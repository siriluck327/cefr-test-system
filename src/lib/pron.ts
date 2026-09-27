import raw from '../../data/pron.tsv?raw';

/** Pronunciation of one word, generated from the CMU Pronouncing Dictionary by scripts/build-pron.mjs. */
export interface Pron {
  /** US IPA with syllable dots and stress marks, without slashes: ˈæp.əl */
  ipa: string;
  /** Approximate Thai reading, one entry per syllable. */
  thai: string[];
  /** Index of the syllable with primary stress. */
  stress: number;
  /** ARPAbet phonemes without stress digits, used to accept homophones (their/there). */
  arpa: string;
}

export function parsePron(tsv: string): Map<string, Pron> {
  const map = new Map<string, Pron>();
  for (const line of tsv.split(/\r?\n/).slice(1)) {
    const [word, ipa, thai, stress, arpa] = line.split('\t');
    if (!word || !ipa) continue;
    map.set(word, { ipa, thai: thai.split('-'), stress: Number(stress) || 0, arpa });
  }
  return map;
}

export const PRON: Map<string, Pron> = parsePron(raw);

/** Lower-case a word and drop surrounding punctuation, keeping inner apostrophes (don't, o'clock). */
export function normWord(t: string): string {
  return t
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z'-]/g, '')
    .replace(/^['-]+|['-]+$/g, '');
}

/** IPA split into syllables, paired index-for-index with Pron.thai. */
export function ipaSyllables(ipa: string): string[] {
  return ipa.split(/[.ˈˌ ]/).filter(Boolean);
}

/** Look up a word; hyphenated words (long-standing) are read part by part. */
export function lookup(word: string): Pron | undefined {
  const key = normWord(word);
  const hit = PRON.get(key);
  if (hit || !key.includes('-')) return hit;
  const parts = key.split('-').map((p) => PRON.get(p));
  if (parts.some((p) => !p)) return undefined;
  const ps = parts as Pron[];
  return {
    ipa: ps.map((p) => p.ipa).join(' '),
    thai: ps.flatMap((p) => p.thai),
    stress: ps[0].stress,
    arpa: ps.map((p) => p.arpa).join(' '),
  };
}

export interface Token {
  /** Text as written, with its punctuation: "o'clock." */
  text: string;
  /** Normalised word used for lookup and grading: "o'clock". Empty for pure punctuation. */
  key: string;
  pron?: Pron;
  /** Content words carry sentence stress; function words are usually reduced. */
  stressed: boolean;
}

// Words that are normally unstressed in connected speech.
const FUNCTION_WORDS = new Set(
  `a an the and but or nor so if as than that which who whom whose to of in on at by for from with into onto about over
  under up down off out i me my you your he him his she her it its we us our they them their this these those there
  am is are was were be been being have has had do does did will would shall should can could may might must
  i'm you're he's she's it's we're they're i've you've we've they've i'd you'd he'd she'd we'd they'd i'll you'll
  he'll she'll we'll they'll`.split(/\s+/),
);

/** Split practice text into words; negatives (don't, won't) keep their stress. */
export function tokenize(text: string): Token[] {
  return text
    .replace(/\(.*?\)/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => {
      const key = normWord(t);
      return { text: t, key, pron: key ? lookup(key) : undefined, stressed: !!key && !FUNCTION_WORDS.has(key) };
    });
}

/**
 * Words as they are read and graded: like tokenize(), but a hyphenated word the
 * dictionary lacks (long-term) becomes one token per part.
 */
export function readingTokens(text: string): Token[] {
  return tokenize(text).flatMap((t) => {
    if (!t.key) return [];
    if (!t.key.includes('-') || PRON.has(t.key)) return [t];
    const parts = t.key.split('-').filter(Boolean);
    return parts.map((k, i) => ({
      text: i < parts.length - 1 ? `${k}-` : t.text.slice(t.text.toLowerCase().lastIndexOf(k)),
      key: k,
      pron: PRON.get(k),
      stressed: t.stressed,
    }));
  });
}

/** Text for speech synthesis: bracketed notes removed, "a, an" read as two words. */
export function speakable(text: string): string {
  return text.replace(/\(.*?\)/g, '').replace(/’/g, "'").trim();
}
