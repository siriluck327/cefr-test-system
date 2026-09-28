import { describe, expect, it } from 'vitest';
import { CENTERS } from '../src/lib/centers';
import { byCenter, daySeries, daysBefore, fromRaw, personFromSave, summarize, type RawRow } from '../src/lib/report';

const A = CENTERS[0];
const B = CENTERS[1];
const raw: RawRow[] = [
  ['2026-09-26', 'สมชาย ใจดี', A, 'word', 'A1', 80, 1, 1],
  ['2026-09-27', 'สมชาย ใจดี', A, 'sentence', 'A1', 60, 3, 5],
  ['2026-09-27', 'สมชาย ใจดี', A, 'quiz', 'A1', 90, 9, 10],
  ['2026-09-27', 'สมชาย ใจดี', A, 'login', '', '', '', ''],
  ['2026-09-20', 'มานี มีนา', B, 'word', 'B1', 100, 1, 1],
];

describe('report', () => {
  const people = summarize(raw.map(fromRaw), '2026-09-27');
  const somchai = people.find((p) => p.name === 'สมชาย ใจดี')!;

  it('summarises each learner', () => {
    expect(people).toHaveLength(2);
    expect(somchai).toMatchObject({ attempts: 2, words: 1, sentences: 1, quizzes: 1, avg: 70, today: 1, activeDays: 2, lastDate: '2026-09-27' });
    expect(somchai.accuracy).toBe(67); // 4 of 6 words
    expect(somchai.byLevel.A1).toEqual({ n: 2, sum: 140 });
  });

  it('keeps learners with the same name at different centres apart', () => {
    const two = summarize([...raw, ['2026-09-27', 'สมชาย ใจดี', B, 'word', 'A1', 50, 0, 1]].map((r) => fromRaw(r as RawRow)), '2026-09-27');
    expect(two.filter((p) => p.name === 'สมชาย ใจดี')).toHaveLength(2);
  });

  it('totals per centre', () => {
    const c = byCenter(people, CENTERS);
    expect(c).toHaveLength(15);
    expect(c[0]).toMatchObject({ learners: 1, activeToday: 1, attempts: 2, avg: 70 });
    expect(c[2]).toMatchObject({ learners: 0, attempts: 0, avg: null });
  });

  it('builds day series and date offsets', () => {
    expect(daysBefore('2026-03-01', 1)).toBe('2026-02-28');
    const s = daySeries(somchai.byDay, '2026-09-27', 3);
    expect(s.map((d) => d.n)).toEqual([0, 1, 1]);
    expect(s[2].avg).toBe(60);
  });

  it('reads progress saved on the device', () => {
    const day = new Date(2026, 8, 27).getTime();
    const p = personFromSave({ name: 'x', center: A }, { [day]: { n: 4, sum: 300, wordsOk: 3, wordsTotal: 4, byLevel: { A2: { n: 4, sum: 300 } } } }, 2, '2026-09-27');
    expect(p).toMatchObject({ attempts: 4, avg: 75, accuracy: 75, today: 4, quizzes: 2, activeDays: 1 });
  });
});
