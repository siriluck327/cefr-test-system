(function () {
  'use strict';

  var SITE = window.SITE;
  var API = window.MEDIA_API_URL || '';
  var TZ = 'Asia/Bangkok';
  var NEW_DAYS = 30;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var ICONS = {
    monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    play: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m10 9 5 3-5 3Z"/>',
    doc: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
    puzzle: '<path d="M10 3h4v3a2 2 0 1 0 4 0h0v4h-3a2 2 0 1 0 0 4h3v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4h3a2 2 0 1 0 0-4H4V6a2 2 0 0 1 2-2h4Z"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    book: '<path d="M4 19.5V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2.5Z"/><path d="M4 19.5A2 2 0 0 0 6 21h13"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    link: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>',
  };

  var $ = function (s) { return document.querySelector(s); };
  function icon(name) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[name] || ICONS.star) + '</svg>'; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  // Links typed by the admin: never allow script URLs.
  function safeUrl(u) {
    u = String(u || '').trim();
    return /^(javascript|data|vbscript):/i.test(u) ? '' : u;
  }
  function fmt(n) { return Number(n || 0).toLocaleString('th-TH'); }
  function store(kind, key, val) {
    try {
      var s = kind === 'local' ? window.localStorage : window.sessionStorage;
      if (val === undefined) return s.getItem(key);
      if (val === null) s.removeItem(key);
      else s.setItem(key, val);
    } catch (e) { /* storage blocked */ }
    return null;
  }
  function dayKey(d) { return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d); }

  var catById = {};
  SITE.categories.forEach(function (c) { catById[c.id] = c; });
  function catOf(m) { return catById[m.category] || { id: m.category, name: 'อื่น ๆ', icon: 'star', color: 'lavender' }; }
  function tagsOf(m) {
    return (Array.isArray(m.tags) ? m.tags : String(m.tags || '').split(','))
      .map(function (t) { return t.trim(); })
      .filter(Boolean);
  }
  function imageOf(m) {
    if (m.imageFile) return 'https://lh3.googleusercontent.com/d/' + encodeURIComponent(m.imageFile) + '=w1200';
    return safeUrl(m.image);
  }
  // If the Drive link style is blocked, retry with the Drive thumbnail endpoint once.
  window.__imgFallback = function (img) {
    var id = img.getAttribute('data-file');
    if (id && !img.dataset.retried) {
      img.dataset.retried = '1';
      img.src = 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(id) + '&sz=w1200';
    } else {
      img.remove();
    }
  };
  function thumbHtml(m) {
    var c = catOf(m);
    var src = imageOf(m);
    var deco = '<span class="deco d1"></span><span class="deco d2"></span><span class="deco d3"></span>';
    var inner = src
      ? '<img src="' + esc(src) + '" alt="" loading="lazy"' + (m.imageFile ? ' data-file="' + esc(m.imageFile) + '"' : '') + ' onerror="__imgFallback(this)">'
      : deco + '<span class="t-ico">' + icon(c.icon) + '</span>';
    return { cls: 'thumb ' + c.color, html: inner };
  }
  function isNew(m) {
    var t = Date.parse(m.createdAt || '');
    return t && Date.now() - t < NEW_DAYS * 86400000;
  }

  /* ---------- Static text ---------- */
  var S = SITE.site;
  var O = SITE.owner;
  document.title = S.name + ' · ' + S.subtitle;
  $('#brand-name').textContent = S.name;
  $('#brand-sub').textContent = S.subtitle;
  $('#hero-english').textContent = S.english;
  $('#hero-l1').textContent = S.headline[0];
  $('#hero-l2').textContent = S.headline[1];
  $('#hero-intro').textContent = S.intro;
  $('#footer-site').textContent = S.name;
  $('#footer-sub').textContent = S.subtitle;
  $('#footer-name').textContent = O.name;
  $('#footer-role').textContent = O.role + ' ' + O.org;
  $('#footer-copy').textContent = S.name;
  $('#year').textContent = new Date().getFullYear() + 543;

  /* ---------- Media state ---------- */
  var items = SITE.items.slice();
  try {
    var cached = JSON.parse(store('local', 'pb:media') || 'null');
    if (Array.isArray(cached)) items = cached;
  } catch (e) { /* ignore */ }

  var filter = 'all';
  var query = '';
  var sort = 'new';
  var stats = { total: 0, unique: 0, days: {}, items: {}, today: dayKey(new Date()) };

  function setItems(list, fromServer) {
    items = list;
    if (fromServer) store('local', 'pb:media', JSON.stringify(list));
    renderAll();
  }

  function renderAll() {
    renderCats();
    renderChips();
    renderGrid();
    renderArt();
    renderPopular();
    renderStats();
  }

  function countIn(cat) {
    return cat === 'all' ? items.length : items.filter(function (m) { return m.category === cat; }).length;
  }

  function renderCats() {
    $('#cat-grid').innerHTML = SITE.categories.map(function (c) {
      return '<button type="button" class="cat ' + esc(c.color) + ' ripple" data-cat="' + esc(c.id) + '">' +
        '<span class="cat-ico">' + icon(c.icon) + '</span><span><b>' + esc(c.name) + '</b><small>' + fmt(countIn(c.id)) + ' สื่อ</small></span></button>';
    }).join('');
  }
  $('#cat-grid').addEventListener('click', function (e) {
    var b = e.target.closest('.cat');
    if (!b) return;
    filter = b.dataset.cat;
    renderChips();
    renderGrid();
    $('#library').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  });

  function renderChips() {
    var defs = [{ id: 'all', name: 'ทั้งหมด' }].concat(SITE.categories);
    $('#chips').innerHTML = defs.map(function (c) {
      return '<button type="button" class="chip ripple" role="tab" data-cat="' + esc(c.id) + '" aria-selected="' + (filter === c.id) + '">' +
        esc(c.name) + '<span class="count">' + countIn(c.id) + '</span></button>';
    }).join('');
  }
  $('#chips').addEventListener('click', function (e) {
    var b = e.target.closest('.chip');
    if (!b) return;
    filter = b.dataset.cat;
    renderChips();
    renderGrid();
  });
  $('#q').addEventListener('input', function (e) { query = e.target.value.trim().toLowerCase(); renderGrid(); });
  $('#sort').addEventListener('change', function (e) { sort = e.target.value; renderGrid(); });
  $('#hero-search').addEventListener('submit', function (e) {
    e.preventDefault();
    var v = $('#hero-q').value.trim();
    $('#q').value = v;
    query = v.toLowerCase();
    filter = 'all';
    renderChips();
    renderGrid();
    $('#library').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  });

  function visible() {
    var list = items.filter(function (m) {
      if (filter !== 'all' && m.category !== filter) return false;
      if (!query) return true;
      return [m.title, m.summary, m.detail, m.audience, m.year, tagsOf(m).join(' '), catOf(m).name]
        .join(' ').toLowerCase().indexOf(query) >= 0;
    });
    list.sort(function (a, b) {
      if (sort === 'popular') return (stats.items[b.id] || 0) - (stats.items[a.id] || 0);
      if (sort === 'az') return String(a.title).localeCompare(String(b.title), 'th');
      return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    });
    return list;
  }

  function renderGrid() {
    var list = visible();
    var html = '<button type="button" class="add-card" id="add-card"><span>+</span>เพิ่มสื่อใหม่</button>';
    html += list.map(function (m, i) {
      var c = catOf(m);
      var t = thumbHtml(m);
      return (
        '<article class="card ' + esc(c.color) + '" style="--i:' + i + '">' +
        '<button type="button" class="card-open" data-id="' + esc(m.id) + '" aria-label="' + esc('ดูรายละเอียด ' + m.title) + '"></button>' +
        (isNew(m) ? '<span class="new-badge">ใหม่</span>' : '') +
        '<div class="card-admin"><button type="button" data-edit="' + esc(m.id) + '">แก้ไข</button>' +
        '<button type="button" class="del" data-del="' + esc(m.id) + '">ลบ</button></div>' +
        '<div class="' + t.cls + '">' + t.html + '</div>' +
        '<div class="card-body"><span class="cat-tag">' + esc(c.name) + '</span>' +
        '<span class="card-title">' + esc(m.title) + '</span>' +
        '<p class="card-sum">' + esc(m.summary) + '</p>' +
        '<div class="card-foot"><span class="aud">' + esc(m.audience || (m.year ? 'พ.ศ. ' + m.year : '')) + '</span>' +
        '<span class="views" title="จำนวนครั้งที่เปิดดู">' + icon('eye') + '<span data-views="' + esc(m.id) + '">' + fmt(stats.items[m.id]) + '</span></span></div>' +
        '</div></article>'
      );
    }).join('');
    $('#grid').innerHTML = html;
    $('#empty').hidden = list.length > 0;
  }

  $('#grid').addEventListener('click', function (e) {
    var t = e.target;
    if (t.closest('#add-card')) return openEditor(null);
    var ed = t.closest('[data-edit]');
    if (ed) return openEditor(ed.getAttribute('data-edit'));
    var del = t.closest('[data-del]');
    if (del) return removeItem(del.getAttribute('data-del'));
    var open = t.closest('.card-open');
    if (open) {
      burst(e.clientX, e.clientY);
      openDetail(open.dataset.id, e.clientX, e.clientY);
    }
  });

  function renderArt() {
    var latest = items.slice().sort(function (a, b) { return String(b.createdAt || '').localeCompare(String(a.createdAt || '')); })[0];
    var el = $('#art-card');
    if (!latest) { el.innerHTML = ''; return; }
    var c = catOf(latest);
    var t = thumbHtml(latest);
    el.className = 'art-card ' + c.color;
    el.innerHTML = '<div class="' + t.cls + '">' + t.html + '</div><span class="art-tag">ล่าสุด · ' + esc(c.name) + '</span><span class="art-title">' + esc(latest.title) + '</span>';
    countUp($('#art-count'), items.length);
  }

  function renderPopular() {
    var seen = {};
    var tags = [];
    items.forEach(function (m) {
      tagsOf(m).forEach(function (t) {
        if (!seen[t]) { seen[t] = 1; tags.push(t); }
      });
    });
    var colors = ['lavender', 'mint', 'peach', 'sky', 'pink'];
    $('#popular').innerHTML = tags.length
      ? '<span>คำค้นยอดนิยม:</span>' + tags.slice(0, 5).map(function (t, i) {
          return '<button type="button" class="' + colors[i % colors.length] + '" data-q="' + esc(t) + '">' + esc(t) + '</button>';
        }).join('')
      : '';
  }
  $('#popular').addEventListener('click', function (e) {
    var b = e.target.closest('[data-q]');
    if (!b) return;
    $('#hero-q').value = b.dataset.q;
    $('#hero-search').requestSubmit();
  });

  /* ---------- Dialog helpers ---------- */
  function openDialog(d, x, y) {
    d.classList.remove('closing');
    d.showModal();
    if (x != null) {
      var r = d.getBoundingClientRect();
      d.style.transformOrigin = (x - r.left) + 'px ' + (y - r.top) + 'px';
    } else {
      d.style.transformOrigin = '';
    }
  }
  function closeDialog(d) {
    if (!d.open || d.classList.contains('closing')) return;
    if (reduceMotion) { d.close(); return; }
    d.classList.add('closing');
    d.addEventListener('animationend', function done() {
      d.removeEventListener('animationend', done);
      d.classList.remove('closing');
      d.close();
    });
  }
  document.querySelectorAll('dialog').forEach(function (d) {
    d.addEventListener('cancel', function (e) { e.preventDefault(); closeDialog(d); });
    d.addEventListener('click', function (e) {
      if (e.target === d || e.target.closest('[data-close]')) closeDialog(d);
    });
  });

  /* ---------- Detail ---------- */
  function findItem(id) { return items.filter(function (m) { return m.id === id; })[0]; }
  function openDetail(id, x, y) {
    var m = findItem(id);
    if (!m) return;
    var c = catOf(m);
    var t = thumbHtml(m);
    var cover = $('#d-cover');
    cover.className = 'd-cover ' + t.cls;
    cover.innerHTML = t.html;
    $('#d-meta').innerHTML = '<span class="cat-tag ' + esc(c.color) + '">' + esc(c.name) + '</span>' +
      (m.year ? '<span>พ.ศ. ' + esc(m.year) + '</span>' : '') +
      '<span>เปิดดู ' + fmt(stats.items[m.id]) + ' ครั้ง</span>';
    $('#d-title').textContent = m.title;
    $('#d-detail').textContent = m.detail || m.summary;
    $('#d-facts').innerHTML = m.audience ? '<dt>กลุ่มเป้าหมาย</dt><dd>' + esc(m.audience) + '</dd>' : '';
    $('#d-tags').innerHTML = tagsOf(m).map(function (t) { return '<li>#' + esc(t) + '</li>'; }).join('');
    var link = $('#d-link');
    var href = safeUrl(m.link);
    link.hidden = !href;
    if (href) {
      link.href = href;
      link.innerHTML = esc(m.linkLabel || 'เปิดสื่อ') + icon('link');
    }
    openDialog($('#detail'), x, y);
    countView(m.id);
  }

  /* ---------- Click effects ---------- */
  document.addEventListener('pointerdown', function (e) {
    if (reduceMotion) return;
    var el = e.target.closest('.ripple, .card');
    if (!el) return;
    var r = el.getBoundingClientRect();
    var size = Math.max(r.width, r.height) * 2.2;
    var w = document.createElement('span');
    w.className = 'ripple-wave';
    w.style.width = w.style.height = size + 'px';
    w.style.left = e.clientX - r.left - size / 2 + 'px';
    w.style.top = e.clientY - r.top - size / 2 + 'px';
    el.appendChild(w);
    setTimeout(function () { w.remove(); }, 700);
  });
  function burst(x, y) {
    if (reduceMotion || !x) return;
    var colors = ['#c9bfff', '#ffc9dd', '#b5ecd4', '#bcdcff', '#ffd257', '#ffcfb8'];
    for (var i = 0; i < 16; i++) {
      var s = document.createElement('span');
      var a = (Math.PI * 2 * i) / 16 + Math.random() * 0.4;
      var d = 40 + Math.random() * 60;
      s.className = 'burst';
      s.style.left = x - 5 + 'px';
      s.style.top = y - 5 + 'px';
      s.style.background = colors[i % colors.length];
      s.style.setProperty('--dx', Math.cos(a) * d + 'px');
      s.style.setProperty('--dy', Math.sin(a) * d + 'px');
      document.body.appendChild(s);
      setTimeout(s.remove.bind(s), 750);
    }
  }
  var toastTimer;
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    t.style.animation = 'none';
    void t.offsetWidth;
    t.style.animation = '';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 3200);
  }

  /* ---------- Server ---------- */
  function get(params) {
    if (!API) return Promise.reject(new Error('no-api'));
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 10000);
    return fetch(API + '?' + new URLSearchParams(params).toString(), ctrl ? { signal: ctrl.signal } : {})
      .then(function (r) { return r.json(); })
      .then(function (j) { clearTimeout(timer); return j; });
  }
  function post(body) {
    if (!API) return Promise.reject(new Error('no-api'));
    return fetch(API, {
      method: 'POST',
      // text/plain avoids a CORS preflight, which Apps Script cannot answer.
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
    }).then(function (r) { return r.json(); });
  }

  function loadMedia() {
    get({ action: 'media' })
      .then(function (j) {
        if (!j || !j.ok || !Array.isArray(j.items)) return;
        if (j.initialized) setItems(j.items, true);
        else { store('local', 'pb:media', null); setItems(SITE.items.slice(), false); }
      })
      .catch(function () { /* keep built-in or cached list */ });
  }

  /* ---------- Stats (numbers only) ---------- */
  var remote = false;
  function statsCall(params) {
    return get(params).then(function (j) {
      if (!j || !j.ok || typeof j.total !== 'number') throw new Error('bad');
      return j;
    });
  }
  // Fallback when the Apps Script is not reachable: counts kept on this device only.
  function local(action, id) {
    var s;
    try { s = JSON.parse(store('local', 'pb:stats') || '{}'); } catch (e) { s = {}; }
    s.total = s.total || 0; s.unique = s.unique || 0; s.days = s.days || {}; s.items = s.items || {};
    var today = dayKey(new Date());
    if (action === 'hit') {
      s.total++;
      if (!store('local', 'pb:seen-local')) { s.unique++; store('local', 'pb:seen-local', '1'); }
      s.days[today] = (s.days[today] || 0) + 1;
    }
    if (action === 'view') s.items[id] = (s.items[id] || 0) + 1;
    store('local', 'pb:stats', JSON.stringify(s));
    s.today = today;
    return s;
  }
  function applyStats(s, isRemote) {
    remote = isRemote;
    stats = s;
    renderStats();
    document.querySelectorAll('[data-views]').forEach(function (el) { el.textContent = fmt(stats.items[el.dataset.views]); });
  }
  function loadStats() {
    var counted = store('session', 'pb:counted');
    var params = counted ? { action: 'stats' } : { action: 'hit', 'new': store('local', 'pb:seen') ? '0' : '1' };
    statsCall(params)
      .then(function (s) {
        if (!counted) { store('session', 'pb:counted', '1'); store('local', 'pb:seen', '1'); }
        applyStats(s, true);
      })
      .catch(function () {
        var s = local(counted ? 'stats' : 'hit');
        store('session', 'pb:counted', '1');
        applyStats(s, false);
      });
  }
  function countView(id) {
    var key = 'pb:v:' + id;
    if (store('session', key)) return;
    store('session', key, '1');
    (remote ? statsCall({ action: 'view', item: id }) : Promise.reject())
      .then(function (s) { applyStats(s, true); })
      .catch(function () { applyStats(local('view', id), false); });
  }
  function countUp(el, to) {
    var from = Number(el.dataset.v || 0);
    el.dataset.v = to;
    if (reduceMotion || from === to) { el.textContent = fmt(to); return; }
    var t0 = performance.now();
    (function step(now) {
      var k = Math.min(1, (now - t0) / 1100);
      el.textContent = fmt(Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))));
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }
  var statsSeen = false;
  function renderStats() {
    if (!statsSeen) return;
    var v = {
      items: items.length,
      total: stats.total,
      unique: stats.unique,
      today: stats.days[stats.today || dayKey(new Date())] || 0,
    };
    document.querySelectorAll('[data-stat]').forEach(function (el) { countUp(el, v[el.dataset.stat]); });
    $('#stats-note').textContent = remote ? '' : 'ตัวเลขการเข้าชมนับเฉพาะบนอุปกรณ์เครื่องนี้ (ยังเชื่อมต่อระบบนับสถิติกลางไม่ได้)';
  }

  /* ---------- Admin ---------- */
  var pin = store('session', 'pb:admin');
  function adminError(code) {
    return {
      'pin-not-set': 'ยังไม่ได้ตั้งรหัสผ่านผู้ดูแล (แก้ ADMIN_PIN ใน Code.gs แล้วสร้างเวอร์ชันใหม่)',
      'bad-pin': 'รหัสผ่านไม่ถูกต้อง',
      locked: 'ใส่รหัสผิดหลายครั้ง ระบบล็อกไว้ 10 นาที',
      'no-api': 'ยังไม่ได้ตั้งค่า URL ของ Apps Script ในไฟล์ config.js',
    }[code] || 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ลองใหม่อีกครั้ง (' + code + ')';
  }
  function setBusy(btn, busy, label) {
    btn.disabled = busy;
    if (busy) { btn.dataset.label = btn.textContent; btn.innerHTML = '<span class="spin"></span>' + esc(label); }
    else if (btn.dataset.label) btn.textContent = btn.dataset.label;
  }
  function enterAdmin() {
    document.body.classList.add('is-admin');
    $('#admin-bar').hidden = false;
  }
  function leaveAdmin() {
    pin = null;
    store('session', 'pb:admin', null);
    document.body.classList.remove('is-admin');
    $('#admin-bar').hidden = true;
  }
  function showLogin() {
    if (pin) { enterAdmin(); return; }
    $('#login-error').hidden = true;
    $('#login-pin').value = '';
    openDialog($('#login'));
    $('#login-pin').focus();
  }
  $('#admin-open').addEventListener('click', showLogin);
  $('#admin-out').addEventListener('click', function () { leaveAdmin(); toast('ออกจากโหมดผู้ดูแลแล้ว'); });
  $('#admin-add').addEventListener('click', function () { openEditor(null); });

  $('#login-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = $('#login-go');
    var p = $('#login-pin').value;
    var err = $('#login-error');
    err.hidden = true;
    setBusy(btn, true, 'กำลังตรวจสอบ');
    post({ action: 'admin-login', pin: p })
      .then(function (j) {
        if (!j.ok) throw new Error(j.error);
        pin = p;
        store('session', 'pb:admin', p);
        // First sign-in: copy the built-in media into the sheet so everything is editable.
        if (!j.initialized) {
          return post({ action: 'admin-import', pin: p, items: SITE.items }).then(function (k) {
            if (!k.ok) throw new Error(k.error);
            setItems(k.items, true);
          });
        }
      })
      .then(function () {
        setBusy(btn, false);
        closeDialog($('#login'));
        enterAdmin();
        loadMedia();
        toast('เข้าสู่โหมดผู้ดูแลแล้ว');
      })
      .catch(function (x) {
        setBusy(btn, false);
        err.textContent = adminError(x.message);
        err.hidden = false;
      });
  });

  // Editor
  var editing = null;
  var newImage = null;
  var removeImage = false;
  var catSelect = $('#ed-cat');
  catSelect.innerHTML = SITE.categories.map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(c.name) + '</option>'; }).join('');

  function setPreview(src) {
    var img = $('#ed-preview');
    img.hidden = !src;
    if (src) img.src = src; else img.removeAttribute('src');
    $('#drop-hint').hidden = !!src;
  }
  function openEditor(id) {
    var m = id ? findItem(id) : null;
    editing = m;
    newImage = null;
    removeImage = false;
    $('#ed-title').textContent = m ? 'แก้ไขสื่อ' : 'เพิ่มสื่อใหม่';
    $('#ed-name').value = m ? m.title : '';
    catSelect.value = m ? m.category : filter !== 'all' ? filter : SITE.categories[0].id;
    $('#ed-year').value = m ? m.year || '' : String(new Date().getFullYear() + 543);
    $('#ed-summary').value = m ? m.summary || '' : '';
    $('#ed-detail').value = m ? m.detail || '' : '';
    $('#ed-audience').value = m ? m.audience || '' : '';
    $('#ed-tags').value = m ? tagsOf(m).join(', ') : '';
    $('#ed-link').value = m ? m.link || '' : '';
    $('#ed-link-label').value = m ? m.linkLabel || '' : '';
    $('#ed-image-url').value = m && !m.imageFile ? m.image || '' : '';
    $('#ed-file').value = '';
    setPreview(m ? imageOf(m) : '');
    $('#ed-delete').hidden = !m;
    $('#ed-error').hidden = true;
    openDialog($('#editor'));
  }

  // Shrink the picture in the browser so uploads stay small (max 1400px, JPEG).
  function readImage(file) {
    return new Promise(function (resolve, reject) {
      if (!/^image\//.test(file.type)) return reject(new Error('ไฟล์นี้ไม่ใช่รูปภาพ'));
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var max = 1400;
        var k = Math.min(1, max / Math.max(img.width, img.height));
        var cv = document.createElement('canvas');
        cv.width = Math.round(img.width * k);
        cv.height = Math.round(img.height * k);
        var ctx = cv.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, cv.width, cv.height);
        ctx.drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url);
        resolve(cv.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('เปิดรูปนี้ไม่ได้')); };
      img.src = url;
    });
  }
  function takeFile(file) {
    if (!file) return;
    readImage(file).then(function (data) {
      newImage = data;
      removeImage = false;
      $('#ed-image-url').value = '';
      setPreview(data);
    }).catch(function (x) { toast(x.message); });
  }
  $('#ed-file').addEventListener('change', function (e) { takeFile(e.target.files[0]); });
  var drop = $('#drop');
  ['dragenter', 'dragover'].forEach(function (t) {
    drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add('over'); });
  });
  ['dragleave', 'drop'].forEach(function (t) {
    drop.addEventListener(t, function () { drop.classList.remove('over'); });
  });
  drop.addEventListener('drop', function (e) {
    e.preventDefault();
    takeFile(e.dataTransfer.files[0]);
  });
  $('#ed-remove-img').addEventListener('click', function () {
    newImage = null;
    removeImage = true;
    $('#ed-image-url').value = '';
    $('#ed-file').value = '';
    setPreview('');
  });
  $('#ed-image-url').addEventListener('input', function (e) {
    var u = safeUrl(e.target.value);
    newImage = null;
    removeImage = true;
    setPreview(u);
  });

  function adminFail(x, box) {
    if (x.message === 'bad-pin') leaveAdmin();
    box.textContent = adminError(x.message);
    box.hidden = false;
  }

  $('#ed-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = $('#ed-save');
    var err = $('#ed-error');
    err.hidden = true;
    var url = safeUrl($('#ed-image-url').value);
    var item = {
      id: editing ? editing.id : '',
      title: $('#ed-name').value.trim(),
      category: catSelect.value,
      year: $('#ed-year').value.trim(),
      summary: $('#ed-summary').value.trim(),
      detail: $('#ed-detail').value.trim(),
      audience: $('#ed-audience').value.trim(),
      tags: $('#ed-tags').value,
      link: safeUrl($('#ed-link').value),
      linkLabel: $('#ed-link-label').value.trim(),
      image: url,
      // Drop the uploaded Drive picture when it was removed or replaced by a typed link.
      removeImage: (removeImage && !url) || !!(url && editing && editing.imageFile),
    };
    setBusy(btn, true, newImage ? 'กำลังอัปโหลดรูป' : 'กำลังบันทึก');
    post({ action: 'admin-save', pin: pin, item: item, image: newImage || undefined })
      .then(function (j) {
        if (!j.ok) throw new Error(j.error);
        setBusy(btn, false);
        setItems(j.items, true);
        closeDialog($('#editor'));
        toast(editing ? 'บันทึกการแก้ไขแล้ว' : 'เพิ่มสื่อใหม่แล้ว 🎉');
      })
      .catch(function (x) { setBusy(btn, false); adminFail(x, err); });
  });

  function removeItem(id) {
    var m = findItem(id);
    if (!m || !window.confirm('ลบสื่อ "' + m.title + '" ใช่ไหม? ลบแล้วกู้คืนไม่ได้')) return;
    post({ action: 'admin-delete', pin: pin, id: id })
      .then(function (j) {
        if (!j.ok) throw new Error(j.error);
        setItems(j.items, true);
        if ($('#editor').open) closeDialog($('#editor'));
        toast('ลบสื่อแล้ว');
      })
      .catch(function (x) { adminFail(x, $('#ed-error')); toast(adminError(x.message)); });
  }
  $('#ed-delete').addEventListener('click', function () { if (editing) removeItem(editing.id); });

  /* ---------- Scroll: reveal, nav ---------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      en.target.classList.add('in');
      io.unobserve(en.target);
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });

  new IntersectionObserver(function (entries) {
    if (!statsSeen && entries.some(function (en) { return en.isIntersecting; })) {
      statsSeen = true;
      renderStats();
    }
  }, { threshold: 0.3 }).observe($('#stats'));

  var navLinks = document.querySelectorAll('.nav-links a');
  var navIo = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      navLinks.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id); });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  document.querySelectorAll('.section').forEach(function (s) { navIo.observe(s); });

  var nav = $('#nav');
  window.addEventListener('scroll', function () { nav.classList.toggle('scrolled', window.scrollY > 8); }, { passive: true });

  /* ---------- Theme ---------- */
  var themeBtn = $('#theme');
  function isDark() {
    var t = document.documentElement.dataset.theme;
    return t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function paintTheme() { themeBtn.innerHTML = icon(isDark() ? 'sun' : 'moon'); }
  var saved = store('local', 'pb:theme');
  if (saved) document.documentElement.dataset.theme = saved;
  paintTheme();
  themeBtn.addEventListener('click', function () {
    var next = isDark() ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    store('local', 'pb:theme', next);
    paintTheme();
  });

  /* ---------- Start ---------- */
  renderAll();
  if (pin) enterAdmin();
  if (location.hash === '#admin') {
    history.replaceState(null, '', location.pathname + location.search);
    showLogin();
  }
  loadMedia();
  loadStats();
})();
