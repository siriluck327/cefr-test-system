import { LEVELS, type Level } from './words';

/** One practice attempt as returned by the Sheet's `rows` report. */
export interface Row {
  date: string;
  name: string;
  center: string;
  kind: string;
  level: string;
  score: number | null;
  wordsOk: number;
  wordsTotal: number;
}

/** Compact form sent by Apps Script: [date, name, center, kind, level, score, wordsOk, wordsTotal]. */
export type RawRow = [string, string, string, string, string, number | string, number | string, number | string];

export function fromRaw(r: RawRow): Row {
  const num = (v: number | string) => (v === '' || v === null || v === undefined ? NaN : Number(v));
  const score = num(r[5]);
  return {
    date: String(r[0]).slice(0, 10),
    name: String(r[1]),
    center: String(r[2]),
    kind: String(r[3]),
    level: String(r[4]),
    score: Number.isFinite(score) ? score : null,
    wordsOk: num(r[6]) || 0,
    wordsTotal: num(r[7]) || 0,
  };
}

export const isPractice = (kind: string) => kind === 'word' || kind === 'sentence';

export interface DayStat {
  n: number;
  sum: number;
}

export interface Person {
  key: string;
  name: string;
  center: string;
  /** Read-aloud attempts (words + sentences). */
  attempts: number;
  words: number;
  sentences: number;
  quizzes: number;
  /** Average read-aloud score, null when none. */
  avg: number | null;
  /** Share of words read correctly, null when nothing was graded word by word. */
  accuracy: number | null;
  activeDays: number;
  firstDate: string;
  lastDate: string;
  today: number;
  byDay: Record<string, DayStat>;
  byLevel: Partial<Record<Level, DayStat>>;
}

export const personKey = (center: string, name: string) => `${center}|${name}`;

export function summarize(rows: Row[], today: string): Person[] {
  const map = new Map<string, Person & { sum: number; scored: number; ok: number; tot: number; days: Set<string> }>();
  for (const r of rows) {
    const key = personKey(r.center, r.name);
    let p = map.get(key);
    if (!p) {
      p = {
        key, name: r.name, center: r.center, attempts: 0, words: 0, sentences: 0, quizzes: 0, avg: null, accuracy: null,
        activeDays: 0, firstDate: r.date, lastDate: r.date, today: 0, byDay: {}, byLevel: {},
        sum: 0, scored: 0, ok: 0, tot: 0, days: new Set(),
      };
      map.set(key, p);
    }
    if (r.date < p.firstDate) p.firstDate = r.date;
    if (r.date > p.lastDate) p.lastDate = r.date;
    p.days.add(r.date);
    if (r.kind === 'quiz') p.quizzes++;
    if (!isPractice(r.kind)) continue;
    p.attempts++;
    if (r.kind === 'word') p.words++;
    else p.sentences++;
    if (r.date === today) p.today++;
    const day = (p.byDay[r.date] ??= { n: 0, sum: 0 });
    day.n++;
    if (r.score !== null) {
      day.sum += r.score;
      p.sum += r.score;
      p.scored++;
      if ((LEVELS as readonly string[]).includes(r.level)) {
        const lv = (p.byLevel[r.level as Level] ??= { n: 0, sum: 0 });
        lv.n++;
        lv.sum += r.score;
      }
    }
    p.ok += r.wordsOk;
    p.tot += r.wordsTotal;
  }
  return [...map.values()].map(({ sum, scored, ok, tot, days, ...p }) => ({
    ...p,
    avg: scored ? Math.round(sum / scored) : null,
    accuracy: tot ? Math.round((ok / tot) * 100) : null,
    activeDays: days.size,
  }));
}

export interface CenterStat {
  center: string;
  learners: number;
  activeToday: number;
  attempts: number;
  avg: number | null;
}

export function byCenter(people: Person[], centers: readonly string[]): CenterStat[] {
  return centers.map((center) => {
    const ps = people.filter((p) => p.center === center);
    const scored = ps.filter((p) => p.avg !== null);
    const weight = scored.reduce((a, p) => a + p.attempts, 0);
    return {
      center,
      learners: ps.length,
      activeToday: ps.filter((p) => p.today > 0).length,
      attempts: ps.reduce((a, p) => a + p.attempts, 0),
      avg: weight ? Math.round(scored.reduce((a, p) => a + (p.avg ?? 0) * p.attempts, 0) / weight) : null,
    };
  });
}

/** YYYY-MM-DD `days` days before `date`. */
export function daysBefore(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(y, m - 1, d - days);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

/** Same summary built from one learner's progress saved on this device (report page without a Sheet). */
export function personFromSave(
  profile: { name: string; center: string },
  speech: Record<string, { n: number; sum: number; wordsOk: number; wordsTotal: number; byLevel: Partial<Record<Level, DayStat>> }>,
  quizzes: number,
  today: string,
): Person {
  const byDay: Record<string, DayStat> = {};
  const byLevel: Partial<Record<Level, DayStat>> = {};
  let n = 0;
  let sum = 0;
  let ok = 0;
  let tot = 0;
  for (const [k, d] of Object.entries(speech)) {
    if (!d.n) continue;
    const t = new Date(Number(k));
    const date = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
    byDay[date] = { n: d.n, sum: d.sum };
    n += d.n;
    sum += d.sum;
    ok += d.wordsOk;
    tot += d.wordsTotal;
    for (const l of LEVELS) {
      const x = d.byLevel[l];
      if (!x) continue;
      const acc = (byLevel[l] ??= { n: 0, sum: 0 });
      acc.n += x.n;
      acc.sum += x.sum;
    }
  }
  const dates = Object.keys(byDay).sort();
  return {
    key: personKey(profile.center, profile.name),
    name: profile.name,
    center: profile.center,
    attempts: n,
    words: 0,
    sentences: 0,
    quizzes,
    avg: n ? Math.round(sum / n) : null,
    accuracy: tot ? Math.round((ok / tot) * 100) : null,
    activeDays: dates.length,
    firstDate: dates[0] ?? '',
    lastDate: dates[dates.length - 1] ?? '',
    today: byDay[today]?.n ?? 0,
    byDay,
    byLevel,
  };
}

/** The last `count` days ending at `today`, oldest first, as chart input. */
export function daySeries(byDay: Record<string, DayStat>, today: string, count: number) {
  const out: { day: number; n: number; avg: number | null }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const date = daysBefore(today, i);
    const [y, m, d] = date.split('-').map(Number);
    const s = byDay[date];
    out.push({ day: new Date(y, m - 1, d).getTime(), n: s?.n ?? 0, avg: s && s.n ? Math.round(s.sum / s.n) : null });
  }
  return out;
}
