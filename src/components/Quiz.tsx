import { useEffect, useState } from 'react';
import { makeQuiz, type Question, type QuizMode } from '../lib/quiz';
import { review, status } from '../lib/srs';
import { speak } from '../lib/speech';
import { store, useStore } from '../lib/store';
import { LEVEL_INFO, LEVELS, WORDS, WORDS_BY_LEVEL, type Level, type Word } from '../lib/words';
import { LevelBadge, Page, SpeakButton } from './common';

type Source = 'all' | 'studied' | 'weak';

const SOURCE_LABEL: Record<Source, string> = {
  all: 'ทุกคำในระดับ',
  studied: 'เฉพาะคำที่เรียนแล้ว',
  weak: 'คำที่ยังจำไม่แม่น',
};

export function Quiz({ level }: { level: Level | 'ALL' }) {
  const data = useStore();
  const scope = level === 'ALL' ? WORDS : WORDS_BY_LEVEL[level];
  const [mode, setMode] = useState<QuizMode>('en-th');
  const [length, setLength] = useState(data.settings.quizLength);
  const [source, setSource] = useState<Source>('all');
  const [questions, setQuestions] = useState<Question[] | null>(null);

  const title = level === 'ALL' ? 'แบบทดสอบรวมทุกระดับ' : `แบบทดสอบ ${level} · ${LEVEL_INFO[level].name}`;

  const pickWords = (s: Source): Word[] => {
    if (s === 'all') return scope;
    return scope.filter((w) => {
      const st = status(data.cards[w.id]);
      return s === 'studied' ? st !== 'new' : st === 'learning';
    });
  };
  const available = pickWords(source).length;

  if (questions) {
    return (
      <Page title={title} back="">
        <QuizRun
          questions={questions}
          mode={mode}
          onFinish={(score) => store.addQuiz({ at: Date.now(), level, mode, score, total: questions.length })}
          onRestart={() => setQuestions(null)}
        />
      </Page>
    );
  }

  return (
    <Page title={title} back="">
      <div className="panel">
        <fieldset className="choice-group">
          <legend>รูปแบบคำถาม</legend>
          <label className={mode === 'en-th' ? 'chip on' : 'chip'}>
            <input type="radio" name="mode" checked={mode === 'en-th'} onChange={() => setMode('en-th')} />
            อังกฤษ → ไทย
          </label>
          <label className={mode === 'th-en' ? 'chip on' : 'chip'}>
            <input type="radio" name="mode" checked={mode === 'th-en'} onChange={() => setMode('th-en')} />
            ไทย → อังกฤษ
          </label>
        </fieldset>

        <fieldset className="choice-group">
          <legend>จำนวนข้อ</legend>
          {[10, 20, 30, 50].map((n) => (
            <label key={n} className={length === n ? 'chip on' : 'chip'}>
              <input type="radio" name="len" checked={length === n} onChange={() => setLength(n)} />
              {n} ข้อ
            </label>
          ))}
        </fieldset>

        <fieldset className="choice-group">
          <legend>เลือกคำจาก</legend>
          {(Object.keys(SOURCE_LABEL) as Source[]).map((s) => (
            <label key={s} className={source === s ? 'chip on' : 'chip'}>
              <input type="radio" name="src" checked={source === s} onChange={() => setSource(s)} />
              {SOURCE_LABEL[s]} ({pickWords(s).length})
            </label>
          ))}
        </fieldset>

        {available < 4 ? (
          <p className="muted">ต้องมีอย่างน้อย 4 คำในกลุ่มนี้ ลองเรียนแฟลชการ์ดก่อน หรือเลือก “ทุกคำในระดับ”</p>
        ) : (
          <button
            className="btn primary wide"
            onClick={() => {
              store.setSettings({ quizLength: length });
              // Distractors come from the whole level so they stay plausible.
              setQuestions(makeQuiz(pickWords(source), scope, Math.min(length, available), mode));
            }}
          >
            เริ่มทำแบบทดสอบ ({Math.min(length, available)} ข้อ)
          </button>
        )}
      </div>

      {level !== 'ALL' && (
        <p className="muted small center">
          หรือ <a href="#/quiz/ALL">ทำแบบทดสอบรวมทุกระดับ</a> · ระดับอื่น:{' '}
          {LEVELS.filter((l) => l !== level).map((l) => (
            <a key={l} href={`#/quiz/${l}`} className="inline-link">
              {l}
            </a>
          ))}
        </p>
      )}
    </Page>
  );
}

