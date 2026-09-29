(function () {
  'use strict';

  var DATA = window.PORTFOLIO;
  var API = window.PORTFOLIO_STATS_URL || '';
  var TZ = 'Asia/Bangkok';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;

  var ICONS = {
    book: '<path d="M4 19.5V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2.5Z"/><path d="M4 19.5A2 2 0 0 0 6 21h13"/><path d="M9 7h6M9 11h4"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4"/><path d="m6 6 2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/><circle cx="12" cy="12" r="2"/>',
    flask: '<path d="M9 3h6M10 3v6L4.5 18.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3"/><path d="M7 15h10"/>',
    award: '<circle cx="12" cy="9" r="6"/><path d="m8.5 14-1.5 7 5-3 5 3-1.5-7"/>',
    people: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.2a5 5 0 0 1 5.5 5.8"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    link: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>',
  };
  var COVERS = [
    'linear-gradient(135deg, #1f3a8a, #5b7be0)',
    'linear-gradient(135deg, #7a4a0f, #d9a441)',
    'linear-gradient(135deg, #0f5c56, #3fb3a0)',
    'linear-gradient(135deg, #6b2150, #d0679b)',
    'linear-gradient(135deg, #3b2c7a, #8f78e6)',
  ];

  var $ = function (s) { return document.querySelector(s); };
  function icon(name, cls) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"' + (cls ? ' class="' + cls + '"' : '') + '>' + (ICONS[name] || '') + '</svg>';
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmt(n) { return Number(n || 0).toLocaleString('th-TH'); }
  function store(kind, key, val) {
    try {
      var s = kind === 'local' ? window.localStorage : window.sessionStorage;
      if (val === undefined) return s.getItem(key);
      s.setItem(key, val);
    } catch (e) { /* storage blocked: counts still show */ }
    return null;
  }
  function dayKey(d) { return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d); }

  var catById = {};
  DATA.categories.forEach(function (c, i) { c.cover = COVERS[i % COVERS.length]; catById[c.id] = c; });

  /* ---------- Profile ---------- */
  var p = DATA.profile;
  var m = /^(นางสาว|นาง|นาย)(.*)$/.exec(p.name);
  $('#hero-name').innerHTML = m ? esc(m[1]) + '<br><span class="accent">' + esc(m[2]) + '</span>' : '<span class="accent">' + esc(p.name) + '</span>';
  $('#hero-role').textContent = p.role + ' · ' + p.org;
  $('#hero-tagline').textContent = p.tagline;
  $('#about-text').textContent = p.about;
  $('#focus').innerHTML = p.focus.map(function (f, i) { return '<li><span>' + (i + 1) + '</span>' + esc(f) + '</li>'; }).join('');
  $('#footer-name').textContent = p.name;
  $('#footer-role').textContent = p.role + ' ' + p.org;
  $('#year').textContent = new Date().getFullYear() + 543;
  $('#fact-works').textContent = fmt(DATA.works.length);
  $('#fact-cats').textContent = fmt(DATA.categories.length);

  /* ---------- Filters + grid ---------- */
  var filter = 'all';
  var query = '';
  var stats = { total: 0, unique: 0, days: {}, items: {}, today: dayKey(new Date()) };

  var chips = $('#chips');
  var pill = $('#chip-pill');
  var chipDefs = [{ id: 'all', name: 'ทั้งหมด' }].concat(DATA.categories);
  chipDefs.forEach(function (c) {
    var n = c.id === 'all' ? DATA.works.length : DATA.works.filter(function (w) { return w.category === c.id; }).length;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.setAttribute('role', 'tab');
    b.dataset.id = c.id;
    b.innerHTML = esc(c.name) + '<span class="count">' + n + '</span>';
    b.addEventListener('click', function () { filter = c.id; renderChips(); renderGrid(); });
    chips.appendChild(b);
  });
  function renderChips() {
    chips.querySelectorAll('.chip').forEach(function (b) {
      var on = b.dataset.id === filter;
      b.setAttribute('aria-selected', String(on));
      if (on) {
        pill.style.left = b.offsetLeft + 'px';
        pill.style.top = b.offsetTop + 'px';
        pill.style.width = b.offsetWidth + 'px';
        pill.style.height = b.offsetHeight + 'px';
      }
    });
  }
  $('#search').addEventListener('input', function (e) { query = e.target.value.trim().toLowerCase(); renderGrid(); });

  function visibleWorks() {
    return DATA.works.filter(function (w) {
      if (filter !== 'all' && w.category !== filter) return false;
      if (!query) return true;
      return [w.title, w.summary, w.detail, w.year, (w.tags || []).join(' '), (catById[w.category] || {}).name]
        .join(' ').toLowerCase().indexOf(query) >= 0;
    });
  }
  function coverHtml(w) {
    var c = catById[w.category] || DATA.categories[0];
    var inner = w.image ? '<img src="' + esc(w.image) + '" alt="" loading="lazy">' : icon(c.icon, 'cover-icon');
    return { style: '--cover:' + c.cover, html: inner, cat: c };
  }
  function renderGrid() {
    var list = visibleWorks();
    var grid = $('#grid');
    grid.innerHTML = list.map(function (w, i) {
      var cv = coverHtml(w);
      return (
        '<button type="button" class="card" data-id="' + esc(w.id) + '" style="--i:' + i + '">' +
        '<div class="cover" style="' + cv.style + '">' + cv.html +
        '<span class="badge">' + esc(cv.cat.name) + '</span>' +
        (w.sample ? '<span class="badge sample">ตัวอย่าง</span>' : '') + '</div>' +
        '<div class="card-body"><span class="card-title">' + esc(w.title) + '</span>' +
        '<p class="card-sum">' + esc(w.summary) + '</p>' +
        '<div class="card-foot"><span class="views" title="จำนวนครั้งที่เปิดดู">' + icon('eye') +
        '<span data-views="' + esc(w.id) + '">' + fmt(stats.items[w.id]) + '</span></span>' +
        '<span>พ.ศ. ' + esc(w.year) + '</span>' +
        '<span class="more">รายละเอียด' + icon('arrow') + '</span></div></div></button>'
      );
    }).join('');
    $('#empty').hidden = list.length > 0;
  }

  $('#grid').addEventListener('click', function (e) {
    var card = e.target.closest('.card');
    if (!card) return;
    burst(e.clientX, e.clientY);
    openWork(card.dataset.id, e.clientX, e.clientY);
  });

  if (finePointer && !reduceMotion) {
    $('#grid').addEventListener('pointermove', function (e) {
      var card = e.target.closest('.card');
      if (!card) return;
      var r = card.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width;
      var y = (e.clientY - r.top) / r.height;
      card.style.setProperty('--ry', ((x - 0.5) * 8).toFixed(2) + 'deg');
      card.style.setProperty('--rx', ((0.5 - y) * 8).toFixed(2) + 'deg');
      card.style.setProperty('--px', (x * 100).toFixed(1) + '%');
      card.style.setProperty('--py', (y * 100).toFixed(1) + '%');
    });
    $('#grid').addEventListener('pointerout', function (e) {
      var card = e.target.closest('.card');
      if (card && !card.contains(e.relatedTarget)) {
        card.style.removeProperty('--rx');
        card.style.removeProperty('--ry');
      }
    });
  }

  /* ---------- Modal ---------- */
  var modal = $('#modal');
  function openWork(id, x, y) {
    var w = DATA.works.filter(function (v) { return v.id === id; })[0];
    if (!w) return;
    var cv = coverHtml(w);
    var cover = $('#modal-cover');
    cover.className = 'modal-cover cover';
    cover.setAttribute('style', cv.style);
    cover.innerHTML = cv.html;
    $('#modal-meta').textContent = cv.cat.name + ' · พ.ศ. ' + w.year + (w.sample ? ' · ผลงานตัวอย่าง' : '');
    $('#modal-title').textContent = w.title;
    $('#modal-detail').textContent = w.detail || w.summary;
    $('#modal-tags').innerHTML = (w.tags || []).map(function (t) { return '<li>#' + esc(t) + '</li>'; }).join('');
    var link = $('#modal-link');
    link.hidden = !w.link;
    if (w.link) {
      link.href = w.link;
      link.innerHTML = esc(w.linkLabel || 'เปิดผลงาน') + icon('link');
    }
    modal.classList.remove('closing');
    modal.showModal();
    if (x != null) {
      var r = modal.getBoundingClientRect();
      modal.style.transformOrigin = (x - r.left) + 'px ' + (y - r.top) + 'px';
    } else {
      modal.style.transformOrigin = '';
    }
    countView(id);
  }
  function closeModal() {
    if (!modal.open || modal.classList.contains('closing')) return;
    if (reduceMotion) { modal.close(); return; }
    modal.classList.add('closing');
    modal.addEventListener('animationend', function done() {
      modal.removeEventListener('animationend', done);
      modal.classList.remove('closing');
      modal.close();
    });
  }
  $('#modal-close').addEventListener('click', closeModal);
  $('#modal-x').addEventListener('click', closeModal);
  modal.addEventListener('cancel', function (e) { e.preventDefault(); closeModal(); });
  modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });

  /* ---------- Click effects ---------- */
  document.addEventListener('pointerdown', function (e) {
    if (reduceMotion) return;
    var el = e.target.closest('.ripple, .card, .chip, .top button');
    if (!el) return;
    var r = el.getBoundingClientRect();
    var size = Math.max(r.width, r.height) * 2.2;
    var wave = document.createElement('span');
    wave.className = 'ripple-wave';
    wave.style.width = wave.style.height = size + 'px';
    wave.style.left = e.clientX - r.left - size / 2 + 'px';
    wave.style.top = e.clientY - r.top - size / 2 + 'px';
    el.appendChild(wave);
    setTimeout(function () { wave.remove(); }, 700);
  });
  function burst(x, y) {
    if (reduceMotion || !x) return;
    var colors = ['#c8952c', '#3656b3', '#e3b456', '#7f97f5', '#3fb3a0'];
    for (var i = 0; i < 14; i++) {
      var s = document.createElement('span');
      var a = (Math.PI * 2 * i) / 14 + Math.random() * 0.4;
      var d = 40 + Math.random() * 50;
      s.className = 'burst';
      s.style.left = x - 4 + 'px';
      s.style.top = y - 4 + 'px';
      s.style.background = colors[i % colors.length];
      s.style.setProperty('--dx', Math.cos(a) * d + 'px');
      s.style.setProperty('--dy', Math.sin(a) * d + 'px');
      s.style.setProperty('--rot', Math.random() * 360 + 'deg');
      document.body.appendChild(s);
      setTimeout(s.remove.bind(s), 750);
    }
  }

  /* ---------- Stats ---------- */
  var remote = false;
  function call(params) {
    if (!API) return Promise.reject(new Error('no api'));
    var ctrl = window.AbortController ? new AbortController() : null;
    var t = setTimeout(function () { if (ctrl) ctrl.abort(); }, 9000);
    return fetch(API + '?' + new URLSearchParams(params).toString(), ctrl ? { signal: ctrl.signal } : {})
      .then(function (r) { return r.json(); })
      .then(function (j) {
        clearTimeout(t);
        if (!j || !j.ok || typeof j.total !== 'number') throw new Error('bad response');
        return j;
      });
  }
  // Fallback when the Apps Script is not set up: counts kept on this device only.
  function local(action, item) {
    var s;
    try { s = JSON.parse(store('local', 'pf:stats') || '{}'); } catch (e) { s = {}; }
    s.total = s.total || 0; s.unique = s.unique || 0; s.days = s.days || {}; s.items = s.items || {};
    var today = dayKey(new Date());
    if (action === 'hit') {
      s.total++;
      if (!store('local', 'pf:seen-local')) { s.unique++; store('local', 'pf:seen-local', '1'); }
      s.days[today] = (s.days[today] || 0) + 1;
    }
    if (action === 'view') s.items[item] = (s.items[item] || 0) + 1;
    store('local', 'pf:stats', JSON.stringify(s));
    s.today = today;
    return s;
  }
  function apply(s, isRemote) {
    remote = isRemote;
    stats = s;
    renderStats();
  }

  function loadStats() {
    var counted = store('session', 'pf:counted');
    var params = counted ? { action: 'stats' } : { action: 'hit', 'new': store('local', 'pf:seen') ? '0' : '1' };
    call(params)
      .then(function (s) {
        if (!counted) { store('session', 'pf:counted', '1'); store('local', 'pf:seen', '1'); }
        apply(s, true);
      })
      .catch(function () {
        var s = local(counted ? 'stats' : 'hit');
        store('session', 'pf:counted', '1');
        apply(s, false);
      });
  }
  function countView(id) {
    var key = 'pf:v:' + id;
    if (store('session', key)) return;
    store('session', key, '1');
    (remote ? call({ action: 'view', item: id }) : Promise.reject())
      .then(function (s) { apply(s, true); })
      .catch(function () { apply(local('view', id), false); });
  }

  function countUp(el, to) {
    var from = Number(el.dataset.v || 0);
    el.dataset.v = to;
    if (reduceMotion || from === to) { el.textContent = fmt(to); return; }
    var t0 = performance.now();
    var dur = 1100;
    (function step(now) {
      var k = Math.min(1, (now - t0) / dur);
      var e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(Math.round(from + (to - from) * e));
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }

  function lastDays(n) {
    var out = [];
    var now = Date.now();
    for (var i = n - 1; i >= 0; i--) {
      var d = new Date(now - i * 86400000);
      out.push({
        key: dayKey(d),
        label: d.toLocaleDateString('th-TH', { timeZone: TZ, day: 'numeric', month: 'short' }),
      });
    }
    return out;
  }

  var statsSeen = false;
  function renderStats() {
    var days = lastDays(14);
    var week = days.slice(-7).reduce(function (a, d) { return a + (stats.days[d.key] || 0); }, 0);
    var values = { total: stats.total, unique: stats.unique, today: stats.days[stats.today || dayKey(new Date())] || 0, week: week };
    if (statsSeen) {
      document.querySelectorAll('[data-stat]').forEach(function (el) { countUp(el, values[el.dataset.stat]); });
    }
    countUp($('#fact-visits'), stats.unique);

    var max = Math.max.apply(null, days.map(function (d) { return stats.days[d.key] || 0; }).concat([1]));
    $('#chart').innerHTML = days.map(function (d) {
      var v = stats.days[d.key] || 0;
      return '<div class="bar" tabindex="0" data-tip="' + esc(d.label + ': ' + fmt(v) + ' ครั้ง') + '" aria-label="' + esc(d.label + ' ' + v + ' ครั้ง') + '">' +
        '<i data-h="' + (v / max) * 100 + '"></i><b>' + esc(d.label) + '</b></div>';
    }).join('');
    if (statsSeen) growBars();

    var top = DATA.works
      .map(function (w) { return { w: w, n: stats.items[w.id] || 0 }; })
      .filter(function (x) { return x.n > 0; })
      .sort(function (a, b) { return b.n - a.n; })
      .slice(0, 5);
    $('#top-works').innerHTML = top.length
      ? top.map(function (x, i) {
          return '<li><button type="button" data-id="' + esc(x.w.id) + '"><span class="rank">' + (i + 1) + '</span><span class="t">' +
            esc(x.w.title) + '</span><span class="n">' + fmt(x.n) + ' ครั้ง</span></button></li>';
        }).join('')
      : '<li class="none">ยังไม่มีการเปิดดูผลงาน ลองคลิกผลงานด้านบน</li>';

    document.querySelectorAll('[data-views]').forEach(function (el) { el.textContent = fmt(stats.items[el.dataset.views]); });
    $('#stats-note').textContent = remote
      ? 'นับทุกการเข้าชม (นับ 1 ครั้งต่อการเปิดเว็บ 1 รอบ) อัปเดตล่าสุด ' + new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.'
      : 'ยังเชื่อมต่อระบบนับสถิติกลางไม่ได้ ตัวเลขนี้นับเฉพาะบนอุปกรณ์เครื่องนี้';
  }
  function growBars() {
    requestAnimationFrame(function () {
      document.querySelectorAll('#chart i').forEach(function (i) { i.style.height = i.dataset.h + '%'; });
    });
  }
  $('#top-works').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (b) openWork(b.dataset.id, e.clientX, e.clientY);
  });

  var tip = $('#tooltip');
  function showTip(el) {
    var r = el.getBoundingClientRect();
    tip.textContent = el.dataset.tip;
    tip.style.left = r.left + r.width / 2 + 'px';
    tip.style.top = r.top + r.height - el.querySelector('i').offsetHeight + 'px';
    tip.hidden = false;
  }
  $('#chart').addEventListener('pointerover', function (e) { var b = e.target.closest('.bar'); if (b) showTip(b); });
  $('#chart').addEventListener('pointerleave', function () { tip.hidden = true; });
  $('#chart').addEventListener('focusin', function (e) { var b = e.target.closest('.bar'); if (b) showTip(b); });
  $('#chart').addEventListener('focusout', function () { tip.hidden = true; });
  window.addEventListener('scroll', function () { tip.hidden = true; }, { passive: true });

  /* ---------- Scroll: reveal, progress, nav ---------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      en.target.classList.add('in');
      io.unobserve(en.target);
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });

  new IntersectionObserver(function (entries) {
    if (entries.some(function (en) { return en.isIntersecting; }) && !statsSeen) {
      statsSeen = true;
      renderStats();
    }
  }, { threshold: 0.2 }).observe($('#stats'));

  var navLinks = document.querySelectorAll('.nav-links a');
  var navIo = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      navLinks.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id); });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  document.querySelectorAll('.section').forEach(function (s) { navIo.observe(s); });

  var bar = $('#progress');
  var nav = $('#nav');
  function onScroll() {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = 'scaleX(' + (h > 0 ? window.scrollY / h : 0) + ')';
    nav.classList.toggle('scrolled', window.scrollY > 8);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (finePointer && !reduceMotion) {
    var hero = document.querySelector('.hero');
    var bg = document.querySelector('.hero-bg');
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      bg.style.setProperty('--mx', ((e.clientX - r.left) / r.width) * 100 + '%');
      bg.style.setProperty('--my', ((e.clientY - r.top) / r.height) * 100 + '%');
    });
  }

  /* ---------- Theme ---------- */
  var themeBtn = $('#theme');
  function isDark() {
    var t = document.documentElement.dataset.theme;
    return t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function paintThemeBtn() { themeBtn.innerHTML = icon(isDark() ? 'sun' : 'moon'); }
  var saved = store('local', 'pf:theme');
  if (saved) document.documentElement.dataset.theme = saved;
  paintThemeBtn();
  themeBtn.addEventListener('click', function () {
    var next = isDark() ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    store('local', 'pf:theme', next);
    paintThemeBtn();
  });

  window.addEventListener('resize', renderChips);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(renderChips);
  renderChips();
  renderGrid();
  renderStats();
  loadStats();
})();
