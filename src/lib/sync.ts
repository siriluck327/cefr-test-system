import { SHEET_API_URL } from '../config';
import { profileStore } from './profile';

/** One row in the Google Sheet. */
export interface SyncEvent {
  /** ISO time on the learner's device. */
  at: string;
  /** Local calendar day, YYYY-MM-DD, so days match the learner's time zone. */
  date: string;
  userId: string;
  name: string;
  center: string;
  kind: 'login' | 'word' | 'sentence' | 'quiz';
  level: string;
  tense: string;
  text: string;
  /** 0-100; empty for sign-ins. */
  score: number | '';
  wordsOk: number;
  wordsTotal: number;
  /** Misread words, comma separated. */
  missed: string;
}

export type EventInput = Pick<SyncEvent, 'kind'> & Partial<Omit<SyncEvent, 'kind' | 'at' | 'date' | 'userId' | 'name' | 'center'>>;

const OUTBOX_KEY = 'vocab5000:outbox';
const BATCH = 200;

export function localDate(t = Date.now()): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function readOutbox(): SyncEvent[] {
  try {
    const s = localStorage.getItem(OUTBOX_KEY);
    return s ? (JSON.parse(s) as SyncEvent[]) : [];
  } catch {
    return [];
  }
}

function writeOutbox(events: SyncEvent[]) {
  try {
    // Keep at most a few thousand unsent events if the device stays offline for long.
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(events.slice(-5000)));
  } catch {
    // Storage full: drop silently, local stats still work.
  }
}

export function pendingCount(): number {
  return readOutbox().length;
}

let timer: number | undefined;
let flushing = false;

/** Queue an event for the signed-in learner and send it soon. Does nothing when nobody is signed in. */
export function logEvent(e: EventInput, now = Date.now()) {
  const p = profileStore.get().current;
  if (!p) return;
  const ev: SyncEvent = {
    at: new Date(now).toISOString(),
    date: localDate(now),
    userId: p.id,
    name: p.name,
    center: p.center,
    level: '',
    tense: '',
    text: '',
    score: '',
    wordsOk: 0,
    wordsTotal: 0,
    missed: '',
    ...e,
  };
  if (!SHEET_API_URL) return;
  writeOutbox([...readOutbox(), ev]);
  window.clearTimeout(timer);
  timer = window.setTimeout(() => void flush(), 1500);
}

/** Send queued events to the Sheet. Events stay queued until the server confirms them. */
export async function flush(): Promise<void> {
  if (!SHEET_API_URL || flushing || (typeof navigator !== 'undefined' && navigator.onLine === false)) return;
  const queue = readOutbox();
  if (queue.length === 0) return;
  flushing = true;
  try {
    const batch = queue.slice(0, BATCH);
    const res = await fetch(SHEET_API_URL, {
      method: 'POST',
      // text/plain avoids a CORS preflight, which Apps Script cannot answer.
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'log', events: batch }),
    });
    const json = (await res.json()) as { ok?: boolean };
    if (!json.ok) return;
    const sent = new Set(batch.map((e) => `${e.userId}|${e.at}|${e.kind}|${e.text}`));
    writeOutbox(readOutbox().filter((e) => !sent.has(`${e.userId}|${e.at}|${e.kind}|${e.text}`)));
    if (queue.length > BATCH) void flush();
  } catch {
    // Offline or server unreachable: retry later.
  } finally {
    flushing = false;
  }
}

/** Retry sending when the connection returns and every minute while events are waiting. */
export function startSync() {
  if (!SHEET_API_URL || typeof window === 'undefined') return;
  window.addEventListener('online', () => void flush());
  window.setInterval(() => {
    if (pendingCount() > 0) void flush();
  }, 60_000);
  void flush();
}

/** GET a report endpoint of the Apps Script. */
export async function fetchReport<T>(params: Record<string, string>): Promise<T> {
  const url = `${SHEET_API_URL}?${new URLSearchParams(params).toString()}`;
  const res = await fetch(url);
  return (await res.json()) as T;
}
