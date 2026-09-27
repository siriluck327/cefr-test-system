import { useSyncExternalStore } from 'react';
import type { CardState } from './srs';
import type { Level } from './words';
import type { QuizMode } from './quiz';
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
}

export interface SaveData {
  version: 1;
  cards: Record<string, CardState>;
  quizzes: QuizResult[];
  /** Days (start-of-day epoch ms) on which the learner studied. */
  days: number[];
  settings: Settings;
}

const KEY = 'vocab5000:v1';

export const DEFAULT_SETTINGS: Settings = { newPerSession: 10, quizLength: 10, autoSpeak: false };

function empty(): SaveData {
  return { version: 1, cards: {}, quizzes: [], days: [], settings: { ...DEFAULT_SETTINGS } };
}

function load(): SaveData {
  try {
    const s = localStorage.getItem(KEY);
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
  };
}

let data: SaveData = load();
const listeners = new Set<() => void>();

function commit(next: SaveData) {
  data = next;
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
