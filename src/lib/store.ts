import { useSyncExternalStore } from 'react';
import type { CardState } from './srs';
import type { Level } from './words';
import type { QuizMode } from './quiz';
import type { Accent } from './speech';
import { profileStore } from './profile';
import { startOfDay } from './srs';

export interface QuizResult {
  at: number;
  level: Level | 'ALL';
  mode: QuizMode;
  score: number;
  total: number;
}

export interface Settings {
  newPerSession: number;
  quizLength: number;
  autoSpeak: boolean;
  /** Pronunciation attempts to aim for each day. */
  dailyGoal: number;
  accent: Accent;
}

/** Pronunciation practice on one day. */
export interface SpeechDay {
  /** Attempts (one per word or sentence read aloud). */
  n: number;
  /** Sum of attempt scores (0-100 each), for the daily average. */
  sum: number;
  /** Words read correctly / attempted, counted inside words and sentences alike. */
  wordsOk: number;
  wordsTotal: number;
  byLevel: Partial<Record<Level, { n: number; sum: number }>>;
}

export interface Attempt {
  level: Level;
  score: number;
  /** Per-word verdicts; empty when the learner rated themselves. */
  words: { key: string; ok: boolean }[];
}

export interface SaveData {
  version: 1;
  cards: Record<string, CardState>;
  quizzes: QuizResult[];
  /** Days (start-of-day epoch ms) on which the learner studied. */
  days: number[];
  settings: Settings;
  /** Pronunciation practice keyed by start-of-day epoch ms. */
  speech: Record<string, SpeechDay>;
  /** Words misread recently -> how many more correct readings clear them. */
  weak: Record<string, number>;
}

/** Progress from before sign-in existed; handed to the first learner who signs in on this device. */
const LEGACY_KEY = 'vocab5000:v1';
const keyFor = (profileId: string | null) => (profileId ? `vocab5000:v1:${profileId}` : null);
let KEY: string | null = keyFor(profileStore.get().current?.id ?? null);

export const DEFAULT_SETTINGS: Settings = {
  newPerSession: 10,
  quizLength: 10,
  autoSpeak: false,
  dailyGoal: 20,
  accent: 'en-US',
};

function empty(): SaveData {
  return { version: 1, cards: {}, quizzes: [], days: [], settings: { ...DEFAULT_SETTINGS }, speech: {}, weak: {} };
}

function load(): SaveData {
  if (!KEY) return empty();
  try {
    let s = localStorage.getItem(KEY);
    if (!s) {
      s = localStorage.getItem(LEGACY_KEY);
      if (s) {
        localStorage.setItem(KEY, s);
        localStorage.removeItem(LEGACY_KEY);
      }
    }
    if (!s) return empty();
    return normalize(JSON.parse(s));
  } catch {
    return empty();
  }
}

export function normalize(d: unknown): SaveData {
  const base = empty();
  if (!d || typeof d !== 'object') return base;
  const o = d as Partial<SaveData>;
  return {
    version: 1,
    cards: o.cards && typeof o.cards === 'object' ? o.cards : {},
    quizzes: Array.isArray(o.quizzes) ? o.quizzes.slice(-100) : [],
    days: Array.isArray(o.days) ? o.days : [],
    settings: { ...base.settings, ...(o.settings ?? {}) },
    speech: o.speech && typeof o.speech === 'object' ? o.speech : {},
    weak: o.weak && typeof o.weak === 'object' ? o.weak : {},
  };
}

let data: SaveData = load();
const listeners = new Set<() => void>();

// Each learner has their own progress: reload whenever the signed-in learner changes.
profileStore.subscribe(() => {
  const next = keyFor(profileStore.get().current?.id ?? null);
  if (next === KEY) return;
  KEY = next;
  data = load();
  listeners.forEach((l) => l());
});

/** Read another learner's saved progress on this device (for the report page). */
export function loadFor(profileId: string): SaveData {
  try {
    const s = localStorage.getItem(`vocab5000:v1:${profileId}`);
    return s ? normalize(JSON.parse(s)) : empty();
  } catch {
    return empty();
  }
}

function commit(next: SaveData) {
  data = next;
  if (!KEY) {
    listeners.forEach((l) => l());
    return;
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Storage full or blocked: keep working in memory for this visit.
  }
  listeners.forEach((l) => l());
}

function markToday(days: number[]): number[] {
  const today = startOfDay(Date.now());
  return days.includes(today) ? days : [...days, today].slice(-400);
}

export const store = {
  get: () => data,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  setCard(id: string, card: CardState) {
    commit({ ...data, cards: { ...data.cards, [id]: card }, days: markToday(data.days) });
  },
  addQuiz(r: QuizResult) {
    commit({ ...data, quizzes: [...data.quizzes, r].slice(-100), days: markToday(data.days) });
  },
  addAttempt(a: Attempt, now = Date.now()) {
    const key = String(startOfDay(now));
    const prev = data.speech[key] ?? { n: 0, sum: 0, wordsOk: 0, wordsTotal: 0, byLevel: {} };
    const lv = prev.byLevel[a.level] ?? { n: 0, sum: 0 };
    const day: SpeechDay = {
      n: prev.n + 1,
      sum: prev.sum + a.score,
      wordsOk: prev.wordsOk + a.words.filter((w) => w.ok).length,
      wordsTotal: prev.wordsTotal + a.words.length,
      byLevel: { ...prev.byLevel, [a.level]: { n: lv.n + 1, sum: lv.sum + a.score } },
    };
    commit({ ...data, speech: { ...data.speech, [key]: day }, weak: updateWeak(data.weak, a.words), days: markToday(data.days) });
  },
  setSettings(s: Partial<Settings>) {
    commit({ ...data, settings: { ...data.settings, ...s } });
  },
  replace(d: SaveData) {
    commit(normalize(d));
  },
  reset() {
    commit({ ...empty(), settings: data.settings });
  },
};

/** A misread word must be read correctly twice before it leaves the list. */
const WEAK_CLEAR = 2;

export function updateWeak(weak: Record<string, number>, words: { key: string; ok: boolean }[]): Record<string, number> {
  const next = { ...weak };
  for (const w of words) {
    if (!w.ok) next[w.key] = WEAK_CLEAR;
    else if (next[w.key] !== undefined) {
      if (next[w.key] <= 1) delete next[w.key];
      else next[w.key] -= 1;
    }
  }
  return next;
}

export function useStore(): SaveData {
  return useSyncExternalStore(store.subscribe, store.get);
}

/** Consecutive study days ending today (or yesterday, if not studied yet today). */
export function streak(days: number[], now = Date.now()): number {
  const set = new Set(days);
  let d = startOfDay(now);
  if (!set.has(d)) d = startOfDay(d - 12 * 3600 * 1000);
  let n = 0;
  while (set.has(d)) {
    n++;
    d = startOfDay(d - 12 * 3600 * 1000);
  }
  return n;
}
