import { useEffect, useMemo, useRef, useState } from 'react';
import type { Grade } from '../lib/grade';
import { readingTokens } from '../lib/pron';
import { go } from '../router';
import { SENTENCES, sentencesFor, tensesFor } from '../lib/sentences';
import { speak } from '../lib/speech';
import { TENSE_BY_ID, type Tense } from '../lib/tenses';
import { LEVEL_INFO, LEVELS, type Level } from '../lib/words';
import { AccentToggle, ReadAloud, ThaiReading, ToolButton, VERDICT_LABEL } from './Practice';
import { LevelBadge, Page } from './common';

function LevelTabs({ level }: { level: Level }) {
  return (
    <div className="tabs" role="tablist">
      {LEVELS.map((l) => (
        <a key={l} role="tab" aria-selected={l === level} className={l === level ? 'tab on' : 'tab'} href={`#/sentences/${l}`}>
          {l}
        </a>
      ))}
    </div>
  );
}

/** Tense list for one level. */
export function SentenceHub({ level }: { level: Level }) {
  const tenses = tensesFor(level);
  return (
    <Page title="ฝึกอ่านประโยคตาม Tense" back="">
      <LevelTabs level={level} />
      <p className="muted small">
        ระดับ {level} · {LEVEL_INFO[level].name} — {SENTENCES.filter((s) => s.level === level).length} ประโยค ใน {tenses.length} tense
        เลือก tense แล้วอ่านออกเสียงทีละประโยค ระบบจะบอกว่าอ่านคำไหนถูกหรือผิด
      </p>
      <div className="tense-grid">
        {tenses.map((t) => (
          <a key={t.id} className="tense-card" href={`#/sentences/${level}/${t.id}/1`}>
            <span className="tense-en">{t.en}</span>
            <span className="tense-th">{t.th}</span>
            <code className="form">{t.form}</code>
            <span className="small muted">{t.use}</span>
            <span className="small tense-count">{sentencesFor(level, t.id).length} ประโยค →</span>
          </a>
        ))}
      </div>
    </Page>
  );
}

function TenseInfo({ tense }: { tense: Tense }) {
  return (
    <details className="tense-info">
      <summary>
        <b>{tense.en}</b> · {tense.th}
      </summary>
      <dl>
        <dt>โครงสร้าง</dt>
        <dd>
          <code className="form">{tense.form}</code>
        </dd>
        <dt>ใช้เมื่อ</dt>
        <dd>{tense.use}</dd>
        <dt>คำบ่งชี้</dt>
        <dd>{tense.signals}</dd>
      </dl>
    </details>
  );
}

export function SentencePractice({ level, tenseId, n }: { level: Level; tenseId: string; n: number }) {
  const tense = TENSE_BY_ID.get(tenseId);
  const list = tense ? sentencesFor(level, tense.id) : [];
  if (!tense || list.length === 0) return <SentenceHub level={level} />;

  const index = Math.min(Math.max(1, n || 1), list.length) - 1;
  const sentence = list[index];
  const tenses = tensesFor(level);
  const nextTense = tenses[tenses.findIndex((t) => t.id === tense.id) + 1];
  const to = (i: number) => go(`sentences/${level}/${tense.id}/${((i + list.length) % list.length) + 1}`);

  return (
    <Page title={tense.en} back={`sentences/${level}`} aside={<AccentToggle />}>
      <div className="practice-head">
        <p className="study-meta">
          <span>
            <LevelBadge level={level} /> ประโยคที่ {index + 1} / {list.length}
          </span>
        </p>
      </div>
      <TenseInfo tense={tense} />
      <SentenceCard key={sentence.id} en={sentence.en} thai={sentence.thai} level={level} />
      <div className="pager">
        <button type="button" className="btn" onClick={() => to(index - 1)}>
          ← ก่อนหน้า
        </button>
        {index === list.length - 1 && nextTense ? (
          <a className="btn primary" href={`#/sentences/${level}/${nextTense.id}/1`}>
            ต่อ: {nextTense.en} →
          </a>
        ) : (
          <button type="button" className="btn primary" onClick={() => to(index + 1)}>
            ถัดไป →
          </button>
        )}
      </div>
    </Page>
  );
}

function SentenceCard({ en, thai, level }: { en: string; thai: string; level: Level }) {
  const tokens = useMemo(() => readingTokens(en), [en]);
  const [grade, setGrade] = useState<Grade | null>(null);
  const [saying, setSaying] = useState(-1);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const walk = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = tokens.map((t, i) =>
      window.setTimeout(() => {
        setSaying(i);
        speak(t.key, 0.8);
      }, i * 900),
    );
    timers.current.push(window.setTimeout(() => setSaying(-1), tokens.length * 900 + 300));
  };

  return (
    <>
      <article className="practice-card">
        <div className="sentence" lang="en">
          {tokens.map((t, i) => {
            const v = grade?.words[i];
            return (
              <button
                key={i}
                type="button"
                className={`w${t.stressed ? ' stressed' : ''}${i === saying ? ' saying' : ''}${v ? ` v-${v.verdict}` : ''}`}
                onClick={() => speak(t.key, 0.8)}
                aria-label={`${t.key}${v ? ` ${VERDICT_LABEL[v.verdict]}` : ''} แตะเพื่อฟัง`}
                title={v?.heard ? `ได้ยินเป็น “${v.heard}”` : undefined}
              >
                <span className="w-text">{t.text}</span>
                <span className="w-ipa ipa">{t.pron?.ipa ?? ''}</span>
              </button>
            );
          })}
        </div>
        <p className="small muted">แตะคำเพื่อฟังทีละคำ · คำที่ขีดเส้นใต้คือคำสำคัญที่ควรเน้นเสียง</p>
        {grade && (
          <p className="legend small">
            <span className="key v-ok">✓ ถูกต้อง</span>
            <span className="key v-close">~ เกือบถูก</span>
            <span className="key v-wrong">✗ ผิด</span>
            <span className="key v-missed">– ไม่ได้อ่าน</span>
          </p>
        )}
        <div className="box">
          <span className="label">คำอ่านภาษาไทย (โดยประมาณ)</span>
          <span className="pc-thai">
            <ThaiReading tokens={tokens} />
          </span>
        </div>
        <div>
          <span className="label">ความหมาย</span>
          <p className="pc-meaning">{thai}</p>
        </div>
      </article>

      <div className="tools">
        <ToolButton icon="speaker" label="ฟังทั้งประโยค" onClick={() => speak(en, 0.9)} />
        <ToolButton icon="slow" label="ฟังช้า" onClick={() => speak(en, 0.6)} />
        <ToolButton icon="steps" label="ทีละคำ" onClick={walk} />
      </div>

      <ReadAloud text={en} level={level} onGraded={setGrade} />
    </>
  );
}
