import { useRef, useState } from 'react';
import { isDue, status } from '../lib/srs';
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
