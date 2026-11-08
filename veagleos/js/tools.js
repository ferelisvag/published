/* Μικρά εργαλεία: αριθμομηχανή, χρονόμετρο, ΦΠΑ, κωδικοί, μετατροπές, διαγνωστικά δικτύου, αλλαγές repos. */
(function () {
  'use strict';
  var OS = window.OS, h = OS.h, C = window.VEAGLE;
  function mk(tag, cls, txt, attrs) { var e = h(tag, cls, txt); if (attrs) Object.keys(attrs).forEach(function (k) { e[k] = attrs[k]; }); return e; }
  function row(parent) { var r = h('div', 'r'); parent.appendChild(r); return r; }

  /* αριθμομηχανή (δική της ανάλυση, χωρίς eval) */
  function evalExpr(s) {
    var t = s.replace(/×/g, '*').replace(/÷/g, '/').replace(/,/g, '.').replace(/\s+/g, ''), i = 0;
    function peek() { return t[i]; }
    function num() { var m = /^\d*\.?\d+(e[+-]?\d+)?/i.exec(t.slice(i)); if (!m) throw 0; i += m[0].length; return parseFloat(m[0]); }
    function atom() { if (peek() === '(') { i++; var v = expr(); if (peek() !== ')') throw 0; i++; return v; } if (peek() === '-') { i++; return -atom(); } if (peek() === '+') { i++; return atom(); } var v2 = num(); if (peek() === '%') { i++; v2 /= 100; } return v2; }
    function term() { var v = atom(); while (peek() === '*' || peek() === '/') { var o = t[i++], r = atom(); v = o === '*' ? v * r : v / r; } return v; }
    function expr() { var v = term(); while (peek() === '+' || peek() === '-') { var o = t[i++], r = term(); v = o === '+' ? v + r : v - r; } return v; }
    var v = expr(); if (i !== t.length) throw 0; return v;
  }
  OS.registerApp('calc', { title: 'Αριθμομηχανή', path: '/usr/calc', icon: 'calc', width: 320, build: function (body) {
    var a = mk('div', 'app'); body.appendChild(a);
    var disp = mk('input', '', '', { type: 'text', placeholder: '0', autocomplete: 'off' }); disp.style.cssText = 'font:600 24px var(--disp);text-align:right'; disp.setAttribute('aria-label', 'Πράξη');
    var hist = mk('div', 'mono'); hist.style.cssText = 'color:var(--dim);min-height:1.4em;text-align:right';
    a.appendChild(hist); a.appendChild(disp);
    var keys = mk('div', 'keys'); a.appendChild(keys);
    ['C', '(', ')', '÷', '7', '8', '9', '×', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', '⌫', '='].forEach(function (k) {
      var b = mk('button', k === '=' ? 'eq' : ('+-×÷'.indexOf(k) >= 0 ? 'op' : ''), k); b.type = 'button';
      b.addEventListener('click', function () { press(k); keys.dataset.f = 1; disp.focus(); }); keys.appendChild(b);
    });
    function calc() { try { var v = evalExpr(disp.value); if (!isFinite(v)) throw 0; var r = String(parseFloat(v.toPrecision(12))); hist.textContent = disp.value + ' ='; disp.value = r; } catch (e) { hist.textContent = 'Μη έγκυρη πράξη'; } }
    function press(k) { if (k === 'C') { disp.value = ''; hist.textContent = ''; } else if (k === '⌫') disp.value = disp.value.slice(0, -1); else if (k === '=') calc(); else disp.value += k; }
    disp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); calc(); } });
  } });

  /* χρονόμετρο */
  OS.registerApp('timer', { title: 'Χρονόμετρο', path: '/usr/timer', icon: 'timer', width: 340, build: function (body) {
    var a = mk('div', 'app'); body.appendChild(a);
    var mode = mk('select'); [['sw', 'Χρονόμετρο'], ['cd', 'Αντίστροφη μέτρηση'], ['pomo', 'Pomodoro 25′ / 5′']].forEach(function (o) { var op = mk('option', '', o[1]); op.value = o[0]; mode.appendChild(op); });
    var mins = mk('input', '', '', { type: 'number', value: 10, min: 1, max: 600 }); mins.style.width = '80px'; mins.setAttribute('aria-label', 'Λεπτά');
    var r1 = row(a); r1.appendChild(mode); r1.appendChild(mins);
    var out = mk('div', 'out', '00:00:00'); out.style.cssText = 'font-size:44px;text-align:center;padding:10px 0'; a.appendChild(out);
    var lab = mk('div', 'mono', ''); lab.style.cssText = 'text-align:center;color:var(--dim)'; a.appendChild(lab);
    var r2 = row(a); r2.style.justifyContent = 'center';
    var go = mk('button', 'btn pri', 'Έναρξη', { type: 'button' }), rs = mk('button', 'btn', 'Μηδενισμός', { type: 'button' }); r2.appendChild(go); r2.appendChild(rs);
    var t0 = 0, acc = 0, run = false, iv, target = 0, phase = 'work';
    function two(n) { return (n < 10 ? '0' : '') + n; }
    function show(ms) { var s = Math.max(0, Math.floor(ms / 1000)); out.textContent = two(Math.floor(s / 3600)) + ':' + two(Math.floor(s / 60) % 60) + ':' + two(s % 60); }
    function elapsed() { return acc + (run ? Date.now() - t0 : 0); }
    function beep() { try { var c = new (window.AudioContext || window.webkitAudioContext)(), o = c.createOscillator(), g = c.createGain(); o.connect(g); g.connect(c.destination); g.gain.value = .08; o.frequency.value = 880; o.start(); setTimeout(function () { o.stop(); c.close(); }, 350); } catch (e) {} }
    function setTarget() { target = mode.value === 'sw' ? 0 : mode.value === 'pomo' ? (phase === 'work' ? 25 : 5) * 60000 : Math.max(1, +mins.value || 1) * 60000; lab.textContent = mode.value === 'pomo' ? (phase === 'work' ? 'Δουλειά' : 'Διάλειμμα') : ''; }
    function frame() {
      var e = elapsed();
      if (!target) { show(e); return; }
      show(target - e);
      if (e >= target) { beep(); OS.toast('Τέλος χρόνου'); acc = 0; t0 = Date.now(); if (mode.value === 'pomo') { phase = phase === 'work' ? 'rest' : 'work'; setTarget(); } else { run = false; clearInterval(iv); go.textContent = 'Έναρξη'; show(0); } }
    }
    function reset() { run = false; clearInterval(iv); acc = 0; phase = 'work'; go.textContent = 'Έναρξη'; setTarget(); target ? show(target) : show(0); }
    go.addEventListener('click', function () { if (run) { acc = elapsed(); run = false; clearInterval(iv); go.textContent = 'Συνέχεια'; } else { setTarget(); t0 = Date.now(); run = true; iv = setInterval(frame, 200); go.textContent = 'Παύση'; } });
    rs.addEventListener('click', reset); mode.addEventListener('change', reset); mins.addEventListener('change', reset);
    OS.on('winclose', function (id) { if (id === 'a:timer') clearInterval(iv); });
    reset();
  } });

  /* ΦΠΑ */
  OS.registerApp('vat', { title: 'ΦΠΑ', path: '/usr/vat', icon: 'percent', width: 340, build: function (body) {
    var a = mk('div', 'app'); body.appendChild(a);
    var amt = mk('input', '', '', { type: 'number', step: '0.01', placeholder: 'Ποσό €' }); amt.setAttribute('aria-label', 'Ποσό');
    var rate = mk('select'); [24, 13, 6, 0].forEach(function (r) { var o = mk('option', '', r + '%'); o.value = r; rate.appendChild(o); });
    var dir = mk('select'); [['add', 'Το ποσό είναι χωρίς ΦΠΑ'], ['sub', 'Το ποσό περιλαμβάνει ΦΠΑ']].forEach(function (o) { var op = mk('option', '', o[1]); op.value = o[0]; dir.appendChild(op); });
    var r1 = row(a); r1.appendChild(amt); r1.appendChild(rate); a.appendChild(dir);
    var kv = mk('div', 'kv'); a.appendChild(kv);
    function f(n) { return n.toLocaleString((window.OSLOC||'el-GR'), { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'; }
    function upd() {
      var v = parseFloat(amt.value), r = +rate.value / 100; kv.textContent = '';
      if (isNaN(v)) return;
      var net = dir.value === 'add' ? v : v / (1 + r), gross = net * (1 + r);
      [['Καθαρό', f(net)], ['ΦΠΑ ' + rate.value + '%', f(gross - net)], ['Σύνολο', f(gross)]].forEach(function (x) { kv.appendChild(mk('span', '', x[0])); kv.appendChild(mk('b', '', x[1])); });
    }
    [amt, rate, dir].forEach(function (e) { e.addEventListener('input', upd); });
  } });

  /* κωδικοί */
  OS.registerApp('passgen', { title: 'Κωδικοί', path: '/usr/passgen', icon: 'key', width: 380, build: function (body) {
    var a = mk('div', 'app'); body.appendChild(a);
    var len = mk('input', '', '', { type: 'range', min: 8, max: 64, value: 20 }); len.style.padding = 0;
    var lv = mk('span', 'mono', '20');
    var r1 = row(a); r1.appendChild(mk('label', '', 'Μήκος')); r1.appendChild(len); r1.appendChild(lv);
    var opts = {}; var r2 = row(a);
    [['up', 'ABC', 1], ['lo', 'abc', 1], ['dg', '123', 1], ['sy', '#$%', 1]].forEach(function (o) { var l = mk('label', '', ''), c = mk('input', '', '', { type: 'checkbox', checked: !!o[2] }); l.appendChild(c); l.appendChild(document.createTextNode(' ' + o[1])); opts[o[0]] = c; r2.appendChild(l); c.addEventListener('change', gen); });
    var out = mk('div', 'mono', ''); out.style.cssText = 'padding:10px;border:1px solid var(--line2);border-radius:8px;font-size:15px'; a.appendChild(out);
    var r3 = row(a), cp = mk('button', 'btn pri', 'Αντιγραφή', { type: 'button' }), nw = mk('button', 'btn', 'Νέος', { type: 'button' }); r3.appendChild(cp); r3.appendChild(nw);
    var sets = { up: 'ABCDEFGHJKLMNPQRSTUVWXYZ', lo: 'abcdefghijkmnopqrstuvwxyz', dg: '23456789', sy: '!@#$%^&*-_=+?' };
    function gen() {
      var pool = '', need = [];
      Object.keys(opts).forEach(function (k) { if (opts[k].checked) { pool += sets[k]; need.push(sets[k]); } });
      if (!pool) { out.textContent = 'Διάλεξε τουλάχιστον ένα είδος'; return; }
      var n = +len.value, rnd = new Uint32Array(n + need.length), res = [];
      crypto.getRandomValues(rnd);
      for (var i = 0; i < n; i++) res.push(pool[rnd[i] % pool.length]);
      need.forEach(function (s, j) { res[rnd[n + j] % n] = s[rnd[n + j] % s.length]; });
      out.textContent = res.join(''); lv.textContent = n;
    }
    len.addEventListener('input', gen); nw.addEventListener('click', gen); cp.addEventListener('click', function () { OS.copy(out.textContent, 'Ο κωδικός αντιγράφηκε'); });
    gen();
  } });

  /* μετατροπές */
  OS.registerApp('convert', { title: 'Μετατροπές', path: '/usr/convert', icon: 'code', width: 440, build: function (body) {
    var a = mk('div', 'app'); body.appendChild(a);
    var mode = mk('select'); [['b64e', 'Κείμενο → Base64'], ['b64d', 'Base64 → κείμενο'], ['urle', 'Κείμενο → URL'], ['urld', 'URL → κείμενο'], ['hexe', 'Κείμενο → hex'], ['hexd', 'hex → κείμενο'], ['json', 'Μορφοποίηση JSON']].forEach(function (o) { var op = mk('option', '', o[1]); op.value = o[0]; mode.appendChild(op); });
    var i = mk('textarea', '', '', { rows: 4, placeholder: 'Είσοδος' }), o = mk('textarea', '', '', { rows: 4, readOnly: true, placeholder: 'Αποτέλεσμα' });
    var cp = mk('button', 'btn', 'Αντιγραφή αποτελέσματος', { type: 'button' });
    a.appendChild(mode); a.appendChild(i); a.appendChild(o); a.appendChild(cp);
    function enc(s) { return new TextEncoder().encode(s); } function dec(b) { return new TextDecoder().decode(b); }
    function run() {
      var v = i.value, m = mode.value; try {
        if (m === 'b64e') o.value = btoa(String.fromCharCode.apply(null, enc(v)));
        else if (m === 'b64d') o.value = dec(Uint8Array.from(atob(v.trim()), function (c) { return c.charCodeAt(0); }));
        else if (m === 'urle') o.value = encodeURIComponent(v); else if (m === 'urld') o.value = decodeURIComponent(v);
        else if (m === 'hexe') o.value = Array.prototype.map.call(enc(v), function (b) { return (b < 16 ? '0' : '') + b.toString(16); }).join('');
        else if (m === 'hexd') o.value = dec(Uint8Array.from(v.replace(/\s+/g, '').match(/.{1,2}/g) || [], function (x) { return parseInt(x, 16); }));
        else o.value = JSON.stringify(JSON.parse(v), null, 2);
      } catch (e) { o.value = 'Μη έγκυρη είσοδος'; }
    }
    i.addEventListener('input', run); mode.addEventListener('change', run);
    cp.addEventListener('click', function () { OS.copy(o.value, 'Αντιγράφηκε'); });
  } });

  /* διαγνωστικά δικτύου */
  OS.registerApp('net', { title: 'Διαγνωστικά δικτύου', path: '/usr/net', icon: 'radar', width: 440, build: function (body) {
    var a = mk('div', 'app'); body.appendChild(a);
    var info = mk('div', 'kv'); a.appendChild(info);
    var tbl = mk('div', 'kv'); tbl.style.gridTemplateColumns = '1fr auto auto'; a.appendChild(tbl);
    var go = mk('button', 'btn pri', 'Έλεγχος τώρα', { type: 'button' }); a.appendChild(go);
    var c = navigator.connection || {};
    [['Κατάσταση', navigator.onLine ? 'online' : 'offline'], ['Τύπος', c.effectiveType || '—'], ['Downlink', c.downlink ? c.downlink + ' Mbps' : '—'], ['Γλώσσα', navigator.language]].forEach(function (x) { info.appendChild(mk('span', '', x[0])); info.appendChild(mk('b', '', x[1])); });
    function run() {
      tbl.textContent = '';
      C.diag.forEach(function (s) {
        var n = mk('span', '', s.name), st = mk('b', '', '…'), ms = mk('b', '', '');
        tbl.appendChild(n); tbl.appendChild(st); tbl.appendChild(ms);
        delete OS.probe.cache; OS.probe(s.url + (s.url.indexOf('?') < 0 ? '?' : '&') + '_=' + Date.now(), 8000).then(function (r) { st.textContent = r.ok ? 'ok' : 'δεν απαντά'; st.style.color = r.ok ? 'var(--ok)' : 'var(--accent)'; ms.textContent = r.ok ? r.ms + ' ms' : ''; });
      });
    }
    if (!OS.settings.get('net')) { a.insertBefore(mk('p', '', 'Το internet είναι κλειστό. Άνοιξέ το από τις Ρυθμίσεις για να μετρήσεις τους στόχους.'), tbl); }
    go.addEventListener('click', run); run();
  } });

})();
