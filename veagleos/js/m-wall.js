/* Wall: control room. Ρολόι, καιρός, ping, countdown και μία οθόνη ανά φάκελο. */
(function () {
  'use strict';
  var ML = window.ML, wall = document.getElementById('wall');
  var S = ML.shell({ id: 'wall', title: 'Wall', acc: '#6fd3ff', find: 'Φίλτρο οθονών' });
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function tile(title, color, right, big) { var t = el('section', 'tl' + (big ? ' big' : '')); t.style.setProperty('--c', color); t.innerHTML = '<div class="th"><i></i>' + ML.esc(title) + '<span>' + (right || '') + '</span></div>'; wall.appendChild(t); return t; }
var SET = {}; try { SET = JSON.parse(localStorage.getItem('veagleos.settings.v1') || '{}') || {}; } catch (e) {}
  var NET = !!SET.net, WX = SET.wx || null, TZ = (function () { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local'; } catch (e) { return 'Local'; } })();
  function two(n) { return (n < 10 ? '0' : '') + n; }
  /* ρολόι */
  var tc = tile('Χρόνος', '#6fd3ff', TZ, true); var bc = el('div', 'bigclk'), bd = el('div', 'bigdate'); tc.appendChild(bc); tc.appendChild(bd);
  /* καιρός */
  var tw = tile('Καιρός', '#ffd36b', WX ? WX.name : ''); var wb = el('div', 'kv', '<span>Φόρτωση…</span><b></b>'); tw.appendChild(wb);
  if (!NET || !WX) wb.innerHTML = '<span>' + (!NET ? 'Κλειστό: άνοιξε το Internet στις Ρυθμίσεις' : 'Διάλεξε πόλη στις Ρυθμίσεις') + '</span><b></b>'; else fetch('https://api.open-meteo.com/v1/forecast?latitude=' + WX.lat + '&longitude=' + WX.lon + '&current=temperature_2m,apparent_temperature,wind_speed_10m&daily=sunrise,sunset&timezone=auto&forecast_days=1').then(function (r) { return r.json(); }).then(function (d) {
    var c = d.current; wb.innerHTML = '<span>Θερμοκρασία</span><b>' + Math.round(c.temperature_2m) + '°</b><span>Αίσθηση</span><b>' + Math.round(c.apparent_temperature) + '°</b><span>Άνεμος</span><b>' + Math.round(c.wind_speed_10m) + ' km/h</b><span>Ανατολή</span><b>' + d.daily.sunrise[0].slice(11, 16) + '</b><span>Ηλιοβασίλεμα</span><b>' + d.daily.sunset[0].slice(11, 16) + '</b>';
  }).catch(function () { wb.innerHTML = '<span>Χρειάζεται σύνδεση</span><b></b>'; });
  /* ping */
  var tp = tile('Δίκτυο', '#a8ff60', NET ? 'google.com' : 'τοπικά'); var pc = el('canvas'); pc.width = 540; pc.height = 92; tp.appendChild(pc); var pk = el('div', 'kv', '<span>Τελευταίο</span><b id="pl">--</b><span>Μέσος όρος</span><b id="pa">--</b><span>Κατάσταση</span><b id="ps">online</b>'); tp.appendChild(pk);
  var pings = [];
  function ping() { if (!NET) { document.getElementById('ps').textContent = 'τοπικά (internet κλειστό)'; return; } var t = performance.now(); fetch('https://www.google.com/generate_204?_=' + Date.now(), { mode: 'no-cors', cache: 'no-store' }).then(function () { pings.push(Math.round(performance.now() - t)); if (pings.length > 40) pings.shift(); draw(); }).catch(function () { document.getElementById('pl').textContent = '--'; }); }
  function draw() {
    var c = pc.getContext('2d'); c.clearRect(0, 0, 540, 92); if (pings.length < 2) return; var mx = Math.max.apply(null, pings) * 1.2; c.strokeStyle = '#a8ff60'; c.lineWidth = 2.4; c.shadowColor = '#a8ff60'; c.shadowBlur = 8; c.beginPath(); pings.forEach(function (v, i) { var x = i / 39 * 540, y = 84 - v / mx * 76; if (i) c.lineTo(x, y); else c.moveTo(x, y); }); c.stroke();
    document.getElementById('pl').textContent = pings[pings.length - 1] + ' ms'; document.getElementById('pa').textContent = Math.round(pings.reduce(function (a, b) { return a + b; }, 0) / pings.length) + ' ms';
  }
  ping(); setInterval(ping, 8000);
  /* φάκελοι */
  var tiles = [];
  ML.folders.forEach(function (f) {
    var list = f.items.concat(f.also), t = tile(f.name, f.color, list.length + ' στοιχεία');
    var cv = el('canvas'); cv.width = 540; cv.height = 92; t.appendChild(cv);
    var ul = el('ul'); list.forEach(function (it) { var li = el('li'), a = el('a'); a.href = it.href; if (it.ext) { a.target = '_blank'; a.rel = 'noopener noreferrer'; } a.appendChild(document.createTextNode(it.name)); if (it.desc) { var sm = el('small'); sm.textContent = it.desc; a.appendChild(sm); } li.appendChild(a); ul.appendChild(li); });
    t.appendChild(ul); tiles.push({ f: f, el: t, cv: cv, ph: ML.hash(f.id) * 6.28, items: list });
  });
  S.onQuery(function (q) { tiles.forEach(function (tl) { var any = !q || tl.items.some(function (it) { return ML.match(it, q); }); tl.el.classList.toggle('hide', !any); Array.prototype.forEach.call(tl.el.querySelectorAll('li'), function (li, i) { li.style.display = !q || ML.match(tl.items[i], q) ? '' : 'none'; }); }); });
  function loop(now) {
    requestAnimationFrame(loop); var t = now / 1000;
    tiles.forEach(function (tl) { var c = tl.cv.getContext('2d'); c.clearRect(0, 0, 540, 92); c.strokeStyle = tl.f.color; c.lineWidth = 2; c.shadowColor = tl.f.color; c.shadowBlur = 6; c.beginPath(); for (var x = 0; x <= 540; x += 4) { var y = 46 + Math.sin(x * .02 + t * 1.6 + tl.ph) * 16 * Math.sin(x * .004 + t * .4) + Math.sin(x * .07 - t * 2.4 + tl.ph) * 6; if (x) c.lineTo(x, y); else c.moveTo(x, y); } c.stroke(); });
    var d = new Date(); bc.innerHTML = two(d.getHours()) + ':' + two(d.getMinutes()) + '<small>' + two(d.getSeconds()) + '</small>'; bd.textContent = d.toLocaleDateString((window.OSLOC||'el-GR'), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  requestAnimationFrame(loop);
})();
