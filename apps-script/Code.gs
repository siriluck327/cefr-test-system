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
 * Media library page (public/media):
 *   GET  ?action=media                                -> public list of media
 *   GET  ?action=hit&new=1                            -> count one visit (new=1: first visit from this browser)
 *   GET  ?action=view&item=..                         -> count one open of a media item
 *   GET  ?action=stats                                -> read the counts
 *   POST {action:'admin-login', pin}                  -> check the admin password
 *   POST {action:'admin-import', pin, items:[...]}    -> first-time copy of the built-in media into the sheet
 *   POST {action:'admin-save', pin, item, image?}     -> add or edit one item; image is a data: URL saved to Drive
 *   POST {action:'admin-delete', pin, id}             -> delete one item
 */

// Change this before deploying: teachers type it to open the report page.
const REPORT_PIN = 'CHANGE-ME';

// Change this before deploying: the password for adding media on the media library page.
const ADMIN_PIN = 'CHANGE-ME';

const SHEET_NAME = 'Attempts';
const TZ = 'Asia/Bangkok';
const HEADERS = ['timestamp', 'at', 'date', 'userId', 'name', 'center', 'kind', 'level', 'tense', 'text', 'score', 'wordsOk', 'wordsTotal', 'missed'];
const COL = HEADERS.reduce(function (m, h, i) { m[h] = i; return m; }, {});

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (String(body.action || '').indexOf('admin-') === 0) return admin_(body);
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
  if (p.action === 'media') return json_({ ok: true, initialized: !!mediaSheet_(false), items: mediaList_() });
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

const MEDIA_SHEET = 'Media';
const MEDIA_HEADERS = ['id', 'createdAt', 'updatedAt', 'category', 'title', 'summary', 'detail', 'tags', 'audience', 'year', 'link', 'linkLabel', 'image', 'imageFile'];
const MEDIA_LIMITS = { title: 200, summary: 400, detail: 5000, tags: 300, audience: 200, link: 1000, image: 1000 };
const MEDIA_CACHE = 'media-list';

function admin_(body) {
  if (ADMIN_PIN === 'CHANGE-ME') return json_({ ok: false, error: 'pin-not-set' });
  // Slow down password guessing: after 10 wrong tries, refuse everyone for 10 minutes.
  const cache = CacheService.getScriptCache();
  const fails = Number(cache.get('admin-fails') || 0);
  if (fails >= 10) return json_({ ok: false, error: 'locked' });
  if (String(body.pin || '') !== ADMIN_PIN) {
    cache.put('admin-fails', String(fails + 1), 600);
    return json_({ ok: false, error: 'bad-pin' });
  }
  if (body.action === 'admin-login') return json_({ ok: true, initialized: !!mediaSheet_(false) });

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (body.action === 'admin-import') {
      if (!mediaSheet_(false)) {
        const sheet = mediaSheet_(true);
        (body.items || []).slice(0, 100).forEach(function (it) {
          writeMedia_(sheet, sheet.getLastRow() + 1, mediaRow_(it, {}));
        });
      }
    } else if (body.action === 'admin-save') {
      const sheet = mediaSheet_(true);
      const it = body.item || {};
      const row = it.id ? findMedia_(sheet, it.id) : 0;
      const old = row ? mediaObj_(sheet.getRange(row, 1, 1, MEDIA_HEADERS.length).getValues()[0]) : {};
      const next = mediaRow_(it, old);
      if (body.image) {
        next[MEDIA_HEADERS.indexOf('imageFile')] = saveImage_(body.image, next[MEDIA_HEADERS.indexOf('title')]);
        next[MEDIA_HEADERS.indexOf('image')] = '';
      }
      const oldFile = old.imageFile;
      const newFile = next[MEDIA_HEADERS.indexOf('imageFile')];
      writeMedia_(sheet, row || sheet.getLastRow() + 1, next);
      if (oldFile && oldFile !== newFile) trashFile_(oldFile);
    } else if (body.action === 'admin-delete') {
      const sheet = mediaSheet_(true);
      const row = findMedia_(sheet, body.id);
      if (row) {
        const old = mediaObj_(sheet.getRange(row, 1, 1, MEDIA_HEADERS.length).getValues()[0]);
        sheet.deleteRow(row);
        if (old.imageFile) trashFile_(old.imageFile);
      }
    } else {
      return json_({ ok: false, error: 'unknown action' });
    }
    CacheService.getScriptCache().remove(MEDIA_CACHE);
  } finally {
    lock.releaseLock();
  }
  return json_({ ok: true, initialized: true, items: mediaList_() });
}

