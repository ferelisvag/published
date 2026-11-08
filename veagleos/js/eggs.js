/* Easter eggs του Veagle OS: οι ίδιοι κωδικοί με το Link Hub (bm.html) + μερικά δικά του.
   Νέο egg: πρόσθεσε εγγραφή στο EGGS (id, name, how, run) και, αν γράφεται, στο INSTANT (δουλεύει μόλις γραφτεί) ή στο WORDS (δουλεύει με κενό ή Enter). */
(function () {
  'use strict';
  var OS = window.OS, C = window.VEAGLE;
  var RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  var css = [
    '.egg-toast{position:fixed;left:50%;top:56px;z-index:130;transform:translate(-50%,-12px);opacity:0;pointer-events:none;background:var(--bg2);border:1px solid var(--accent);border-radius:12px;padding:12px 18px;max-width:min(92vw,560px);font:600 14px var(--mono);color:var(--text);text-align:center;box-shadow:0 0 30px var(--glow);transition:opacity .25s,transform .25s}',
    '.egg-toast.show{opacity:1;transform:translate(-50%,0)}.egg-toast small{display:block;margin-top:4px;color:var(--dim);font-weight:400;font-size:12px}',
    'body.god .ic,body.god .win,body.god .card{border-color:#ffd36b!important;box-shadow:0 0 18px rgba(255,211,107,.35)!important}',
    '.egg-pill{border:1px solid #ffd36b;color:#ffd36b;border-radius:999px;padding:0 8px;font:600 11px var(--mono)}',
    '#ecg.healed{filter:drop-shadow(0 0 6px #3ddc84) hue-rotate(120deg)}',
    '.egg-wanted{position:fixed;right:22px;top:92px;z-index:130;display:flex;gap:4px;font-size:26px;pointer-events:none}',
    '.egg-wanted span{color:#fff;text-shadow:0 2px 0 #000,0 0 10px rgba(255,255,255,.6);transition:opacity .4s,transform .4s}.egg-wanted span.gone{opacity:0;transform:scale(.4)}',
    '.egg-rocket{position:fixed;left:50%;bottom:-80px;z-index:130;font-size:54px;transform:translateX(-50%) rotate(-45deg);pointer-events:none;filter:drop-shadow(0 0 14px rgba(255,140,0,.8))}',
    '.fi.falling{transition:transform .9s cubic-bezier(.5,0,.9,.4),opacity .9s;opacity:0}.fi.rising{transition:transform .6s cubic-bezier(.2,.8,.2,1),opacity .6s}',
    '#egg-bsod{position:fixed;inset:0;z-index:140;display:none;background:#0078d7;color:#fff;padding:10vh 10vw;font-family:"Segoe UI",system-ui,sans-serif}#egg-bsod.show{display:block}',
    '#egg-bsod .sad{font-size:clamp(70px,14vw,150px);line-height:1;margin-bottom:24px}#egg-bsod p{font-size:clamp(16px,2.2vw,24px);max-width:900px;margin:0 0 20px;line-height:1.4}#egg-bsod small{display:block;font-size:14px;opacity:.9;margin-top:28px}',
    '#egg-bsod button{margin-top:20px;background:#fff;color:#0078d7;border:0;padding:10px 22px;font:600 15px inherit;cursor:pointer}',
    '.egg-ball{position:absolute;z-index:5;width:10px;height:10px;border-radius:2px;background:#fff;box-shadow:0 0 10px #fff;pointer-events:none}',
    '#egg-matrix{position:fixed;inset:0;z-index:135;display:none;background:#000;cursor:pointer}#egg-matrix canvas{width:100%;height:100%;display:block}',
    '#egg-matrix div{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font:600 clamp(16px,3vw,26px) var(--mono);color:#fff;text-shadow:0 0 18px var(--accent);text-align:center;pointer-events:none}#egg-matrix div small{display:block;margin-top:8px;font-size:12px;color:#888;text-shadow:none}',
    '.egg-ride{position:fixed;left:-300px;bottom:70px;z-index:130;width:280px;pointer-events:none}.egg-ride img{width:100%;height:auto;display:block;filter:drop-shadow(0 8px 10px rgba(0,0,0,.6));animation:eggRumble .18s ease-in-out infinite alternate;transform-origin:30% 100%}',
    '@keyframes eggRumble{from{transform:translateY(0) rotate(0)}to{transform:translateY(-1.5px) rotate(-.4deg)}}',
    '.egg-dust{position:fixed;z-index:129;width:12px;height:12px;border-radius:50%;background:rgba(190,170,150,.55);pointer-events:none}',
    '.egg-tag{position:fixed;left:0;bottom:190px;z-index:130;font:700 13px var(--disp);letter-spacing:3px;color:var(--accent);text-transform:uppercase;pointer-events:none}',
    '.egg-flash{position:fixed;inset:0;z-index:135;background:#fff;pointer-events:none;animation:eggFlash .7s ease-out forwards}@keyframes eggFlash{0%{opacity:1}100%{opacity:0}}',
    '.egg-mug{position:fixed;left:22px;bottom:90px;z-index:130;width:120px;pointer-events:none;text-align:center;font:600 11px var(--mono);color:var(--text);transition:opacity .4s}',
    '.egg-mug .steam path{animation:eggSteam 1.6s ease-in-out infinite;opacity:0}.egg-mug .steam path:nth-child(2){animation-delay:.5s}.egg-mug .steam path:nth-child(3){animation-delay:1s}',
    '@keyframes eggSteam{0%{opacity:0;transform:translateY(6px)}40%{opacity:.8}100%{opacity:0;transform:translateY(-10px)}}',
    '.egg-lh{position:fixed;left:12px;bottom:0;z-index:128;width:90px;pointer-events:none}',
    '.egg-beam{position:fixed;z-index:127;width:170vw;height:240px;margin-top:-120px;pointer-events:none;transform-origin:0 50%;background:linear-gradient(90deg,rgba(255,244,200,.55),rgba(255,244,200,.12) 60%,transparent);clip-path:polygon(0 47%,100% 0,100% 100%,0 53%);mix-blend-mode:screen;animation:eggSweep 2.2s ease-in-out 3 alternate}',
    '@keyframes eggSweep{from{transform:rotate(-38deg)}to{transform:rotate(8deg)}}',
    '.vault .ck{color:var(--dim);width:18px;display:inline-block}.vault li.found .ck{color:var(--ok)}.vault .how{display:block;color:var(--dim);font-size:12px}.vault .how code{color:var(--accent)}.vault .nm{font-weight:500}',
    '.vault .go{border:1px solid var(--line2);border-radius:8px;padding:3px 10px;font-size:12px;flex:none}.vault .go:hover{border-color:var(--accent)}',
    '@media (prefers-reduced-motion:reduce){.egg-ride img,.egg-beam,.egg-mug .steam path{animation:none}}'
  ].join('\n');
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  /* ---------- βοηθητικά ---------- */
  var toastEl = null, toastT = null;
  function toast(msg, sub, ms) {
    if (!toastEl) { toastEl = el('div', 'egg-toast'); toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
    toastEl.innerHTML = msg + (sub ? '<small>' + sub + '</small>' : '');
    toastEl.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('show'); }, ms || 3200);
  }
  function later(fn, ms) { return setTimeout(fn, ms); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function uptime() {
    var s = Math.floor((Date.now() - new Date(2007, 4, 1).getTime()) / 1000);
    var y = Math.floor(s / 31556952); s -= y * 31556952;
    var d = Math.floor(s / 86400); s -= d * 86400;
    var h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60; s = s % 60;
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return y + 'y ' + d + 'd ' + p(h) + ':' + p(m) + ':' + p(s);
  }

  /* ---------- τα eggs ---------- */
  var EGGS = [
    { id: 'baguvix', name: 'God mode', how: 'γράψε <code>BAGUVIX</code>', run: function () {
      document.body.classList.add('god');
      var tray = document.querySelector('.tray'), pill = el('span', 'egg-pill', 'GOD'); if (tray) tray.insertBefore(pill, tray.firstChild);
      toast('GOD MODE ACTIVATED', 'Τίποτα δεν χαλάει εδώ. Για 10 δευτερόλεπτα.');
      later(function () { document.body.classList.remove('god'); pill.remove(); }, 10000);
    } },
    { id: 'aspirine', name: 'Full health', how: 'γράψε <code>ASPIRINE</code>', run: function () {
      var e = $('ecg'); if (e) e.classList.add('healed');
      toast('+100 HEALTH', 'Ο παλμός του συστήματος επανήλθε.'); later(function () { if (e) e.classList.remove('healed'); }, 7000);
    } },
    { id: 'aezakmi', name: 'Never wanted', how: 'γράψε <code>AEZAKMI</code>', run: function () {
      var w = el('div', 'egg-wanted', '<span>★</span><span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>'); document.body.appendChild(w);
      toast('NEVER WANTED', 'Οι μπάτσοι έχασαν το ενδιαφέρον τους.');
      var stars = w.querySelectorAll('span');
      for (var i = 0; i < stars.length; i++) (function (s, i) { later(function () { s.classList.add('gone'); }, 900 + i * 450); })(stars[stars.length - 1 - i], i);
      later(function () { w.remove(); }, 900 + stars.length * 450 + 500);
    } },
    { id: 'rocketman', name: 'Jetpack', how: 'γράψε <code>ROCKETMAN</code>', run: function () {
      toast('ROCKETMAN', 'Jetpack engaged.');
      var r = el('div', 'egg-rocket', '🚀'); document.body.appendChild(r);
      var t0 = performance.now(), dur = RM ? 10 : 2400;
      (function step(t) { var k = Math.min(1, (t - t0) / dur), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; r.style.bottom = (-80 + (innerHeight + 160) * e) + 'px'; if (k < 1) requestAnimationFrame(step); else r.remove(); })(t0);
    } },
    { id: 'sudo', name: 'Delete everything', how: 'γράψε <code>sudo rm -rf</code> και κενό ή Enter', run: function () {
      var ic = Array.prototype.slice.call(document.querySelectorAll('#icons .fi'));
      toast('rm: removing all folders…', 'no undo. probably.', 1800);
      ic.forEach(function (t, i) { later(function () { t.classList.remove('rising'); t.classList.add('falling'); t.style.transform = 'translateY(' + (innerHeight + 200) + 'px) rotate(' + rand(-40, 40).toFixed(0) + 'deg)'; }, i * 90); });
      var back = ic.length * 90 + 1200;
      later(function () { toast('Μπλόφα. Υπάρχουν backups. 😉', null, 2600); }, back - 300);
      later(function () { ic.forEach(function (t) { t.classList.remove('falling'); t.classList.add('rising'); t.style.transform = ''; }); }, back);
      later(function () { ic.forEach(function (t) { t.classList.remove('rising'); }); }, back + 800);
    } },
    { id: 'bsod', name: 'Blue screen', how: 'γράψε <code>ctrl alt del</code> και κενό ή Enter', run: function () {
      var b = $('egg-bsod');
      if (!b) {
        b = el('div', '', '<div class="sad">:(</div><p>Το Veagle OS αντιμετώπισε πρόβλημα και πρέπει να επανεκκινήσει. Δοκίμασες να το κλείσεις και να το ανοίξεις ξανά;</p><p><span data-pct>0</span>% complete</p><small>Stop code: PEBKAC (problem exists between keyboard and chair)</small><button type="button" hidden>Restart</button>');
        b.id = 'egg-bsod'; document.body.appendChild(b);
        b.querySelector('button').addEventListener('click', function () { b.classList.remove('show'); toast('Επανεκκίνηση. Όλα δουλεύουν. Κάπως.'); });
      }
      var pct = b.querySelector('[data-pct]'), btn = b.querySelector('button'), n = 0;
      btn.hidden = true; pct.textContent = '0'; b.classList.add('show');
      var iv = setInterval(function () { n = Math.min(100, n + Math.floor(rand(4, 17))); pct.textContent = n; if (n >= 100) { clearInterval(iv); btn.hidden = false; btn.focus(); } }, 260);
    } },
    { id: 'clock', name: 'Real uptime', how: 'πάτα 5 φορές το ρολόι πάνω δεξιά', run: function () {
      var c = $('clk'), d = $('clkdate'); if (!c) return;
      var box = c.parentNode, up = el('b', '', uptime());
      c.style.display = 'none'; d.style.display = 'none'; box.appendChild(up);
      var iv = setInterval(function () { up.textContent = uptime(); }, 1000);
      toast('Ο χρόνος είναι ψευδαίσθηση. Το uptime όχι.', 'Uptime από τον Μάιο του 2007.', 4000);
      later(function () { clearInterval(iv); up.remove(); c.style.display = ''; d.style.display = ''; }, 8000);
    } },
    { id: 'ping', name: 'Pong', how: 'γράψε <code>ping</code> και κενό ή Enter', run: function () {
      var p = $('ping'), top = document.querySelector('.bar');
      if (p) { var old = p.textContent; p.textContent = 'PONG'; later(function () { if (p.textContent === 'PONG') p.textContent = old; }, 5000); }
      toast('PONG', 'Round trip: ένα αστείο.');
      if (!top || RM) return;
      var ball = el('div', 'egg-ball'); top.appendChild(ball);
      var x = 20, y = 10, vx = 6, vy = 2.4, t0 = performance.now();
      (function step(t) {
        var W = top.clientWidth - 10, H = top.clientHeight - 10; x += vx; y += vy;
        if (x < 0 || x > W) { vx = -vx; x = Math.max(0, Math.min(W, x)); } if (y < 0 || y > H) { vy = -vy; y = Math.max(0, Math.min(H, y)); }
        ball.style.left = x + 'px'; ball.style.top = y + 'px';
        if (t - t0 < 4500) requestAnimationFrame(step); else ball.remove();
      })(t0);
    } },
    { id: 'matrix', name: 'The Matrix', how: 'γράψε <code>matrix</code> και κενό ή Enter', run: function () {
      var m = $('egg-matrix');
      if (!m) { m = el('div', '', '<canvas></canvas><div>Wake up, Veagle…<small>κλικ ή Esc για επιστροφή</small></div>'); m.id = 'egg-matrix'; document.body.appendChild(m); }
      var c = m.querySelector('canvas'), ctx = c.getContext('2d'), W = c.width = innerWidth, H = c.height = innerHeight, fs = 16;
      var col = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ff1e38';
      var cols = Math.ceil(W / fs), drops = []; for (var i = 0; i < cols; i++) drops.push(rand(-40, 0));
      var chars = 'ΦΕΡΕΛΗΣVEAGLE01アイウエオカキクケコ<>/{}[]#$π', run = true, end = performance.now() + 10000;
      m.style.display = 'block';
      function stop() { run = false; m.style.display = 'none'; m.removeEventListener('click', stop); document.removeEventListener('keydown', key); }
      function key(e) { if (e.key === 'Escape') stop(); }
      m.addEventListener('click', stop); document.addEventListener('keydown', key);
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      (function frame(t) {
        if (!run) return; if (t > end) return stop();
        ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(0, 0, W, H); ctx.font = fs + 'px monospace';
        for (var i = 0; i < cols; i++) { var y = drops[i] * fs; ctx.fillStyle = Math.random() < .05 ? '#fff' : col; ctx.fillText(chars[(Math.random() * chars.length) | 0], i * fs, y); if (y > H && Math.random() > .975) drops[i] = 0; drops[i] += .6; }
        requestAnimationFrame(frame);
      })(performance.now());
    } },
    { id: '42', name: 'The answer', how: 'γράψε <code>42</code> και κενό ή Enter', run: function () { toast('42', 'Η απάντηση στη ζωή, το σύμπαν και τα πάντα. Τώρα βρες την σωστή ερώτηση.', 4500); } },
    { id: 'cheese', name: 'Say cheese', how: 'γράψε <code>cheese</code> και κενό ή Enter', run: function () { var f = el('div', 'egg-flash'); document.body.appendChild(f); later(function () { f.remove(); }, 800); toast('📸 Η φωτογραφία αποθηκεύτηκε. Μην ανησυχείς, μένει μόνο εδώ.', 'Photojournalist mode.', 3200); } },
    { id: 'coffee', name: 'Refuel', how: 'γράψε <code>coffee</code> και κενό ή Enter', run: function () {
      var mug = el('div', 'egg-mug', MUG + '<div data-l>Refueling sysadmin… 0%</div>'); document.body.appendChild(mug);
      var liquid = mug.querySelector('[data-liquid]'), lbl = mug.querySelector('[data-l]'), t0 = performance.now(), dur = RM ? 300 : 4000;
      (function step(t) { var k = Math.min(1, (t - t0) / dur), h = 44 * k; liquid.setAttribute('y', 66 - h); liquid.setAttribute('height', h); lbl.textContent = k < 1 ? 'Refueling sysadmin… ' + Math.round(k * 100) + '%' : 'Sysadmin fully caffeinated ☕'; if (k < 1) requestAnimationFrame(step); else later(function () { mug.style.opacity = 0; later(function () { mug.remove(); }, 450); }, 2200); })(t0);
    } },
    { id: 'night', name: 'Night shift', how: 'άνοιξέ το μεταξύ 03:00 και 05:00', run: function () { toast('Πήγαινε για ύπνο. Οι servers περιμένουν.', 'Είναι ' + new Date().toLocaleTimeString((window.OSLOC||'el-GR'), { hour: '2-digit', minute: '2-digit' }) + '. Σοβαρά.', 6000); } },
    { id: 'shake', name: 'Fragile hardware', how: 'ανακίνησε το κινητό', run: function () { toast('Σταμάτα να με κουνάς, είμαι εύθραυστο hardware.', null, 3500); } },
    { id: 'clicks', name: 'Clicking harder', how: 'κάνε 10 κλικ στο ίδιο κενό σημείο', run: function () { toast('Τα περισσότερα κλικ δεν το κάνουν πιο γρήγορο.', 'Μην αφήνεις τον υπολογιστή να δει ότι βιάζεσαι.', 4000); } },
    /* μόνο στο Veagle OS */
    { id: 'konami', name: 'Konami', how: '↑ ↑ ↓ ↓ ← → ← → B A', run: function () { var t = OS.settings.get('theme'); OS.themes.apply('terminal', true); toast('Μπήκες στο Matrix', 'Θέμα Τερματικό για 6 δευτερόλεπτα.'); later(function () { OS.themes.apply(t, true); }, 6000); } },
    { id: 'flip', name: 'Ανάποδα', how: 'γράψε <code>flip</code> και κενό ή Enter', run: function () { document.body.classList.add('fx-flip'); later(function () { document.body.classList.remove('fx-flip'); }, 2200); } },
    { id: 'eagle', name: 'Ο αετός βλέπει', how: 'πάτα 5 φορές τον τίτλο VEAGLE OS', run: function () { toast('Show me the problem.', null, 2500); var i = document.querySelector('.brand h1 i'); if (i) { i.style.textShadow = '0 0 30px var(--accent)'; later(function () { i.style.textShadow = ''; }, 1500); } } },
    { id: 'another', name: 'Υπάρχει πάντα άλλος τρόπος', how: 'γράψε <code>anotherway</code> και κενό ή Enter', run: function () { toast('There’s always another way.', null, 3500); } },
    { id: 'pi', name: 'π', how: 'πάτα το μικρό π κάτω δεξιά', run: function () {} }
  ];
  var BY_ID = {}; EGGS.forEach(function (e) { BY_ID[e.id] = e; });

  /* ---------- τι έχεις βρει (μόνο σε αυτόν τον browser) ---------- */
  var KEY = 'veagleos.eggs.v2', found = {};
  try { var o = JSON.parse(OS.lsGet(KEY, '[]')); (Array.isArray(o) ? o : Object.keys(o)).forEach(function (id) { found[id] = true; }); } catch (e) {}
  function save() { OS.lsSet(KEY, JSON.stringify(Object.keys(found))); }
  var lastRun = {};
  function trigger(id, discovered) {
    var egg = BY_ID[id]; if (!egg) return;
    var t = Date.now(); if (discovered && lastRun[id] && t - lastRun[id] < 1000) return;
    lastRun[id] = t;
    if (discovered && !found[id]) { found[id] = true; save(); }
    egg.run(); renderVault();
  }
  OS.egg = trigger;

  /* ---------- κωδικοί που γράφονται (στο launcher, στο τερματικό ή στο κενό) ---------- */
  var INSTANT = { baguvix: 'baguvix', aspirine: 'aspirine', aezakmi: 'aezakmi', rocketman: 'rocketman' };
  var WORDS = [['sudo rm -rf', 'sudo'], ['ctrl alt del', 'bsod'], ['ctrlaltdel', 'bsod'], ['ping', 'ping'], ['matrix', 'matrix'], ['42', '42'], ['cheese', 'cheese'], ['coffee', 'coffee'], ['flip', 'flip'], ['anotherway', 'another']];
  var buf = '', lastKey = 0, lastTarget = null, scrubbing = false;
  function okTarget(t) { if (!t || t === document.body || t === document.documentElement) return true; return t.id === 'lq' || (t.classList && t.classList.contains('tin')); }
  function boundaryOk(code) { var b = buf.charAt(buf.length - code.length - 1); return !b || !/[a-z0-9]/i.test(b); }
  function scrub(target, code) {
    if (!target || typeof target.value !== 'string') return;
    var i = target.value.toLowerCase().lastIndexOf(code); if (i < 0) return;
    target.value = target.value.slice(0, i) + target.value.slice(i + code.length);
    scrubbing = true; try { target.dispatchEvent(new Event('input', { bubbles: true })); } finally { scrubbing = false; }
  }
  var KS = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'], ki = 0;
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey || !e.key) return;
    var target = document.activeElement, now = Date.now();
    if (!/^(INPUT|TEXTAREA|SELECT)$/.test((target || {}).tagName || '')) {
      var kk = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      ki = kk === KS[ki] ? ki + 1 : (kk === KS[0] ? 1 : 0); if (ki === KS.length) { ki = 0; trigger('konami', true); }
    }
    if (!okTarget(target)) return;
    if (now - lastKey > 2500 || target !== lastTarget) buf = '';
    lastKey = now; lastTarget = target;
    if (e.key === 'Backspace') { buf = buf.slice(0, -1); return; }
    if (e.key === ' ' || e.key === 'Enter') {
      for (var i = 0; i < WORDS.length; i++) {
        var w = WORDS[i][0];
        if (buf.slice(-w.length) === w && boundaryOk(w)) { e.preventDefault(); e.stopImmediatePropagation(); buf = ''; scrub(target, w); trigger(WORDS[i][1], true); return; }
      }
      buf = (buf + ' ').slice(-24); return;
    }
    if (e.key.length !== 1) return;
    buf = (buf + e.key.toLowerCase()).slice(-24);
    for (var code in INSTANT) if (buf.slice(-code.length) === code) { buf = ''; setTimeout(function (c) { return function () { scrub(target, c); }; }(code), 0); trigger(INSTANT[code], true); return; }
  }, true);
  document.addEventListener('input', function (e) {
    var t = e.target; if (scrubbing || !t || typeof t.value !== 'string' || !okTarget(t)) return;
    var v = t.value.toLowerCase();
    for (var code in INSTANT) if (v.slice(-code.length) === code) { scrub(t, code); trigger(INSTANT[code], true); return; }
    for (var i = 0; i < WORDS.length; i++) {
      var w = WORDS[i][0], before = v.charAt(v.length - w.length - 2);
      if (v.slice(-(w.length + 1)) === w + ' ' && (!before || !/[a-z0-9]/.test(before))) { scrub(t, w + ' '); trigger(WORDS[i][1], true); return; }
    }
  }, true);

  /* ---------- κλικ, ώρα, κίνηση ---------- */
  (function () {
    var n = 0, last = 0, box = $('clk') && $('clk').parentNode; if (!box) return; box.style.cursor = 'default';
    box.addEventListener('click', function () { var t = Date.now(); n = t - last < 900 ? n + 1 : 1; last = t; if (n >= 5) { n = 0; trigger('clock', true); } });
    var c = 0, tt = $('desk'); void tt;
  })();
  (function () {
    var title = document.querySelector('.brand h1'), n = 0, last = 0; if (!title) return;
    title.style.pointerEvents = 'auto';
    title.addEventListener('click', function () { var t = Date.now(); n = t - last < 1200 ? n + 1 : 1; last = t; if (n >= 5) { n = 0; trigger('eagle', true); } });
  })();
  (function () {
    var n = 0, lx = 0, ly = 0, last = 0;
    document.addEventListener('click', function (e) {
      if (e.target.closest('a, button, input, canvas, label, textarea, select, .win, .launch, .modal, .dock, .bar, .card, .fi, #egg-matrix')) { n = 0; return; }
      var t = Date.now();
      if (t - last < 1200 && Math.hypot(e.clientX - lx, e.clientY - ly) < 40) n++; else n = 1;
      lx = e.clientX; ly = e.clientY; last = t; if (n >= 10) { n = 0; trigger('clicks', true); }
    });
  })();
  OS.on('start', function () {
    var shown = false;
    function check() { var h = new Date().getHours(); if (!shown && h >= 3 && h < 5) { shown = true; trigger('night', true); } }
    later(check, 2500); setInterval(check, 60000);
  });
  (function () {
    if (!('ondevicemotion' in window)) return;
    var hits = [], cool = 0, lx = null, ly, lz;
    window.addEventListener('devicemotion', function (e) {
      var a = e.accelerationIncludingGravity; if (!a || a.x == null) return;
      if (lx !== null) { var d = Math.abs(a.x - lx) + Math.abs(a.y - ly) + Math.abs(a.z - lz), t = Date.now(); if (d > 32) { hits.push(t); hits = hits.filter(function (h) { return t - h < 1000; }); } if (hits.length >= 3 && t > cool) { hits = []; cool = t + 8000; trigger('shake', true); } }
      lx = a.x; ly = a.y; lz = a.z;
    });
  })();

  /* ---------- το π και το θησαυροφυλάκιο ---------- */
  var vaultBody = null;
  function renderVault() {
    if (!vaultBody || !vaultBody.isConnected) return;
    var n = EGGS.filter(function (e) { return found[e.id]; }).length;
    vaultBody.innerHTML = '<h4>Βρέθηκαν ' + n + ' από ' + EGGS.length + '</h4><ul class="vault">' + EGGS.map(function (e) {
      return '<li class="' + (found[e.id] ? 'found' : '') + '"><span><span class="ck">' + (found[e.id] ? '✓' : '·') + '</span><span class="nm">' + e.name + '</span><span class="how">' + e.how + '</span></span>' + (e.id === 'pi' ? '' : '<button type="button" class="go" data-run="' + e.id + '">run ›</button>') + '</li>';
    }).join('') + '</ul><p style="color:var(--dim);font-size:12px">Τα eggs που βρήκες θυμάται μόνο αυτός ο browser. Οι κωδικοί δουλεύουν παντού, ακόμα και μέσα στην αναζήτηση και το τερματικό.</p>';
  }
  OS.registerApp('vault', { title: 'Θησαυροφυλάκιο π', path: '/secret/vault', icon: 'egg', width: 520, build: function (body) {
    var a = el('div', 'app'); body.appendChild(a); vaultBody = a; renderVault();
    a.addEventListener('click', function (e) { var b = e.target.closest('[data-run]'); if (b) trigger(b.getAttribute('data-run'), false); });
  } });
  $('pi').addEventListener('click', function () { if (!found.pi) { found.pi = true; save(); } OS.openApp('vault'); });

  OS.eggCommand = function (line, say) {
    var c = line.trim().toLowerCase().split(/\s+/)[0];
    if (c === 'sudo') { say('Δεν έχεις δικαιώματα εδώ. Δοκίμασε «sudo rm -rf» χωρίς το τερματικό… ή μην το δοκιμάσεις.', 'err'); return true; }
    if (c === 'exit') { say('Εδώ δεν φεύγεις έτσι.', 'dim'); return true; }
    return false;
  };

  /* ---------- σχέδια ---------- */
  var MUG = '<svg viewBox="0 0 90 80" width="110" aria-hidden="true"><g class="steam" stroke="#bbb" stroke-width="2" fill="none" stroke-linecap="round"><path d="M28 16 q-5 -6 0 -12"/><path d="M40 16 q-5 -6 0 -12"/><path d="M52 16 q-5 -6 0 -12"/></g><defs><clipPath id="egg-mug-in"><path d="M18 22 h46 v38 a10 10 0 0 1 -10 10 h-26 a10 10 0 0 1 -10 -10 z"/></clipPath></defs><rect data-liquid x="18" y="66" width="46" height="0" fill="#6f3b1d" clip-path="url(#egg-mug-in)"/><path d="M18 22 h46 v38 a10 10 0 0 1 -10 10 h-26 a10 10 0 0 1 -10 -10 z" fill="none" stroke="#eee" stroke-width="3"/><path d="M64 32 h6 a9 9 0 0 1 0 18 h-6" fill="none" stroke="#eee" stroke-width="3"/></svg>';
  var LIGHTHOUSE = '<svg viewBox="0 0 90 200" aria-hidden="true"><path d="M30 200 L38 48 H52 L60 200 Z" fill="#e8e8e8"/><path d="M33 150 L57 150 L58 168 L32 168 Z M35 100 L55 100 L56 116 L34 116 Z" fill="#b3121f"/><rect x="34" y="40" width="22" height="10" fill="#333"/><rect x="37" y="24" width="16" height="16" fill="#fff4c8"/><path d="M34 24 L45 12 L56 24 Z" fill="#333"/><rect x="20" y="194" width="50" height="6" fill="#2a2a2a"/></svg>';
})();
