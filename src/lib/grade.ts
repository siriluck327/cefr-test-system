import { normWord, PRON, readingTokens } from './pron';

export type Verdict = 'ok' | 'close' | 'wrong' | 'missed';

export interface WordResult {
  text: string;
  key: string;
  verdict: Verdict;
  /** What the recogniser heard in this word's place, when it differs. */
  heard?: string;
}

export interface Grade {
  words: WordResult[];
  /** 0-100: correct words count fully, near misses count 60%. */
  score: number;
  heard: string;
}

const ONES = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split(' ');
const TENS = 'twenty thirty forty fifty sixty seventy eighty ninety'.split(' ');

/** 0-9999 as English words, the way recognisers print them as digits ("10" -> "ten"). */
export function numberWords(n: number): string[] {
  if (n < 20) return [ONES[n]];
  if (n < 100) return n % 10 ? [TENS[Math.floor(n / 10) - 2], ONES[n % 10]] : [TENS[n / 10 - 2]];
  if (n < 1000) {
    const rest = n % 100;
    return [ONES[Math.floor(n / 100)], 'hundred', ...(rest ? ['and', ...numberWords(rest)] : [])];
  }
  const rest = n % 1000;
  return [...numberWords(Math.floor(n / 1000)), 'thousand', ...(rest ? numberWords(rest) : [])];
}

/** Recogniser output -> comparable word keys. */
export function heardWords(text: string): string[] {
  const out: string[] = [];
  const cleaned = text.toLowerCase().replace(/%/g, ' percent').replace(/[’‘]/g, "'");
  for (const raw of cleaned.split(/[\s,.!?;"]+/)) {
    const time = /^(\d{1,2}):00$/.exec(raw);
    if (time) {
      out.push(...numberWords(Number(time[1])), "o'clock");
      continue;
    }
    if (/^\d+$/.test(raw) && Number(raw) < 10000) {
      out.push(...numberWords(Number(raw)).filter((w) => w !== 'and'));
      continue;
    }
    const k = normWord(raw);
    if (k) out.push(...k.split('-').filter(Boolean));
  }
  return out;
}

function editDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

/** How well one heard word matches one target word. */
export function compareWord(target: string, heard: string): 'ok' | 'close' | 'wrong' {
  if (target === heard) return 'ok';
  const bare = (s: string) => s.replace(/'/g, '');
  if (bare(target) === bare(heard)) return 'ok';
  // Homophones: the recogniser may spell a correctly spoken word differently (there/their, two/to).
  const a = PRON.get(target)?.arpa;
  if (a && a === PRON.get(heard)?.arpa) return 'ok';
  const sim = 1 - editDistance(target, heard) / Math.max(target.length, heard.length);
  return sim >= 0.8 ? 'close' : 'wrong';
}

const COST = { ok: 0, close: 0.4, wrong: 1 };

/**
 * Align what was heard against the target text word by word (edit distance over words),
 * so each target word gets its own verdict even when words are skipped or added.
 */
export function gradeReading(target: string, heardText: string): Grade {
  const targetTokens = readingTokens(target).map((t) => ({ text: t.text, key: t.key }));
  const h = heardWords(heardText);
  const n = targetTokens.length;
  const m = h.length;
  const cmp: ('ok' | 'close' | 'wrong')[][] = targetTokens.map((t) => h.map((w) => compareWord(t.key, w)));
  const d: number[][] = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: m + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + COST[cmp[i - 1][j - 1]]);
    }
  }
  const words: WordResult[] = new Array(n);
  let i = n;
  let j = m;
  while (i > 0) {
    if (j > 0 && d[i][j] === d[i - 1][j - 1] + COST[cmp[i - 1][j - 1]]) {
      const v = cmp[i - 1][j - 1];
      words[i - 1] = { ...targetTokens[i - 1], verdict: v, heard: v === 'ok' ? undefined : h[j - 1] };
      i--;
      j--;
    } else if (j > 0 && d[i][j] === d[i][j - 1] + 1) {
      j--; // an extra heard word
    } else {
      words[i - 1] = { ...targetTokens[i - 1], verdict: 'missed' };
      i--;
    }
  }
  const points = words.reduce((s, w) => s + (w.verdict === 'ok' ? 1 : w.verdict === 'close' ? 0.6 : 0), 0);
  return { words, score: n ? Math.round((points / n) * 100) : 0, heard: heardText };
}

/** Recognisers return several guesses; grade against the one that fits best. */
export function gradeBest(target: string, alternatives: string[]): Grade {
  let best = gradeReading(target, alternatives[0] ?? '');
  for (const alt of alternatives.slice(1)) {
    const g = gradeReading(target, alt);
    if (g.score > best.score) best = g;
  }
  return best;
}
