/* VEAGLE PC Check - themes: Clean (default), Step by step, Cockpit, Bento, Cyber, Classic. Only changes how the report looks. Nothing on the PC is touched. */
var THEMES = (function (V) {
  'use strict';
  var esc = V.esc, g = V.g, D = V.D, I = function (en, el) { return V.I(en, el); };
  var KEY = 'veagle.pccheck.theme';
  var LIST = [
    { id: 'classic', en: 'Classic (Veagle OS)', el: 'Classic (Veagle OS)', light: false, big: false },
    { id: 'clean', en: 'Clean', el: 'Καθαρό', light: true, big: false },
    { id: 'guide', en: 'Step by step', el: 'Βήμα-βήμα', light: true, big: true },
    { id: 'cockpit', en: 'Cockpit', el: 'Cockpit', light: false, big: false },
    { id: 'bento', en: 'Bento', el: 'Bento', light: false, big: false },
    { id: 'cyber', en: 'Cyber', el: 'Cyber', light: false, big: false }
  ];
  var cur = 'classic', stored = false;
  try { var sv = localStorage.getItem(KEY); if (sv && LIST.some(function (t) { return t.id === sv; })) { cur = sv; stored = true; } } catch (e) { }
  var guide = { step: 0, full: false };
  var AREA_EL = { Stability: 'Σταθερότητα', Storage: 'Αποθήκευση', Security: 'Ασφάλεια', Network: 'Δίκτυο', Backup: 'Backup', Performance: 'Απόδοση', Updates: 'Ενημερώσεις', Software: 'Λογισμικό' };
  var TR = { Easy: 'Εύκολο', Medium: 'Μέτριο', 'Ask a pro': 'Ρώτα ειδικό', Safe: 'Ασφαλές', 'Back up first': 'Πρώτα αντίγραφο ασφαλείας', Careful: 'Με προσοχή' };
  function tr(s) { return V.lang === 'el' && TR[s] ? TR[s] : s; }
  function areaName(n) { return V.lang === 'el' && AREA_EL[n] ? AREA_EL[n] : n; }
  function meta(f) {
    var m = V.META[f.id] || [10, 'Medium', 'Safe'];
    return I('About ' + m[0] + ' min · Difficulty: ' + tr(m[1]) + ' · Risk: ' + tr(m[2]), 'Περίπου ' + m[0] + ' λεπτά · Δυσκολία: ' + tr(m[1]) + ' · Ρίσκο: ' + tr(m[2]));
  }
  function themeOf(id) { return LIST.filter(function (t) { return t.id === id; })[0] || LIST[0]; }

  /* ---------- shared pieces ---------- */
  function radarSvg(size, o) {
    o = o || {};
    var A = V.score.areas, n = A.length, c = 115, R = 88;
    function pt(i, r) { var a = (i * 360 / n - 90) * Math.PI / 180; return [c + r * Math.cos(a), c + r * Math.sin(a)]; }
    function poly(f) { return A.map(function (x, i) { var p = pt(i, R * f(x, i)); return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' '); }
    var s = '<svg class="thradar" viewBox="-100 -5 430 240" width="' + size + '" role="img" aria-label="' + esc(I('Radar of the 8 areas', 'Ραντάρ των 8 τομέων')) + '">';
    [.33, .66, 1].forEach(function (k) { s += '<polygon points="' + poly(function () { return k; }) + '" class="rg1"/>'; });
    A.forEach(function (x, i) { var p = pt(i, R); s += '<line x1="' + c + '" y1="' + c + '" x2="' + p[0].toFixed(1) + '" y2="' + p[1].toFixed(1) + '" class="rg1"/>'; });
    s += '<polygon points="' + poly(function () { return .9; }) + '" class="rgoal"/>';
    s += '<polygon points="' + poly(function (x) { return Math.max(0, Math.min(100, x.score)) / 100; }) + '" class="rval"/>';
    A.forEach(function (x, i) {
      var p = pt(i, R + 18), anc = p[0] > c + 12 ? 'start' : (p[0] < c - 12 ? 'end' : 'middle');
      s += '<text x="' + p[0].toFixed(1) + '" y="' + p[1].toFixed(1) + '" text-anchor="' + anc + '" dominant-baseline="middle" class="rlab">' + esc(areaName(x.name)) + ' ' + x.score + '</text>';
    });
    return s + '</svg>';
  }
  function counts() { var c = V.counts; return { high: c.high || 0, medium: c.medium || 0, low: c.low || 0, info: c.info || 0 }; }
  function headline() {
    var c = counts(), s = V.score.score;
    if (c.high) return I('Your PC needs attention.', 'Ο υπολογιστής σου χρειάζεται προσοχή.');
    if (c.medium || s < 85) return I('Your PC works, but a few things are worth a look.', 'Ο υπολογιστής σου δουλεύει, αλλά μερικά πράγματα αξίζει να τα δεις.');
    return I('Your PC looks healthy.', 'Ο υπολογιστής σου φαίνεται υγιής.');
  }
  function prio() { var o = V.openList(); return o.length ? o[0] : null; }
  function hdr(en, el) { return '<h3 class="thh">' + esc(I(en, el)) + '</h3>'; }

  /* ---------- Cockpit ---------- */
  function cockpit() {
    var c = counts(), p = prio(), st = VIZ.chkStats(), ex = p ? V.tf(p) : null;
    return '<div class="cp-grid"><div class="cp-radar">' + radarSvg(520) + '<div class="cp-leg"><span class="k1"></span>' + esc(I('Your PC', 'Ο υπολογιστής σου')) + ' <span class="k2"></span>' + esc(I('Goal 90', 'Στόχος 90')) + '</div></div>' +
      '<div class="cp-side"><div class="cp-score"><b>' + V.score.score + '</b><div><div class="cp-cap">HEALTH INDEX</div><p>' + esc(headline()) + '</p><p class="sm">' + esc(I('Estimate. It changes when you tick steps or accept a finding.', 'Εκτίμηση. Αλλάζει όταν κάνεις τικ ή αποδέχεσαι ένα εύρημα.')) + '</p></div></div>' +
      '<div class="cp-cnt"><div><b>' + c.high + '</b>HIGH</div><div class="m"><b>' + c.medium + '</b>MEDIUM</div><div><b>' + c.low + '</b>LOW</div></div>' +
      (p ? '<div class="cp-prio"><div class="cp-cap r">' + esc(I('PRIORITY #1', 'ΠΡΟΤΕΡΑΙΟΤΗΤΑ #1')) + '</div><b>' + esc(ex.title) + '</b><p>' + esc(meta(p)) + '</p><button class="btn sm" type="button" data-open="' + esc(p.id) + '">' + esc(I('Open', 'Άνοιγμα')) + '</button></div>' : '') +
      '</div></div>' +
      '<div class="cp-kpis"><div><small>' + esc(I('OPEN FINDINGS', 'ΑΝΟΙΧΤΑ ΕΥΡΗΜΑΤΑ')) + '</small><b>' + V.openList().length + '</b></div><div><small>' + esc(I('STEPS DONE', 'ΒΗΜΑΤΑ ΠΟΥ ΕΓΙΝΑΝ')) + '</small><b>' + st.done + '/' + st.total + '</b></div><div><small>' + esc(I('ACCEPTED', 'ΑΠΟΔΕΚΤΑ')) + '</small><b>' + V.acceptedCount() + '</b></div><div><small>' + esc(I('PERIOD (DAYS)', 'ΠΕΡΙΟΔΟΣ (ΗΜΕΡΕΣ)')) + '</small><b>' + V.days + '</b></div></div>';
  }

  /* ---------- Step by step ---------- */
  function guideHtml() {
    var list = V.openList().slice(0, 5), n = list.length, s = V.score.score, step = Math.max(0, Math.min(guide.step, n + 1)), body, bars = '';
    guide.step = step;
    for (var i = 0; i <= n + 1; i++) bars += '<i class="' + (i <= step ? 'on' : '') + '"></i>';
    if (step === 0) {
      body = '<div class="gd-k">' + esc(I('THE RESULT', 'ΤΟ ΑΠΟΤΕΛΕΣΜΑ')) + '</div><div class="gd-score"><b>' + s + '</b><span>' + esc(I('out of 100', 'στα 100')) + '</span></div><h2>' + esc(headline()) + '</h2><p>' +
        esc(n ? I('You do not have to change anything. If you want to improve it, there ' + (n === 1 ? 'is 1 small step' : 'are ' + n + ' small steps') + '. Take your time. Nothing changes by itself.', 'Δεν χρειάζεται να αλλάξεις κάτι. Αν θες να τον βελτιώσεις, ' + (n === 1 ? 'υπάρχει 1 μικρό βήμα' : 'υπάρχουν ' + n + ' μικρά βήματα') + '. Πάρε τον χρόνο σου. Τίποτα δεν αλλάζει μόνο του.') : I('There is nothing to fix right now. Run the check again after big changes.', 'Δεν υπάρχει τίποτα για διόρθωση τώρα. Τρέξε ξανά τον έλεγχο μετά από μεγάλες αλλαγές.')) + '</p>';
    } else if (step <= n) {
      var f = list[step - 1], t = V.tf(f);
      body = '<div class="gd-k">' + esc(I('STEP ' + step + ' OF ' + n, 'ΒΗΜΑ ' + step + ' ΑΠΟ ' + n)) + '</div><h2>' + esc(t.title) + '</h2><p>' + esc(t.why) + '</p>' +
        (t.steps.length ? '<div class="gd-do"><b>' + esc(I('What to do', 'Τι κάνεις')) + '</b><ol>' + t.steps.map(function (x) { return '<li>' + esc(x.t) + (x.cmd ? '<div class="gd-cmd"><code>' + esc(x.cmd) + '</code> <button class="btn sm" type="button" data-copy="' + esc(x.cmd) + '">' + esc(I('Copy', 'Αντιγραφή')) + '</button></div>' : '') + '</li>'; }).join('') + '</ol></div>' : '') +
        '<p class="gd-meta">' + esc(meta(f)) + ' &nbsp; <button class="btn sm" type="button" data-open="' + esc(f.id) + '">' + esc(I('Open in Findings', 'Άνοιγμα στα Ευρήματα')) + '</button></p>';
    } else {
      body = '<div class="gd-k">' + esc(I('THE END', 'ΤΕΛΟΣ')) + '</div><h2>' + esc(I('You are done. Well done.', 'Τελείωσες. Μπράβο.')) + '</h2><p>' + esc(I('Run the check again in a few days and see how the score changed. For the technical details open the Findings and Equipment tabs.', 'Σε λίγες μέρες τρέξε ξανά τον έλεγχο και δες πόσο άλλαξε ο βαθμός. Για τα τεχνικά στοιχεία άνοιξε τις καρτέλες Ευρήματα και Εξοπλισμός.')) + '</p>';
    }
    var nextL = step === 0 ? I('Let us start', 'Ας ξεκινήσουμε') : (step === n + 1 ? I('From the start', 'Από την αρχή') : I('Next', 'Επόμενο'));
    return '<div class="gd-bars" aria-hidden="true">' + bars + '</div><div class="gd-card">' + body + '</div><div class="gd-nav"><button class="btn" type="button" data-thg="back">&larr; ' + esc(I('Back', 'Πίσω')) + '</button>' +
      '<button class="btn sm" type="button" data-thg="full">' + esc(guide.full ? I('Hide the full summary', 'Απόκρυψη πλήρους σύνοψης') : I('Show the full summary', 'Εμφάνιση πλήρους σύνοψης')) + '</button>' +
      '<button class="btn pri" type="button" data-thg="next">' + esc(nextL) + ' &rarr;</button></div>';
  }

  /* ---------- Cyber: a turning sphere with one node per finding ---------- */
  var cy = null;
  function stopCyber() { if (cy) { cy.dead = true; cy = null; } }
  function cyberHtml() {
    var A = V.score.areas, c = counts();
    var rows = A.map(function (x) { var col = x.score < 80 ? '#ffb454' : (x.score < 90 ? '#29e3ff' : '#a8ff60'); return '<div class="cy-row" style="border-color:' + col + '"><span>' + esc(areaName(x.name)) + '</span><b>' + x.score + '</b></div>'; }).join('');
    return '<div class="cy-grid"><aside class="cy-pan"><h3 class="thh">' + esc(I('AREAS', 'ΤΟΜΕΙΣ')) + '</h3>' + rows + '<h3 class="thh">' + esc(I('HINT', 'ΥΠΟΔΕΙΞΗ')) + '</h3><p class="cy-hint">' + esc(I('Drag the sphere. Every node is a finding. Point at one to read it, press it to open.', 'Σύρε τη σφαίρα. Κάθε κόμβος είναι ένα εύρημα. Πέρασε από πάνω για να το διαβάσεις, πάτα για να ανοίξει.')) + '</p></aside>' +
      '<div class="cy-mid"><canvas id="cySphere" aria-label="' + esc(I('Sphere with one node for each finding', 'Σφαίρα με έναν κόμβο για κάθε εύρημα')) + '"></canvas><div class="cy-score"><b>' + V.score.score + '</b><small>HEALTH INDEX</small></div><div class="cy-det" id="cyDet" aria-live="polite"></div></div>' +
      '<aside class="cy-pan"><h3 class="thh">' + esc(I('RADAR', 'ΡΑΝΤΑΡ')) + '</h3>' + radarSvg(250) + '<h3 class="thh">' + esc(I('FINDINGS', 'ΕΥΡΗΜΑΤΑ')) + '</h3><div class="cy-cnt"><span class="m">' + esc(I('medium', 'μέτρια')) + '</span><b>' + (c.high + c.medium) + '</b><span class="c">' + esc(I('small', 'μικρά')) + '</span><b>' + c.low + '</b><span class="l">' + esc(I('info', 'πληροφορίες')) + '</span><b>' + c.info + '</b></div>' +
      '<h3 class="thh">' + esc(I('HEARTBEAT', 'ΠΑΛΜΟΣ')) + '</h3><svg viewBox="0 0 226 44" width="100%" aria-hidden="true"><polyline class="cy-ecg" points="0,26 30,26 38,26 42,20 46,26 60,26 66,26 70,6 74,40 78,24 84,26 110,26 140,26 148,26 152,20 156,26 170,26 176,26 180,6 184,40 188,24 194,26 226,26"/></svg></aside></div>';
  }
  function startCyber() {
    var cv = document.getElementById('cySphere'); if (!cv) return;
    var all = V.findings.slice().sort(function (a, b) { var o = { high: 0, medium: 1, low: 2, info: 3 }; return o[a.sev] - o[b.sev]; });
    var N = all.length, ga = Math.PI * (3 - Math.sqrt(5)), pts = all.map(function (f, i) { var y = 1 - 2 * (i + .5) / Math.max(1, N), r = Math.sqrt(Math.max(0, 1 - y * y)), th = i * ga; return { f: f, x: r * Math.cos(th), y: y, z: r * Math.sin(th), sx: 0, sy: 0, d: 0 }; });
    var S = { dead: false, rot: .5, tilt: -.38, vr: .0035, drag: false, lx: 0, ly: 0, hover: null, sel: null, moved: 0 };
    cy = S;
    var ctx = cv.getContext('2d'), W = 0, H = 0, still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var COL = { high: '#ff2e93', medium: '#ff2e93', low: '#29e3ff', info: '#a8ff60' };
    function size() { var r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1; W = r.width; H = r.height; cv.width = Math.max(1, W * dpr); cv.height = Math.max(1, H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    function proj(x, y, z) { var cr = Math.cos(S.rot), sr = Math.sin(S.rot), x2 = x * cr + z * sr, z2 = -x * sr + z * cr, ct = Math.cos(S.tilt), st = Math.sin(S.tilt), y2 = y * ct - z2 * st, z3 = y * st + z2 * ct, R = Math.min(W, H) * .42; return [W / 2 + R * x2, H / 2 + R * y2, z3]; }
    function det(p) {
      var el = document.getElementById('cyDet'); if (!el) return;
      if (!p) { el.innerHTML = '<span class="k">' + esc(I('Point at a node', 'Πέρασε από έναν κόμβο')) + '</span>'; return; }
      var t = V.tf(p.f), sevL = { high: I('serious', 'σοβαρό'), medium: I('medium', 'μέτριο'), low: I('small', 'μικρό'), info: I('info', 'πληροφορία') }[p.f.sev];
      el.innerHTML = '<span class="k" style="color:' + COL[p.f.sev] + '">' + esc(sevL) + (V.isResolved(p.f) ? ' · ' + esc(I('done', 'έγινε')) : '') + '</span><b>' + esc(t.title) + '</b><button class="btn sm" type="button" data-open="' + esc(p.f.id) + '">' + esc(I('Open', 'Άνοιγμα')) + '</button>';
    }
    function frame() {
      if (S.dead || !document.body.contains(cv)) { S.dead = true; return; }
      requestAnimationFrame(frame);
      if (!cv.offsetParent) return;
      if (!W) size();
      if (!S.drag && !still && !S.hover) S.rot += S.vr;
      ctx.clearRect(0, 0, W, H);
      var R = Math.min(W, H) * .42, k, i, j, a, p, q;
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(41,227,255,.16)';
      for (k = -60; k <= 60; k += 30) { ctx.beginPath(); for (a = 0; a <= 360; a += 10) { var la = k * Math.PI / 180, t = a * Math.PI / 180; p = proj(Math.cos(la) * Math.cos(t), Math.sin(la), Math.cos(la) * Math.sin(t)); if (a) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); } ctx.stroke(); }
      for (k = 0; k < 180; k += 30) { var lo = k * Math.PI / 180; ctx.beginPath(); for (a = 0; a <= 360; a += 10) { var tt = a * Math.PI / 180; p = proj(Math.cos(tt) * Math.cos(lo), Math.sin(tt), Math.cos(tt) * Math.sin(lo)); if (a) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); } ctx.stroke(); }
      ctx.strokeStyle = 'rgba(41,227,255,.4)'; ctx.beginPath(); ctx.arc(W / 2, H / 2, R, 0, 7); ctx.stroke();
      pts.forEach(function (n) { q = proj(n.x, n.y, n.z); n.sx = q[0]; n.sy = q[1]; n.d = q[2]; });
      var order = pts.slice().sort(function (a, b) { return a.d - b.d; });
      ctx.font = '11px ui-monospace,Consolas,monospace';
      order.forEach(function (n) {
        var big = n.f.sev === 'medium' || n.f.sev === 'high', r = (big ? 8 : 5) * (.7 + .3 * (n.d + 1) / 2), op = .3 + .7 * (n.d + 1) / 2, col = COL[n.f.sev];
        if (V.isResolved(n.f)) { col = '#6c8f9c'; op *= .6; }
        ctx.globalAlpha = op; ctx.fillStyle = col;
        if (big) { ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(n.sx, n.sy, r + 8, 0, 7); ctx.stroke(); }
        if (n === S.hover || n === S.sel) { ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(n.sx, n.sy, r + 5, 0, 7); ctx.stroke(); }
        ctx.beginPath(); ctx.arc(n.sx, n.sy, r, 0, 7); ctx.fill();
        if (big && n.d > -.1) { ctx.fillStyle = col; ctx.fillText(n.f.id, n.sx + r + 10, n.sy - 6); }
      });
      ctx.globalAlpha = 1;
    }
    function hit(e) { var r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, best = null, bd = 14; pts.forEach(function (n) { if (n.d < -.25) return; var d = Math.hypot(n.sx - x, n.sy - y); if (d < bd) { bd = d; best = n; } }); return best; }
    cv.addEventListener('pointerdown', function (e) { S.drag = true; S.lx = e.clientX; S.ly = e.clientY; S.moved = 0; try { cv.setPointerCapture(e.pointerId); } catch (x) { } });
    cv.addEventListener('pointermove', function (e) {
      if (S.drag) { var dx = e.clientX - S.lx, dy = e.clientY - S.ly; S.moved += Math.abs(dx) + Math.abs(dy); S.rot += dx * .008; S.tilt = Math.max(-1.2, Math.min(1.2, S.tilt + dy * .006)); S.lx = e.clientX; S.ly = e.clientY; return; }
      var h = hit(e); if (h !== S.hover) { S.hover = h; cv.style.cursor = h ? 'pointer' : 'grab'; det(h || S.sel); }
    });
    cv.addEventListener('pointerup', function (e) { S.drag = false; if (S.moved < 5) { var h = hit(e); if (h) { S.sel = h; det(h); } } });
    cv.addEventListener('pointerleave', function () { S.hover = null; det(S.sel); });
    window.addEventListener('resize', function () { if (!S.dead) size(); });
    det(null); size(); frame();
  }

  /* ---------- decorate the Summary ---------- */
  function decorate() {
    var pane = document.getElementById('tab-summary'); if (!pane) return;
    var old = document.getElementById('thHero'); if (old && old.parentNode) old.parentNode.removeChild(old);
    stopCyber();
    pane.classList.toggle('thfull', !!guide.full);
    var h = '';
    if (cur === 'cockpit') h = cockpit(); else if (cur === 'guide') h = guideHtml(); else if (cur === 'cyber') h = cyberHtml();
    if (!h) return;
    var d = document.createElement('div'); d.id = 'thHero'; d.className = 'thhero th-' + cur; d.innerHTML = h;
    pane.insertBefore(d, pane.firstChild);
    if (cur === 'cyber') startCyber();
  }

  /* ---------- switch ---------- */
  function applyClass() {
    LIST.forEach(function (t) { document.body.classList.remove('th-' + t.id); });
    document.body.classList.add('th-' + cur);
    var b = document.getElementById('btnTheme'); if (b) b.style.display = cur === 'classic' ? '' : 'none';
    var s = document.getElementById('themeSel'); if (s) s.value = cur;
  }
  function set(id, fromUser) {
    var t = themeOf(id); cur = t.id;
    try { localStorage.setItem(KEY, cur); } catch (e) { }
    guide.step = 0;
    if (cur !== 'classic' || fromUser) VIZ.set('light', t.light);
    if (fromUser) VIZ.set('big', t.big);
    applyClass();
    if (fromUser) { UI.renderAll(); VIZ.applyPrefs(); I18N.apply(); }
  }
  function relabel() {
    var sel = document.getElementById('themeSel'), chip = document.getElementById('themeChip');
    if (chip && chip.firstChild) chip.firstChild.nodeValue = I('Theme ', 'Θέμα ');
    if (sel) { sel.innerHTML = LIST.map(function (t) { return '<option value="' + t.id + '">' + esc(I(t.en, t.el)) + '</option>'; }).join(''); sel.value = cur; }
  }
  function init() {
    var sel = document.getElementById('themeSel');
    relabel();
    if (sel) sel.addEventListener('change', function () { set(sel.value, true); });
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-thg]'); if (!b) return;
      var a = b.getAttribute('data-thg'), n = Math.min(5, V.openList().length);
      if (a === 'next') guide.step = guide.step >= n + 1 ? 0 : guide.step + 1;
      else if (a === 'back') guide.step = Math.max(0, guide.step - 1);
      else if (a === 'full') guide.full = !guide.full;
      decorate();
    });
    /* first time: Classic Veagle OS, exactly as before. Later: the theme you chose, with your own text-size choice. */
    if (!stored) applyClass(); else { if (cur !== 'classic') VIZ.set('light', themeOf(cur).light); applyClass(); }
  }
  return { init: init, relabel: relabel, decorate: decorate, set: set, list: LIST, current: function () { return cur; } };
})(V);
