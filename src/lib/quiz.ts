import type { Word } from './words';

export type QuizMode = 'en-th' | 'th-en';

export interface Question {
  word: Word;
  prompt: string;
  choices: string[];
  answer: number; // index into choices
}

export function shuffle<T>(arr: T[], rand = Math.random): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function mainPos(pos: string): string {
  return pos.split(/[,;(]/)[0].trim();
}

/**
 * Build a 4-choice question. Distractors come from `pool`, preferring the
 * same part of speech, and never share the answer's text (several English
 * words have the same Thai meaning, and the same word can appear at two
 * levels).
 */
export function makeQuestion(word: Word, pool: Word[], mode: QuizMode, rand = Math.random): Question {
  const show = (w: Word) => (mode === 'en-th' ? w.thai : w.word);
  const correct = show(word);
  const used = new Set([correct.toLowerCase()]);
  const candidates = shuffle(
    pool.filter((w) => w.word !== word.word),
    rand,
  );
  const samePos = candidates.filter((w) => mainPos(w.pos) === mainPos(word.pos));
  const distractors: string[] = [];
  for (const w of [...samePos, ...candidates]) {
    const text = show(w);
    if (used.has(text.toLowerCase())) continue;
    used.add(text.toLowerCase());
    distractors.push(text);
    if (distractors.length === 3) break;
  }
  const choices = shuffle([correct, ...distractors], rand);
  return {
    word,
    prompt: mode === 'en-th' ? word.word : word.thai,
    choices,
    answer: choices.indexOf(correct),
  };
}

export function makeQuiz(words: Word[], pool: Word[], count: number, mode: QuizMode, rand = Math.random): Question[] {
  return shuffle(words, rand)
    .slice(0, count)
    .map((w) => makeQuestion(w, pool, mode, rand));
}
