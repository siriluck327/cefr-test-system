import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { SHEET_API_URL } from '../config';
import { CENTERS, shortCenter } from '../lib/centers';
import { useProfiles } from '../lib/profile';
import { byCenter, daySeries, daysBefore, fromRaw, personFromSave, summarize, type Person, type RawRow } from '../lib/report';
import { loadFor } from '../lib/store';
import { fetchReport, localDate } from '../lib/sync';
import { LEVELS } from '../lib/words';
import { go } from '../router';
import { DayChart } from './DayChart';
import { LevelBadge, Page } from './common';

const PIN_KEY = 'vocab5000:report-pin';
const RANGES = [
  { days: 7, label: '7 วัน' },
  { days: 30, label: '30 วัน' },
  { days: 90, label: '90 วัน' },
  { days: 0, label: 'ทั้งหมด' },
];

type SortKey = 'name' | 'center' | 'today' | 'attempts' | 'avg' | 'accuracy' | 'activeDays' | 'lastDate';
const COLUMNS: { key: SortKey; label: string; num?: boolean }[] = [
  { key: 'name', label: 'ชื่อ' },
  { key: 'center', label: 'ศกร.' },
  { key: 'today', label: 'วันนี้', num: true },
  { key: 'attempts', label: 'ฝึกออกเสียง (ครั้ง)', num: true },
  { key: 'avg', label: 'คะแนนเฉลี่ย', num: true },
  { key: 'accuracy', label: 'คำที่อ่านถูก', num: true },
  { key: 'activeDays', label: 'วันที่ฝึก', num: true },
  { key: 'lastDate', label: 'ล่าสุด' },
];

function readPin(): string {
  try {
    return sessionStorage.getItem(PIN_KEY) ?? '';
  } catch {
    return '';
  }
}

const thDate = (d: string) => {
  if (!d) return '–';
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
};

