import { useEffect, useState } from 'react';
import { isDue, review, type Grade } from '../lib/srs';
import { speak } from '../lib/speech';
import { store } from '../lib/store';
import { LEVEL_INFO, WORDS, WORDS_BY_LEVEL, type Level, type Word } from '../lib/words';
import { LevelBadge, Page, SpeakButton } from './common';

/** Due cards first (oldest first), then up to `newCount` never-studied words in list order. */
export function buildQueue(scope: Word[], newCount: number, now = Date.now()): Word[] {
  const { cards } = store.get();
  const due = scope.filter((w) => isDue(cards[w.id], now)).sort((a, b) => cards[a.id].due - cards[b.id].due);
  const fresh = newCount > 0 ? scope.filter((w) => !cards[w.id] || cards[w.id].box === 0).slice(0, newCount) : [];
  return [...due, ...fresh];
}

export function Study({ level }: { level: Level | 'review' }) {
  const scope = level === 'review' ? WORDS : WORDS_BY_LEVEL[level];
  const settings = store.get().settings;
  const [queue, setQueue] = useState<Word[]>(() => buildQueue(scope, level === 'review' ? 0 : settings.newPerSession));
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [tally, setTally] = useState({ again: 0, good: 0, easy: 0 });
  const [firstSeen] = useState(() => new Set<string>());

  const card = queue[pos];
  const title = level === 'review' ? 'ทบทวนคำที่ถึงกำหนด' : `แฟลชการ์ด ${level} · ${LEVEL_INFO[level].name}`;

  useEffect(() => {
    if (card && settings.autoSpeak) speak(card.word);
  }, [card, settings.autoSpeak]);

  const grade = (g: Grade) => {
    if (!card) return;
    const prev = store.get().cards[card.id];
    store.setCard(card.id, review(prev, g));
    // Only the first answer for a word in this session counts in the summary.
    if (!firstSeen.has(card.id)) {
      firstSeen.add(card.id);
      setTally((t) => ({ ...t, [g]: t[g] + 1 }));
    }
    if (g === 'again') {
      // Show the forgotten card again a few cards later in this session.
      const next = queue.slice();
      next.splice(Math.min(pos + 4, next.length), 0, card);
      setQueue(next);
    }
    setFlipped(false);
    setPos((p) => p + 1);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!card || e.target instanceof HTMLInputElement) return;
      if (e.key === ' ' || e.key === 'Enter') {
        // A focused button already handles Enter/Space itself.
        if (e.target instanceof HTMLButtonElement) return;
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (e.key.toLowerCase() === 's') speak(card.word);
      else if (flipped && e.key === '1') grade('again');
      else if (flipped && e.key === '2') grade('good');
      else if (flipped && e.key === '3') grade('easy');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (queue.length === 0) {
    return (
      <Page title={title} back="">
        <div className="panel center">
          <p>ไม่มีคำที่ต้องทบทวนตอนนี้ 🎉</p>
          {level === 'review' ? (
            <a className="btn primary" href="#/">
              กลับหน้าแรก
            </a>
          ) : (
            <p className="muted">คุณเรียนครบทุกคำในระดับนี้แล้ว ลองทำแบบทดสอบเพื่อทบทวนได้</p>
          )}
        </div>
      </Page>
    );
  }

  if (!card) {
    const total = tally.again + tally.good + tally.easy;
    return (
      <Page title={title} back="">
        <div className="panel center">
          <h2>จบรอบนี้แล้ว!</h2>
          <p>ทบทวนไป {total} คำ</p>
          <div className="stats-row">
            <div className="stat">
              <strong className="bad">{tally.again}</strong>
              <span>ยังไม่จำ</span>
            </div>
            <div className="stat">
              <strong>{tally.good}</strong>
              <span>จำได้</span>
            </div>
            <div className="stat">
              <strong className="good">{tally.easy}</strong>
              <span>ง่ายมาก</span>
            </div>
          </div>
          <div className="actions center">
            {level !== 'review' && (
              <button
                className="btn primary"
                onClick={() => {
                  setQueue(buildQueue(scope, settings.newPerSession));
                  setPos(0);
                  setTally({ again: 0, good: 0, easy: 0 });
                  firstSeen.clear();
                }}
              >
                เรียนต่ออีกรอบ
              </button>
            )}
            {level !== 'review' && (
              <a className="btn" href={`#/quiz/${level}`}>
                ทำแบบทดสอบ
              </a>
            )}
            <a className="btn ghost" href="#/">
              หน้าแรก
            </a>
          </div>
        </div>
      </Page>
    );
  }

  const isNew = !store.get().cards[card.id] || store.get().cards[card.id].box === 0;

  return (
    <Page title={title} back="">
      <div className="study-meta">
        <span>
          {pos + 1} / {queue.length}
        </span>
        {isNew && <span className="tag">คำใหม่</span>}
      </div>
      <div className="bar thin">
        <span className="bar-mastered" style={{ width: `${(pos / queue.length) * 100}%` }} />
      </div>

      <button
        type="button"
        className={flipped ? 'flashcard flipped' : 'flashcard'}
        onClick={() => setFlipped((f) => !f)}
        aria-label={flipped ? 'ซ่อนความหมาย' : 'แตะเพื่อดูความหมาย'}
      >
        <span className="fc-top">
          <LevelBadge level={card.level} />
          <span className="pos">{card.pos}</span>
        </span>
        <span className="fc-word">{card.word}</span>
        {flipped ? <span className="fc-thai">{card.thai}</span> : <span className="fc-hint">แตะเพื่อดูความหมาย</span>}
      </button>
      <div className="center">
        <SpeakButton text={card.word} big />
      </div>

      {flipped ? (
        <div className="grade-row">
          <button className="btn grade again" onClick={() => grade('again')}>
            ยังไม่จำ <kbd>1</kbd>
          </button>
          <button className="btn grade good" onClick={() => grade('good')}>
            จำได้ <kbd>2</kbd>
          </button>
          <button className="btn grade easy" onClick={() => grade('easy')}>
            ง่ายมาก <kbd>3</kbd>
          </button>
        </div>
      ) : (
        <div className="grade-row">
          <button className="btn primary wide" onClick={() => setFlipped(true)}>
            ดูความหมาย <kbd>Space</kbd>
          </button>
        </div>
      )}
    </Page>
  );
}
