import { startOfDay } from './srs';
import { streak, type SpeechDay } from './store';
import { LEVELS, type Level } from './words';

const EMPTY: SpeechDay = { n: 0, sum: 0, wordsOk: 0, wordsTotal: 0, byLevel: {} };

export function dayOf(speech: Record<string, SpeechDay>, t: number): SpeechDay {
  return speech[String(startOfDay(t))] ?? EMPTY;
}

export function average(d: SpeechDay): number | null {
  return d.n ? Math.round(d.sum / d.n) : null;
}

/** The last `count` days, oldest first, including days with no practice. */
export function lastDays(speech: Record<string, SpeechDay>, count: number, now = Date.now()) {
  const out: { day: number; data: SpeechDay }[] = [];
  let d = startOfDay(now);
  for (let i = 0; i < count; i++) {
    out.unshift({ day: d, data: speech[String(d)] ?? EMPTY });
    d = startOfDay(d - 12 * 3600 * 1000);
  }
  return out;
}

export function speechStreak(speech: Record<string, SpeechDay>, now = Date.now()): number {
  return streak(
    Object.keys(speech)
      .filter((k) => speech[k].n > 0)
      .map(Number),
    now,
  );
}

/** All-time average score per level (null where never practised). */
export function levelAverages(speech: Record<string, SpeechDay>): Record<Level, { n: number; avg: number | null }> {
  const acc = Object.fromEntries(LEVELS.map((l) => [l, { n: 0, sum: 0 }])) as Record<Level, { n: number; sum: number }>;
  for (const d of Object.values(speech)) {
    for (const l of LEVELS) {
      const x = d.byLevel[l];
      if (x) {
        acc[l].n += x.n;
        acc[l].sum += x.sum;
      }
    }
  }
  return Object.fromEntries(LEVELS.map((l) => [l, { n: acc[l].n, avg: acc[l].n ? Math.round(acc[l].sum / acc[l].n) : null }])) as Record<
    Level,
    { n: number; avg: number | null }
  >;
}
