import { describe, expect, it } from 'vitest';
import { makeQuestion, makeQuiz } from '../src/lib/quiz';
import type { Word } from '../src/lib/words';

const w = (word: string, thai: string, pos = 'n.'): Word => ({ id: `A1:${word}`, word, thai, pos, level: 'A1' });
const pool = [
  w('house', 'บ้าน'),
  w('home', 'บ้าน'),
  w('cat', 'แมว'),
  w('dog', 'สุนัข'),
  w('bird', 'นก'),
  w('run', 'วิ่ง', 'v.'),
];

describe('makeQuestion', () => {
  it('has four distinct choices including the answer', () => {
    for (let i = 0; i < 50; i++) {
      const q = makeQuestion(pool[0], pool, 'en-th');
      expect(q.choices).toHaveLength(4);
      expect(new Set(q.choices).size).toBe(4);
      expect(q.choices[q.answer]).toBe('บ้าน');
    }
  });

  it('never offers a synonym with the same Thai text as a wrong choice', () => {
    for (let i = 0; i < 50; i++) {
      const q = makeQuestion(pool[0], pool, 'en-th');
      expect(q.choices.filter((c) => c === 'บ้าน')).toHaveLength(1);
    }
  });

  it('prefers distractors with the same part of speech', () => {
    for (let i = 0; i < 50; i++) {
      const q = makeQuestion(pool[2], pool, 'th-en');
      expect(q.choices).not.toContain('run');
    }
  });

  it('builds a quiz of the requested length', () => {
    expect(makeQuiz(pool, pool, 3, 'en-th')).toHaveLength(3);
  });
});
