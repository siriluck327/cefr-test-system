import { useMemo, useState } from 'react';
import { status, type Status } from '../lib/srs';
import { useStore } from '../lib/store';
import { LEVELS, WORDS, WORDS_BY_LEVEL, type Level } from '../lib/words';
import { LevelBadge, Page, SpeakButton } from './common';

const PAGE = 100;
const STATUS_LABEL: Record<Status, string> = { new: 'ยังไม่เรียน', learning: 'กำลังเรียน', mastered: 'จำได้แม่น' };

export function WordList({ level }: { level: Level | 'ALL' }) {
  const data = useStore();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Status | 'all'>('all');
  const [page, setPage] = useState(0);

  const list = useMemo(() => {
    const scope = level === 'ALL' ? WORDS : WORDS_BY_LEVEL[level];
    const needle = q.trim().toLowerCase();
    return scope.filter(
      (w) =>
        (filter === 'all' || status(data.cards[w.id]) === filter) &&
        (!needle || w.word.toLowerCase().includes(needle) || w.thai.includes(needle)),
    );
  }, [level, q, filter, data.cards]);

  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  const current = Math.min(page, pages - 1);
  const shown = list.slice(current * PAGE, current * PAGE + PAGE);

  return (
    <Page title={level === 'ALL' ? 'ค้นหาคำศัพท์ทั้งหมด' : `รายการคำ ${level}`} back="">
      <div className="tabs" role="tablist">
        {(['ALL', ...LEVELS] as const).map((l) => (
          <a key={l} role="tab" aria-selected={l === level} className={l === level ? 'tab on' : 'tab'} href={`#/words/${l}`}>
            {l === 'ALL' ? 'ทั้งหมด' : l}
          </a>
        ))}
      </div>
      <div className="toolbar">
        <input
          type="search"
          placeholder="ค้นหาคำอังกฤษหรือความหมายไทย"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(0);
          }}
          aria-label="ค้นหาคำ"
        />
        <select
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value as Status | 'all');
            setPage(0);
          }}
          aria-label="กรองตามสถานะ"
        >
          <option value="all">ทุกสถานะ</option>
          {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>
      <p className="muted small">พบ {list.length.toLocaleString()} คำ</p>

      <ul className="word-list">
        {shown.map((w) => {
          const s = status(data.cards[w.id]);
          return (
            <li key={w.id}>
              <span className="wl-word">
                <span className={`dot ${s}`} title={STATUS_LABEL[s]} aria-label={STATUS_LABEL[s]} />
                {w.word} <SpeakButton text={w.word} />
              </span>
              <span className="wl-pos">
                {level === 'ALL' && <LevelBadge level={w.level} />} {w.pos}
              </span>
              <span className="wl-thai">{w.thai}</span>
            </li>
          );
        })}
      </ul>

      {pages > 1 && (
        <div className="pager">
          <button className="btn ghost" disabled={current === 0} onClick={() => setPage(current - 1)}>
            ← ก่อนหน้า
          </button>
          <span>
            หน้า {current + 1} / {pages}
          </span>
          <button className="btn ghost" disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>
            ถัดไป →
          </button>
        </div>
      )}
    </Page>
  );
}
