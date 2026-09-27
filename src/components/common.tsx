import type { ReactNode } from 'react';
import { canSpeak, speak } from '../lib/speech';
import type { Level } from '../lib/words';

export function SpeakButton({ text, big }: { text: string; big?: boolean }) {
  if (!canSpeak) return null;
  return (
    <button
      type="button"
      className={big ? 'icon-btn big' : 'icon-btn'}
      aria-label={`ฟังเสียง ${text}`}
      title="ฟังเสียง (S)"
      onClick={(e) => {
        e.stopPropagation();
        speak(text);
      }}
    >
      <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true">
        <path
          fill="currentColor"
          d="M3 10v4h4l5 4V6L7 10H3zm13.5 2a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"
        />
      </svg>
    </button>
  );
}

export function LevelBadge({ level }: { level: Level }) {
  return <span className={`badge lvl-${level}`}>{level}</span>;
}

export function ProgressBar({ total, mastered, learning }: { total: number; mastered: number; learning: number }) {
  const m = total ? (mastered / total) * 100 : 0;
  const l = total ? (learning / total) * 100 : 0;
  return (
    <div
      className="bar"
      role="img"
      aria-label={`จำได้แม่น ${mastered} กำลังเรียน ${learning} จาก ${total} คำ`}
    >
      <span className="bar-mastered" style={{ width: `${m}%` }} />
      <span className="bar-learning" style={{ width: `${l}%` }} />
    </div>
  );
}

export function Page({ title, back, children }: { title: string; back?: string; children: ReactNode }) {
  return (
    <main className="page">
      <div className="page-head">
        {back !== undefined && (
          <a className="back" href={`#/${back}`} aria-label="ย้อนกลับ">
            ←
          </a>
        )}
        <h1>{title}</h1>
      </div>
      {children}
    </main>
  );
}
