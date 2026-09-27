// Leitner-style spaced repetition. A card climbs one box per correct
// answer and falls back to box 1 when forgotten; each box has a longer
// review interval.

export interface CardState {
  box: number; // 0 = never studied, 1..MAX_BOX
  due: number; // epoch ms when the card should be reviewed next
  correct: number;
  wrong: number;
  last: number; // epoch ms of the last review
}

export const MAX_BOX = 6;
const DAY = 24 * 60 * 60 * 1000;
/** Review interval (days) after reaching each box. */
export const INTERVAL_DAYS = [0, 0, 1, 3, 7, 16, 35];
/** A word counts as "mastered" once it reaches this box. */
export const MASTERED_BOX = 5;

export type Grade = 'again' | 'good' | 'easy';

export function newCard(): CardState {
  return { box: 0, due: 0, correct: 0, wrong: 0, last: 0 };
}

export function review(card: CardState | undefined, grade: Grade, now = Date.now()): CardState {
  const c = card ?? newCard();
  let box: number;
  if (grade === 'again') box = 1;
  else if (grade === 'good') box = Math.min(MAX_BOX, c.box + 1);
  else box = Math.min(MAX_BOX, c.box + 2);
  // A forgotten card comes back after a short pause within the same day.
  const due = grade === 'again' ? now + 60 * 1000 : startOfDay(now) + INTERVAL_DAYS[box] * DAY;
  return {
    box,
    due,
    correct: c.correct + (grade === 'again' ? 0 : 1),
    wrong: c.wrong + (grade === 'again' ? 1 : 0),
    last: now,
  };
}

export function isDue(card: CardState | undefined, now = Date.now()): boolean {
  return !!card && card.box > 0 && card.due <= now;
}

export type Status = 'new' | 'learning' | 'mastered';

export function status(card: CardState | undefined): Status {
  if (!card || card.box === 0) return 'new';
  return card.box >= MASTERED_BOX ? 'mastered' : 'learning';
}

export function startOfDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
