import { isDue, status } from '../lib/srs';
import { average, dayOf, speechStreak } from '../lib/speechStats';
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
  const today = dayOf(data.speech, now);
  const goal = data.settings.dailyGoal;
  const weak = Object.keys(data.weak).length;

  return (
    <main className="page">
      <section className="speak-hero">
        <div className="sh-top">
          <div>
            <span className="sh-label">วันนี้ฝึกออกเสียงไปแล้ว</span>
            <div className="sh-count">
              <strong>{today.n}</strong> / {goal} ครั้ง
            </div>
          </div>
          <span className="streak-chip">{speechStreak(data.speech, now)} วันติด</span>
        </div>
        <div className="sh-bar" role="img" aria-label={`${today.n} จากเป้าหมาย ${goal} ครั้ง`}>
          <span style={{ width: `${Math.min(100, (today.n / goal) * 100)}%` }} />
        </div>
        <p className="sh-label">
          {today.n >= goal ? 'ถึงเป้าหมายวันนี้แล้ว เก่งมาก!' : `อีก ${goal - today.n} ครั้งถึงเป้าหมาย`}
          {average(today) !== null && ` · คะแนนเฉลี่ย ${average(today)}`}
        </p>
        <div className="mode-grid">
          <a className="mode" href="#/speak/A1/1">
            <b>ฝึกอ่านคำ</b>
            <span>5,000 คำ · IPA · คำอ่านไทย · สะกดทีละตัว</span>
          </a>
          <a className="mode" href="#/sentences/A1">
            <b>ฝึกอ่านประโยค</b>
            <span>แบ่งตาม tense · บอกถูก/ผิดทีละคำ</span>
          </a>
        </div>
        {weak > 0 && (
          <a className="sh-weak" href="#/speak/weak/1">
            มีคำที่อ่านผิด {weak} คำ — ฝึกซ้ำ →
          </a>
        )}
      </section>

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
                <a className="btn" href={`#/speak/${lv}/1`}>
                  ฝึกอ่านคำ
                </a>
                <a className="btn" href={`#/sentences/${lv}`}>
                  ฝึกอ่านประโยค
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
