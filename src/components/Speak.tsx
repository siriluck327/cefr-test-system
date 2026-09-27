import { useMemo, useState } from 'react';
import type { Grade } from '../lib/grade';
import { lookup, readingTokens, tokenize } from '../lib/pron';
import { go } from '../router';
import { speak } from '../lib/speech';
import { useStore } from '../lib/store';
import { LEVEL_INFO, LEVELS, WORDS, WORDS_BY_LEVEL, type Level, type Word } from '../lib/words';
import { AccentToggle, ipaOf, ReadAloud, SpellTiles, Syllables, ThaiReading, ToolButton, useSpeller, verdictClass } from './Practice';
import { LevelBadge, Page } from './common';

export type SpeakScope = Level | 'weak';

const WORD_BY_TEXT = new Map(WORDS.map((w) => [w.word.toLowerCase(), w]));

/** Misread words, as vocabulary entries where possible (sentence words may not be in the list). */
function weakWords(weak: Record<string, number>): Word[] {
  return Object.keys(weak)
    .filter((k) => lookup(k))
    .sort()
    .map((k) => WORD_BY_TEXT.get(k) ?? { id: `weak:${k}`, word: k, pos: '', thai: '', level: 'A1' as Level });
}

export function Speak({ scope, n }: { scope: SpeakScope; n: number }) {
  const data = useStore();
  // Freeze the weak list for this visit so words don't vanish while being practised.
  const [weakList] = useState(() => weakWords(data.weak));
  const list = scope === 'weak' ? weakList : WORDS_BY_LEVEL[scope];
  const index = Math.min(Math.max(1, n || 1), Math.max(1, list.length)) - 1;
  const word = list[index];
  const to = (i: number) => go(`speak/${scope}/${((i + list.length) % list.length) + 1}`);

  return (
    <Page title="ฝึกอ่านคำ" back="" aside={<AccentToggle />}>
      <div className="practice-head">
        <div className="tabs" role="tablist">
          {LEVELS.map((l) => (
            <a key={l} role="tab" aria-selected={l === scope} className={l === scope ? 'tab on' : 'tab'} href={`#/speak/${l}/1`}>
              {l}
            </a>
          ))}
          <a role="tab" aria-selected={scope === 'weak'} className={scope === 'weak' ? 'tab on' : 'tab'} href="#/speak/weak/1">
            คำที่ต้องฝึก ({Object.keys(data.weak).length})
          </a>
        </div>
      </div>

      {!word ? (
        <div className="panel center">
          <p>ยังไม่มีคำที่อ่านผิด เก่งมาก!</p>
          <p className="muted small">คำที่ระบบตรวจว่าอ่านผิดจะมาอยู่ที่นี่ และจะหายไปเมื่ออ่านถูก 2 ครั้ง</p>
          <a className="btn primary" href="#/speak/A1/1">
            เริ่มฝึกระดับ A1
          </a>
        </div>
      ) : (
        <WordCard key={word.id} word={word} scope={scope} position={index + 1} total={list.length} onPrev={() => to(index - 1)} onNext={() => to(index + 1)} onJump={to} />
      )}
    </Page>
  );
}

function WordCard({
  word,
  scope,
  position,
  total,
  onPrev,
  onNext,
  onJump,
}: {
  word: Word;
  scope: SpeakScope;
  position: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onJump: (i: number) => void;
}) {
  const tokens = useMemo(() => tokenize(word.word), [word.word]);
  const parts = useMemo(() => readingTokens(word.word), [word.word]);
  const { letters, active, spell } = useSpeller(word.word);
  const [grade, setGrade] = useState<Grade | null>(null);
  const level = scope === 'weak' ? word.level : scope;

  return (
    <>
      <p className="study-meta">
        <span>
          {scope === 'weak' ? 'คำที่ต้องฝึก' : `${scope} · ${LEVEL_INFO[scope].name}`} · คำที่ {position} / {total}
        </span>
        {word.pos && <span className="pos">{word.pos}</span>}
      </p>

      <article className="practice-card">
        <div className="pc-word">
          {parts.length > 1
            ? parts.map((p, i) => (
                <span key={i} className={`pc-part${verdictClass(grade, i)}`}>
                  {p.text}
                </span>
              ))
            : <span className={verdictClass(grade, 0).trim()}>{word.word}</span>}
          {scope !== 'weak' && <LevelBadge level={word.level} />}
        </div>
        <p className="ipa big-ipa">{ipaOf(tokens)}</p>
        {word.thai && <p className="pc-meaning">{word.thai}</p>}

        <div className="box">
          <span className="label">คำอ่านภาษาไทย (โดยประมาณ)</span>
          <span className="pc-thai">
            <ThaiReading tokens={tokens} />
          </span>
        </div>

        <div>
          <span className="label">พยางค์และการเน้นเสียง</span>
          <Syllables tokens={tokens} />
          <p className="small muted">พยางค์สีเข้มคือพยางค์ที่ต้องลงเสียงหนัก (ตรงกับเครื่องหมาย ˈ ใน IPA)</p>
        </div>

        <div>
          <span className="label">การสะกด ({letters.length} ตัวอักษร)</span>
          <SpellTiles letters={letters} active={active} />
        </div>
      </article>

      <div className="tools">
        <ToolButton icon="speaker" label="ฟังเสียง" onClick={() => speak(word.word, 0.9)} />
        <ToolButton icon="slow" label="ฟังช้า" onClick={() => speak(word.word, 0.5)} />
        <ToolButton icon="spell" label="สะกดทีละตัว" onClick={spell} />
      </div>

      <ReadAloud text={word.word} level={level} onGraded={setGrade} />

      <div className="pager">
        <button type="button" className="btn" onClick={onPrev}>
          ← ก่อนหน้า
        </button>
        <button type="button" className="btn ghost" onClick={() => onJump(Math.floor(Math.random() * total))}>
          สุ่มคำ
        </button>
        <button type="button" className="btn primary" onClick={onNext}>
          ถัดไป →
        </button>
      </div>
    </>
  );
}
