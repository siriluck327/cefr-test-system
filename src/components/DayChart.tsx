const DAY_TH = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

export interface ChartDay {
  /** Local midnight of the day. */
  day: number;
  n: number;
  avg: number | null;
  wordsOk?: number;
  wordsTotal?: number;
}

/** Daily practice counts as bars, with an optional goal line and a table view. */
export function DayChart({ title, days, goal }: { title: string; days: ChartDay[]; goal?: number }) {
  const max = Math.max(goal ?? 0, ...days.map((d) => d.n), 1);
  const cols = days.length;
  const showLabel = (i: number) => cols <= 14 || i % Math.ceil(cols / 10) === 0 || i === cols - 1;
  return (
    <div className="panel">
      <div className="chart-head">
        <h3>{title}</h3>
        <span className="small muted">รวม {days.reduce((a, d) => a + d.n, 0)} ครั้ง</span>
      </div>
      <div className="chart" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }} role="img" aria-label={`${title} ดูตัวเลขได้ในตารางด้านล่าง`}>
        {goal !== undefined && (
          <div className="goal-line" style={{ bottom: `${(goal / max) * 100}%` }}>
            <span>เป้า {goal}</span>
          </div>
        )}
        {days.map((d, i) => {
          const isToday = i === cols - 1;
          const date = new Date(d.day);
          return (
            <div key={d.day} className="col" tabIndex={0} aria-label={`${date.toLocaleDateString('th-TH')} ${d.n} ครั้ง`}>
              <div className="tip">
                {date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                <br />
                {d.n} ครั้ง{d.avg !== null && ` · เฉลี่ย ${d.avg}`}
              </div>
              <div className="bar-v" style={{ height: `${d.n ? Math.max(2, (d.n / max) * 100) : 0}%` }} />
              {showLabel(i) && (
                <span className={isToday ? 'day today' : 'day'}>
                  {isToday ? 'วันนี้' : cols <= 14 ? DAY_TH[date.getDay()] : date.getDate()}
                </span>
              )}
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
              {days.some((d) => d.wordsTotal !== undefined) && <th className="num">คำที่อ่านถูก</th>}
            </tr>
          </thead>
          <tbody>
            {days
              .slice()
              .reverse()
              .map((d) => (
                <tr key={d.day}>
                  <td>{new Date(d.day).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                  <td className="num">{d.n}</td>
                  <td className="num">{d.avg ?? '–'}</td>
                  {d.wordsTotal !== undefined && <td className="num">{d.wordsTotal ? `${d.wordsOk}/${d.wordsTotal}` : '–'}</td>}
                </tr>
              ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
