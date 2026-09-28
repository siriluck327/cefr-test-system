import { describe, expect, it } from 'vitest';
// @ts-expect-error plain JS build helper
import { stressIndex, syllabify, toIPA, toThai } from '../scripts/pron-core.mjs';
import { ipaSyllables, lookup, readingTokens, tokenize } from '../src/lib/pron';

const conv = (arpa: string) => {
  const s = syllabify(arpa);
  return { ipa: toIPA(s), thai: toThai(s).join('-'), stress: stressIndex(s) };
};

describe('ARPAbet conversion', () => {
  it('keeps a consonant after a short stressed vowel and doubles it in Thai', () => {
    expect(conv('AE1 P AH0 L')).toEqual({ ipa: 'ˈæp.əl', thai: 'แอป-เพิล', stress: 0 });
    expect(conv('HH AE1 P IY0').thai).toBe('แฮป-พี');
  });

  it('marks primary and secondary stress', () => {
    expect(conv('R EH2 K AH0 M EH1 N D')).toEqual({ ipa: 'ˌrek.əˈmend', thai: 'เร็ค-เคอะ-เม็นด์', stress: 2 });
  });

  it('writes s-clusters the Thai way', () => {
    expect(conv('S K UW1 L').thai).toBe('สกูล');
    expect(conv('IH0 K S P EH1 N S IH0 V').thai).toBe('อิค-สเป็น-ซิฟ');
  });

  it('reads /juː/ as ิว and marks extra finals with karan', () => {
    expect(conv('M Y UW1 Z IH0 K').thai).toBe('มิว-ซิค');
    expect(conv('F R EH1 N D').thai).toBe('เฟร็นด์');
  });
});

describe('pronunciation lookup', () => {
  it('covers vocabulary, British spellings and hyphenated words', () => {
    expect(lookup('Apple')?.ipa).toBe('ˈæp.əl');
    expect(lookup('colour')).toBeDefined();
    expect(lookup('long-standing')?.thai.length).toBeGreaterThan(2);
  });

  it('pairs IPA syllables with Thai syllables', () => {
    const p = lookup('environment')!;
    expect(ipaSyllables(p.ipa)).toHaveLength(p.thai.length);
  });

  it('marks content words as stressed and splits unknown hyphenations', () => {
    const t = tokenize('I drink water.');
    expect(t.map((x) => x.stressed)).toEqual([false, true, true]);
    expect(readingTokens('its long-term strategy').map((x) => x.key)).toEqual(['its', 'long', 'term', 'strategy']);
  });
});
