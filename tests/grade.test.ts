import { describe, expect, it } from 'vitest';
import { compareWord, gradeBest, gradeReading, heardWords, numberWords } from '../src/lib/grade';
import { updateWeak } from '../src/lib/store';

describe('gradeReading', () => {
  it('marks every word correct for a perfect reading', () => {
    const g = gradeReading('I drink water every morning.', 'I drink water every morning');
    expect(g.words.map((w) => w.verdict)).toEqual(['ok', 'ok', 'ok', 'ok', 'ok']);
    expect(g.score).toBe(100);
  });

  it('finds the wrong and the skipped word', () => {
    const g = gradeReading('They went to the beach in July.', 'they want to beach in July');
    const v = Object.fromEntries(g.words.map((w) => [w.key, w.verdict]));
    expect(v.went).not.toBe('ok');
    expect(v.the).toBe('missed');
    expect(v.beach).toBe('ok');
    expect(g.score).toBeLessThan(100);
  });

  it('ignores extra words the recogniser adds', () => {
    const g = gradeReading('He bought a new phone.', 'um he bought a new phone');
    expect(g.score).toBe(100);
  });

  it('accepts digits, clock times and homophones', () => {
    expect(heardWords('9:00')).toEqual(['nine', "o'clock"]);
    expect(gradeReading('The train will arrive in ten minutes.', 'the train will arrive in 10 minutes').score).toBe(100);
    expect(gradeReading('The shop opens at nine o’clock.', 'the shop opens at 9:00').score).toBe(100);
    expect(compareWord('their', 'there')).toBe('ok');
  });

  it('picks the best recogniser alternative', () => {
    expect(gradeBest('apple', ['up all', 'apple']).score).toBe(100);
  });

  it('spells numbers', () => {
    expect(numberWords(21)).toEqual(['twenty', 'one']);
    expect(numberWords(100)).toEqual(['one', 'hundred']);
  });
});

describe('weak words', () => {
  it('adds misread words and clears them after two correct readings', () => {
    let w = updateWeak({}, [{ key: 'went', ok: false }, { key: 'beach', ok: true }]);
    expect(w).toEqual({ went: 2 });
    w = updateWeak(w, [{ key: 'went', ok: true }]);
    expect(w).toEqual({ went: 1 });
    w = updateWeak(w, [{ key: 'went', ok: true }]);
    expect(w).toEqual({});
  });
});
