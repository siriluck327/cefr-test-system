import { useRef, useState } from 'react';
import { isDue, status } from '../lib/srs';
import { average, dayOf, lastDays, levelAverages, speechStreak } from '../lib/speechStats';
import { store, streak, useStore, type SaveData } from '../lib/store';
import { LEVELS, WORDS_BY_LEVEL } from '../lib/words';
import { LevelBadge, Page, ProgressBar } from './common';

export function Stats() {
  const data = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');
  const now = Date.now();

  const rows = LEVELS.map((lv) => {
    const words = WORDS_BY_LEVEL[lv];
    let mastered = 0;
    let learning = 0;
    let due = 0;
    for (const w of words) {
      const c = data.cards[w.id];
      const s = status(c);
      if (s === 'mastered') mastered++;
      else if (s === 'learning') learning++;
      if (isDue(c, now)) due++;
    }
    return { lv, total: words.length, mastered, learning, due };
  });

  const quizzes = data.quizzes.slice(-20).reverse();

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vocab5000-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importData = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as SaveData;
      if (!parsed || typeof parsed.cards !== 'object') throw new Error('bad file');
      store.replace(parsed);
      setMsg('นำเข้าข้อมูลเรียบร้อยแล้ว');
    } catch {
      setMsg('ไฟล์ไม่ถูกต้อง นำเข้าไม่สำเร็จ');
    }
  };

  return (
    <Page title="สถิติและการตั้งค่า" back="">
      <SpeechStats />

      <h2 className="section-title">คำศัพท์และแบบทดสอบ</h2>
      <div className="stats-row">
        <div className="stat">
          <strong>{streak(data.days, now)}</strong>
          <span>วันติดต่อกัน</span>
        </div>
        <div className="stat">
          <strong>{data.days.length}</strong>
          <span>วันที่เรียนทั้งหมด</span>
        </div>
        <div className="stat">
          <strong>{data.quizzes.length}</strong>
          <span>แบบทดสอบที่ทำ</span>
        </div>
      </div>

      <h2 className="section-title">ความก้าวหน้าแต่ละระดับ</h2>
      <div className="panel">
        {rows.map((r) => (
          <div key={r.lv} className="stat-level">
            <div className="stat-level-head">
              <LevelBadge level={r.lv} />
              <span>
                จำได้แม่น <b>{r.mastered}</b> · กำลังเรียน <b>{r.learning}</b> / {r.total}
              </span>
              <span className="muted small">{Math.round((r.mastered / r.total) * 100)}%</span>
            </div>
            <ProgressBar total={r.total} mastered={r.mastered} learning={r.learning} />
          </div>
        ))}
        <p className="legend small muted">
          <span className="dot mastered" /> จำได้แม่น (ทบทวนถูกต่อเนื่องจนเว้นระยะได้นาน) <span className="dot learning" /> กำลังเรียน
        </p>
      </div>

      <h2 className="section-title">ผลแบบทดสอบล่าสุด</h2>
      <div className="panel">
        {quizzes.length === 0 ? (
          <p className="muted">ยังไม่มีผลแบบทดสอบ</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>วันที่</th>
                <th>ระดับ</th>
                <th>รูปแบบ</th>
                <th className="num">คะแนน</th>
              </tr>
            </thead>
            <tbody>
              {quizzes.map((q) => (
                <tr key={q.at}>
                  <td>{new Date(q.at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td>{q.level === 'ALL' ? 'รวม' : q.level}</td>
                  <td>{q.mode === 'en-th' ? 'อังกฤษ→ไทย' : 'ไทย→อังกฤษ'}</td>
                  <td className="num">
                    {q.score}/{q.total}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h2 className="section-title">การตั้งค่า</h2>
      <div className="panel settings">
        <label>
          คำใหม่ต่อรอบแฟลชการ์ด
          <select
            value={data.settings.newPerSession}
            onChange={(e) => store.setSettings({ newPerSession: Number(e.target.value) })}
          >
            {[5, 10, 20, 30, 50].map((n) => (
              <option key={n} value={n}>
                {n} คำ
              </option>
            ))}
          </select>
        </label>
        <label>
          เป้าหมายการฝึกออกเสียงต่อวัน
          <select value={data.settings.dailyGoal} onChange={(e) => store.setSettings({ dailyGoal: Number(e.target.value) })}>
            {[10, 20, 30, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} ครั้ง
              </option>
            ))}
          </select>
        </label>
        <label>
          สำเนียงเสียงอ่านและการฟัง
          <select value={data.settings.accent} onChange={(e) => store.setSettings({ accent: e.target.value as 'en-US' | 'en-GB' })}>
            <option value="en-US">อเมริกัน (US)</option>
            <option value="en-GB">อังกฤษ (UK)</option>
          </select>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={data.settings.autoSpeak}
            onChange={(e) => store.setSettings({ autoSpeak: e.target.checked })}
          />
          อ่านออกเสียงคำศัพท์อัตโนมัติ
        </label>
      </div>

      <h2 className="section-title">ข้อมูลของฉัน</h2>
      <div className="panel">
        <p className="muted small">
          ความก้าวหน้าทั้งหมดเก็บไว้ในเบราว์เซอร์ของเครื่องนี้เท่านั้น ถ้าล้างข้อมูลเบราว์เซอร์หรือเปลี่ยนเครื่อง ให้สำรองไฟล์ไว้ก่อนแล้วนำเข้าอีกครั้ง
        </p>
        <div className="actions">
          <button className="btn" onClick={exportData}>
            สำรองข้อมูล (ดาวน์โหลด)
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            นำเข้าข้อมูล
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importData(f);
              e.target.value = '';
            }}
          />
          <button
            className="btn danger"
            onClick={() => {
              if (window.confirm('ล้างความก้าวหน้าทั้งหมด? การกระทำนี้ย้อนกลับไม่ได้')) {
                store.reset();
                setMsg('ล้างข้อมูลแล้ว');
              }
            }}
          >
            ล้างความก้าวหน้า
          </button>
        </div>
        {msg && <p className="small" role="status">{msg}</p>}
      </div>
    </Page>
  );
}

const DAY_TH = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

function SpeechStats() {
  const data = useStore();
  const now = Date.now();
  const today = dayOf(data.speech, now);
  const goal = data.settings.dailyGoal;
  const days = lastDays(data.speech, 14, now);
  const max = Math.max(goal, ...days.map((d) => d.data.n));
  const lv = levelAverages(data.speech);
  const weak = Object.keys(data.weak).sort();
  const todayAvg = average(today);
  const accuracy = today.wordsTotal ? Math.round((today.wordsOk / today.wordsTotal) * 100) : null;

  return (
    <>
      <h2 className="section-title">การฝึกออกเสียงวันนี้</h2>
      <div className="stats-row four">
        <div className="stat">
          <strong>{today.n}</strong>
          <span>ครั้ง (เป้า {goal})</span>
        </div>
        <div className="stat">
          <strong>{todayAvg ?? '–'}</strong>
          <span>คะแนนเฉลี่ย</span>
        </div>
        <div className="stat">
          <strong>{accuracy === null ? '–' : `${accuracy}%`}</strong>
          <span>คำที่อ่านถูก</span>
        </div>
        <div className="stat accent">
          <strong>{speechStreak(data.speech, now)}</strong>
          <span>วันติดต่อกัน</span>
        </div>
      </div>

      <div className="panel">
        <div className="chart-head">
          <h3>จำนวนครั้งที่ฝึกออกเสียง 14 วันล่าสุด</h3>
          <span className="small muted">รวม {days.reduce((a, d) => a + d.data.n, 0)} ครั้ง</span>
        </div>
        <div className="chart" role="img" aria-label="กราฟจำนวนครั้งที่ฝึกออกเสียงรายวัน ดูตัวเลขได้ในตารางด้านล่าง">
          <div className="goal-line" style={{ bottom: `${(goal / max) * 100}%` }}>
            <span>เป้า {goal}</span>
          </div>
          {days.map((d, i) => {
            const isToday = i === days.length - 1;
            const date = new Date(d.day);
            const avg = average(d.data);
            return (
              <div key={d.day} className="col" tabIndex={0} aria-label={`${date.toLocaleDateString('th-TH')} ${d.data.n} ครั้ง`}>
                <div className="tip">
                  {date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                  <br />
                  {d.data.n} ครั้ง{avg !== null && ` · เฉลี่ย ${avg}`}
                </div>
                <div className="bar-v" style={{ height: `${d.data.n ? Math.max(2, (d.data.n / max) * 100) : 0}%` }} />
                <span className={isToday ? 'day today' : 'day'}>{isToday ? 'วันนี้' : DAY_TH[date.getDay()]}</span>
              </div>
            );
          })}
        </div>
        <details className="small">
          <summary>ดูเป็นตาราง</summary>
          <table className="table">
            <thead>
              <tr>
                <th>วันที่</th>
                <th className="num">ครั้ง</th>
                <th className="num">คะแนนเฉลี่ย</th>
                <th className="num">คำที่อ่านถูก</th>
              </tr>
            </thead>
            <tbody>
              {days
                .slice()
                .reverse()
                .map((d) => (
                  <tr key={d.day}>
                    <td>{new Date(d.day).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                    <td className="num">{d.data.n}</td>
                    <td className="num">{average(d.data) ?? '–'}</td>
                    <td className="num">{d.data.wordsTotal ? `${d.data.wordsOk}/${d.data.wordsTotal}` : '–'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </details>
      </div>

      <div className="panel">
        <h3>คะแนนออกเสียงเฉลี่ยตามระดับ</h3>
        {LEVELS.map((l) => (
          <div key={l} className="hbar">
            <LevelBadge level={l} />
            <div className="hbar-track">
              <span style={{ width: `${lv[l].avg ?? 0}%` }} />
            </div>
            <span className="small muted hbar-val">{lv[l].avg === null ? 'ยังไม่ฝึก' : `${lv[l].avg} (${lv[l].n} ครั้ง)`}</span>
          </div>
        ))}
      </div>

      <div className="panel">
        <h3>คำที่ยังอ่านผิด ({weak.length})</h3>
        {weak.length === 0 ? (
          <p className="muted small">ยังไม่มี คำที่ระบบตรวจว่าอ่านผิดจะแสดงที่นี่ และหายไปเมื่ออ่านถูก 2 ครั้ง</p>
        ) : (
          <>
            <p className="weak-list">
              {weak.slice(0, 60).map((w) => (
                <span key={w} className="chip-s">
                  {w}
                </span>
              ))}
            </p>
            <a className="btn primary" href="#/speak/weak/1">
              ฝึกคำเหล่านี้
            </a>
          </>
        )}
      </div>
    </>
  );
}
