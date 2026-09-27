import { Home } from './components/Home';
import { Quiz } from './components/Quiz';
import { Stats } from './components/Stats';
import { Study } from './components/Study';
import { WordList } from './components/WordList';
import { LEVELS, type Level } from './lib/words';
import { useRoute } from './router';

const isLevel = (s: string | undefined): s is Level => LEVELS.includes(s as Level);

function View() {
  const [page, arg] = useRoute();
  if (page === 'study' && (isLevel(arg) || arg === 'review')) return <Study key={arg} level={arg} />;
  if (page === 'quiz' && (isLevel(arg) || arg === 'ALL')) return <Quiz key={arg} level={arg} />;
  if (page === 'words' && (isLevel(arg) || arg === 'ALL')) return <WordList key={arg} level={arg} />;
  if (page === 'stats') return <Stats />;
  return <Home />;
}

export function App() {
  const [page] = useRoute();
  return (
    <>
      <nav className="topbar">
        <a href="#/" className="brand">
          <span aria-hidden="true">📚</span> ศัพท์ 5000
        </a>
        <div className="nav-links">
          <a href="#/" className={!page ? 'on' : ''}>
            หน้าแรก
          </a>
          <a href="#/words/ALL" className={page === 'words' ? 'on' : ''}>
            ค้นหาคำ
          </a>
          <a href="#/stats" className={page === 'stats' ? 'on' : ''}>
            สถิติ
          </a>
        </div>
      </nav>
      <View />
      <footer className="footer muted small">
        คำระดับ A1–B2 อ้างอิง The Oxford 3000™ by CEFR level · ระดับ C1 คัดเลือกเพิ่มเติม · ความก้าวหน้าบันทึกไว้ในเครื่องของคุณ
      </footer>
    </>
  );
}
