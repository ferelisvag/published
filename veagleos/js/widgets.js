/* Widgets: σημειώσεις, εκκρεμότητες, καιρός με ηλιοβασίλεμα. */
(function () {
  'use strict';
  var OS = window.OS, $ = OS.$, h = OS.h;

  /* σημειώσεις */
  var notes = $('#notes');
  notes.value = OS.lsGet('veagleos.notes.v1', '');
  notes.addEventListener('input', function () { OS.lsSet('veagleos.notes.v1', notes.value); });

  /* εκκρεμότητες */
  var TK = 'veagleos.tasks.v1', tasks = [];
  try { tasks = JSON.parse(OS.lsGet(TK, '[]')) || []; } catch (e) { tasks = []; }
  var card = $('#taskcard');
  var form = h('form', 'add'), inp = h('input'); inp.type = 'text'; inp.placeholder = 'Νέα εκκρεμότητα'; inp.maxLength = 80; inp.setAttribute('aria-label', 'Νέα εκκρεμότητα');
  var ok = h('button', 'btn', '+'); ok.type = 'submit'; ok.setAttribute('aria-label', 'Προσθήκη');
  form.appendChild(inp); form.appendChild(ok);
  var ul = h('ul'); card.appendChild(form); card.appendChild(ul);
  function save() { OS.lsSet(TK, JSON.stringify(tasks)); }
  function render() {
    ul.textContent = '';
    if (!tasks.length) ul.appendChild(h('li', 'none', 'Τίποτα σε εκκρεμότητα.'));
    tasks.forEach(function (t) {
      var li = h('li', t.done ? 'done' : ''), cb = h('input'); cb.type = 'checkbox'; cb.checked = !!t.done; cb.setAttribute('aria-label', t.text);
      cb.addEventListener('change', function () { t.done = cb.checked; save(); render(); });
      var x = h('button', '', '×'); x.type = 'button'; x.setAttribute('aria-label', 'Διαγραφή');
      x.addEventListener('click', function () { tasks = tasks.filter(function (k) { return k !== t; }); save(); render(); });
      li.appendChild(cb); li.appendChild(h('span', '', t.text)); li.appendChild(x); ul.appendChild(li);
    });
  }
  form.addEventListener('submit', function (e) { e.preventDefault(); var v = inp.value.trim(); if (!v) return; tasks.unshift({ text: v, done: false }); inp.value = ''; save(); render(); });
  render();
  OS.tasksChanged = function () { try { tasks = JSON.parse(OS.lsGet(TK, '[]')) || []; } catch (e) { tasks = []; } render(); };

  /* καιρός */
  var WMO = { 0: ['Αίθριος', 'sun'], 1: ['Σχεδόν αίθριος', 'sun'], 2: ['Λίγα σύννεφα', 'cloud'], 3: ['Συννεφιά', 'cloud'], 45: ['Ομίχλη', 'cloud'], 48: ['Ομίχλη', 'cloud'], 51: ['Ψιχάλες', 'cloud'], 53: ['Ψιχάλες', 'cloud'], 55: ['Ψιχάλες', 'cloud'], 61: ['Βροχή', 'cloud'], 63: ['Βροχή', 'cloud'], 65: ['Δυνατή βροχή', 'cloud'], 71: ['Χιόνι', 'cloud'], 73: ['Χιόνι', 'cloud'], 75: ['Χιόνι', 'cloud'], 80: ['Μπόρες', 'cloud'], 81: ['Μπόρες', 'cloud'], 82: ['Δυνατές μπόρες', 'cloud'], 95: ['Καταιγίδα', 'cloud'], 96: ['Καταιγίδα', 'cloud'], 99: ['Καταιγίδα', 'cloud'] };
  function hm(iso) { return iso ? iso.slice(11, 16) : '--'; }
  function shift(iso, mins) { var d = new Date(iso); d.setMinutes(d.getMinutes() + mins); return d; }
  function fmt(d) { return (d.getHours() < 10 ? '0' : '') + d.getHours() + ':' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes(); }
  var cache = null;
  function renderWx(d, loc, box) {
    box = box || $('#wxbody'); box.textContent = '';
    var c = d.current, info = WMO[c.weather_code] || ['—', 'cloud'];
    var ic = h('span', 'ico'); ic.innerHTML = OS.svg(info[1]); box.appendChild(ic);
    var tx = h('div'); tx.appendChild(h('div', 'big', Math.round(c.temperature_2m) + '°')); tx.appendChild(h('div', 'date', info[0] + ' · ' + loc.name)); box.appendChild(tx);
    var sub = h('div', 'wxsub'); sub.style.gridColumn = '1 / -1'; sub.style.width = '100%';
    var sr = d.daily.sunrise[0], ss = d.daily.sunset[0];
    [['Αίσθηση', Math.round(c.apparent_temperature) + '°'], ['Άνεμος', Math.round(c.wind_speed_10m) + ' km/h'], ['Ανατολή', hm(sr)], ['Ηλιοβασίλεμα', hm(ss)], ['Χρυσή ώρα', fmt(shift(ss, -60)) + '–' + hm(ss)], ['Μέγ / Ελάχ', Math.round(d.daily.temperature_2m_max[0]) + '° / ' + Math.round(d.daily.temperature_2m_min[0]) + '°']].forEach(function (r) { sub.appendChild(h('span', '', r[0])); sub.appendChild(h('b', '', r[1])); });
    box.style.flexWrap = 'wrap'; box.appendChild(sub);
  }
  function loadWx(force) {
    var loc = OS.settings.get('wx'), box = $('#wxbody');
    if (!OS.settings.get('net') || !loc) {
      box.textContent = '';
      var m = h('div'); m.style.cssText = 'color:var(--dim);font-size:12px;line-height:1.5';
      m.textContent = !OS.settings.get('net') ? 'Ο καιρός θέλει internet και είναι κλειστός (δεν στέλνεται τίποτα πουθενά αν δεν τον ανοίξεις εσύ). Ρυθμίσεις → Internet.' : 'Διάλεξε πόλη από τις Ρυθμίσεις → Καιρός.';
      box.appendChild(m); return;
    }
    var key = 'veagleos.wxcache.v1';
    if (!force) { try { var c = JSON.parse(OS.lsGet(key, 'null')); if (c && c.k === loc.lat + ',' + loc.lon && Date.now() - c.t < 900000) { renderWx(c.d, loc); return; } } catch (e) {} }
    var u = 'https://api.open-meteo.com/v1/forecast?latitude=' + loc.lat + '&longitude=' + loc.lon + '&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&daily=sunrise,sunset,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1';
    fetch(u).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (d) {
      OS.lsSet(key, JSON.stringify({ k: loc.lat + ',' + loc.lon, t: Date.now(), d: d })); renderWx(d, loc);
    }).catch(function () { box.textContent = ''; box.appendChild(h('span', '', 'Ο καιρός δεν φορτώθηκε (χρειάζεται σύνδεση).')).style.cssText = 'color:var(--dim);font-size:12px'; });
  }
  OS.loadWeather = loadWx;
  OS.on('start', function () { loadWx(false); });
  OS.on('setting:wx', function () { loadWx(true); });
  OS.on('setting:net', function () { loadWx(true); });
  OS.registerApp('weather', { title: 'Καιρός', path: '/usr/weather', icon: 'sun', width: 360, build: function (body) {
    var b = h('div', 'wx'); body.appendChild(b);
    var loc = OS.settings.get('wx');
    if (!OS.settings.get('net') || !loc) { loadWx(false); b.textContent = $('#wxbody').textContent; return; }
    try { var cc = JSON.parse(OS.lsGet('veagleos.wxcache.v1', 'null')); if (cc) renderWx(cc.d, loc, b); else b.textContent = 'Δεν υπάρχουν δεδομένα ακόμα.'; } catch (e) {}
    var p = h('p'); p.style.cssText = 'color:var(--dim);font-size:12px;margin-top:10px'; p.textContent = 'Η πόλη αλλάζει από τις Ρυθμίσεις.'; body.appendChild(p);
  } });
  OS.registerApp('tasks', { title: 'Εκκρεμότητες', path: '/usr/tasks', icon: 'list', width: 380, build: function (body) {
    var c = h('div', 'tasks'); var f = h('form', 'add'), i = h('input'); i.type = 'text'; i.placeholder = 'Νέα εκκρεμότητα'; var ob = h('button', 'btn', '+'); ob.type = 'submit'; f.appendChild(i); f.appendChild(ob);
    var l = h('ul'); l.style.maxHeight = '360px'; c.appendChild(f); c.appendChild(l); body.appendChild(c);
    function r() {
      l.textContent = ''; if (!tasks.length) l.appendChild(h('li', 'none', 'Τίποτα σε εκκρεμότητα.'));
      tasks.forEach(function (t) { var li = h('li', t.done ? 'done' : ''), cb = h('input'); cb.type = 'checkbox'; cb.checked = !!t.done; cb.addEventListener('change', function () { t.done = cb.checked; save(); render(); r(); }); var x = h('button', '', '×'); x.type = 'button'; x.addEventListener('click', function () { tasks = tasks.filter(function (k) { return k !== t; }); save(); render(); r(); }); li.appendChild(cb); li.appendChild(h('span', '', t.text)); li.appendChild(x); l.appendChild(li); });
    }
    f.addEventListener('submit', function (e) { e.preventDefault(); var v = i.value.trim(); if (!v) return; tasks.unshift({ text: v, done: false }); i.value = ''; save(); render(); r(); });
    r();
  } });
})();