function mediaSheet_(create) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(MEDIA_SHEET);
  if (!sheet && create) {
    sheet = ss.insertSheet(MEDIA_SHEET);
    sheet.appendRow(MEDIA_HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function mediaList_() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get(MEDIA_CACHE);
  if (hit) return JSON.parse(hit);
  const sheet = mediaSheet_(false);
  let items = [];
  if (sheet && sheet.getLastRow() > 1) {
    items = sheet.getRange(2, 1, sheet.getLastRow() - 1, MEDIA_HEADERS.length).getValues().map(mediaObj_).filter(function (m) { return m.id; });
  }
  const text = JSON.stringify(items);
  if (text.length < 90000) cache.put(MEDIA_CACHE, text, 300);
  return items;
}

function mediaObj_(r) {
  const m = {};
  MEDIA_HEADERS.forEach(function (h, i) {
    // Undo the apostrophe that keeps text such as "=..." from turning into a formula.
    m[h] = String(r[i] === null || r[i] === undefined ? '' : r[i]).replace(/^'(?=[=+\-@])/, '');
  });
  return m;
}

// Build a sheet row from what the admin sent, keeping id, createdAt and image from the old row.
function mediaRow_(it, old) {
  const now = new Date().toISOString();
  const m = {
    id: old.id || String(it.id || '').replace(/[^\w-]/g, '').slice(0, 40) || 'm' + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36),
    createdAt: old.createdAt || String(it.createdAt || now),
    updatedAt: now,
    imageFile: it.removeImage ? '' : old.imageFile || '',
  };
  ['category', 'title', 'summary', 'detail', 'audience', 'year', 'link', 'linkLabel', 'image'].forEach(function (k) {
    m[k] = String(it[k] === undefined || it[k] === null ? '' : it[k]).slice(0, MEDIA_LIMITS[k] || 100);
  });
  m.tags = (Array.isArray(it.tags) ? it.tags.join(', ') : String(it.tags || '')).slice(0, MEDIA_LIMITS.tags);
  return MEDIA_HEADERS.map(function (h) { return m[h]; });
}

function writeMedia_(sheet, row, values) {
  const range = sheet.getRange(row, 1, 1, MEDIA_HEADERS.length);
  range.setNumberFormat('@');
  range.setValues([values.map(function (v) { return /^[=+\-@]/.test(v) ? "'" + v : v; })]);
}

function findMedia_(sheet, id) {
  if (!id || sheet.getLastRow() < 2) return 0;
  const ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return 0;
}

// Save a data: URL image in a Drive folder that anyone with the link can view; returns the file id.
function saveImage_(dataUrl, title) {
  const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/.exec(String(dataUrl));
  if (!m) throw new Error('bad image');
  const bytes = Utilities.base64Decode(m[2]);
  if (bytes.length > 5 * 1024 * 1024) throw new Error('image too large');
  const ext = m[1].split('/')[1].replace('jpeg', 'jpg');
  const file = mediaFolder_().createFile(Utilities.newBlob(bytes, m[1], String(title || 'media').slice(0, 60) + '.' + ext));
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getId();
}

function mediaFolder_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('mediaFolder');
  if (id) {
    try {
      const f = DriveApp.getFolderById(id);
      if (!f.isTrashed()) return f;
    } catch (err) {
      // Folder deleted: make a new one below.
    }
  }
  const folder = DriveApp.createFolder('คลังสื่อ - รูปภาพ');
  props.setProperty('mediaFolder', folder.getId());
  return folder;
}

function trashFile_(id) {
  try {
    DriveApp.getFileById(id).setTrashed(true);
  } catch (err) {
    // Already gone.
  }
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
