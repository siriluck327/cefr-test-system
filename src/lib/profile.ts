import { useSyncExternalStore } from 'react';

/** A learner signed in on this device. Several learners can share one device. */
export interface Profile {
  id: string;
  name: string;
  center: string;
  created: number;
}

const LIST_KEY = 'vocab5000:profiles';
const CURRENT_KEY = 'vocab5000:current';

function read<T>(key: string, fallback: T): T {
  try {
    const s = localStorage.getItem(key);
    return s ? (JSON.parse(s) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage blocked: the session still works in memory.
  }
}

let profiles: Profile[] = read<Profile[]>(LIST_KEY, []).filter((p) => p && p.id && p.name);
let currentId: string | null = read<string | null>(CURRENT_KEY, null);
if (currentId && !profiles.some((p) => p.id === currentId)) currentId = null;

const listeners = new Set<() => void>();
let snapshot = { profiles, current: profiles.find((p) => p.id === currentId) ?? null };
function emit() {
  snapshot = { profiles, current: profiles.find((p) => p.id === currentId) ?? null };
  listeners.forEach((l) => l());
}

/** Collapse spacing so "สมชาย  ใจดี" and "สมชาย ใจดี" are the same learner. */
export function cleanName(name: string): string {
  return name.replace(/\s+/g, ' ').trim();
}

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export const profileStore = {
  get: () => snapshot,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  /** Sign in; reuses the device's existing profile with the same name and centre. */
  signIn(name: string, center: string): Profile {
    const n = cleanName(name);
    let p = profiles.find((x) => x.name === n && x.center === center);
    if (!p) {
      p = { id: newId(), name: n, center, created: Date.now() };
      profiles = [...profiles, p];
      write(LIST_KEY, profiles);
    }
    currentId = p.id;
    write(CURRENT_KEY, currentId);
    emit();
    return p;
  },
  switchTo(id: string) {
    if (!profiles.some((p) => p.id === id)) return;
    currentId = id;
    write(CURRENT_KEY, currentId);
    emit();
  },
  signOut() {
    currentId = null;
    write(CURRENT_KEY, null);
    emit();
  },
  /** Forget a learner on this device (their saved progress here is deleted too). */
  remove(id: string) {
    profiles = profiles.filter((p) => p.id !== id);
    write(LIST_KEY, profiles);
    if (currentId === id) {
      currentId = null;
      write(CURRENT_KEY, null);
    }
    try {
      localStorage.removeItem(`vocab5000:v1:${id}`);
    } catch {
      // ignore
    }
    emit();
  },
};

export function useProfiles() {
  return useSyncExternalStore(profileStore.subscribe, profileStore.get);
}
