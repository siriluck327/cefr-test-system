import raw from '../../data/words.tsv?raw';

export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'] as const;
export type Level = (typeof LEVELS)[number];

export interface Word {
  /** Stable key used for saved progress: `${level}:${word}`. */
  id: string;
  word: string;
  pos: string;
  thai: string;
  level: Level;
}

export const LEVEL_INFO: Record<Level, { name: string; desc: string }> = {
  A1: { name: 'เริ่มต้น', desc: 'คำพื้นฐานที่สุดในชีวิตประจำวัน' },
  A2: { name: 'พื้นฐาน', desc: 'สื่อสารเรื่องใกล้ตัวได้' },
  B1: { name: 'กลาง', desc: 'พูดคุยเรื่องทั่วไปได้คล่องขึ้น' },
  B2: { name: 'กลางค่อนสูง', desc: 'อ่านข่าวและบทความได้' },
  C1: { name: 'สูง', desc: 'ศัพท์วิชาการและงานอาชีพ' },
};

export function parseWords(tsv: string): Word[] {
  const lines = tsv.split(/\r?\n/).filter((l) => l.trim() !== '');
  const out: Word[] = [];
  for (const line of lines.slice(1)) {
    const [level, word, pos, thai] = line.split('\t');
    if (!LEVELS.includes(level as Level) || !word || !thai) continue;
    out.push({ id: `${level}:${word}`, word, pos: pos ?? '', thai, level: level as Level });
  }
  return out;
}

export const WORDS: Word[] = parseWords(raw);

export const WORDS_BY_LEVEL: Record<Level, Word[]> = Object.fromEntries(
  LEVELS.map((l) => [l, WORDS.filter((w) => w.level === l)]),
) as Record<Level, Word[]>;

export const WORD_BY_ID: Map<string, Word> = new Map(WORDS.map((w) => [w.id, w]));
