import { useEffect } from 'react';
import { Home } from './components/Home';
import { Quiz } from './components/Quiz';
import { SentenceHub, SentencePractice } from './components/Sentences';
import { Speak } from './components/Speak';
import { Stats } from './components/Stats';
import { Study } from './components/Study';
import { WordList } from './components/WordList';
import { setAccent } from './lib/speech';
import { useStore } from './lib/store';
import { LEVELS, type Level } from './lib/words';
import { useRoute } from './router';

const isLevel = (s: string | undefined): s is Level => LEVELS.includes(s as Level);

function View() {
  const [page, arg, arg2, arg3] = useRoute();
  if (page === 'study' && (isLevel(arg) || arg === 'review')) return <Study key={arg} level={arg} />;
  if (page === 'quiz' && (isLevel(arg) || arg === 'ALL')) return <Quiz key={arg} level={arg} />;
  if (page === 'words' && (isLevel(arg) || arg === 'ALL')) return <WordList key={arg} level={arg} />;
  if (page === 'speak') return <Speak key={arg} scope={isLevel(arg) || arg === 'weak' ? arg : 'A1'} n={Number(arg2) || 1} />;
  if (page === 'sentences' && isLevel(arg) && arg2) return <SentencePractice level={arg} tenseId={arg2} n={Number(arg3) || 1} />;
  if (page === 'sentences') return <SentenceHub level={isLevel(arg) ? arg : 'A1'} />;
  if (page === 'stats') return <Stats />;
  return <Home />;
}

const NAV = [
  { page: '', href: '#/', label: 'หน้าแรก', icon: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z' },
  { page: 'speak', href: '#/speak/A1/1', label: 'ฝึกอ่านคำ', icon: 'M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3' },
  { page: 'sentences', href: '#/sentences/A1', label: 'ประโยค', icon: 'M4 6h16M4 12h16M4 18h10' },
  { page: 'words', href: '#/words/ALL', label: 'ค้นหาคำ', icon: 'M11 4a7 7 0 1 0 0 14a7 7 0 1 0 0-14zM20 20l-4-4' },
  { page: 'stats', href: '#/stats', label: 'สถิติ', icon: 'M5 20V11M12 20V4M19 20v-8' },
];

export function App() {
  const [page = ''] = useRoute();
  const { settings } = useStore();
  useEffect(() => setAccent(settings.accent), [settings.accent]);
  const current = ['study', 'quiz'].includes(page) ? '' : page;

  return (
    <>
      <nav className="topbar">
        <a href="#/" className="brand">
          <span className="brand-mark" aria-hidden="true">
            Aa
          </span>
          ศัพท์ 5000
        </a>
        <div className="nav-links">
          {NAV.map((n) => (
            <a key={n.page} href={n.href} className={current === n.page ? 'on' : ''}>
              {n.label}
            </a>
          ))}
        </div>
      </nav>
      <View />
      <footer className="footer muted small">
        คำระดับ A1–B2 อ้างอิง The Oxford 3000™ by CEFR level · ระดับ C1 คัดเลือกเพิ่มเติม · คำอ่าน IPA จาก CMU Pronouncing Dictionary ·
        ความก้าวหน้าบันทึกไว้ในเครื่องของคุณ
      </footer>
      <nav className="tabbar" aria-label="เมนูหลัก">
        {NAV.map((n) => (
          <a key={n.page} href={n.href} className={current === n.page ? 'on' : ''} aria-current={current === n.page ? 'page' : undefined}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={n.icon} />
            </svg>
            {n.label}
          </a>
        ))}
      </nav>
    </>
  );
}
