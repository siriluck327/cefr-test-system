import { useEffect, useRef, useState } from 'react';
import { gradeBest, type Grade, type Verdict } from '../lib/grade';
import { ipaSyllables, type Token } from '../lib/pron';
import { canRecognize, listen } from '../lib/recognizer';
import { canSpeak, speak, stopSpeaking } from '../lib/speech';
import { store, useStore } from '../lib/store';
import type { Level } from '../lib/words';

export const VERDICT_LABEL: Record<Verdict, string> = {
  ok: 'ถูกต้อง',
  close: 'เกือบถูก',
  wrong: 'ผิด',
  missed: 'ไม่ได้อ่าน',
};
export const VERDICT_MARK: Record<Verdict, string> = { ok: '✓', close: '~', wrong: '✗', missed: '–' };

/** IPA and Thai syllables side by side; the stressed syllable is dark. */
export function Syllables({ tokens }: { tokens: Token[] }) {
  const withPron = tokens.filter((t) => t.pron);
  if (withPron.length === 0) return null;
  return (
    <div className="syllables" aria-label="พยางค์และการเน้นเสียง">
      {withPron.map((t, ti) => {
        const ipa = ipaSyllables(t.pron!.ipa);
        return (
          <span key={ti} className="syl-group">
            {t.pron!.thai.map((th, i) => (
              <span key={i} className={i === t.pron!.stress && t.pron!.thai.length > 1 ? 'syl stressed' : 'syl'}>
                <span className="ipa">{ipa[i]}</span>
                <span>{th}</span>
              </span>
            ))}
          </span>
        );
      })}
    </div>
  );
}

/** Thai reading with the stressed syllable in bold: แอป-<b>เพิล</b>. */
export function ThaiReading({ tokens }: { tokens: Token[] }) {
  return (
    <span className="thai-reading">
      {tokens.map((t, ti) => (
        <span key={ti}>
          {ti > 0 && ' '}
          {t.pron
            ? t.pron.thai.map((s, i) => (
                <span key={i}>
                  {i > 0 && '-'}
                  {i === t.pron!.stress && t.pron!.thai.length > 1 ? <b>{s}</b> : s}
                </span>
              ))
            : t.text}
        </span>
      ))}
    </span>
  );
}

export function ipaOf(tokens: Token[]): string {
  const parts = tokens.filter((t) => t.pron).map((t) => t.pron!.ipa);
  return parts.length ? `/${parts.join(' ')}/` : '';
}

/** Letter tiles; spell() reads them one by one and lights up the current letter. */
export function useSpeller(word: string) {
  const letters = word.replace(/[^a-z]/gi, '').toUpperCase().split('');
  const [active, setActive] = useState(-1);
  const timers = useRef<number[]>([]);
  const clear = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  useEffect(() => {
    setActive(-1);
    return clear;
  }, [word]);
  const spell = () => {
    clear();
    letters.forEach((ch, i) => {
      timers.current.push(
        window.setTimeout(() => {
          setActive(i);
          speak(ch, 0.9);
        }, i * 700),
      );
    });
    timers.current.push(
      window.setTimeout(() => {
        setActive(-1);
        speak(word, 0.8);
      }, letters.length * 700 + 250),
    );
  };
  return { letters, active, spell };
}

export function SpellTiles({ letters, active }: { letters: string[]; active: number }) {
  return (
    <div className="spell" aria-label={`สะกดว่า ${letters.join(' ')}`}>
      {letters.map((ch, i) => (
        <span key={i} className={i === active ? 'tile on' : 'tile'} aria-hidden="true">
          {ch}
        </span>
      ))}
    </div>
  );
}

