/**
 * Google Apps Script backend: stores every learner's practice in a Google Sheet
 * and serves the report page. Setup steps are in README.md
 * ("เก็บสถิติผู้เรียนลง Google Sheets").
 *
 * Deploy as a Web App (Execute as: Me, Who has access: Anyone) and put the
 * /exec URL in src/config.ts.
 *
 *   POST {action:'log', events:[...]}                 -> append rows
 *   GET  ?action=rows&pin=..&since=YYYY-MM-DD         -> compact rows for the report
 *   GET  ?action=person&pin=..&name=..&center=..      -> one learner's recent attempts
 *   GET  ?action=ping&pin=..                          -> check the PIN
 *
 * Public visit counter for the portfolio page (public/portfolio), no PIN:
 *   GET  ?action=hit&new=1                            -> count one visit (new=1: first visit from this browser)
 *   GET  ?action=view&item=..                         -> count one open of a work item
 *   GET  ?action=stats                                -> read the counts
 */

// Change this before deploying: teachers type it to open the report page.
const REPORT_PIN = 'CHANGE-ME';

const SHEET_NAME = 'Attempts';
const TZ = 'Asia/Bangkok';
const HEADERS = ['timestamp', 'at', 'date', 'userId', 'name', 'center', 'kind', 'level', 'tense', 'text', 'score', 'wordsOk', 'wordsTotal', 'missed'];
const COL = HEADERS.reduce(function (m, h, i) { m[h] = i; return m; }, {});

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.action !== 'log' || !Array.isArray(body.events)) return json_({ ok: false, error: 'bad request' });
    const events = body.events.slice(0, 500);
    const rows = events.map(function (ev) {
      return HEADERS.map(function (h) {
        if (h === 'timestamp') return new Date();
        const v = ev[h];
        if (v === undefined || v === null) return '';
        // Keep text as text: a leading = or + must not become a formula.
        return typeof v === 'string' ? clip_(v) : v;
      });
    });
    if (rows.length === 0) return json_({ ok: true, added: 0 });
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      const sheet = sheet_();
      const start = sheet.getLastRow() + 1;
      const range = sheet.getRange(start, 1, rows.length, HEADERS.length);
      range.setNumberFormat('@');
      sheet.getRange(start, 1, rows.length, 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
      range.setValues(rows);
    } finally {
      lock.releaseLock();
    }
    return json_({ ok: true, added: rows.length });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function doGet(e) {
  const p = e.parameter || {};
  if (p.action === 'hit' || p.action === 'view' || p.action === 'stats') return counter_(p);
  if (String(p.pin || '') !== REPORT_PIN || REPORT_PIN === 'CHANGE-ME') {
    return json_({ ok: false, error: REPORT_PIN === 'CHANGE-ME' ? 'pin-not-set' : 'bad-pin' });
  }
  const values = data_();
  if (p.action === 'ping') return json_({ ok: true });

  if (p.action === 'rows') {
    const since = String(p.since || '');
    const rows = [];
    values.forEach(function (r) {
      const date = day_(r[COL.date]);
      if (since && date < since) return;
      rows.push([date, r[COL.name], r[COL.center], r[COL.kind], r[COL.level], r[COL.score], r[COL.wordsOk], r[COL.wordsTotal]]);
    });
    return json_({ ok: true, rows: rows });
  }

  if (p.action === 'person') {
    const name = String(p.name || '');
    const center = String(p.center || '');
    const rows = [];
    for (let i = values.length - 1; i >= 0 && rows.length < 300; i--) {
      const r = values[i];
      if (String(r[COL.name]) !== name || String(r[COL.center]) !== center) continue;
      rows.push([String(r[COL.at]), day_(r[COL.date]), r[COL.kind], r[COL.level], r[COL.tense], r[COL.text], r[COL.score], r[COL.wordsOk], r[COL.wordsTotal], r[COL.missed]]);
    }
    return json_({ ok: true, rows: rows });
  }

  return json_({ ok: false, error: 'unknown action' });
}

const COUNTER_KEY = 'portfolio';
const COUNTER_DAYS = 30;
const COUNTER_MAX_ITEMS = 200;

// Counts live in Script Properties (no sheet needed): {total, unique, days:{date:n}, items:{id:n}}.
function counter_(p) {
  const props = PropertiesService.getScriptProperties();
  const today = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  let s;
  const write = p.action !== 'stats';
  const lock = LockService.getScriptLock();
  if (write) lock.waitLock(10000);
  try {
    s = JSON.parse(props.getProperty(COUNTER_KEY) || '{}');
    s.total = s.total || 0;
    s.unique = s.unique || 0;
    s.days = s.days || {};
    s.items = s.items || {};
    if (p.action === 'hit') {
      s.total++;
      if (p['new'] === '1') s.unique++;
      s.days[today] = (s.days[today] || 0) + 1;
      Object.keys(s.days).sort().slice(0, -COUNTER_DAYS).forEach(function (d) { delete s.days[d]; });
    }
    if (p.action === 'view') {
      const id = String(p.item || '').slice(0, 40).replace(/[^\w-]/g, '');
      if (id && (id in s.items || Object.keys(s.items).length < COUNTER_MAX_ITEMS)) s.items[id] = (s.items[id] || 0) + 1;
    }
    if (write) props.setProperty(COUNTER_KEY, JSON.stringify(s));
  } finally {
    if (write) lock.releaseLock();
  }
  return json_({ ok: true, today: today, total: s.total, unique: s.unique, days: s.days, items: s.items });
}

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function data_() {
  const sheet = sheet_();
  const last = sheet.getLastRow();
  if (last < 2) return [];
  return sheet.getRange(2, 1, last - 1, HEADERS.length).getValues();
}

function day_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, TZ, 'yyyy-MM-dd');
  return String(v).slice(0, 10);
}

function clip_(s) {
  s = s.slice(0, 500);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