function QuizRun({
  questions,
  mode,
  onFinish,
  onRestart,
}: {
  questions: Question[];
  mode: QuizMode;
  onFinish: (score: number) => void;
  onRestart: () => void;
}) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const q = questions[i];
  const done = i >= questions.length;
  const autoSpeak = store.get().settings.autoSpeak;

  useEffect(() => {
    if (q && mode === 'en-th' && autoSpeak) speak(q.word.word);
  }, [q, mode, autoSpeak]);

  const choose = (idx: number) => {
    if (picked !== null || !q) return;
    setPicked(idx);
    const ok = idx === q.answer;
    setAnswers((a) => [...a, ok]);
    store.setCard(q.word.id, review(store.get().cards[q.word.id], ok ? 'good' : 'again'));
    if (mode === 'th-en') speak(q.word.word);
  };

  const next = () => {
    const n = i + 1;
    setPicked(null);
    setI(n);
    if (n >= questions.length) onFinish(answers.filter(Boolean).length);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done) return;
      if (picked === null && ['1', '2', '3', '4'].includes(e.key)) choose(Number(e.key) - 1);
      // A focused button already handles Enter/Space itself.
      else if (picked !== null && (e.key === 'Enter' || e.key === ' ') && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (done) {
    const score = answers.filter(Boolean).length;
    const wrong = questions.filter((_, k) => !answers[k]);
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="panel">
        <div className="center">
          <h2>คะแนน {score} / {questions.length}</h2>
          <p className={pct >= 80 ? 'good big' : pct >= 50 ? 'big' : 'bad big'}>{pct}%</p>
          <p className="muted">
            {pct >= 80 ? 'เยี่ยมมาก!' : pct >= 50 ? 'ดีแล้ว ฝึกต่ออีกนิด' : 'ไม่เป็นไร ลองทบทวนด้วยแฟลชการ์ดแล้วกลับมาใหม่'}
          </p>
        </div>
        {wrong.length > 0 && (
          <>
            <h3>คำที่ตอบผิด</h3>
            <ul className="word-list">
              {wrong.map((w) => (
                <li key={w.word.id}>
                  <span className="wl-word">
                    {w.word.word} <SpeakButton text={w.word.word} />
                  </span>
                  <span className="wl-pos">{w.word.pos}</span>
                  <span className="wl-thai">{w.word.thai}</span>
                </li>
              ))}
            </ul>
            <p className="muted small">คำที่ตอบผิดจะถูกนำกลับมาทบทวนในแฟลชการ์ด</p>
          </>
        )}
        <div className="actions center">
          <button className="btn primary" onClick={onRestart}>
            ทำอีกครั้ง
          </button>
          <a className="btn ghost" href="#/">
            หน้าแรก
          </a>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="study-meta">
        <span>
          ข้อ {i + 1} / {questions.length}
        </span>
        <span>ถูก {answers.filter(Boolean).length}</span>
      </div>
      <div className="bar thin">
        <span className="bar-mastered" style={{ width: `${(i / questions.length) * 100}%` }} />
      </div>
      <div className="quiz-prompt">
        <span className="fc-top">
          <LevelBadge level={q.word.level} />
          <span className="pos">{q.word.pos}</span>
        </span>
        <span className={mode === 'en-th' ? 'fc-word' : 'fc-thai'}>{q.prompt}</span>
        {mode === 'en-th' && <SpeakButton text={q.word.word} big />}
        <span className="muted small">{mode === 'en-th' ? 'คำนี้แปลว่าอะไร?' : 'คำภาษาอังกฤษคือข้อใด?'}</span>
      </div>
      <div className="choices">
        {q.choices.map((c, idx) => {
          let cls = 'choice';
          if (picked !== null) {
            if (idx === q.answer) cls += ' correct';
            else if (idx === picked) cls += ' wrong';
            else cls += ' dim';
          }
          return (
            <button key={idx} className={cls} onClick={() => choose(idx)} disabled={picked !== null}>
              <kbd>{idx + 1}</kbd> {c}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <div className="feedback">
          <p className={picked === q.answer ? 'good' : 'bad'}>
            {picked === q.answer ? 'ถูกต้อง!' : `ผิด — คำตอบคือ “${q.choices[q.answer]}”`}
          </p>
          <button className="btn primary wide" onClick={next} autoFocus>
            {i + 1 < questions.length ? 'ข้อต่อไป' : 'ดูผลคะแนน'} <kbd>Enter</kbd>
          </button>
        </div>
      )}
    </>
  );
}
