import { describe, expect, it } from 'vitest';
import { isDue, MASTERED_BOX, review, startOfDay, status } from '../src/lib/srs';
import { streak } from '../src/lib/store';

const DAY = 86400000;
const now = new Date(2026, 0, 10, 15).getTime();

describe('review', () => {
  it('moves up one box on good and two on easy', () => {
    const a = review(undefined, 'good', now);
    expect(a.box).toBe(1);
    expect(review(a, 'easy', now).box).toBe(3);
  });

  it('resets to box 1 and is due again soon when forgotten', () => {
    const c = review({ box: 4, due: 0, correct: 3, wrong: 0, last: 0 }, 'again', now);
    expect(c.box).toBe(1);
    expect(c.wrong).toBe(1);
    expect(isDue(c, now + 2 * 60 * 1000)).toBe(true);
  });

  it('schedules later boxes further out', () => {
    const c = review({ box: 3, due: 0, correct: 3, wrong: 0, last: 0 }, 'good', now);
    expect(c.due).toBe(startOfDay(now) + 7 * DAY);
    expect(isDue(c, now + DAY)).toBe(false);
  });

  it('reports status by box', () => {
    expect(status(undefined)).toBe('new');
    expect(status({ box: 2, due: 0, correct: 0, wrong: 0, last: 0 })).toBe('learning');
    expect(status({ box: MASTERED_BOX, due: 0, correct: 0, wrong: 0, last: 0 })).toBe('mastered');
  });
});

describe('streak', () => {
  it('counts consecutive days ending today or yesterday', () => {
    const d = startOfDay(now);
    expect(streak([d - 2 * DAY, d - DAY, d], now)).toBe(3);
    expect(streak([d - 2 * DAY, d - DAY], now)).toBe(2);
    expect(streak([d - 3 * DAY], now)).toBe(0);
  });
});
