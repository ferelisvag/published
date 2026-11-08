/* Veagle OS: ο πυρήνας. Παράθυρα, dock, αναζήτηση, επιφάνειες εργασίας, ρυθμίσεις.
   Τα υπόλοιπα (θέματα, εργαλεία, widgets, eggs) είναι ξεχωριστά αρχεία που προσθέτονται μέσω του window.OS. */
(function () {
  'use strict';
  var C = window.VEAGLE, doc = document;
  var OS = window.OS = { apps: {}, wins: {}, hooks: {} };
  function $(s, r) { return (r || doc).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); }
  function h(tag, cls, text) { var e = doc.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  OS.$ = $; OS.$$ = $$; OS.h = h;
  var NARROW = function () { return window.innerWidth < 720; };

  /* ---------- μικρό σύστημα συμβάντων ---------- */
  OS.on = function (n, fn) { (OS.hooks[n] = OS.hooks[n] || []).push(fn); };
  OS.emit = function (n, d) { (OS.hooks[n] || []).forEach(function (f) { try { f(d); } catch (e) { if (window.console) console.error(e); } }); };

  /* ---------- αποθήκευση ---------- */
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  OS.lsGet = lsGet; OS.lsSet = lsSet;
  var DEF = { theme: 'veagle', ws: 'all', particles: true, boot: true, status: false, net: false, name: '', wx: null };
  var S = {};
  try { S = JSON.parse(lsGet('veagleos.settings.v1', '{}')) || {}; } catch (e) { S = {}; }
  OS.settings = {
    get: function (k) { return S[k] === undefined ? DEF[k] : S[k]; },
    set: function (k, v) { S[k] = v; lsSet('veagleos.settings.v1', JSON.stringify(S)); OS.emit('setting', { key: k, value: v }); OS.emit('setting:' + k, v); },
    all: function () { var o = {}; Object.keys(DEF).forEach(function (k) { o[k] = OS.settings.get(k); }); return o; }
  };

  /* ---------- εικονίδια (δικά μας, γραμμικά) ---------- */
  var ICONS = OS.ICONS = {
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3.2 3 3.2 15 0 18M12 3c-3.2 3-3.2 15 0 18"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    doc: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M9.5 12h5M9.5 16h5"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 7l8.5 6 8.5-6"/>',
    route: '<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h6.5a3 3 0 0 0 0-6h-5a3 3 0 0 1 0-6H16"/>',
    calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h2M12 12h2M8 16h2M12 16h2"/>',
    chart: '<path d="M4 20V4M4 20h16M8 16l4-5 3 3 5-7"/>',
    gauge: '<path d="M4 17a8 8 0 1 1 16 0"/><path d="M12 17l4-5"/><circle cx="12" cy="17" r="1"/>',
    moto: '<circle cx="6" cy="16" r="3"/><circle cx="18" cy="16" r="3"/><path d="M6 16l3-6h4l3 6M9 10l-1.5-2H5M13 10h3l2 6"/>',
    play: '<rect x="3" y="6" width="18" height="12" rx="3.5"/><path d="M10 9.5v5l4.5-2.5z"/>',
    fb: '<path d="M14 8h2.5V4.5H14a3.5 3.5 0 0 0-3.5 3.5v2H8v3.5h2.5V21H14v-7.5h2.5L17 10h-3z"/>',
    ig: '<rect x="4" y="4" width="16" height="16" rx="4.5"/><circle cx="12" cy="12" r="3.6"/><path d="M16.8 7.2h0"/>',
    x: '<path d="M5 5l14 14M19 5L5 19"/>',
    'in': '<path d="M7 10v7M7 7h0M11 17v-7M11 13a3 3 0 0 1 6 0v4"/>',
    github: '<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>',
    pin: '<path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    spark: '<path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/>',
    dash: '<rect x="3.5" y="3.5" width="7.5" height="8" rx="1.5"/><rect x="13" y="3.5" width="7.5" height="5" rx="1.5"/><rect x="13" y="11" width="7.5" height="9.5" rx="1.5"/><rect x="3.5" y="14" width="7.5" height="6.5" rx="1.5"/>',
    terminal: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M7 10l3 2-3 2M12 15h5"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    music: '<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
    users: '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0M16.5 5.5a3 3 0 0 1 0 5.5M21 20a5 5 0 0 0-3.5-4.7"/>',
    pulse: '<path d="M3 12h4l2-6 4 12 2-6h6"/>',
    box: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12L4 7.5M12 12v9"/>',
    apps: '<circle cx="6" cy="6" r="1.5"/><circle cx="12" cy="6" r="1.5"/><circle cx="18" cy="6" r="1.5"/><circle cx="6" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="18" cy="12" r="1.5"/><circle cx="6" cy="18" r="1.5"/><circle cx="12" cy="18" r="1.5"/><circle cx="18" cy="18" r="1.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 3h6"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3M14 9l2 2"/>',
    swap: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
    percent: '<path d="M19 5L5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/>',
    radar: '<circle cx="12" cy="12" r="2"/><path d="M16.2 7.8a6 6 0 0 1 0 8.4M7.8 16.2a6 6 0 0 1 0-8.4M19 5a10 10 0 0 1 0 14M5 19a10 10 0 0 1 0-14"/>',
    commit: '<circle cx="12" cy="12" r="3"/><path d="M3 12h6M15 12h6"/>',
    sliders: '<path d="M4 6h8M18 6h2M4 12h2M12 12h8M4 18h10M20 18h0"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
    list: '<path d="M10 6h10M10 12h10M10 18h10"/><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>',
    cloud: '<path d="M7 18a4 4 0 0 1-.5-8A6 6 0 0 1 18 9.5a4.5 4.5 0 0 1-.5 8.5z"/>',
    code: '<path d="M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14"/>',
    egg: '<path d="M12 3c3.5 0 6 6 6 10a6 6 0 0 1-12 0c0-4 2.5-10 6-10z"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'
  };
  function svg(name) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || ICONS.link) + '</svg>';
  }
  OS.svg = svg;
  function eagle() { var im = h('img', 'eagle'); im.src = 'images/eagle-white.png'; im.alt = ''; return im; }
  OS.eagle = eagle;
  function host(u) { try { return new URL(u).hostname; } catch (e) { return ''; } }
  function tile(it) {
    var t = h('span', 'ic');
    if (it.color) t.style.setProperty('--c', it.color);
    if (it.icon === 'eagle') t.appendChild(eagle());
    else if (it.icon === 'fav') {
      var hn = host(it.url), im = h('img', 'fav'); im.alt = ''; im.loading = 'lazy';
      if (!OS.settings.get('net')) { t.appendChild(h('b', 'ltr', (it.name || hn || '?').charAt(0).toUpperCase())); return t; }
      im.src = 'https://www.google.com/s2/favicons?sz=64&domain=' + encodeURIComponent(hn);
      im.addEventListener('error', function () { t.textContent = ''; t.appendChild(h('b', 'ltr', (it.name || hn || '?').charAt(0).toUpperCase())); });
      t.appendChild(im);
    } else t.innerHTML = svg(it.icon);
    if (it.private) { var l = h('span', 'lock'); l.innerHTML = svg('lock'); t.appendChild(l); }
    return t;
  }
  OS.tile = tile;

  /* ---------- δεδομένα: κατάλογος + Link Hub + δικά μου ---------- */
  var KEY = 'veagleos.custom.v1';
  var custom = [];
  try { custom = JSON.parse(lsGet(KEY, '[]')) || []; } catch (e) { custom = []; }
  function saveCustom() { lsSet(KEY, JSON.stringify(custom)); }
  var hubItems = (window.VEAGLE_HUB || []).map(function (b, i) {
    return { id: 'hub' + i, folder: 'linkhub', section: b.section, name: b.name, url: b.url, desc: b.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''), icon: 'fav' };
  });
  function allItems() {
    var rep = {};
    custom.forEach(function (c) { if (c.replaces) rep[c.replaces] = 1; });
    return C.items.concat(hubItems).filter(function (i) { return !rep[i.id]; }).concat(custom.map(function (c) { c.custom = true; return c; }));
  }
  function folderOf(id) { return C.folders.filter(function (f) { return f.id === id; })[0]; }
  function itemsIn(fid) { return allItems().filter(function (i) { return i.folder === fid || (i.also && i.also.indexOf(fid) >= 0); }); }
  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  OS.allItems = allItems; OS.itemsIn = itemsIn; OS.folderOf = folderOf; OS.norm = norm; OS.custom = function () { return custom; };
  OS.setCustom = function (arr) { custom = arr; saveCustom(); refresh(); };

  /* ---------- κατάσταση ιστότοπων (τελεία πράσινη/κόκκινη) ---------- */
  var probeCache = {};
  function probe(url, ms) {
    if (!OS.settings.get('net')) return Promise.resolve({ ok: false, ms: null, off: true });
    var c = probeCache[url];
    if (c && Date.now() - c.t < 300000) return Promise.resolve(c.r);
    return new Promise(function (res) {
      var t0 = performance.now(), done = false, ctl = window.AbortController ? new AbortController() : null;
      var to = setTimeout(function () { if (ctl) ctl.abort(); fin({ ok: false, ms: null }); }, ms || 7000);
      function fin(r) { if (done) return; done = true; clearTimeout(to); probeCache[url] = { t: Date.now(), r: r }; res(r); }
      fetch(url, { mode: 'no-cors', cache: 'no-store', signal: ctl ? ctl.signal : undefined })
        .then(function () { fin({ ok: true, ms: Math.round(performance.now() - t0) }); })
        .catch(function () { fin({ ok: false, ms: null }); });
    });
  }
  OS.probe = probe;
  function addStatus(root, folderId) {
    if (!OS.settings.get('net') || !OS.settings.get('status') || (folderId !== 'apps' && folderId !== 'ferelis')) return;
    $$('a.item', root).forEach(function (a) {
      if (!/^https?:/.test(a.href) || a.dataset.st) return; a.dataset.st = '1';
      var d = h('i', 'st'); d.title = 'Έλεγχος…'; a.querySelector('.ic').appendChild(d);
      probe(a.href).then(function (r) { d.className = 'st ' + (r.ok ? 'ok' : 'bad'); d.title = r.ok ? 'Απαντά · ' + r.ms + ' ms' : 'Δεν απαντά'; });
    });
  }

  /* ---------- στοιχείο εφαρμογής ---------- */
  function itemEl(it) {
    var el;
    if (it.soon) { el = h('button', 'item soon'); el.type = 'button'; el.title = 'Σχέδιο: πάτα για να βάλεις διεύθυνση'; el.addEventListener('click', function () { openAdd(it.folder, it); }); }
    else if (it.app) { el = h('button', 'item'); el.type = 'button'; el.title = it.desc || it.name; el.addEventListener('click', function () { OS.openApp(it.app); }); }
    else {
      el = h('a', 'item'); el.href = it.url;
      if (!/^mailto:/.test(it.url) && /^https?:/.test(it.url)) { el.target = '_blank'; el.rel = 'noopener noreferrer'; }
      else if (!/^mailto:/.test(it.url)) { el.target = '_blank'; }
      el.title = it.desc || it.name;
    }
    el.appendChild(tile(it));
    el.appendChild(h('span', 'nm', it.name));
    if (it.soon) el.appendChild(h('span', 'sub', 'σχέδιο'));
    if (it.custom) {
      var x = h('button', 'del', '×'); x.type = 'button'; x.title = 'Αφαίρεση'; x.setAttribute('aria-label', 'Αφαίρεση ' + it.name);
      x.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); custom = custom.filter(function (c) { return c.id !== it.id; }); saveCustom(); refresh(); toast('Αφαιρέθηκε: ' + it.name); });
      el.appendChild(x);
    }
    return el;
  }
  function slotEl(fid) {
    var b = h('button', 'item slot'); b.type = 'button'; b.title = 'Νέα θέση';
    var t = h('span', 'ic'); t.innerHTML = svg('plus'); b.appendChild(t); b.appendChild(h('span', 'nm', 'Ελεύθερη θέση'));
    b.addEventListener('click', function () { openAdd(fid); });
    return b;
  }

  /* ---------- παράθυρα ---------- */
  var desk = $('#desk'), wins = OS.wins, zTop = 20;
  function focusWin(w) { zTop++; w.style.zIndex = zTop; $$('.win').forEach(function (x) { x.classList.toggle('on', x === w); }); renderDock(); }
  OS.focusWin = focusWin;
  function fillFolder(w, f) {
    var body = $('.wbody', w); body.textContent = '';
    var list = itemsIn(f.id), used = list.filter(function (i) { return i.custom && i.folder === f.id; }).length;
    var meta = h('div', 'wmeta'); meta.appendChild(h('span', '', f.desc));
    meta.appendChild(h('span', 'cnt', list.filter(function (i) { return !i.soon; }).length + ' στοιχεία'));
    body.appendChild(meta);
    var groups = [], map = {};
    list.forEach(function (i) { var s = i.section || ''; if (!map[s]) { map[s] = { s: s, items: [] }; groups.push(map[s]); } map[s].items.push(i); });
    var last;
    groups.forEach(function (g) {
      if (g.s) body.appendChild(h('h3', 'wsec', g.s));
      var grid = h('div', 'igrid'); g.items.forEach(function (i) { grid.appendChild(itemEl(i)); }); body.appendChild(grid); last = grid;
    });
    if (!last) { last = h('div', 'igrid'); body.appendChild(last); }
    for (var k = 0; k < Math.max(1, f.slots - used); k++) last.appendChild(slotEl(f.id));
    addStatus(body, f.id);
  }
  function makeWin(id, title, path, icon, width) {
    var w = h('section', 'win'); w.setAttribute('role', 'dialog'); w.setAttribute('aria-label', title);
    if (width) w.style.width = width + 'px';
    var bar = h('header', 'wbar'), dots = h('div', 'dots');
    function dot(cls, label) { var b = h('button', 'd ' + cls); b.type = 'button'; b.title = label; b.setAttribute('aria-label', label); dots.appendChild(b); return b; }
    /* στυλ Windows: τίτλος αριστερά, κουμπιά δεξιά (ελαχιστοποίηση, μεγιστοποίηση, κλείσιμο) */
    var m = dot('min', 'Ελαχιστοποίηση'), x = dot('max', 'Μεγιστοποίηση'), c = dot('close', 'Κλείσιμο');
    m.innerHTML = '<svg viewBox="0 0 10 10" width="10" height="10"><path d="M1 5.5h8" stroke="currentColor" stroke-width="1" fill="none"/></svg>';
    x.innerHTML = '<svg viewBox="0 0 10 10" width="10" height="10"><rect x="1.5" y="1.5" width="7" height="7" stroke="currentColor" stroke-width="1" fill="none"/></svg>';
    c.innerHTML = '<svg viewBox="0 0 10 10" width="10" height="10"><path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" stroke-width="1" fill="none"/></svg>';
    var tt = h('div', 'wtitle'); tt.appendChild(h('b', '', title)); tt.appendChild(h('span', '', path)); bar.appendChild(tt);
    bar.appendChild(dots);
    var body = h('div', 'wbody');
    w.appendChild(bar); w.appendChild(body); desk.appendChild(w);
    var n = Object.keys(wins).length, W = desk.clientWidth, H = desk.clientHeight;
    w.style.left = Math.max(8, Math.min(W - 600, 130 + n * 30)) + 'px';
    w.style.top = Math.max(8, Math.min(H - 360, 48 + n * 30)) + 'px';
    c.addEventListener('click', function () { w.remove(); delete wins[id]; if (wins[id + '#x']) delete wins[id + '#x']; OS.emit('winclose', id); renderDock(); });
    m.addEventListener('click', function () { w.classList.add('min'); w.classList.remove('on'); renderDock(); });
    x.addEventListener('click', function () { w.classList.toggle('full'); x.title = w.classList.contains('full') ? 'Επαναφορά' : 'Μεγιστοποίηση'; });
    w.addEventListener('pointerdown', function () { focusWin(w); });
    bar.addEventListener('dblclick', function (e) { if (!e.target.closest('.d')) w.classList.toggle('full'); });
    bar.addEventListener('pointerdown', function (e) {
      if (NARROW() || w.classList.contains('full') || e.target.closest('.d')) return;
      var sx = e.clientX, sy = e.clientY, ox = w.offsetLeft, oy = w.offsetTop;
      bar.setPointerCapture(e.pointerId); bar.classList.add('drag');
      function mv(ev) {
        w.style.left = Math.max(-w.offsetWidth + 80, Math.min(desk.clientWidth - 80, ox + ev.clientX - sx)) + 'px';
        w.style.top = Math.max(0, Math.min(desk.clientHeight - 40, oy + ev.clientY - sy)) + 'px';
      }
      function up() { bar.classList.remove('drag'); bar.removeEventListener('pointermove', mv); bar.removeEventListener('pointerup', up); bar.removeEventListener('pointercancel', up); }
      bar.addEventListener('pointermove', mv); bar.addEventListener('pointerup', up); bar.addEventListener('pointercancel', up);
    });
    wins[id] = { el: w, title: title, icon: icon };
    return w;
  }
  OS.makeWin = makeWin;
  function openFolder(fid) {
    closeLauncher();
    var f = folderOf(fid); if (!f) return;
    var rec = wins['f:' + fid], w;
    if (rec) { w = rec.el; w.classList.remove('min'); }
    else { w = makeWin('f:' + fid, f.name, f.path, f.icon); fillFolder(w, f); }
    focusWin(w);
  }
  OS.openFolder = openFolder;

  /* εφαρμογές που ορίζουν άλλα αρχεία: OS.registerApp('calc', { title, path, icon, width, build(body, win) }) */
  OS.registerApp = function (id, def) { OS.apps[id] = def; };
  OS.openApp = function (id) {
    closeLauncher();
    var def = OS.apps[id]; if (!def) { toast('Η εφαρμογή «' + id + '» δεν είναι διαθέσιμη'); return; }
    var rec = wins['a:' + id], w;
    if (rec) { w = rec.el; w.classList.remove('min'); }
    else { w = makeWin('a:' + id, def.title, def.path || '/usr/' + id, def.icon || 'spark', def.width); def.build($('.wbody', w), w); }
    focusWin(w);
    var f = $('input,textarea,select', w); if (f && def.focus) f.focus();
  };

  /* ---------- τερματικό ---------- */
  var termHist = [], termPos = 0;
  function openTerminal() {
    closeLauncher();
    var rec = wins.term, w;
    if (rec) { w = rec.el; w.classList.remove('min'); focusWin(w); $('.tin', w).focus(); return; }
    w = makeWin('term', 'Τερματικό', 'user@veagle', 'terminal', 600);
    var body = $('.wbody', w); body.classList.add('term');
    var out = h('div', 'tout'); body.appendChild(out);
    var row = h('label', 'trow'); row.appendChild(h('span', 'ps', 'user@veagle:~$'));
    var inp = h('input', 'tin'); inp.type = 'text'; inp.autocomplete = 'off'; inp.spellcheck = false; inp.setAttribute('aria-label', 'Εντολή');
    row.appendChild(inp); body.appendChild(row);
    function say(t, cls) { out.appendChild(h('div', cls || '', t)); body.scrollTop = body.scrollHeight; }
    say('Veagle OS ' + C.version + ' · γράψε help', 'dim');
    body.addEventListener('click', function () { inp.focus(); });
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowUp') { if (termPos > 0) inp.value = termHist[--termPos]; e.preventDefault(); return; }
      if (e.key === 'ArrowDown') { if (termPos < termHist.length) inp.value = termHist[++termPos] || ''; e.preventDefault(); return; }
      if (e.key !== 'Enter') return;
      var cmd = inp.value.trim(); inp.value = '';
      if (!cmd) return;
      termHist.push(cmd); termPos = termHist.length;
      say('$ ' + cmd, 'cmd'); runCmd(cmd, say, out);
    });
    focusWin(w); inp.focus();
  }
  function findItem(q) {
    var n = norm(q); if (!n) return null;
    var list = allItems().filter(function (i) { return !i.soon; });
    return list.filter(function (i) { return norm(i.name) === n || i.id === n; })[0] || list.filter(function (i) { return norm(i.name).indexOf(n) >= 0; })[0] || null;
  }
  function launchItem(it) { if (it.app) OS.openApp(it.app); else window.open(it.url, '_blank', 'noopener'); }
  function runCmd(line, say, out) {
    var p = line.split(/\s+/), c = p[0].toLowerCase(), a = p.slice(1).join(' ');
    if (c === 'help') {
      ['help           αυτή η λίστα', 'ls [φάκελος]   φάκελοι ή περιεχόμενα', 'open <όνομα>   άνοιγμα εφαρμογής ή φακέλου', 'find <λέξη>    αναζήτηση', 'theme [id]     θέματα · χωρίς id: λίστα', 'ws [id]        επιφάνειες εργασίας', 'settings       οι ρυθμίσεις', 'eggs           το θησαυροφυλάκιο', 'about          για το σύστημα', 'date           ημερομηνία και ώρα', 'clear          καθαρισμός'].forEach(function (l) { say(l); });
    } else if (c === 'ls') {
      if (!a) C.folders.forEach(function (f) { say(f.id.padEnd(10) + f.path); });
      else { var f = C.folders.filter(function (x) { return x.id === norm(a) || norm(x.name) === norm(a); })[0]; if (!f) say('ls: δεν βρέθηκε ο φάκελος ' + a, 'err'); else itemsIn(f.id).forEach(function (i) { say(i.name + (i.soon ? '  (σχέδιο)' : '')); }); }
    } else if (c === 'open') {
      if (!a) { say('open: γράψε όνομα', 'err'); return; }
      var it = findItem(a), fo = C.folders.filter(function (x) { return x.id === norm(a) || norm(x.name) === norm(a); })[0];
      if (it) { say('άνοιγμα ' + it.name + ' …'); launchItem(it); }
      else if (fo) openFolder(fo.id);
      else say('open: δεν βρέθηκε το ' + a, 'err');
    } else if (c === 'find') {
      var r = search(a).slice(0, 12); if (!r.length) say('τίποτα', 'dim'); r.forEach(function (i) { say(i.name + '  ·  ' + folderOf(i.folder).name); });
    } else if (c === 'theme') {
      var T = OS.themes; if (!T) { say('theme: δεν φορτώθηκαν τα θέματα', 'err'); return; }
      if (!a) T.list.forEach(function (t) { say((t.id === OS.settings.get('theme') ? '* ' : '  ') + t.id.padEnd(10) + t.name); });
      else if (T.byId[a]) { T.apply(a); say('θέμα: ' + T.byId[a].name); } else say('theme: άγνωστο θέμα', 'err');
    } else if (c === 'ws') {
      if (!a) C.workspaces.forEach(function (w) { say((w.id === OS.settings.get('ws') ? '* ' : '  ') + w.id.padEnd(8) + w.name); });
      else if (C.workspaces.some(function (w) { return w.id === a; })) { OS.setWorkspace(a); say('επιφάνεια: ' + a); } else say('ws: άγνωστη επιφάνεια', 'err');
    } else if (c === 'settings') { OS.openApp('settings');
    } else if (c === 'eggs') { OS.openApp('vault');
    } else if (c === 'about' || c === 'neofetch') {
      ['  VEAGLE OS ' + C.version, '  ' + allItems().length + ' στοιχεία σε ' + C.folders.length + ' φακέλους', '  θέμα: ' + OS.settings.get('theme') + ' · επιφάνεια: ' + OS.settings.get('ws'), '  χρήστης: ' + C.owner, '  Show me the problem.', '  There’s always another way.'].forEach(function (l) { say(l); });
    } else if (c === 'date') { say(new Date().toLocaleString((window.OSLOC||'el-GR'), { dateStyle: 'full', timeStyle: 'medium' }));
    } else if (c === 'whoami') { say(OS.settings.get('name') || 'user');
    } else if (c === 'clear') { out.textContent = '';
    } else if (OS.eggCommand && OS.eggCommand(line, say)) { /* χειρίστηκε από τα eggs */
    } else say(c + ': άγνωστη εντολή · γράψε help', 'err');
  }

  /* ---------- αναζήτηση / launcher ---------- */
  var launch = $('#launch'), lq = $('#lq'), lres = $('#lres'), sel = -1;
  function search(q) {
    var words = norm(q).split(/\s+/).filter(Boolean);
    return allItems().filter(function (i) {
      var hay = norm(i.name + ' ' + (i.desc || '') + ' ' + folderOf(i.folder).name + ' ' + (i.section || ''));
      return words.every(function (w) { return hay.indexOf(w) >= 0; });
    });
  }
  function webRow(href, icon, title, sub) {
    var web = h('a', 'item row web'); web.target = '_blank'; web.rel = 'noopener noreferrer'; web.href = href;
    var ti = h('span', 'ic'); ti.innerHTML = svg(icon); web.appendChild(ti);
    var wt = h('span', 'rt'); wt.appendChild(h('b', '', title)); wt.appendChild(h('span', '', sub)); web.appendChild(wt);
    return web;
  }
  function renderLauncher() {
    var q = lq.value.trim(); lres.textContent = ''; sel = -1;
    if (!q) {
      C.folders.forEach(function (f) {
        var list = allItems().filter(function (i) { return i.folder === f.id; }); if (!list.length) return;
        var sec = h('section', 'lsec'); var hd = h('h3'); hd.innerHTML = svg(f.icon); hd.appendChild(h('span', '', f.name)); sec.appendChild(hd);
        var g = h('div', 'igrid'); list.forEach(function (i) { g.appendChild(itemEl(i)); }); sec.appendChild(g); lres.appendChild(sec);
      });
      return;
    }
    var list = h('div', 'rlist');
    var m = q.match(/^(\S+)\s+(.+)$/), sc = m && C.shortcuts.filter(function (s) { return s.k === m[1].toLowerCase(); })[0];
    if (sc) list.appendChild(webRow(sc.url.replace('%s', encodeURIComponent(m[2])), 'search', sc.name + ': ' + m[2], 'συντόμευση «' + sc.k + '»'));
    var found = search(sc ? m[2] : q);
    found.forEach(function (i) {
      var a = itemEl(i); a.classList.add('row'); a.removeChild(a.querySelector('.nm'));
      var tx = h('span', 'rt'); tx.appendChild(h('b', '', i.name)); tx.appendChild(h('span', '', folderOf(i.folder).name + (i.desc ? ' · ' + i.desc : ''))); a.insertBefore(tx, a.children[1] || null);
      list.appendChild(a);
    });
    var isUrl = /^(https?:\/\/)?[^\s]+\.[a-zA-Z]{2,}(\/\S*)?$/.test(q);
    if (isUrl) list.appendChild(webRow(/^https?:\/\//.test(q) ? q : 'https://' + q, 'globe', 'Άνοιγμα ' + q, 'διεύθυνση ιστού'));
    else if (!sc) list.appendChild(webRow('https://www.google.com/search?q=' + encodeURIComponent(q), 'search', 'Αναζήτηση στο Google', '«' + q + '»'));
    lres.appendChild(list);
    var rows = $$('.row', lres); if (rows[0]) { rows[0].classList.add('sel'); sel = 0; }
  }
  function openLauncher(q) { launch.classList.add('open'); lq.value = q || ''; renderLauncher(); setTimeout(function () { lq.focus(); }, 0); renderDock(); }
  function closeLauncher() { if (launch.classList.contains('open')) { launch.classList.remove('open'); renderDock(); } }
  OS.openLauncher = openLauncher; OS.closeLauncher = closeLauncher;
  lq.addEventListener('input', renderLauncher);
  lq.addEventListener('keydown', function (e) {
    var rows = $$('.row', lres);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!rows.length) return; e.preventDefault();
      sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length;
      rows.forEach(function (r, i) { r.classList.toggle('sel', i === sel); }); rows[sel].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && rows[sel]) { e.preventDefault(); rows[sel].click(); }
  });
  launch.addEventListener('click', function (e) { if (e.target === launch) closeLauncher(); });
  $('#lsettings').addEventListener('click', function () { OS.openApp('settings'); });
  $('#lclose').addEventListener('click', closeLauncher);
  $('#lexport').addEventListener('click', function () { closeLauncher(); OS.openExport(); });
  $('#lhint').textContent = C.shortcuts.map(function (s) { return s.k; }).join(' · ') + ' + κείμενο';

  /* ---------- νέα θέση / εξαγωγή ---------- */
  var modal = $('#modal'), mform = $('#mform'), mexp = $('#mexp'), editing = null;
  var selF = $('#mfolder');
  C.folders.forEach(function (f) { var o = h('option', '', f.name); o.value = f.id; selF.appendChild(o); });
  function openAdd(fid, ghost) {
    editing = ghost || null;
    mform.hidden = false; mexp.hidden = true;
    $('#mtitle').textContent = ghost ? 'Βάλε διεύθυνση στο «' + ghost.name + '»' : 'Νέα εφαρμογή';
    $('#mname').value = ghost ? ghost.name : ''; $('#murl').value = ''; $('#mdesc').value = ghost ? (ghost.desc || '') : '';
    selF.value = fid || 'personal';
    modal.classList.add('open'); setTimeout(function () { (ghost ? $('#murl') : $('#mname')).focus(); }, 0);
  }
  OS.openAdd = openAdd;
  function closeModal() { modal.classList.remove('open'); }
  mform.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('#mname').value.trim(), url = $('#murl').value.trim();
    if (!name || !url) return;
    if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) url = 'https://' + url;
    if (/^(javascript|data):/i.test(url)) { toast('Μη έγκυρη διεύθυνση'); return; }
    var it = { id: 'c' + Date.now().toString(36), folder: selF.value, name: name, desc: $('#mdesc').value.trim(), url: url, icon: editing && editing.icon ? editing.icon : 'fav' };
    if (editing) it.replaces = editing.id;
    custom.push(it); saveCustom(); closeModal(); refresh(); toast('Προστέθηκε: ' + name);
  });
  $('#mcancel').addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
  OS.exportCustomText = function () {
    return custom.length ? custom.map(function (c) {
      return "    { id: '" + c.id + "', folder: '" + c.folder + "', name: " + JSON.stringify(c.name) + ", desc: " + JSON.stringify(c.desc || '') + ", url: " + JSON.stringify(c.url) + ", icon: '" + (c.icon || 'fav') + "'" + (c.replaces ? ", replaces: '" + c.replaces + "'" : '') + ' },';
    }).join('\n') : '// Δεν έχεις προσθέσει ακόμα δικές σου εφαρμογές.';
  };
  function openExport() {
    mform.hidden = true; mexp.hidden = false; $('#mtitle').textContent = 'Εξαγωγή δικών μου';
    $('#mtext').value = OS.exportCustomText(); modal.classList.add('open');
  }
  OS.openExport = openExport;
  $('#mcopy').addEventListener('click', function () {
    var t = $('#mtext'); t.select();
    var done = function () { toast('Αντιγράφηκε. Βάλ’ το στο ITEMS του js/catalog.js'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t.value).then(done, function () { try { doc.execCommand('copy'); done(); } catch (e) {} });
    else { try { doc.execCommand('copy'); done(); } catch (e) {} }
  });
  $('#mclose').addEventListener('click', closeModal);
  var toastT;
  function toast(t) { var e = $('#toast'); e.textContent = t; e.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { e.classList.remove('show'); }, 2600); }
  OS.toast = toast;
  OS.copy = function (text, msg) {
    var done = function () { toast(msg || 'Αντιγράφηκε'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { toast('Η αντιγραφή δεν επιτράπηκε'); });
    else toast('Η αντιγραφή δεν υποστηρίζεται εδώ');
  };

  /* ---------- επιφάνεια: φάκελοι, επιφάνειες εργασίας, dock ---------- */
  function wsOf(id) { return C.workspaces.filter(function (w) { return w.id === id; })[0] || C.workspaces[0]; }
  function visibleFolders() { var w = wsOf(OS.settings.get('ws')); return w.folders ? w.folders.map(folderOf).filter(Boolean) : C.folders; }
  function renderIcons() {
    var box = $('#icons'); box.textContent = '';
    visibleFolders().forEach(function (f) {
      var b = h('button', 'fi'); b.type = 'button'; b.title = f.desc;
      var t = h('span', 'ic fold'); t.innerHTML = svg(f.icon); b.appendChild(t); b.appendChild(h('span', 'nm', f.name));
      b.addEventListener('click', function () { openFolder(f.id); });
      box.appendChild(b);
    });
    $('#wsname').textContent = wsOf(OS.settings.get('ws')).name === 'Όλα' ? '' : 'Επιφάνεια: ' + wsOf(OS.settings.get('ws')).name;
  }
  function renderWs() {
    var box = $('#wsw'); box.textContent = '';
    C.workspaces.forEach(function (w, i) {
      var b = h('button', 'wsb', w.name); b.type = 'button'; b.title = 'Alt+' + (i + 1);
      b.setAttribute('aria-pressed', String(w.id === OS.settings.get('ws')));
      b.addEventListener('click', function () { OS.setWorkspace(w.id); });
      box.appendChild(b);
    });
  }
  OS.setWorkspace = function (id) { OS.settings.set('ws', id); renderIcons(); renderWs(); OS.emit('ws', id); };
  function renderDock() {
    var d = $('#dock'); d.textContent = '';
    function add(icon, label, on, open, color) {
      var b = h('button', 'dk' + (on ? ' on' : '')); b.type = 'button'; b.title = label; b.setAttribute('aria-label', label);
      var t = h('span', 'ic'); if (color) t.style.setProperty('--c', color);
      if (icon === 'eagle') t.appendChild(eagle()); else t.innerHTML = svg(icon);
      b.appendChild(t); b.addEventListener('click', open); d.appendChild(b); return b;
    }
    var pinned = {};
    function isOn(id) { return !!wins[id] && !wins[id].el.classList.contains('min'); }
    C.dock.forEach(function (e) {
      if (e.t === 'sep') { d.appendChild(h('i', 'sep')); return; }
      if (e.t === 'item') { var it = allItems().filter(function (i) { return i.id === e.id; })[0]; if (it) add(it.icon === 'fav' ? 'link' : it.icon, it.name, false, function () { launchItem(it); }, it.color); }
      if (e.t === 'folder') { var f = folderOf(e.id); pinned['f:' + e.id] = 1; add(f.icon, f.name, isOn('f:' + e.id), function () { toggleWin('f:' + e.id, function () { openFolder(e.id); }); }); }
      if (e.t === 'app') { var ap = OS.apps[e.id]; if (ap) { pinned['a:' + e.id] = 1; add(ap.icon, ap.title, isOn('a:' + e.id), function () { toggleWin('a:' + e.id, function () { OS.openApp(e.id); }); }); } }
      if (e.t === 'launcher') add('apps', 'Όλες οι εφαρμογές (Ctrl+K)', launch.classList.contains('open'), function () { openLauncher(''); });
      if (e.t === 'terminal') { pinned.term = 1; add('terminal', 'Τερματικό', isOn('term'), function () { toggleWin('term', openTerminal); }); }
    });
    Object.keys(wins).forEach(function (id) {
      if (pinned[id]) return; var r = wins[id];
      d.appendChild(h('i', 'sep'));
      add(r.icon, r.title, !r.el.classList.contains('min'), function () { toggleWin(id, function () {}); });
    });
  }
  OS.renderDock = renderDock;
  function toggleWin(id, opener) {
    var r = wins[id];
    if (!r) { opener(); return; }
    if (r.el.classList.contains('min')) { r.el.classList.remove('min'); focusWin(r.el); }
    else if (r.el.classList.contains('on')) { r.el.classList.add('min'); r.el.classList.remove('on'); renderDock(); }
    else focusWin(r.el);
  }
  function refresh() {
    Object.keys(wins).forEach(function (id) { if (id.indexOf('f:') === 0) fillFolder(wins[id].el, folderOf(id.slice(2))); });
    if (launch.classList.contains('open')) renderLauncher();
    renderDock(); renderIcons(); stats();
  }
  OS.refresh = refresh;

  /* ---------- γραμμή, widgets ---------- */
  function two(n) { return (n < 10 ? '0' : '') + n; }
  var t0 = Date.now();
  function tick() {
    var d = new Date();
    $('#clk').textContent = two(d.getHours()) + ':' + two(d.getMinutes());
    $('#clkdate').textContent = d.toLocaleDateString((window.OSLOC||'el-GR'), { weekday: 'short', day: 'numeric', month: 'short' });
    $('#wtime').textContent = two(d.getHours()) + ':' + two(d.getMinutes());
    $('#wsec').textContent = two(d.getSeconds());
    $('#wdate').textContent = d.toLocaleDateString((window.OSLOC||'el-GR'), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    var hr = d.getHours();
    $('#greet').textContent = OS.greeting ? OS.greeting(hr) : ((hr < 5 ? 'Καλό ξημέρωμα' : hr < 12 ? 'Καλημέρα' : hr < 18 ? 'Καλό απόγευμα' : hr < 22 ? 'Καλησπέρα' : 'Καλή νύχτα') + (OS.settings.get('name') ? ', ' + OS.settings.get('name') : ''));
    var s = Math.floor((Date.now() - t0) / 1000);
    $('#up').textContent = two(Math.floor(s / 3600)) + ':' + two(Math.floor(s / 60) % 60) + ':' + two(s % 60);
  }
  function stats() {
    $('#nitems').textContent = allItems().filter(function (i) { return !i.soon; }).length;
    $('#nfold').textContent = C.folders.length;
  }
  function net() {
    var on = navigator.onLine !== false;
    $('#net').textContent = on ? 'online' : 'offline'; $('#netdot').classList.toggle('bad', !on);
    if (!on || !OS.settings.get('net')) { $('#ping').textContent = on ? 'τοπικά' : '--'; return; }
    var t = performance.now();
    fetch('https://www.google.com/generate_204?_=' + Date.now(), { mode: 'no-cors', cache: 'no-store' })
      .then(function () { $('#ping').textContent = Math.round(performance.now() - t) + ' ms'; })
      .catch(function () { $('#ping').textContent = '--'; });
  }
  if (navigator.getBattery) navigator.getBattery().then(function (b) {
    function u() { $('#bat').textContent = Math.round(b.level * 100) + '%' + (b.charging ? ' ⚡' : ''); }
    u(); b.addEventListener('levelchange', u); b.addEventListener('chargingchange', u);
  }).catch(function () {});

  /* ECG στη γραμμή (παίρνει το χρώμα από το θέμα) */
  (function () {
    var cv = $('#ecg'); if (!cv || !cv.getContext) return; var x = cv.getContext('2d');
    var RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var W = 84, H = 22, buf = new Array(W).fill(0), head = 0, t = 0;
    var dpr = Math.min(window.devicePixelRatio || 1, 2); cv.width = W * dpr; cv.height = H * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0);
    function g(p, m, s) { return Math.exp(-Math.pow(p - m, 2) / (2 * s * s)); }
    function ecg(p) { return 0.12 * g(p, 0.12, 0.025) - 0.1 * g(p, 0.205, 0.008) + g(p, 0.235, 0.009) - 0.22 * g(p, 0.265, 0.01) + 0.25 * g(p, 0.42, 0.04); }
    function draw() {
      x.clearRect(0, 0, W, H); x.strokeStyle = getComputedStyle(doc.documentElement).getPropertyValue('--accent').trim() || '#ff1e38'; x.lineWidth = 1.2; x.beginPath();
      for (var i = 0; i < W; i++) { var v = buf[(head + i) % W], py = H * 0.78 - v * H * 0.7; if (i === 0) x.moveTo(i, py); else x.lineTo(i, py); }
      x.stroke();
    }
    function step() { t += 1 / 60; var p = (t * 1.05) % 1; buf[head] = ecg(p); head = (head + 1) % W; draw(); if (!RM) requestAnimationFrame(step); }
    if (RM) { for (var i = 0; i < W; i++) buf[i] = ecg(i / W); draw(); } else requestAnimationFrame(step);
  })();

  /* ---------- πλήκτρα ---------- */
  doc.addEventListener('keydown', function (e) {
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test((doc.activeElement || {}).tagName || '');
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); launch.classList.contains('open') ? closeLauncher() : openLauncher(''); return; }
    if (e.key === '/' && !typing) { e.preventDefault(); openLauncher(''); return; }
    if (e.altKey && /^[1-9]$/.test(e.key)) { var w = C.workspaces[Number(e.key) - 1]; if (w) { e.preventDefault(); OS.setWorkspace(w.id); toast('Επιφάνεια: ' + w.name); } return; }
    if (e.key === 'Escape') { if (modal.classList.contains('open')) closeModal(); else if (launch.classList.contains('open')) closeLauncher(); else { var top = $$('.win').filter(function (w) { return w.classList.contains('on'); })[0]; if (top) $('.close', top).click(); } }
  });
  $('#startbtn').addEventListener('click', function () { openLauncher(''); });
  $('#searchbtn').addEventListener('click', function () { openLauncher(''); });
  $('#addbtn').addEventListener('click', function () { openAdd('personal'); });
  $('#setbtn').addEventListener('click', function () { OS.openApp('settings'); });

  /* ---------- εκκίνηση ---------- */
  OS.start = function () {
    var boot = $('#boot');
    function endBoot() { if (!boot) return; boot.classList.add('off'); var b = boot; boot = null; setTimeout(function () { b.remove(); }, 500); try { sessionStorage.setItem('veagleos.booted', '1'); } catch (e) {} }
    var booted = false; try { booted = sessionStorage.getItem('veagleos.booted') === '1'; } catch (e) {}
    if (booted || !OS.settings.get('boot')) { boot.remove(); boot = null; }
    else {
      var lines = ['VEAGLE OS ' + C.version, 'φόρτωση πυρήνα ............ ok', 'τοπική λειτουργία .......... ok', 'φάκελοι: ' + C.folders.length + ' · στοιχεία: ' + (C.items.length + hubItems.length), 'Show me the problem.'];
      var bl = $('#bootlines'), i = 0;
      var iv = setInterval(function () { if (i < lines.length) bl.appendChild(h('div', '', lines[i++])); else { clearInterval(iv); setTimeout(endBoot, 250); } }, 170);
      boot.addEventListener('click', function () { clearInterval(iv); endBoot(); });
      doc.addEventListener('keydown', function f() { clearInterval(iv); endBoot(); }, { once: true });
    }
    OS.emit('start');
    renderWs(); renderIcons(); renderDock(); stats(); tick(); setInterval(tick, 1000); net(); setInterval(net, 30000);
    window.addEventListener('online', net); window.addEventListener('offline', net);
    var qp = new URLSearchParams(location.search), q0 = qp.get('open');
    if (q0) { if (folderOf(q0)) openFolder(q0); else if (OS.apps[q0]) OS.openApp(q0); }
    if (location.hash === '#launcher') openLauncher('');
  };
})();
