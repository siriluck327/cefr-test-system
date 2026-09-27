import { isDue, status } from '../lib/srs';
import { streak, useStore } from '../lib/store';
import { LEVEL_INFO, LEVELS, WORDS, WORDS_BY_LEVEL } from '../lib/words';
import { LevelBadge, ProgressBar } from './common';

export function Home() {
  const data = useStore();
  const now = Date.now();
  const count = (list = WORDS) => {
    let mastered = 0;
    let learning = 0;
    let due = 0;
    for (const w of list) {
      const c = data.cards[w.id];
      const s = status(c);
      if (s === 'mastered') mastered++;
      else if (s === 'learning') learning++;
      if (isDue(c, now)) due++;
    }
    return { mastered, learning, due, total: list.length };
  };
  const all = count();
  const days = streak(data.days, now);

  return (
    <main className="page">
      <section className="hero">
        <h1>เรียนศัพท์อังกฤษ 5,000 คำ</h1>
        <p className="muted">แบ่งตามระดับ CEFR (A1–C1) ฝึกด้วยแฟลชการ์ดแบบทบทวนเป็นระยะ และแบบทดสอบความหมายภาษาไทย</p>
        <div className="stats-row">
          <div className="stat">
            <strong>{all.mastered.toLocaleString()}</strong>
            <span>จำได้แม่น</span>
          </div>
          <div className="stat">
            <strong>{all.learning.toLocaleString()}</strong>
            <span>กำลังเรียน</span>
          </div>
          <div className="stat">
            <strong>{days}</strong>
            <span>วันติดต่อกัน</span>
          </div>
        </div>
        <ProgressBar total={all.total} mastered={all.mastered} learning={all.learning} />
        {all.due > 0 ? (
          <a className="btn primary wide" href="#/study/review">
            ทบทวนคำที่ถึงกำหนดวันนี้ ({all.due} คำ)
          </a>
        ) : (
          <p className="muted small">ยังไม่มีคำที่ต้องทบทวนตอนนี้ เลือกระดับด้านล่างเพื่อเรียนคำใหม่</p>
        )}
      </section>

      <h2 className="section-title">เลือกระดับ</h2>
      <div className="levels">
        {LEVELS.map((lv) => {
          const c = count(WORDS_BY_LEVEL[lv]);
          return (
            <article key={lv} className="level-card">
              <header>
                <LevelBadge level={lv} />
                <div>
                  <h3>{LEVEL_INFO[lv].name}</h3>
                  <p className="muted small">{LEVEL_INFO[lv].desc}</p>
                </div>
              </header>
              <ProgressBar total={c.total} mastered={c.mastered} learning={c.learning} />
              <p className="small muted">
                จำได้แม่น {c.mastered} · กำลังเรียน {c.learning} · ทั้งหมด {c.total} คำ
                {c.due > 0 && <span className="due"> · ถึงกำหนด {c.due}</span>}
              </p>
              <div className="actions">
                <a className="btn primary" href={`#/study/${lv}`}>
                  แฟลชการ์ด
                </a>
                <a className="btn" href={`#/quiz/${lv}`}>
                  แบบทดสอบ
                </a>
                <a className="btn ghost" href={`#/words/${lv}`}>
                  รายการคำ
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