export function Report({ personKey }: { personKey?: string }) {
  const online = !!SHEET_API_URL;
  const [pin, setPin] = useState(readPin);
  const [range, setRange] = useState(30);
  const [state, setState] = useState<{ status: 'idle' | 'loading' | 'ok' | 'error'; error?: string; people: Person[] }>({ status: 'idle', people: [] });
  const { profiles } = useProfiles();
  const today = localDate();

  useEffect(() => {
    if (!online) {
      setState({
        status: 'ok',
        people: profiles.map((p) => {
          const save = loadFor(p.id);
          return personFromSave(p, save.speech, save.quizzes.length, today);
        }),
      });
      return;
    }
    if (!pin) return;
    let cancelled = false;
    setState((s) => ({ ...s, status: 'loading' }));
    fetchReport<{ ok: boolean; error?: string; rows?: RawRow[] }>({ action: 'rows', pin, since: range ? daysBefore(today, range - 1) : '' })
      .then((res) => {
        if (cancelled) return;
        if (!res.ok) {
          if (res.error === 'bad-pin') {
            try {
              sessionStorage.removeItem(PIN_KEY);
            } catch {
              // ignore
            }
            setPin('');
          }
          setState({ status: 'error', error: res.error, people: [] });
          return;
        }
        setState({ status: 'ok', people: summarize((res.rows ?? []).map(fromRaw), today) });
      })
      .catch(() => !cancelled && setState({ status: 'error', error: 'network', people: [] }));
    return () => {
      cancelled = true;
    };
  }, [online, pin, range, profiles, today]);

  if (online && !pin) return <PinForm error={state.error} onPin={setPin} />;

  const person = personKey ? state.people.find((p) => p.key === personKey) : undefined;
  if (personKey) {
    return (
      <Page title={person?.name ?? 'รายงานรายบุคคล'} back="report">
        {state.status === 'loading' && <p className="muted">กำลังโหลด…</p>}
        {state.status === 'ok' && !person && <p className="muted">ไม่พบข้อมูลของผู้เรียนคนนี้ในช่วงเวลาที่เลือก</p>}
        {person && <PersonDetail person={person} pin={pin} today={today} />}
      </Page>
    );
  }

  return (
    <Page title="รายงานสถิติผู้เรียน" back="">
      {!online && (
        <div className="panel notice">
          <p>
            <b>ยังไม่ได้เชื่อมต่อ Google Sheets</b> — ตอนนี้แสดงเฉพาะผู้ใช้ที่เข้าใช้บนเครื่องนี้
          </p>
          <p className="small muted">
            เพื่อรวมสถิติของผู้เรียนทุกคนจากทุกเครื่องไว้ที่เดียว ให้ตั้งค่า Google Apps Script ตามขั้นตอนในไฟล์ README ของโปรเจกต์ (หัวข้อ
            “เก็บสถิติผู้เรียนลง Google Sheets”)
          </p>
        </div>
      )}
      {online && (
        <div className="report-bar">
          <div className="seg" role="group" aria-label="ช่วงเวลา">
            {RANGES.map((r) => (
              <button key={r.days} type="button" className={range === r.days ? 'on' : ''} aria-pressed={range === r.days} onClick={() => setRange(r.days)}>
                {r.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              try {
                sessionStorage.removeItem(PIN_KEY);
              } catch {
                // ignore
              }
              setPin('');
            }}
          >
            ออกจากหน้ารายงาน
          </button>
        </div>
      )}
      {state.status === 'loading' && <p className="muted">กำลังโหลดข้อมูลจาก Google Sheets…</p>}
      {state.status === 'error' && (
        <p className="bad">
          {state.error === 'network' ? 'เชื่อมต่อ Google Sheets ไม่สำเร็จ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่' : `โหลดข้อมูลไม่สำเร็จ (${state.error})`}
        </p>
      )}
      {state.status === 'ok' && <Overview people={state.people} today={today} />}
    </Page>
  );
}

function PinForm({ error, onPin }: { error?: string; onPin: (pin: string) => void }) {
  const [value, setValue] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    try {
      sessionStorage.setItem(PIN_KEY, value.trim());
    } catch {
      // ignore
    }
    onPin(value.trim());
  };
  return (
    <Page title="รายงานสถิติผู้เรียน" back="">
      <form className="panel login-form narrow" onSubmit={submit}>
        <label>
          รหัสสำหรับครู
          <input type="password" autoComplete="current-password" value={value} onChange={(e) => setValue(e.target.value)} />
        </label>
        {error === 'bad-pin' && <p className="small bad">รหัสไม่ถูกต้อง</p>}
        {error === 'pin-not-set' && <p className="small bad">ยังไม่ได้ตั้งรหัสใน Apps Script (REPORT_PIN)</p>}
        <button type="submit" className="btn primary">
          ดูรายงาน
        </button>
      </form>
    </Page>
  );
}

function Overview({ people, today }: { people: Person[]; today: string }) {
  const [center, setCenter] = useState('');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'attempts', desc: true });
  const centers = useMemo(() => byCenter(people, CENTERS), [people]);

  const shown = useMemo(() => {
    const needle = q.trim();
    const list = people.filter((p) => (!center || p.center === center) && (!needle || p.name.includes(needle)));
    const val = (p: Person) => p[sort.key] ?? -1;
    return list.sort((a, b) => {
      const x = val(a);
      const y = val(b);
      const c = typeof x === 'string' ? String(x).localeCompare(String(y), 'th') : Number(x) - Number(y);
      return sort.desc ? -c : c;
    });
  }, [people, center, q, sort]);

  const total = people.reduce((a, p) => a + p.attempts, 0);
  const activeToday = people.filter((p) => p.today > 0).length;

  const exportCsv = () => {
    const head = ['ชื่อ', 'ศกร.', 'วันนี้', 'ฝึกออกเสียง', 'คำ', 'ประโยค', 'แบบทดสอบ', 'คะแนนเฉลี่ย', 'คำที่อ่านถูก(%)', 'วันที่ฝึก', 'เริ่ม', 'ล่าสุด'];
    const rows = shown.map((p) => [p.name, p.center, p.today, p.attempts, p.words, p.sentences, p.quizzes, p.avg ?? '', p.accuracy ?? '', p.activeDays, p.firstDate, p.lastDate]);
    const csv = [head, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `สถิติผู้เรียน-${today}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <div className="stats-row four">
        <div className="stat">
          <strong>{people.length}</strong>
          <span>ผู้เรียน</span>
        </div>
        <div className="stat">
          <strong>{activeToday}</strong>
          <span>ฝึกวันนี้</span>
        </div>
        <div className="stat">
          <strong>{total.toLocaleString()}</strong>
          <span>ครั้งที่ฝึกออกเสียง</span>
        </div>
        <div className="stat accent">
          <strong>{centers.filter((c) => c.learners > 0).length}</strong>
          <span>ศกร. ที่มีผู้ใช้</span>
        </div>
      </div>

      <h2 className="section-title">สรุปตาม ศกร.ระดับตำบล</h2>
      <div className="panel table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>ศกร.ระดับตำบล</th>
              <th className="num">ผู้เรียน</th>
              <th className="num">ฝึกวันนี้</th>
              <th className="num">ครั้งที่ฝึก</th>
              <th className="num">คะแนนเฉลี่ย</th>
            </tr>
          </thead>
          <tbody>
            {centers.map((c) => (
              <tr key={c.center} className={center === c.center ? 'row-on' : ''}>
                <td>
                  <button type="button" className="link-btn" onClick={() => setCenter(center === c.center ? '' : c.center)}>
                    {shortCenter(c.center)}
                  </button>
                </td>
                <td className="num">{c.learners}</td>
                <td className="num">{c.activeToday}</td>
                <td className="num">{c.attempts.toLocaleString()}</td>
                <td className="num">{c.avg ?? '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="section-title">รายบุคคล</h2>
      <div className="toolbar wrap">
        <input type="search" placeholder="ค้นหาชื่อ" value={q} onChange={(e) => setQ(e.target.value)} aria-label="ค้นหาชื่อ" />
        <select value={center} onChange={(e) => setCenter(e.target.value)} aria-label="กรองตาม ศกร.">
          <option value="">ทุก ศกร.</option>
          {CENTERS.map((c) => (
            <option key={c} value={c}>
              {shortCenter(c)}
            </option>
          ))}
        </select>
        <button type="button" className="btn" onClick={exportCsv} disabled={shown.length === 0}>
          ดาวน์โหลด CSV
        </button>
      </div>
      <p className="muted small">{shown.length} คน · แตะหัวตารางเพื่อเรียง · แตะชื่อเพื่อดูสถิติรายบุคคล</p>
      <div className="panel table-wrap">
        {shown.length === 0 ? (
          <p className="muted">ยังไม่มีข้อมูล</p>
        ) : (
          <table className="table people">
            <thead>
              <tr>
                {COLUMNS.map((c) => (
                  <th key={c.key} className={c.num ? 'num' : ''} aria-sort={sort.key === c.key ? (sort.desc ? 'descending' : 'ascending') : undefined}>
                    <button
                      type="button"
                      className="sort-btn"
                      onClick={() => setSort((s) => ({ key: c.key, desc: s.key === c.key ? !s.desc : c.num === true }))}
                    >
                      {c.label}
                      {sort.key === c.key ? (sort.desc ? ' ↓' : ' ↑') : ''}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((p) => (
                <tr key={p.key}>
                  <td>
                    <a href={`#/report/p/${encodeURIComponent(p.key)}`}>{p.name}</a>
                  </td>
                  <td>{shortCenter(p.center)}</td>
                  <td className="num">{p.today}</td>
                  <td className="num">{p.attempts}</td>
                  <td className="num">{p.avg ?? '–'}</td>
                  <td className="num">{p.accuracy === null ? '–' : `${p.accuracy}%`}</td>
                  <td className="num">{p.activeDays}</td>
                  <td>{thDate(p.lastDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

type AttemptRow = [string, string, string, string, string, string, number | string, number | string, number | string, string];
const KIND_TH: Record<string, string> = { word: 'คำ', sentence: 'ประโยค', quiz: 'แบบทดสอบ', login: 'เข้าใช้งาน' };

function PersonDetail({ person, pin, today }: { person: Person; pin: string; today: string }) {
  const [recent, setRecent] = useState<AttemptRow[] | null>(null);

  useEffect(() => {
    if (!SHEET_API_URL) return;
    let cancelled = false;
    fetchReport<{ ok: boolean; rows?: AttemptRow[] }>({ action: 'person', pin, name: person.name, center: person.center })
      .then((res) => !cancelled && setRecent(res.ok ? (res.rows ?? []) : []))
      .catch(() => !cancelled && setRecent([]));
    return () => {
      cancelled = true;
    };
  }, [person.name, person.center, pin]);

  const missedCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of recent ?? []) for (const w of String(r[9] || '').split(',').filter(Boolean)) m.set(w, (m.get(w) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);
  }, [recent]);

  return (
    <>
      <p className="muted">{person.center}</p>
      <div className="stats-row four">
        <div className="stat">
          <strong>{person.today}</strong>
          <span>ฝึกวันนี้</span>
        </div>
        <div className="stat">
          <strong>{person.attempts}</strong>
          <span>ฝึกออกเสียงทั้งหมด</span>
        </div>
        <div className="stat">
          <strong>{person.avg ?? '–'}</strong>
          <span>คะแนนเฉลี่ย</span>
        </div>
        <div className="stat accent">
          <strong>{person.accuracy === null ? '–' : `${person.accuracy}%`}</strong>
          <span>คำที่อ่านถูก</span>
        </div>
      </div>
      <p className="small muted">
        ฝึกทั้งหมด {person.activeDays} วัน · เริ่ม {thDate(person.firstDate)} · ล่าสุด {thDate(person.lastDate)}
        {person.quizzes > 0 && ` · ทำแบบทดสอบ ${person.quizzes} ครั้ง`}
      </p>

      <DayChart title="จำนวนครั้งที่ฝึกออกเสียงรายวัน (30 วัน)" days={daySeries(person.byDay, today, 30)} />

      <div className="panel">
        <h3>คะแนนเฉลี่ยตามระดับ</h3>
        {LEVELS.map((l) => {
          const s = person.byLevel[l];
          const avg = s && s.n ? Math.round(s.sum / s.n) : null;
          return (
            <div key={l} className="hbar">
              <LevelBadge level={l} />
              <div className="hbar-track">
                <span style={{ width: `${avg ?? 0}%` }} />
              </div>
              <span className="small muted hbar-val">{avg === null ? 'ยังไม่ฝึก' : `${avg} (${s!.n} ครั้ง)`}</span>
            </div>
          );
        })}
      </div>

      {SHEET_API_URL && (
        <>
          {missedCounts.length > 0 && (
            <div className="panel">
              <h3>คำที่อ่านผิดบ่อย</h3>
              <p className="weak-list">
                {missedCounts.map(([w, n]) => (
                  <span key={w} className="chip-s">
                    {w} ×{n}
                  </span>
                ))}
              </p>
            </div>
          )}
          <div className="panel table-wrap">
            <h3>การฝึกล่าสุด</h3>
            {recent === null ? (
              <p className="muted">กำลังโหลด…</p>
            ) : recent.length === 0 ? (
              <p className="muted">ยังไม่มีข้อมูล</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>เวลา</th>
                    <th>ประเภท</th>
                    <th>ระดับ</th>
                    <th>ข้อความ</th>
                    <th className="num">คะแนน</th>
                    <th>คำที่อ่านผิด</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.slice(0, 100).map((r, i) => (
                    <tr key={i}>
                      <td>{new Date(r[0]).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}</td>
                      <td>{KIND_TH[r[2]] ?? r[2]}</td>
                      <td>{r[3]}</td>
                      <td lang="en">{r[5]}</td>
                      <td className="num">{r[6] === '' ? '–' : r[6]}</td>
                      <td className="small">{String(r[9] || '').replace(/,/g, ', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
      <button type="button" className="btn" onClick={() => go('report')}>
        ← กลับไปหน้ารวม
      </button>
    </>
  );
}
