import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseSentences } from '../src/lib/sentences';
import { readingTokens } from '../src/lib/pron';
import { LEVELS } from '../src/lib/words';

const sentences = parseSentences(readFileSync(new URL('../data/sentences.tsv', import.meta.url), 'utf8'));

describe('sentences', () => {
  it('has sentences in several tenses at every level', () => {
    for (const l of LEVELS) {
      const tenses = new Set(sentences.filter((s) => s.level === l).map((s) => s.tense));
      expect(tenses.size).toBeGreaterThanOrEqual(4);
    }
  });

  it('covers all twelve tenses at C1', () => {
    expect(new Set(sentences.filter((s) => s.level === 'C1').map((s) => s.tense)).size).toBe(12);
  });

  it('has unique ids and a pronunciation for every word', () => {
    expect(new Set(sentences.map((s) => s.id)).size).toBe(sentences.length);
    for (const s of sentences) for (const t of readingTokens(s.en)) expect(t.pron, `${t.key} in "${s.en}"`).toBeDefined();
  });
});
