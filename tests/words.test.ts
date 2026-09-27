import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LEVELS, parseWords } from '../src/lib/words';

const words = parseWords(readFileSync(new URL('../data/words.tsv', import.meta.url), 'utf8'));

describe('word list', () => {
  it('has exactly 5000 entries with unique ids', () => {
    expect(words).toHaveLength(5000);
    expect(new Set(words.map((w) => w.id)).size).toBe(5000);
  });

  it('covers every CEFR level', () => {
    for (const l of LEVELS) expect(words.some((w) => w.level === l)).toBe(true);
  });

  it('gives every word a Thai meaning', () => {
    for (const w of words) expect(w.thai).toMatch(/[฀-๿]/);
  });
});
