/* Διαχειριστής widgets και κέντρο ελέγχου περιβάλλοντος του Veagle OS.
   Εσύ αποφασίζεις τα πάντα: ποια widgets φαίνονται, με ποια σειρά, πόσο πλατιά, πόσο συμπαγή.
   Τίποτα δεν αλλάζει μόνο του. Τα widgets που ρωτούν το internet (sites, DNS, IP) ρωτούν ΜΟΝΟ όταν πατήσεις κουμπί.
   Η διάταξη και οι ρυθμίσεις μένουν στον browser (και μπαίνουν στο αντίγραφο ασφαλείας). */
(function () {
  'use strict';
  var OS = window.OS, C = window.VEAGLE;
  if (!OS || !C) return;
  var $ = OS.$, h = OS.h;
  var aside = $('.widgets'); if (!aside) return;
  var LK = 'veagleos.layout.v1';

  function two(n) { return (n < 10 ? '0' : '') + n; }
  function jget(k, d) { try { var v = JSON.parse(OS.lsGet(k, 'null')); return v == null ? d : v; } catch (e) { return d; } }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function S(k, d) { var v = OS.settings.get(k); return v === undefined ? d : v; }
  function btn(txt, fn, cls) { var b = h('button', 'btn' + (cls ? ' ' + cls : ''), txt); b.type = 'button'; b.addEventListener('click', fn); return b; }
  function launch(it) { if (!it || it.soon) return; if (it.app) OS.openApp(it.app); else if (it.url) window.open(it.url, '_blank', 'noopener'); }
  function netOk() { if (S('net', false)) return true; OS.toast('Το Internet είναι κλειστό. Άνοιξέ το από το Κέντρο ελέγχου ή τις Ρυθμίσεις.'); return false; }
  function itemById(id) { return OS.allItems().filter(function (i) { return i.id === id; })[0]; }

  /* ---------- μητρώο widgets ---------- */
  var REG = {}, ORDER = [];
  function register(def) { if (REG[def.id]) return; REG[def.id] = def; ORDER.push(def.id); }
  /* τα υπάρχοντα widgets (κάρτες του index.html) */
  var kids = Array.prototype.slice.call(aside.children);
  [['time', 'Ρολόι', false, true], ['wx', 'Καιρός', true, true], ['tasks', 'Εκκρεμότητες', true, true], ['system', 'Σύστημα', true, true], ['notes', 'Σημειώσεις', true, true]].forEach(function (x, i) {
    var el = kids[i]; if (!el) return; el.dataset.w = x[0];
    register({ id: x[0], title: x[1], collapsible: x[2], on: x[3], el: el });
  });
  /* το «Σήμερα» μπαίνει δεύτερο, μετά τον καιρό */
  OS.widgets = { register: register, list: function () { return ORDER.slice(); } };

  /* ---------- κατάσταση ---------- */
  var L = jget(LK, null);
  if (!L || !L.lay) L = { v: 1, perWs: false, lay: {}, quick: ['site', 'hub', 'ttasks', 'tset'], sites: ['site', 'hub', 'pccheck', 'notes', 'veagle', 'route'] };
  if (!L.clocks) L.clocks = ['America/Los_Angeles', 'Europe/London'];
  if (!L.cds) L.cds = [];
  function save() { OS.lsSet(LK, JSON.stringify(L)); }
  function defLay() { var o = { order: ORDER.slice(), hidden: {}, col: {}, pos: {} }; ORDER.forEach(function (id) { if (!REG[id].on) o.hidden[id] = 1; }); return o; }
  function wsKey() { return L.perWs ? (S('ws', 'all') || 'all') : 'all'; }
  function lay() {
    var k = wsKey(), l = L.lay[k];
    if (!l) l = L.lay[k] = L.lay.all ? clone(L.lay.all) : defLay();
    if (!l.pos) l.pos = {};
    ORDER.forEach(function (id) { if (l.order.indexOf(id) < 0) { l.order.push(id); if (!REG[id].on) l.hidden[id] = 1; } });
    l.order = l.order.filter(function (id) { return REG[id]; });
    return l;
  }

  /* ---------- εμφάνιση ---------- */
  function mode() { var m = S('wmode', 'one'); return m === 'two' || m === 'free' ? m : 'one'; }
  function deskBox() { var d = aside.parentNode; return { w: d.clientWidth, h: d.clientHeight }; }
  function colW() { var c = aside.querySelector('.card'); return c ? c.offsetWidth || 248 : 248; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function placeFree(l) {
    var box = deskBox(), cw = 248, x = box.w - cw - 14, y = 14, vis = l.order.filter(function (id) { return !l.hidden[id] && REG[id].el; });
    vis.forEach(function (id) { var c = REG[id].el; c.style.zIndex = c.style.zIndex || 1; cw = c.offsetWidth || cw; });
    x = box.w - cw - 14;
    vis.forEach(function (id) {
      var c = REG[id].el, p = l.pos[id], hgt = c.offsetHeight || 120;
      if (!p) {
        if (y + hgt > box.h - 90 && y > 14) { y = 14; x -= cw + 12; }
        p = l.pos[id] = { x: clamp(x, 8, box.w - cw - 8) / box.w, y: y / box.h }; y += hgt + 12; save();
      }
      c.style.left = clamp(p.x * box.w, 0, Math.max(0, box.w - cw)) + 'px';
      c.style.top = clamp(p.y * box.h, 0, Math.max(0, box.h - 40)) + 'px';
    });
  }
  var zTopW = 5;
  function freeDrag(d) {
    var el = d.el, hd = el.querySelector('h2'); if (!hd) return;
    hd.addEventListener('pointerdown', function (e) {
      if (mode() !== 'free' || e.button > 0 || e.target.closest('button')) return;
      e.preventDefault(); el.style.zIndex = ++zTopW;
      var sx = e.clientX, sy = e.clientY, ox = el.offsetLeft, oy = el.offsetTop, box = deskBox(); el.classList.add('wdragging');
      function mv(ev) { el.style.left = clamp(ox + ev.clientX - sx, 0, Math.max(0, box.w - el.offsetWidth)) + 'px'; el.style.top = clamp(oy + ev.clientY - sy, 0, Math.max(0, box.h - 40)) + 'px'; }
      function up() { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); el.classList.remove('wdragging'); var l = lay(); l.pos[d.id] = { x: el.offsetLeft / box.w, y: el.offsetTop / box.h }; save(); }
      document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
    });
    hd.addEventListener('keydown', function (e) {
      if (mode() !== 'free' || !/^Arrow/.test(e.key)) return; e.preventDefault();
      var st = e.shiftKey ? 60 : 12, box = deskBox(), l = lay(), p = l.pos[d.id] || { x: 0, y: 0 }, dx = e.key === 'ArrowLeft' ? -st : e.key === 'ArrowRight' ? st : 0, dy = e.key === 'ArrowUp' ? -st : e.key === 'ArrowDown' ? st : 0;
      l.pos[d.id] = { x: clamp(p.x + dx / box.w, 0, 1), y: clamp(p.y + dy / box.h, 0, 1) }; save(); placeFree(l);
    });
    hd.tabIndex = 0; hd.setAttribute('aria-label', d.title + ': σύρε με το ποντίκι ή χρησιμοποίησε τα βέλη για να μετακινήσεις (στην ελεύθερη διάταξη)');
  }
  var footer = h('div', 'wfoot'); var hiddenBox = h('div', 'wnew');
  var editing = false;
  function render() {
    var l = lay();
    l.order.forEach(function (id) {
      var d = REG[id]; if (!d.el) return;
      aside.appendChild(d.el);
      d.el.hidden = !!l.hidden[id];
      d.el.classList.toggle('wcol', !!l.col[id] && d.collapsible !== false);
      if (!d.bar) addBar(d);
    });
    aside.appendChild(footer);
    paintFooter();
    var free = mode() === 'free';
    Array.prototype.forEach.call(aside.querySelectorAll('.card'), function (c) { c.draggable = editing && !free; });
    if (free) placeFree(l);
    else Array.prototype.forEach.call(aside.querySelectorAll('.card'), function (c) { c.style.left = c.style.top = ''; });
  }
  function move(id, dir) {
    var l = lay(), i = l.order.indexOf(id), j = i + dir;
    while (j >= 0 && j < l.order.length && l.hidden[l.order[j]]) j += dir;
    if (j < 0 || j >= l.order.length) return;
    l.order.splice(i, 1); l.order.splice(j, 0, id); save(); render();
  }
  function addBar(d) {
    var bar = h('div', 'wgbar'); d.bar = bar;
    function b(txt, label, fn) { var x = h('button', '', txt); x.type = 'button'; x.setAttribute('aria-label', label + ': ' + d.title); x.title = label; x.addEventListener('click', function (e) { e.stopPropagation(); fn(); }); bar.appendChild(x); }
    b('↑', 'Πάνω', function () { move(d.id, -1); });
    b('↓', 'Κάτω', function () { move(d.id, 1); });
    if (d.collapsible !== false) b('–', 'Σύμπτυξη', function () { var l = lay(); l.col[d.id] = l.col[d.id] ? 0 : 1; save(); render(); });
    b('×', 'Απόκρυψη', function () { var l = lay(); l.hidden[d.id] = 1; save(); render(); });
    d.el.appendChild(bar); freeDrag(d);
    d.el.addEventListener('dragstart', function (e) { if (!editing) return; e.dataTransfer.setData('text/plain', d.id); e.dataTransfer.effectAllowed = 'move'; });
    d.el.addEventListener('dragover', function (e) { if (!editing) return; e.preventDefault(); d.el.classList.add('wdrop'); });
    d.el.addEventListener('dragleave', function () { d.el.classList.remove('wdrop'); });
    d.el.addEventListener('drop', function (e) {
      if (!editing) return; e.preventDefault(); d.el.classList.remove('wdrop');
      var from = e.dataTransfer.getData('text/plain'), l = lay(); if (!from || from === d.id || !REG[from]) return;
      l.order.splice(l.order.indexOf(from), 1); l.order.splice(l.order.indexOf(d.id), 0, from); save(); render();
    });
  }
  function paintFooter() {
    footer.textContent = '';
    if (!editing) { footer.appendChild(btn('Προσαρμογή', function () { setEdit(true); }, 'wlink')); return; }
    footer.appendChild(h('p', 'wnote', 'Πάνω σε κάθε κάρτα έχεις βελάκια για σειρά, «–» για σύμπτυξη και «×» για απόκρυψη. Μπορείς και να τις σύρεις.'));
    var l = lay(), hid = l.order.filter(function (id) { return l.hidden[id]; });
    footer.appendChild(h('h2', '', 'Κρυμμένα widgets'));
    if (!hid.length) footer.appendChild(h('p', 'wnote', 'Όλα τα widgets φαίνονται.'));
    hid.forEach(function (id) {
      var r = h('div', 'wrow'); r.appendChild(h('span', '', REG[id].title));
      r.appendChild(btn('Πρόσθεσε', function () { l.hidden[id] = 0; save(); render(); })); footer.appendChild(r);
    });
    var r2 = h('div', 'wrow'); r2.appendChild(btn('Επαναφορά διάταξης', function () { if (window.confirm('Να γυρίσει η διάταξη των widgets όπως ήταν αρχικά;')) { L.lay[wsKey()] = defLay(); save(); render(); OS.toast('Η διάταξη επανήλθε'); } }));
    r2.appendChild(btn('Τέλος', function () { setEdit(false); }, 'pri')); footer.appendChild(r2);
  }
  function setEdit(on) {
    editing = !!on; aside.classList.toggle('wedit', editing);
    if (editing && document.documentElement.classList.contains('nowidgets')) { OS.settings.set('widgets', true); applyEnv(); }
    render();
    if (OS.widgets && OS.widgets.refresh) OS.widgets.refresh();
  }

  /* ---------- περιβάλλον ---------- */
  function applyEnv() {
    var r = document.documentElement;
    r.dataset.wpanel = S('wpanel', 'normal'); r.dataset.iconsize = S('iconsize', 'normal'); r.dataset.density = S('density', 'comfortable'); r.dataset.secs = S('secs', true) ? 'on' : 'off'; r.dataset.wmode = mode();
    r.classList.toggle('nowidgets', !S('widgets', true));
  }

  /* ---------- βοηθοί για widgets ---------- */
  function mkCard(id, title) { var c = h('div', 'card w-' + id); c.dataset.w = id; c.appendChild(h('h2', '', title)); return c; }
  function addWidget(id, title, on, build) {
    var el = mkCard(id, title), body = h('div', 'wb'); el.appendChild(body);
    var rend = build(body, el); register({ id: id, title: title, collapsible: true, on: on, el: el, render: rend });
  }
  function picker(list, key, body, rerender) {
    var wrap = h('div', 'wpick'), sel = h('select'); sel.setAttribute('aria-label', 'Διάλεξε στοιχείο');
    OS.allItems().filter(function (i) { return !i.soon && (i.url || i.app) && L[key].indexOf(i.id) < 0 && i.folder !== 'linkhub'; }).forEach(function (i) { var o = h('option', '', i.name); o.value = i.id; sel.appendChild(o); });
    wrap.appendChild(sel); wrap.appendChild(btn('Πρόσθεσε', function () { if (sel.value) { L[key].push(sel.value); save(); rerender(); } }));
    body.appendChild(wrap);
  }

  /* Σήμερα: οι εκκρεμότητές σου (τοπικά, χωρίς δίκτυο) */
  addWidget('today', 'Σήμερα', true, function (body) {
    function render() {
      body.textContent = '';
      var tk = jget('veagleos.tasks.v1', []).filter(function (t) { return !t.done; });
      if (!tk.length) { body.appendChild(h('p', 'wnote', 'Δεν έχεις ανοιχτές εκκρεμότητες.')); }
      else {
        body.appendChild(h('p', 'wnote', tk.length + ' ανοιχτές εκκρεμότητες:'));
        var ul = h('ul', 'wl'); tk.slice(0, 4).forEach(function (t) { var li = h('li'); li.appendChild(h('span', '', t.text)); ul.appendChild(li); }); body.appendChild(ul);
      }
      body.appendChild(btn('Άνοιγμα εκκρεμοτήτων', function () { OS.openApp('tasks'); }));
    }
    render(); return render;
  });

  /* Συντομεύσεις */
  addWidget('quick', 'Συντομεύσεις', false, function (body) {
    function render() {
      body.textContent = '';
      var g = h('div', 'wgrid'); body.appendChild(g);
      L.quick.forEach(function (id) {
        var it = itemById(id); if (!it) return;
        var t = h('button', 'wtile'); t.type = 'button'; t.title = it.desc || it.name;
        var ic = h('span', 'wic'); ic.innerHTML = OS.svg(it.icon || 'globe'); t.appendChild(ic); t.appendChild(h('span', '', it.name));
        t.addEventListener('click', function () { if (aside.classList.contains('wedit')) { L.quick = L.quick.filter(function (x) { return x !== id; }); save(); render(); } else launch(it); });
        if (aside.classList.contains('wedit')) t.title = 'Πάτα για να αφαιρεθεί';
        g.appendChild(t);
      });
      if (!L.quick.length) body.appendChild(h('p', 'wnote', 'Καμία συντόμευση ακόμα. Πάτα «Προσαρμογή» για να προσθέσεις.'));
      if (aside.classList.contains('wedit')) { body.appendChild(h('p', 'wnote', 'Πάτα μια συντόμευση για να την αφαιρέσεις.')); picker(L.quick, 'quick', body, render); }
    }
    render(); return render;
  });

  /* Κατάσταση sites (μόνο με κουμπί) */
  addWidget('sites', 'Τα sites μου', false, function (body) {
    var res = {};
    function render() {
      body.textContent = '';
      var ul = h('ul', 'wl'); body.appendChild(ul);
      L.sites.forEach(function (id) {
        var it = itemById(id); if (!it || !it.url) return;
        var li = h('li'), nm = h('span', '', it.name), st = h('small', '', res[id] ? (res[id].ok ? 'απαντά · ' + res[id].ms + ' ms' : 'ΔΕΝ ΑΠΑΝΤΑ') : '—');
        if (res[id] && !res[id].ok) nm.className = 'wbad';
        li.appendChild(nm); li.appendChild(st);
        if (aside.classList.contains('wedit')) { var x = h('button', '', '×'); x.type = 'button'; x.setAttribute('aria-label', 'Αφαίρεση ' + it.name); x.addEventListener('click', function () { L.sites = L.sites.filter(function (k) { return k !== id; }); save(); render(); }); li.appendChild(x); }
        ul.appendChild(li);
      });
      if (!L.sites.length) body.appendChild(h('p', 'wnote', 'Κανένα site στη λίστα.'));
      body.appendChild(h('p', 'wnote', 'Ρωτάει τα sites μόνο όταν πατήσεις το κουμπί.'));
      body.appendChild(btn('Έλεγχος τώρα', function () {
        if (!netOk()) return;
        L.sites.forEach(function (id) { var it = itemById(id); if (!it || !it.url || !/^https?:/.test(it.url)) return; OS.probe(it.url + (it.url.indexOf('?') < 0 ? '?' : '&') + '_=' + Date.now(), 8000).then(function (r) { res[id] = r; render(); }); });
      }, 'pri'));
      if (aside.classList.contains('wedit')) picker(L.sites, 'sites', body, render);
    }
    render(); return render;
  });

  /* Pomodoro: ξεκινά και σταματά μόνο όταν πατήσεις */
  addWidget('timer', 'Pomodoro', false, function (body) {
    var st = { work: true, left: 25 * 60, run: false, len: 25 }, iv = null;
    var out = h('div', 'wbig'), lab = h('p', 'wnote'), r = h('div', 'wrow');
    var go = btn('Έναρξη', toggle, 'pri'), rs = btn('Επαναφορά', reset), sel = h('select'); sel.setAttribute('aria-label', 'Διάρκεια εργασίας');
    [15, 25, 50].forEach(function (m) { var o = h('option', '', m + ' λεπτά'); o.value = String(m); if (m === 25) o.selected = true; sel.appendChild(o); });
    sel.addEventListener('change', function () { st.len = +sel.value; reset(); });
    function paint() { out.textContent = two(Math.floor(st.left / 60)) + ':' + two(st.left % 60); lab.textContent = st.work ? 'Εργασία' : 'Διάλειμμα (5 λεπτά)'; go.textContent = st.run ? 'Παύση' : 'Έναρξη'; }
    function stop() { st.run = false; if (iv) { clearInterval(iv); iv = null; } }
    function toggle() {
      if (st.run) { stop(); paint(); return; }
      st.run = true; iv = setInterval(function () {
        st.left--; if (st.left <= 0) { stop(); OS.toast(st.work ? 'Τέλος εργασίας. Πάρε διάλειμμα.' : 'Τέλος διαλείμματος.'); st.work = !st.work; st.left = (st.work ? st.len : 5) * 60; }
        paint();
      }, 1000); paint();
    }
    function reset() { stop(); st.work = true; st.left = st.len * 60; paint(); }
    r.appendChild(go); r.appendChild(rs); body.appendChild(out); body.appendChild(lab); body.appendChild(r); body.appendChild(sel);
    paint(); return null;
  });

  /* Ώρες άλλων πόλεων (τοπικά, χωρίς δίκτυο) */
  var CITIES = [['America/Los_Angeles', 'Λος Άντζελες'], ['America/New_York', 'Νέα Υόρκη'], ['America/Chicago', 'Σικάγο'], ['Europe/London', 'Λονδίνο'], ['Europe/Berlin', 'Βερολίνο'], ['Europe/Paris', 'Παρίσι'], ['Europe/Rome', 'Ρώμη'], ['Europe/Istanbul', 'Κωνσταντινούπολη'], ['Asia/Dubai', 'Ντουμπάι'], ['Asia/Tokyo', 'Τόκιο'], ['Asia/Singapore', 'Σιγκαπούρη'], ['Australia/Sydney', 'Σίδνεϊ']];
  function cityName(z) { var c = CITIES.filter(function (x) { return x[0] === z; })[0]; return c ? c[1] : z; }
  function tzParts(z, d) {
    var f = new Intl.DateTimeFormat('en-GB', { timeZone: z, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }), o = {};
    f.formatToParts(d).forEach(function (x) { o[x.type] = x.value; });
    return { t: (o.hour === '24' ? '00' : o.hour) + ':' + o.minute, day: +o.year * 10000 + +o.month * 100 + +o.day, utc: Date.UTC(+o.year, +o.month - 1, +o.day, +(o.hour === '24' ? 0 : o.hour), +o.minute) };
  }
  function myZone() { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) { return 'UTC'; } }
  addWidget('clocks', 'Ώρες στον κόσμο', false, function (body) {
    function render() {
      body.textContent = '';
      var now = new Date(), me = tzParts(myZone(), now), ul = h('ul', 'wl'); body.appendChild(ul);
      L.clocks.forEach(function (z) {
        var t; try { t = tzParts(z, now); } catch (e) { return; }
        var diff = Math.round((t.utc - me.utc) / 3600000), dl = t.day === me.day ? '' : (t.day < me.day ? ' · χθες' : ' · αύριο');
        var li = h('li'); li.appendChild(h('span', '', cityName(z)));
        li.appendChild(h('small', '', t.t + dl + ' (' + (diff > 0 ? '+' : '') + diff + ' ώρες)'));
        if (aside.classList.contains('wedit')) { var x = h('button', '', '×'); x.type = 'button'; x.setAttribute('aria-label', 'Αφαίρεση ' + cityName(z)); x.addEventListener('click', function () { L.clocks = L.clocks.filter(function (k) { return k !== z; }); save(); render(); }); li.appendChild(x); }
        ul.appendChild(li);
      });
      if (!L.clocks.length) body.appendChild(h('p', 'wnote', 'Καμία πόλη. Πάτα «Προσαρμογή» για να προσθέσεις.'));
      body.appendChild(h('p', 'wnote', 'Οι διαφορές είναι σε σχέση με την ώρα της συσκευής σου.'));
      if (aside.classList.contains('wedit')) {
        var wrap = h('div', 'wpick'), sel2 = h('select'); sel2.setAttribute('aria-label', 'Διάλεξε πόλη');
        CITIES.filter(function (c) { return L.clocks.indexOf(c[0]) < 0; }).forEach(function (c) { var o = h('option', '', c[1]); o.value = c[0]; sel2.appendChild(o); });
        wrap.appendChild(sel2); wrap.appendChild(btn('Πρόσθεσε', function () { if (sel2.value) { L.clocks.push(sel2.value); save(); render(); } })); body.appendChild(wrap);
      }
    }
    render(); setInterval(function () { if (!aside.classList.contains('wedit')) render(); }, 20000); return render;
  });

  /* Αντίστροφη μέτρηση για ό,τι ορίσεις εσύ */
  addWidget('cds', 'Αντίστροφη μέτρηση', false, function (body) {
    function days(ds) { var a = new Date(); a.setHours(0, 0, 0, 0); var p = ds.split('-'), b = new Date(+p[0], +p[1] - 1, +p[2]); return Math.round((b - a) / 86400000); }
    function render() {
      body.textContent = '';
      var ul = h('ul', 'wl'); body.appendChild(ul);
      L.cds.slice().sort(function (a, b) { return a.d < b.d ? -1 : 1; }).forEach(function (c) {
        var n = days(c.d), txt = n === 0 ? 'ΣΗΜΕΡΑ' : n === 1 ? 'αύριο' : n > 1 ? 'σε ' + n + ' ημέρες' : (window.OSLANG === 'en' ? (-n) + (n === -1 ? ' day ago' : ' days ago') : 'πριν ' + (-n) + (n === -1 ? ' ημέρα' : ' ημέρες'));
        var li = h('li'); li.appendChild(h('span', '', c.n)); li.appendChild(h('small', '', txt + ' · ' + c.d.split('-').reverse().join('/')));
        if (aside.classList.contains('wedit')) { var x = h('button', '', '×'); x.type = 'button'; x.setAttribute('aria-label', 'Διαγραφή ' + c.n); x.addEventListener('click', function () { L.cds = L.cds.filter(function (k) { return k !== c; }); save(); render(); }); li.appendChild(x); }
        ul.appendChild(li);
      });
      if (!L.cds.length) body.appendChild(h('p', 'wnote', 'Καμία μέτρηση ακόμα. Πάτα «Προσαρμογή» και πρόσθεσε μία, π.χ. «Ταξίδι» με ημερομηνία.'));
      if (aside.classList.contains('wedit')) {
        var nm = h('input'); nm.type = 'text'; nm.placeholder = 'Όνομα (π.χ. Ταξίδι)'; nm.maxLength = 40; nm.setAttribute('aria-label', 'Όνομα');
        var dt = h('input'); dt.type = 'date'; dt.setAttribute('aria-label', 'Ημερομηνία');
        var f = h('div', 'wcdform'); f.appendChild(nm); f.appendChild(dt);
        f.appendChild(btn('Πρόσθεσε', function () { var n = nm.value.trim(); if (!n || !dt.value) { OS.toast('Γράψε όνομα και διάλεξε ημερομηνία'); return; } L.cds.push({ n: n, d: dt.value }); save(); render(); }));
        body.appendChild(f);
      }
    }
    render(); return render;
  });

  /* Διαχείριση εργασιών: τι μπορεί να δει ΠΡΑΓΜΑΤΙΚΑ ένας browser + τα ανοιχτά παράθυρα του Veagle OS */
  addWidget('taskmgr', 'Διαχείριση εργασιών', false, function (body) {
    var on = false, lagT = null, raf = 0, frames = 0, fps = 0, lag = 0, last = 0, fpsT = 0, bat = null, store = null, hist = [];
    var info = h('div', 'wtm'), wins = h('div', 'wtmw'), ctl = h('div', 'wrow');
    function meter(label, val, txt, cls) { var r = h('div', 'wm'); r.appendChild(h('span', '', label)); var b = h('div', 'wmb'), f = h('i'); f.style.width = Math.max(2, Math.min(100, val)) + '%'; if (cls) f.className = cls; b.appendChild(f); r.appendChild(b); r.appendChild(h('small', '', txt)); return r; }
    function mb(n) { return (n / 1048576).toLocaleString((window.OSLOC || 'el-GR'), { maximumFractionDigits: n > 1073741824 ? 0 : 1 }) + ' MB'; }
    function draw() {
      info.textContent = '';
      var kv = h('div', 'kv'); function row(a, b) { kv.appendChild(h('span', '', a)); kv.appendChild(h('b', '', b)); }
      row('Πυρήνες επεξεργαστή', navigator.hardwareConcurrency ? String(navigator.hardwareConcurrency) : 'δεν δίνεται');
      if (navigator.deviceMemory) row('Μνήμη υπολογιστή', 'περίπου ' + (navigator.deviceMemory >= 8 ? '8+' : navigator.deviceMemory) + ' GB');
      info.appendChild(kv);
      if (!on) { info.appendChild(h('p', 'wnote', 'Πάτα «Έναρξη» για ζωντανές τιμές. Ο browser δεν δίνει το πραγματικό ποσοστό CPU ή RAM του υπολογιστή, γι’ αυτό δείχνω όσα μπορεί να μετρήσει με ακρίβεια.')); return; }
      var lt = lag < 30 ? 'ήσυχα' : lag < 100 ? 'μέτρια' : 'βαριά';
      info.appendChild(meter('Φόρτος browser', Math.min(100, lag / 2), lt + ' · καθυστέρηση ' + Math.round(lag) + ' ms', lag >= 100 ? 'bad' : ''));
      info.appendChild(meter('Ρυθμός καρέ', fps / 60 * 100, Math.round(fps) + ' fps', fps && fps < 25 ? 'bad' : ''));
      var pm = performance.memory;
      if (pm) info.appendChild(meter('Μνήμη σελίδας', pm.usedJSHeapSize / pm.jsHeapSizeLimit * 100, mb(pm.usedJSHeapSize) + ' από ' + mb(pm.jsHeapSizeLimit)));
      if (store && store.quota) info.appendChild(meter('Δεδομένα αποθήκευσης', store.usage / store.quota * 100, mb(store.usage) + ' (αυτό το site)'));
      if (bat) info.appendChild(meter('Μπαταρία', bat.level * 100, Math.round(bat.level * 100) + '%' + (bat.charging ? ' · φορτίζει' : ''), bat.level < .2 && !bat.charging ? 'bad' : ''));
      var cn = navigator.connection, nk = h('div', 'kv'); nk.appendChild(h('span', '', 'Δίκτυο')); nk.appendChild(h('b', '', navigator.onLine ? (cn && cn.effectiveType ? cn.effectiveType.toUpperCase() + (cn.downlink ? ' · ' + cn.downlink + ' Mbps' : '') + (cn.rtt ? ' · ' + cn.rtt + ' ms' : '') : 'συνδεδεμένο') : 'εκτός σύνδεσης')); info.appendChild(nk);
    }
    function drawWins() {
      wins.textContent = ''; wins.appendChild(h('h3', 'wtmh', 'Ανοιχτά παράθυρα'));
      var ws = Array.prototype.slice.call(document.querySelectorAll('.win'));
      if (!ws.length) { wins.appendChild(h('p', 'wnote', 'Κανένα ανοιχτό παράθυρο.')); return; }
      var ul = h('ul', 'wl');
      ws.forEach(function (w) {
        var li = h('li'), nm = h('button', 'wlk', w.getAttribute('aria-label') || 'Παράθυρο'); nm.type = 'button'; nm.title = 'Εμφάνιση'; nm.addEventListener('click', function () { w.classList.remove('min'); OS.focusWin(w); });
        var st = h('small', '', w.classList.contains('min') ? 'ελαχιστοποιημένο' : 'ανοιχτό'), x = h('button', '', '×'); x.type = 'button'; x.setAttribute('aria-label', 'Κλείσιμο ' + (w.getAttribute('aria-label') || 'παραθύρου'));
        x.addEventListener('click', function () { var c = w.querySelector('.close'); if (c) c.click(); setTimeout(drawWins, 150); });
        li.appendChild(nm); li.appendChild(st); li.appendChild(x); ul.appendChild(li);
      });
      wins.appendChild(ul);
    }
    function tick() { var n = performance.now(); if (last) lag = Math.max(0, n - last - 1000); last = n; hist.push(lag); if (hist.length > 5) hist.shift(); lag = hist.reduce(function (a, b) { return a + b; }, 0) / hist.length; draw(); }
    function frame() { frames++; raf = requestAnimationFrame(frame); }
    function start() {
      on = true; last = 0; frames = 0; hist = []; raf = requestAnimationFrame(frame); fpsT = performance.now();
      lagT = setInterval(function () { if (document.hidden) { last = 0; return; } var n = performance.now(); fps = frames / ((n - fpsT) / 1000); frames = 0; fpsT = n; tick(); drawWins(); }, 1000);
      if (navigator.getBattery) navigator.getBattery().then(function (b) { bat = b; draw(); }).catch(function () {});
      if (navigator.storage && navigator.storage.estimate) navigator.storage.estimate().then(function (e) { store = e; draw(); }).catch(function () {});
      go.textContent = 'Διακοπή'; draw();
    }
    function stop() { on = false; clearInterval(lagT); cancelAnimationFrame(raf); go.textContent = 'Έναρξη'; draw(); }
    var go = btn('Έναρξη', function () { on ? stop() : start(); }, 'pri'); ctl.appendChild(go);
    body.appendChild(info); body.appendChild(ctl); body.appendChild(wins);
    draw(); drawWins();
    return drawWins;
  });

  /* IP και DNS: ρωτά μόνο όταν πατήσεις κουμπί (DNS μέσω HTTPS από Cloudflare ή Google) */
  addWidget('dns', 'IP και DNS', false, function (body) {
    var TY = { A: 1, NS: 2, CNAME: 5, SOA: 6, PTR: 12, MX: 15, TXT: 16, AAAA: 28 }, NM = {}; Object.keys(TY).forEach(function (k) { NM[TY[k]] = k; });
    var out = h('div', 'wdnsout'), inp = h('input'), ty = h('select'), pv = h('select');
    inp.type = 'text'; inp.placeholder = 'π.χ. ferelis.gr ή 8.8.8.8'; inp.setAttribute('aria-label', 'Όνομα site ή διεύθυνση IP'); inp.spellcheck = false; inp.autocomplete = 'off';
    [['ALL', 'Όλα τα βασικά'], ['A', 'A (IPv4)'], ['AAAA', 'AAAA (IPv6)'], ['MX', 'MX (email)'], ['NS', 'NS (διακομιστές ονομάτων)'], ['TXT', 'TXT (κείμενο)'], ['CNAME', 'CNAME (ψευδώνυμο)'], ['SOA', 'SOA']].forEach(function (o) { var op = h('option', '', o[1]); op.value = o[0]; ty.appendChild(op); }); ty.setAttribute('aria-label', 'Τύπος εγγραφής');
    [['cf', 'Cloudflare (1.1.1.1)'], ['g', 'Google (8.8.8.8)']].forEach(function (o) { var op = h('option', '', o[1]); op.value = o[0]; pv.appendChild(op); }); pv.setAttribute('aria-label', 'Ποιον διακομιστή DNS να ρωτήσω');
    var last = '';
    function say(txt, bad) { out.textContent = ''; out.appendChild(h('p', 'wnote' + (bad ? ' wbad' : ''), txt)); }
    function isV4(x) { return /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.test(x) && x.split('.').every(function (n) { return +n < 256; }); }
    function v6ptr(x) {
      var p = x.split('::'); if (p.length > 2 || !/^[0-9a-f:]+$/i.test(x)) return null;
      var a = p[0] ? p[0].split(':') : [], b = p.length > 1 && p[1] ? p[1].split(':') : [];
      if (p.length === 1 && a.length !== 8) return null; if (a.length + b.length > 8) return null;
      while (a.length + b.length < 8) a.push('0'); var all = a.concat(b), n = '';
      for (var i = 0; i < all.length; i++) { if (all[i].length > 4) return null; n += ('0000' + all[i]).slice(-4); }
      return n.split('').reverse().join('.') + '.ip6.arpa';
    }
    function query(name, type) {
      var u = pv.value === 'g' ? 'https://dns.google/resolve?name=' + encodeURIComponent(name) + '&type=' + type : 'https://cloudflare-dns.com/dns-query?name=' + encodeURIComponent(name) + '&type=' + type;
      return fetch(u, { headers: { Accept: 'application/dns-json' } }).then(function (r) { if (!r.ok) throw r.status; return r.json(); });
    }
    function clean(d, t) { return t === 16 ? String(d).replace(/^"|"$/g, '').replace(/" "/g, '') : String(d); }
    function lookup() {
      if (!netOk()) return;
      var q = inp.value.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '').replace(/\.$/, '');
      if (!q) { say('Γράψε ένα όνομα (π.χ. ferelis.gr) ή μια διεύθυνση IP.', true); return; }
      var jobs, v6 = q.indexOf(':') >= 0;
      if (isV4(q)) jobs = [[q.split('.').reverse().join('.') + '.in-addr.arpa', 'PTR']];
      else if (v6) { var rp = v6ptr(q.toLowerCase()); if (!rp) { say('Η διεύθυνση IPv6 δεν φαίνεται σωστή.', true); return; } jobs = [[rp, 'PTR']]; }
      else if (/^[a-z0-9_.-]+$/i.test(q) && q.indexOf('.') > 0) jobs = (ty.value === 'ALL' ? ['A', 'AAAA', 'MX', 'NS', 'TXT'] : [ty.value]).map(function (t) { return [q, t]; });
      else { say('Αυτό δεν μοιάζει με όνομα site ή IP. Δοκίμασε π.χ. ferelis.gr', true); return; }
      say('Ρωτάω…'); last = '';
      Promise.all(jobs.map(function (j) { return query(j[0], j[1]).then(function (r) { return { t: j[1], r: r }; }, function (e) { return { t: j[1], err: e }; }); })).then(function (res) {
        out.textContent = ''; var txt = q + '\n', any = false, fail = res.every(function (x) { return x.err !== undefined; });
        if (fail) { say('Δεν πήρα απάντηση. Έλεγξε τη σύνδεσή σου ή δοκίμασε τον άλλο διακομιστή.', true); return; }
        res.forEach(function (x) {
          var sec = h('div', 'wdsec'); sec.appendChild(h('b', '', x.t === 'PTR' ? 'Όνομα για αυτή την IP' : x.t));
          if (x.err !== undefined) { sec.appendChild(h('small', 'wbad', 'δεν φόρτωσε')); out.appendChild(sec); return; }
          if (x.r.Status === 3) { sec.appendChild(h('small', '', 'το όνομα δεν υπάρχει')); out.appendChild(sec); txt += x.t + ': δεν υπάρχει\n'; return; }
          var an = (x.r.Answer || []).filter(function (a) { return a.type === TY[x.t]; });
          if (!an.length) sec.appendChild(h('small', '', 'καμία εγγραφή'));
          an.forEach(function (a) { any = true; var l = clean(a.data, a.type); txt += x.t + ': ' + l + '\n'; var r = h('div', 'wdrow'); r.appendChild(h('span', '', l)); r.appendChild(h('small', '', 'TTL ' + a.TTL + 's')); sec.appendChild(r); });
          out.appendChild(sec);
        });
        last = txt; if (any) out.appendChild(btn('Αντιγραφή αποτελέσματος', function () { OS.copy(last); }));
      });
    }
    function myip() {
      if (!netOk()) return;
      say('Ρωτάω…');
      fetch('https://api.ipify.org?format=json').then(function (r) { return r.json(); }).then(function (j) {
        out.textContent = ''; var sec = h('div', 'wdsec'); sec.appendChild(h('b', '', 'Η δημόσια IP σου')); var r = h('div', 'wdrow'); r.appendChild(h('span', '', j.ip)); sec.appendChild(r); out.appendChild(sec);
        out.appendChild(btn('Αντιγραφή IP', function () { OS.copy(j.ip); })); inp.value = j.ip;
        fetch('https://ipwho.is/' + encodeURIComponent(j.ip)).then(function (r) { return r.json(); }).then(function (g) {
          if (!g || g.success === false) return; var d = h('div', 'kv'); [['Χώρα', g.country], ['Πόλη (κατά προσέγγιση)', g.city], ['Πάροχος', g.connection && (g.connection.isp || g.connection.org)]].forEach(function (x) { if (x[1]) { d.appendChild(h('span', '', x[0])); d.appendChild(h('b', '', x[1])); } }); out.insertBefore(d, out.lastChild);
        }).catch(function () {});
      }).catch(function () { say('Δεν μπόρεσα να βρω τη δημόσια IP σου. Έλεγξε τη σύνδεση.', true); });
    }
    var rw = h('div', 'wrow'); rw.appendChild(btn('Βρες', lookup, 'pri')); rw.appendChild(btn('Η IP μου', myip));
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') lookup(); });
    body.appendChild(inp); body.appendChild(ty); body.appendChild(pv); body.appendChild(rw); body.appendChild(out);
    body.appendChild(h('p', 'wnote', 'Ρωτάει το internet μόνο όταν πατήσεις κουμπί. Τα ονόματα πάνε στον διακομιστή DNS που διαλέγεις. Το «Η IP μου» ρωτά τα api.ipify.org και ipwho.is.'));
    return null;
  });

  /* Η σύνδεσή μου: IP, ISP, δίκτυο, ήπειρος, χώρα και DNS (όπως στο ipleak.net). Ρωτά μόνο με κουμπί. */
  addWidget('myconn', 'Η σύνδεσή μου', false, function (body) {
    var out = h('div', 'wdnsout'), dnsOut = h('div', 'wdnsout');
    function pick(o, ks) { for (var i = 0; i < ks.length; i++) { var v = o[ks[i]]; if (v !== undefined && v !== null && v !== '' && typeof v !== 'object') return String(v); } return ''; }
    function say(box, txt, bad) { box.textContent = ''; box.appendChild(h('p', 'wnote' + (bad ? ' wbad' : ''), txt)); }
    function rows(o) {
      var kv = h('div', 'kv'), used = {};
      [['IP', ['ip', 'query_text', 'query']], ['Πάροχος (ISP)', ['isp_name', 'isp', 'org', 'organization']], ['Δίκτυο', ['network', 'as_network', 'asn_network', 'as_name']], ['Αριθμός δικτύου (ASN)', ['as_number', 'asn']], ['Ήπειρος', ['continent_name', 'continent']], ['Χώρα', ['country_name', 'country']], ['Πόλη', ['city_name', 'city']], ['Ζώνη ώρας', ['time_zone', 'timezone']]].forEach(function (f) {
        var v = pick(o, f[1]); if (v) { kv.appendChild(h('span', '', f[0])); kv.appendChild(h('b', '', v)); f[1].forEach(function (k) { used[k] = 1; }); }
      });
      return kv;
    }
    function check() {
      if (!netOk()) return;
      say(out, 'Ρωτάω…');
      fetch('https://ipleak.net/json/').then(function (r) { if (!r.ok) throw r.status; return r.json(); }).then(function (o) {
        out.textContent = ''; var kv = rows(o);
        if (!kv.childNodes.length) { say(out, 'Πήρα απάντηση αλλά δεν αναγνώρισα τα πεδία της. Δες την απευθείας στο ipleak.net.', true); }
        else out.appendChild(kv);
        out.appendChild(btn('Αντιγραφή', function () { OS.copy(Array.prototype.map.call(kv.children, function (x) { return x.textContent; }).reduce(function (a, x, i) { return a + (i % 2 ? ': ' : (i ? '\n' : '')) + x; }, '')); }));
      }).catch(function () { say(out, 'Δεν μπόρεσα να διαβάσω την απάντηση του ipleak.net (έλλειψη σύνδεσης ή ο browser την μπλόκαρε). Μπορείς να το ανοίξεις απευθείας.', true); });
    }
    function sid() { var a = new Uint8Array(20), s2 = ''; (window.crypto || window.msCrypto).getRandomValues(a); for (var i = 0; i < a.length; i++) s2 += ('0' + a[i].toString(16)).slice(-2); return s2; }
    function dns() {
      if (!netOk()) return;
      say(dnsOut, 'Ρωτάω… (παίρνει λίγα δευτερόλεπτα)'); var id = sid(), tasks = [];
      for (var i = 1; i <= 6; i++) tasks.push(fetch('https://' + id + '-' + i + '.ipleak.net/dnsdetection/').then(function (r) { return r.json(); }).catch(function () { return null; }));
      Promise.all(tasks).then(function (rs) {
        var seen = {}, list = [];
        function add(o) { if (!o || typeof o !== 'object') return; if (Array.isArray(o)) { o.forEach(add); return; } var ip = pick(o, ['ip', 'query_text']); if (!ip) { Object.keys(o).forEach(function (k) { if (typeof o[k] === 'object') add(o[k]); }); return; } if (!seen[ip]) { seen[ip] = 1; list.push(o); } }
        rs.forEach(add); dnsOut.textContent = '';
        if (!list.length) { say(dnsOut, rs.every(function (x) { return x === null; }) ? 'Δεν πήρα απάντηση για τους DNS σου (σύνδεση ή μπλοκάρισμα από τον browser). Δοκίμασε απευθείας στο ipleak.net.' : 'Η απάντηση για τους DNS ήρθε σε μορφή που δεν αναγνώρισα. Δες την στο ipleak.net.', true); return; }
        dnsOut.appendChild(h('div', 'wdsec')).appendChild(h('b', '', 'Οι DNS που χρησιμοποιεί η σύνδεσή σου'));
        list.forEach(function (o) { var r = h('div', 'wdsec'); r.appendChild(h('div', 'wdrow')).appendChild(h('span', '', pick(o, ['ip', 'query_text']))); var d = [pick(o, ['isp_name', 'isp', 'org']), pick(o, ['country_name', 'country'])].filter(Boolean).join(' · '); if (d) r.appendChild(h('small', '', d)); dnsOut.appendChild(r); });
        dnsOut.appendChild(h('p', 'wnote', 'Αν οι DNS ανήκουν στον πάροχό σου ή στον διακομιστή που διάλεξες εσύ, όλα είναι φυσιολογικά. Αν ανήκουν σε κάποιον άλλον από αυτόν που περιμένεις (π.χ. με VPN ενεργό), μπορεί να υπάρχει διαρροή DNS.'));
      });
    }
    var rw = h('div', 'wrow'); rw.appendChild(btn('Έλεγχος IP και ISP', check, 'pri')); rw.appendChild(btn('Έλεγχος DNS', dns));
    var op = btn('Άνοιγμα ipleak.net', function () { window.open('https://ipleak.net/', '_blank', 'noopener'); });
    body.appendChild(rw); body.appendChild(out); body.appendChild(dnsOut); body.appendChild(op);
    body.appendChild(h('p', 'wnote', 'Ρωτάει το ipleak.net μόνο όταν πατήσεις κουμπί. Ο έλεγχος DNS στέλνει 6 τυχαία ονόματα για να δει ποιοι διακομιστές τα έλυσαν.'));
    return null;
  });

  /* Εργαλεία δικτύου: γρήγορα κουμπιά προς ιστοσελίδες (ανοίγουν σε νέα καρτέλα μόνο όταν τα πατήσεις) */
  addWidget('nettools', 'Εργαλεία δικτύου', false, function (body) {
    var T = [['Ping και DNS από πολλές χώρες', 'https://ping.pe/'], ['Έλεγχος IPv6', 'https://test-ipv6.com/'], ['Ανοιχτές θύρες (ports)', 'https://allports.exposed/'], ['BGP', 'https://bgp.tools/'], ['Ταχύτητα (Speedtest)', 'https://www.speedtest.net/'], ['Πέφτουν οι υπηρεσίες; (Downdetector)', 'https://downdetector.gr/'], ['Έλεγχος SSL', 'https://www.sslshopper.com/ssl-checker.html'], ['Nslookup', 'https://www.nslookup.io/'], ['MAC σε κατασκευαστή', 'https://maclookup.app/'], ['Cloudflare Radar', 'https://radar.cloudflare.com/'], ['Έτοιμο για IPv6 το site;', 'https://ip6.nl/'], ['Τι χρησιμοποιεί ένα site (BuiltWith)', 'https://builtwith.com/']];
    var g = h('div', 'wnt'); T.forEach(function (t) { var b = h('button', 'wtile', t[0]); b.type = 'button'; b.title = t[1]; b.addEventListener('click', function () { window.open(t[1], '_blank', 'noopener'); }); g.appendChild(b); });
    body.appendChild(g); body.appendChild(h('p', 'wnote', 'Κάθε κουμπί ανοίγει την ιστοσελίδα σε νέα καρτέλα, μόνο όταν το πατήσεις.')); return null;
  });
  OS.widgets.refresh = function (id) { if (id) { if (REG[id] && REG[id].render) REG[id].render(); } else ORDER.forEach(function (k) { if (REG[k].render) REG[k].render(); }); };

  /* τοπικά δεδομένα: ανανέωση όταν κάτι αλλάζει στην οθόνη (χωρίς δίκτυο) */
  ['click', 'change', 'submit'].forEach(function (ev) { document.addEventListener(ev, function () { setTimeout(function () { ['today'].forEach(function (k) { if (REG[k] && REG[k].render) REG[k].render(); }); }, 120); }, true); });

  /* ---------- Κέντρο ελέγχου περιβάλλοντος ---------- */
  var cc = h('div', 'ccpop'); cc.id = 'cc'; cc.setAttribute('role', 'dialog'); cc.setAttribute('aria-label', 'Κέντρο ελέγχου περιβάλλοντος'); document.body.appendChild(cc);
  function sw(parent, key, title, sub, def, after) {
    var r = h('div', 'sw2'), l = h('span', '', title); if (sub) l.appendChild(h('small', '', sub));
    var b = h('button', 'tg'); b.type = 'button'; b.setAttribute('role', 'switch'); b.setAttribute('aria-label', title);
    function set() { var v = !!S(key, def); b.setAttribute('aria-pressed', String(v)); b.setAttribute('aria-checked', String(v)); }
    set(); b.addEventListener('click', function () { OS.settings.set(key, !S(key, def)); set(); applyEnv(); if (key === 'status') OS.refresh(); if (after) after(); });
    r.appendChild(l); r.appendChild(b); parent.appendChild(r);
  }
  function sel(parent, label, key, opts, def, after) {
    var r = h('div', 'r'), l = h('label', '', label), s = h('select'); l.style.flex = '1';
    opts.forEach(function (o) { var op = h('option', '', o[1]); op.value = o[0]; s.appendChild(op); });
    s.value = String(S(key, def)); s.setAttribute('aria-label', label);
    s.addEventListener('change', function () { OS.settings.set(key, s.value); applyEnv(); if (after) after(s.value); });
    r.appendChild(l); r.appendChild(s); parent.appendChild(r);
  }
  function buildCC() {
    cc.textContent = '';
    var a = h('div', 'app'); cc.appendChild(a);
    var hd = h('div', 'cchd'); hd.appendChild(h('b', '', 'Κέντρο ελέγχου περιβάλλοντος'));
    var x = h('button', '', '×'); x.type = 'button'; x.setAttribute('aria-label', 'Κλείσιμο'); x.addEventListener('click', function () { openCC(false); }); hd.appendChild(x); a.appendChild(hd);
    a.appendChild(h('p', 'wnote', 'Όλες οι αλλαγές γίνονται μόνο όταν τις επιλέξεις και μένουν στον browser σου.'));
    a.appendChild(h('h4', '', 'Widgets'));
    sw(a, 'widgets', 'Εμφάνιση των widgets', 'Η στήλη δεξιά στην επιφάνεια', true);
    sel(a, 'Διάταξη', 'wmode', [['one', 'Μία στήλη δεξιά'], ['two', 'Δύο στήλες δεξιά'], ['free', 'Ελεύθερη: παντού στην οθόνη']], 'one', function () { render(); });
    a.appendChild(h('p', 'wnote', 'Στην ελεύθερη διάταξη σύρε κάθε κάρτα από τον τίτλο της (ή με τα βέλη του πληκτρολογίου όταν είναι επιλεγμένος).'));
    sel(a, 'Πλάτος στήλης', 'wpanel', [['narrow', 'Στενό'], ['normal', 'Κανονικό'], ['wide', 'Πλατύ']], 'normal');
    sel(a, 'Πυκνότητα', 'density', [['comfortable', 'Άνετη'], ['compact', 'Συμπαγής']], 'comfortable');
    var pr = h('div', 'sw2'), pl = h('span', '', 'Ξεχωριστή διάταξη ανά επιφάνεια'); pl.appendChild(h('small', '', 'Κάθε επιφάνεια εργασίας με δικά της widgets'));
    var pb = h('button', 'tg'); pb.type = 'button'; pb.setAttribute('role', 'switch'); pb.setAttribute('aria-label', 'Ξεχωριστή διάταξη ανά επιφάνεια');
    function pset() { pb.setAttribute('aria-pressed', String(!!L.perWs)); pb.setAttribute('aria-checked', String(!!L.perWs)); } pset();
    pb.addEventListener('click', function () { L.perWs = !L.perWs; save(); pset(); render(); }); pr.appendChild(pl); pr.appendChild(pb); a.appendChild(pr);
    var br = h('div', 'r'); br.appendChild(btn('Προσαρμογή widgets', function () { openCC(false); setEdit(true); }, 'pri'));
    br.appendChild(btn('Επαναφορά διάταξης', function () { if (window.confirm('Να γυρίσει η διάταξη των widgets όπως ήταν αρχικά;')) { L.lay[wsKey()] = defLay(); save(); render(); OS.toast('Η διάταξη επανήλθε'); } })); a.appendChild(br);
    a.appendChild(h('h4', '', 'Επιφάνεια'));
    if (OS.themes && OS.themes.list) sel(a, 'Θέμα', 'theme', OS.themes.list.map(function (t) { return [t.id, t.name]; }), 'veagle', function (v) { OS.themes.apply(v); });
    sel(a, 'Επιφάνεια εργασίας', 'ws', C.workspaces.map(function (w) { return [w.id, w.name]; }), 'all', function (v) { OS.setWorkspace(v); });
    sel(a, 'Μέγεθος εικονιδίων', 'iconsize', [['small', 'Μικρό'], ['normal', 'Κανονικό'], ['large', 'Μεγάλο']], 'normal');
    sw(a, 'secs', 'Δευτερόλεπτα στο ρολόι', '', true);
    sw(a, 'particles', 'Δίκτυο σωματιδίων στο φόντο', 'Κλείσ’ το για πιο ήσυχο φόντο', true);
    sw(a, 'net', 'Internet', 'Κλειστό από προεπιλογή: τίποτα δεν στέλνεται πουθενά αν δεν το ανοίξεις', false);
    sw(a, 'status', 'Τελείες κατάστασης στους φακέλους', 'Ρωτά τα sites όταν ανοίγεις φάκελο', false);
    sw(a, 'boot', 'Οθόνη εκκίνησης', 'Μία φορά ανά άνοιγμα του browser', true);
    a.appendChild(h('h4', '', 'Κι άλλα'));
    var r3 = h('div', 'r');
    r3.appendChild(btn('Ρυθμίσεις…', function () { openCC(false); OS.openApp('settings'); }));
    r3.appendChild(btn('Αντίγραφο ασφαλείας…', function () { openCC(false); OS.openApp('settings'); })); a.appendChild(r3);
    a.appendChild(h('p', 'wnote', 'Συντομεύσεις: Alt+Shift+W εμφάνιση/απόκρυψη widgets · Alt+Shift+E προσαρμογή · Alt+Shift+C αυτό το παράθυρο.'));
  }
  function openCC(on) {
    if (on === undefined) on = !cc.classList.contains('open');
    if (on) buildCC();
    cc.classList.toggle('open', !!on); if (ccb) ccb.setAttribute('aria-expanded', String(!!on));
    if (on) { var f = cc.querySelector('button,select'); if (f) f.focus(); }
  }
  var ccb = h('button', 'addbtn'); ccb.id = 'ccbtn'; ccb.type = 'button'; ccb.title = 'Κέντρο ελέγχου περιβάλλοντος (Alt+Shift+C)'; ccb.setAttribute('aria-label', 'Κέντρο ελέγχου περιβάλλοντος'); ccb.setAttribute('aria-expanded', 'false'); ccb.innerHTML = OS.svg('dash');
  var setb = $('#setbtn'); if (setb && setb.parentNode) setb.parentNode.insertBefore(ccb, setb);
  ccb.addEventListener('click', function (e) { e.stopPropagation(); openCC(); });
  document.addEventListener('click', function (e) { if (cc.classList.contains('open') && !cc.contains(e.target) && e.target !== ccb && !ccb.contains(e.target)) openCC(false); });
  document.addEventListener('keydown', function (e) {
    var t = e.target, typing = t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
    if (e.key === 'Escape' && cc.classList.contains('open')) { openCC(false); return; }
    if (e.key === 'Escape' && editing && !typing) { setEdit(false); return; }
    if (!e.altKey || !e.shiftKey || e.ctrlKey || e.metaKey) return;
    var k = (e.code || '').replace('Key','').toLowerCase();
    if (k === 'w') { e.preventDefault(); OS.settings.set('widgets', !S('widgets', true)); applyEnv(); OS.toast(S('widgets', true) ? 'Τα widgets εμφανίστηκαν' : 'Τα widgets κρύφτηκαν'); }
    else if (k === 'e') { e.preventDefault(); setEdit(!editing); }
    else if (k === 'c') { e.preventDefault(); openCC(); }
  });
  OS.widgets.edit = setEdit; OS.widgets.cc = openCC;
  OS.on('ws', function () { render(); });
  window.addEventListener('resize', function () { if (mode() === 'free') placeFree(lay()); });

  /* ---------- στυλ ---------- */
  var css = '.widgets{max-height:calc(100% - 100px);overflow-y:auto;overflow-x:hidden;scrollbar-width:thin;padding-bottom:4px}' +
    '.widgets>[hidden]{display:none!important}html.nowidgets .widgets{display:none}' +
    'html{--wcol:248px}html[data-wpanel=narrow]{--wcol:208px}html[data-wpanel=wide]{--wcol:320px}.widgets{width:var(--wcol)}' +
    'html[data-wmode=two] .widgets{width:calc(var(--wcol)*2 + 12px);grid-template-columns:repeat(2,minmax(0,1fr));align-items:start}html[data-wmode=two] .wfoot{grid-column:1/-1}' +
    'html[data-wmode=free] .widgets{inset:0;width:auto;max-height:none;overflow:visible;display:block;pointer-events:none;right:0;top:0}' +
    'html[data-wmode=free] .widgets>.card{position:absolute;width:var(--wcol);pointer-events:auto;z-index:1}html[data-wmode=free] .widgets>.card h2{cursor:grab;touch-action:none}html[data-wmode=free] .widgets>.card.wdragging{box-shadow:0 14px 40px rgba(0,0,0,.55);z-index:30!important}html[data-wmode=free] .widgets>.card.wdragging h2{cursor:grabbing}' +
    'html[data-wmode=free] .wfoot{position:absolute;right:14px;bottom:86px;width:var(--wcol);pointer-events:auto;z-index:40;max-height:calc(100% - 120px);overflow:auto}html[data-wmode=free] .wgbar button:nth-child(-n+2){display:none}' +
    'html[data-density=compact] .widgets{gap:8px}html[data-density=compact] .card{padding:10px 12px}' +
    'html[data-iconsize=small] .icons{zoom:.86}html[data-iconsize=large] .icons{zoom:1.16}html[data-secs=off] #wsec{display:none}' +
    '.card{position:relative}.card.wcol>:not(h2):not(.wgbar){display:none}.card.wcol h2{margin-bottom:0}' +
    '.wedit .card{padding-top:32px;outline:1px dashed rgba(var(--ar),.5);cursor:grab}.wdrop{box-shadow:0 0 0 2px var(--accent)}' +
    '.wgbar{display:none;position:absolute;top:6px;right:6px;gap:3px;z-index:3}.wedit .wgbar{display:flex}' +
    '.wgbar button{width:22px;height:22px;border-radius:6px;background:rgba(var(--fr),.1);font-size:12px;line-height:1;color:var(--text)}.wgbar button:hover,.wgbar button:focus-visible{background:var(--accent);color:var(--onacc)}' +
    '.wfoot{display:grid;gap:8px;padding:2px 2px 6px}.wfoot h2{font:600 10px var(--mono);letter-spacing:.18em;text-transform:uppercase;color:var(--dim)}.wlink{background:none!important;border:0!important;color:var(--dim);font:11px var(--mono)!important;letter-spacing:.06em;padding:4px 2px!important;justify-self:start}.wlink:hover{color:var(--text)}' +
    '.wedit .wfoot{background:var(--glass);border:1px solid var(--line);border-radius:12px;padding:12px}' +
    '.wnote{color:var(--dim);font-size:12px;margin:4px 0 6px}.wrow{display:flex;gap:6px;align-items:center;justify-content:space-between;flex-wrap:wrap}.wrow .btn{padding:5px 10px;font-size:12px}' +
    '.wb{display:grid;gap:6px}.wb .btn{padding:6px 10px;font-size:12px;justify-self:start}.wl{list-style:none;display:grid;gap:3px;font-size:12.5px;margin:0;padding:0}.wl li{display:flex;gap:6px;justify-content:space-between;align-items:baseline}.wl li small{color:var(--dim);font:11px var(--mono);white-space:nowrap}.wl li button{color:var(--dim)}.wbad{color:var(--accent)}' +
    '.wgrid{display:grid;grid-template-columns:1fr 1fr;gap:6px}.wtile{display:flex;gap:6px;align-items:center;padding:7px 8px;border:1px solid var(--line2);border-radius:9px;font-size:12px;text-align:left;min-width:0}.wtile:hover{border-color:var(--accent)}.wtile span:last-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.wic{width:16px;height:16px;flex:none;color:var(--accent)}.wic svg{width:16px;height:16px}' +
    '.wpick{display:flex;gap:6px}.wpick select{flex:1;min-width:0;padding:5px 6px;background:rgba(var(--fr),.04);border:1px solid var(--line2);border-radius:8px;color:var(--text);font:12px var(--body)}.wpick select option{background:var(--bg2)}' +
    '.wcdform{display:grid;gap:6px}.wcdform input{padding:6px 8px;background:rgba(var(--fr),.04);border:1px solid var(--line2);border-radius:8px;color:var(--text);font:12px var(--body);color-scheme:dark}.w-clocks select{padding:5px 6px}' +
    '.wtm{display:grid;gap:7px}.wm{display:grid;grid-template-columns:1fr;gap:2px;font-size:12px}.wm small{color:var(--dim);font:11px var(--mono)}.wmb{height:5px;border-radius:3px;background:rgba(var(--fr),.09);overflow:hidden}.wmb i{display:block;height:100%;background:var(--accent);border-radius:3px;transition:width .4s}.wmb i.bad{background:#ff9f43}.wtmh{font:600 10px var(--mono);letter-spacing:.16em;text-transform:uppercase;color:var(--dim);margin:8px 0 4px}.wlk{background:none;border:0;color:var(--text);font:12.5px var(--body);text-align:left;padding:0;cursor:pointer;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.wlk:hover{color:var(--accent)}' +
    '.w-dns input,.w-dns select,.w-myconn select{padding:6px 8px;background:rgba(var(--fr),.04);border:1px solid var(--line2);border-radius:8px;color:var(--text);font:12px var(--body);width:100%;min-width:0}.w-dns select option{background:var(--bg2)}.wdsec{display:grid;gap:2px;margin:4px 0}.wdsec>b{font:600 10px var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--dim)}.wdrow{display:flex;gap:8px;justify-content:space-between;font:12px var(--mono);word-break:break-all}.wdrow small{color:var(--dim);white-space:nowrap}.wdsec>small{color:var(--dim);font-size:12px}' +
    '.wnt{display:grid;gap:5px}.wnt .wtile{font-size:12px;text-align:left;white-space:normal}' +
    '.wrepo{display:grid;gap:1px;font-size:12.5px}.wrepo small{color:var(--dim);font:11px var(--mono)}.wbig{font:600 30px var(--disp);font-variant-numeric:tabular-nums}' +
    '.w-timer select{padding:5px 6px;background:rgba(var(--fr),.04);border:1px solid var(--line2);border-radius:8px;color:var(--text);font:12px var(--body)}.w-timer select option{background:var(--bg2)}' +
    '.ccpop{position:fixed;top:42px;right:10px;width:340px;max-height:calc(100% - 70px);overflow:auto;background:var(--bg2);border:1px solid var(--line2);border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.5);padding:14px 16px;z-index:60;display:none}.ccpop.open{display:block}' +
    '.ccpop .cchd{display:flex;justify-content:space-between;align-items:center;font:600 14px var(--disp)}.ccpop .cchd button{font-size:18px;color:var(--dim)}.ccpop .app{gap:8px}' +
    '.ccpop .r label{font:12px var(--body);color:var(--text)}.ccpop select{padding:6px 8px;background:rgba(var(--fr),.04);border:1px solid var(--line2);border-radius:8px;color:var(--text);font:13px var(--body)}.ccpop select option{background:var(--bg2)}' +
    '@media (max-width:720px){.ccpop{left:8px;right:8px;width:auto}}';
  var sty = document.createElement('style'); sty.textContent = css; document.head.appendChild(sty);

  applyEnv(); render();
})();
