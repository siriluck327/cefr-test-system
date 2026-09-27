import raw from '../../data/sentences.tsv?raw';
import { TENSE_BY_ID, TENSES, type Tense, type TenseId } from './tenses';
import { LEVELS, type Level } from './words';

export interface Sentence {
  /** Stable key used for saved progress: `${level}:${tense}:${n}`. */
  id: string;
  level: Level;
  tense: TenseId;
  en: string;
  thai: string;
}

export function parseSentences(tsv: string): Sentence[] {
  const out: Sentence[] = [];
  const seen = new Map<string, number>();
  for (const line of tsv.split(/\r?\n/).slice(1)) {
    const [level, tense, en, thai] = line.split('\t');
    if (!LEVELS.includes(level as Level) || !TENSE_BY_ID.has(tense) || !en || !thai) continue;
    const group = `${level}:${tense}`;
    const n = (seen.get(group) ?? 0) + 1;
    seen.set(group, n);
    out.push({ id: `${group}:${n}`, level: level as Level, tense: tense as TenseId, en, thai });
  }
  return out;
}

export const SENTENCES: Sentence[] = parseSentences(raw);

export function sentencesFor(level: Level, tense: TenseId): Sentence[] {
  return SENTENCES.filter((s) => s.level === level && s.tense === tense);
}

/** Tenses practised at a level, in teaching order. */
export function tensesFor(level: Level): Tense[] {
  const used = new Set(SENTENCES.filter((s) => s.level === level).map((s) => s.tense));
  return TENSES.filter((t) => used.has(t.id));
}