export function Icon({ name }: { name: 'speaker' | 'slow' | 'spell' | 'mic' | 'steps' }) {
  const paths: Record<string, string[]> = {
    speaker: ['M11 5L6 9H3v6h3l5 4z', 'M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13'],
    slow: ['M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z', 'M12 7v5l3 2'],
    spell: ['M4 7V5h16v2M9 19h6M12 5v14'],
    mic: ['M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z', 'M5 11a7 7 0 0 0 14 0M12 18v3'],
    steps: ['M4 12h10M10 6l6 6-6 6M20 5v14'],
  };
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

export function ToolButton({ icon, label, onClick }: { icon: Parameters<typeof Icon>[0]['name']; label: string; onClick: () => void }) {
  if (!canSpeak) return null;
  return (
    <button type="button" className="tool" onClick={onClick}>
      <Icon name={icon} />
      {label}
    </button>
  );
}

export function AccentToggle() {
  const { settings } = useStore();
  return (
    <div className="seg" role="group" aria-label="สำเนียงเสียงอ่าน">
      {(['en-US', 'en-GB'] as const).map((a) => (
        <button key={a} type="button" aria-pressed={settings.accent === a} className={settings.accent === a ? 'on' : ''} onClick={() => store.setSettings({ accent: a })}>
          {a === 'en-US' ? 'US' : 'UK'}
        </button>
      ))}
    </div>
  );
}

function feedback(score: number): string {
  if (score >= 90) return 'ยอดเยี่ยม! อ่านถูกเกือบทั้งหมด';
  if (score >= 70) return 'ดีมาก ลองแก้คำที่ยังไม่ถูกอีกนิด';
  if (score >= 40) return 'ใกล้แล้ว ฟังตัวอย่างแล้วลองใหม่';
  return 'ลองฟังตัวอย่างช้า ๆ แล้วอ่านอีกครั้ง';
}

/**
 * Mic button + result. Uses speech recognition where the browser has it and
 * grades each word; otherwise the learner rates their own reading.
 * Remount (key={text}) to reset for a new word or sentence.
 */
export function ReadAloud({ text, level, onGraded }: { text: string; level: Level; onGraded?: (g: Grade | null) => void }) {
  const { settings } = useStore();
  const [phase, setPhase] = useState<'idle' | 'listening' | 'done'>('idle');
  const [grade, setGrade] = useState<Grade | null>(null);
  const [selfScore, setSelfScore] = useState<number | null>(null);
  const [error, setError] = useState('');
  const stopRef = useRef<() => void>(() => {});

  useEffect(() => () => stopRef.current(), []);

  const start = () => {
    stopSpeaking();
    setError('');
    setGrade(null);
    onGraded?.(null);
    setPhase('listening');
    stopRef.current = listen(settings.accent, {
      onResult: (alts) => {
        const g = gradeBest(text, alts);
        setGrade(g);
        onGraded?.(g);
        store.addAttempt({ level, score: g.score, words: g.words.map((w) => ({ key: w.key, ok: w.verdict === 'ok' })) });
      },
      onError: (reason) =>
        setError(
          reason === 'denied'
            ? 'ไม่ได้รับอนุญาตให้ใช้ไมโครโฟน กรุณาอนุญาตในการตั้งค่าเบราว์เซอร์ หรือประเมินตัวเองด้านล่าง'
            : reason === 'nothing'
              ? 'ไม่ได้ยินเสียง ลองกดแล้วอ่านใหม่อีกครั้ง'
              : 'ฟังเสียงไม่สำเร็จ ลองใหม่อีกครั้ง',
        ),
      onEnd: () => setPhase('done'),
    });
  };

  const rateSelf = (score: number) => {
    setSelfScore(score);
    store.addAttempt({ level, score, words: [] });
  };

  const showSelfRate = !canRecognize || error.startsWith('ไม่ได้รับอนุญาต');
  const mistakes = grade?.words.filter((w) => w.verdict !== 'ok') ?? [];

  return (
    <div className="read-aloud">
      {canRecognize && (
        <button type="button" className={phase === 'listening' ? 'mic listening' : 'mic'} onClick={phase === 'listening' ? () => stopRef.current() : start}>
          <Icon name="mic" />
          {phase === 'listening' ? 'กำลังฟัง… อ่านออกเสียงได้เลย (แตะเพื่อหยุด)' : grade ? 'อ่านอีกครั้ง' : 'กดแล้วอ่านออกเสียง'}
        </button>
      )}
      {error && (
        <p className="small bad" role="status">
          {error}
        </p>
      )}

      {grade && (
        <div className="result" role="status">
          <div className={`score ${grade.score >= 90 ? 'hi' : grade.score >= 60 ? 'mid' : 'lo'}`}>{grade.score}</div>
          <div className="result-body">
            <strong>{feedback(grade.score)}</strong>
            <span className="small muted">ระบบได้ยิน: “{grade.heard || '—'}”</span>
            {mistakes.length > 0 ? (
              <ul className="mistakes">
                {mistakes.map((w, i) => (
                  <li key={i}>
                    <span className={`v v-${w.verdict}`}>{VERDICT_MARK[w.verdict]}</span>
                    <b>{w.text.replace(/[.,!?;:]+$/, '')}</b>
                    <span className="muted small">
                      {VERDICT_LABEL[w.verdict]}
                      {w.heard && ` · ได้ยินเป็น “${w.heard}”`}
                    </span>
                    {canSpeak && (
                      <button type="button" className="icon-btn" aria-label={`ฟังเสียง ${w.key}`} onClick={() => speak(w.key, 0.75)}>
                        <Icon name="speaker" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <span className="small good">อ่านถูกทุกคำ</span>
            )}
          </div>
        </div>
      )}

      {showSelfRate && (
        <div className="self-rate">
          <p className="small muted">
            {canRecognize
              ? 'ประเมินการอ่านของตัวเอง:'
              : 'เบราว์เซอร์นี้ยังตรวจการออกเสียงอัตโนมัติไม่ได้ (ใช้ Chrome, Edge หรือ Safari เพื่อตรวจทีละคำ) อ่านออกเสียงแล้วประเมินตัวเอง:'}
          </p>
          <div className="grade-row">
            <button type="button" className="btn grade easy" onClick={() => rateSelf(95)} disabled={selfScore !== null}>
              ถูกต้อง
            </button>
            <button type="button" className="btn grade good" onClick={() => rateSelf(70)} disabled={selfScore !== null}>
              เกือบถูก
            </button>
            <button type="button" className="btn grade again" onClick={() => rateSelf(40)} disabled={selfScore !== null}>
              ยังไม่ถูก
            </button>
          </div>
          {selfScore !== null && <p className="small muted">บันทึกแล้ว</p>}
        </div>
      )}
    </div>
  );
}

export function verdictClass(grade: Grade | null, index: number): string {
  const v = grade?.words[index]?.verdict;
  return v ? ` v-${v}` : '';
}
