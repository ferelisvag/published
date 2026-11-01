/* VEAGLE PC Check 0.6.1 - visual layer: PC map, KPI tiles with gauges and sparklines, area tiles, findings overview */
var VIZ2 = (function (V, UI) {
  'use strict';
  var $ = V.$, $$ = V.$$, esc = V.esc, arr = V.arr, num = V.num, g = V.g, D = V.D;
  function I(en, el) { return V.I(en, el); }
  var COL = { red: '#e82c2d', amber: '#f5b44a', green: '#3ddc84', grey: '#8a8a94', white: '#ececf0' };
  var AREA_EL = { Stability: 'Σταθερότητα', Storage: 'Αποθήκευση', Security: 'Ασφάλεια', Network: 'Δίκτυο', Backup: 'Αντίγραφα', Performance: 'Απόδοση', Updates: 'Ενημερώσεις', Software: 'Λογισμικό' };
  var AREA_HINT = {
    Stability: ['crashes and blue screens', 'κρασαρίσματα και μπλε οθόνες'], Storage: ['drives and free space', 'δίσκοι και ελεύθερος χώρος'], Security: ['antivirus, accounts, doors', 'antivirus, λογαριασμοί, πόρτες'],
    Network: ['internet and Wi-Fi', 'internet και Wi-Fi'], Backup: ['copies of your files', 'αντίγραφα των αρχείων σου'], Performance: ['speed, heat, start-up', 'ταχύτητα, θερμοκρασία, εκκίνηση'], Updates: ['Windows and programs', 'Windows και προγράμματα'], Software: ['installed programs', 'εγκατεστημένα προγράμματα']
  };
  function areaName(a) { return I(a, AREA_EL[a] || a); }
  function worst(area) {
    var f = V.findings.filter(function (x) { return x.area === area && x.sev !== 'info'; });
    var h = f.filter(function (x) { return x.sev === 'high'; }).length, m = f.filter(function (x) { return x.sev === 'medium'; }).length, l = f.filter(function (x) { return x.sev === 'low'; }).length;
    return { n: f.length, h: h, m: m, l: l, col: h ? COL.red : (m ? COL.amber : (l ? COL.white : COL.green)) };
  }
  function areaScore(a) { var x = V.score.areas.filter(function (z) { return z.name === a; })[0]; return x ? x.score : 100; }
  function goArea(area) {
    UI.state.area = area; UI.state.sev = 'all'; UI.state.q = '';
    var fq = $('#findQ'); if (fq) fq.value = '';
    $$('#nav button').forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute('data-tab') === 'findings' ? 'true' : 'false'); });
    $$('.tabpane').forEach(function (p) { p.classList.toggle('on', p.id === 'tab-findings'); });
    try { history.replaceState(null, '', '#findings'); } catch (e) { } window.scrollTo(0, 0);
    UI.renderAll();
  }
  function spark(vals, col, w, h) {
    vals = vals.filter(function (v) { return v != null && isFinite(v); }); w = w || 120; h = h || 34;
    if (vals.length < 2) return '<svg viewBox="0 0 ' + w + ' ' + h + '" class="spk"></svg>';
    var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals), sp = (mx - mn) || 1;
    var xy = vals.map(function (v, i) { return [3 + i * (w - 6) / (vals.length - 1), h - 4 - (v - mn) / sp * (h - 10)]; });
    var line = xy.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" class="spk" preserveAspectRatio="none"><path d="' + line + ' L' + xy[xy.length - 1][0] + ' ' + h + ' L' + xy[0][0] + ' ' + h + ' Z" fill="' + col + '" fill-opacity=".14"/><path d="' + line + '" fill="none" stroke="' + col + '" stroke-width="2" stroke-linejoin="round"/><circle cx="' + xy[xy.length - 1][0].toFixed(1) + '" cy="' + xy[xy.length - 1][1].toFixed(1) + '" r="3" fill="' + col + '"/></svg>';
  }
  function gauge(pct, col, big, small) {
    pct = Math.max(0, Math.min(100, pct)); var r = 44, c = Math.PI * r, off = c * (1 - pct / 100);
    return '<svg viewBox="0 0 120 74" class="kg" role="img" aria-label="' + esc(big) + '"><path d="M16 64 A44 44 0 0 1 104 64" fill="none" stroke="var(--line)" stroke-width="10" stroke-linecap="round"/><path class="kgf" d="M16 64 A44 44 0 0 1 104 64" fill="none" stroke="' + col + '" stroke-width="10" stroke-linecap="round" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/><text x="60" y="58" text-anchor="middle" class="kgn">' + esc(big) + '</text></svg>';
  }

  /* ---------- Summary: KPI tiles and area tiles ---------- */
  function kpis() {
    var tr = arr(D.trend), cv = arr(D.volumes).filter(function (x) { return /^C:/i.test(x.letter); })[0] || arr(D.volumes)[0];
    var tiles = [];
    if (cv && num(cv.sizeGB)) {
      var fp = num(cv.freeGB) / num(cv.sizeGB) * 100, c1 = fp < 10 ? COL.red : (fp < 20 ? COL.amber : COL.green);
      tiles.push({ go: 'dashboard', t: I('Free space on ', 'Ελεύθερος χώρος στο ') + cv.letter, v: gauge(100 - fp, c1, Math.round(fp) + '%'), s: V.fmtGB(cv.freeGB) + I(' free of ', ' ελεύθερα από ') + V.fmtGB(cv.sizeGB), sp: spark(tr.map(function (x) { return x.freeC; }), c1) });
    }
    var r = g(D, 'system.ram', null);
    if (r && num(r.totalGB)) { var up = (r.totalGB - r.freeGB) / r.totalGB * 100, c2 = up > 90 ? COL.red : (up > 75 ? COL.amber : COL.green); tiles.push({ go: 'dashboard', t: I('Memory in use', 'Μνήμη σε χρήση'), v: gauge(up, c2, Math.round(up) + '%'), s: V.fmtGB(r.totalGB - r.freeGB) + I(' of ', ' από ') + V.fmtGB(r.totalGB), sp: '' }); }
    var bh = arr(g(D, 'boot.history', [])).slice(0, 6).reverse().map(function (x) { return num(x.seconds); }), bavg = bh.length ? bh.reduce(function (a, b) { return a + b; }, 0) / bh.length : null;
    if (bavg != null) { var c3 = bavg > 90 ? COL.red : (bavg > 50 ? COL.amber : COL.green); tiles.push({ go: 'events', t: I('Start-up time', 'Χρόνος εκκίνησης'), v: '<div class="kbig" style="color:' + c3 + '">' + Math.round(bavg) + '<small> s</small></div>', s: bavg > 90 ? I('slow', 'αργή') : (bavg > 50 ? I('a bit slow', 'λίγο αργή') : I('fast', 'γρήγορη')), sp: spark(bh, c3) }); }
    var pd = g(D, 'updates.lastPatchDaysAgo', null);
    if (pd != null) { var c4 = pd > 90 ? COL.red : (pd > 45 ? COL.amber : COL.green); tiles.push({ go: 'findings', t: I('Last Windows update', 'Τελευταία ενημέρωση Windows'), v: '<div class="kbig" style="color:' + c4 + '">' + pd + '<small> ' + I('days', 'ημ.') + '</small></div>', s: pd > 90 ? I('far too long', 'πάρα πολύ καιρό') : (pd > 45 ? I('getting old', 'παλιώνει') : I('recent', 'πρόσφατη')), sp: spark(tr.map(function (x) { return x.patchDays; }), c4) }); }
    var er = num(g(D, 'events.system.errors', 0)) + num(g(D, 'events.application.errors', 0));
    var c5 = er > 800 ? COL.red : (er > 200 ? COL.amber : COL.green);
    tiles.push({ go: 'events', t: I('Errors in 30 days', 'Σφάλματα σε 30 ημέρες'), v: '<div class="kbig" style="color:' + c5 + '">' + V.fmtNum(er) + '</div>', s: er > 800 ? I('a lot, see the timeline', 'πολλά, δες το χρονολόγιο') : (er > 200 ? I('some noise', 'λίγος θόρυβος') : I('quiet', 'ήσυχο')), sp: spark(tr.map(function (x) { return x.sysErr; }), c5) });
    var sn = (V.uniq ? V.uniq(arr(g(D, 'startup.items', [])).map(function (s) { return s.name; })) : arr(g(D, 'startup.items', []))).length;
    var c6 = sn > 25 ? COL.red : (sn > 14 ? COL.amber : COL.green);
    tiles.push({ go: 'software', t: I('Programs at start-up', 'Προγράμματα στην εκκίνηση'), v: '<div class="kbig" style="color:' + c6 + '">' + sn + '</div>', s: sn > 25 ? I('too many', 'πάρα πολλά') : (sn > 14 ? I('quite a few', 'αρκετά') : I('fine', 'εντάξει')), sp: spark(tr.map(function (x) { return x.startup; }), c6) });
    return '<div class="kpis">' + tiles.map(function (t) { return '<button type="button" class="kpi" data-tab-go="' + t.go + '"><span class="kt">' + esc(t.t) + '</span><span class="kv">' + t.v + '</span><span class="ks">' + esc(t.s) + '</span>' + (t.sp || '') + '</button>'; }).join('') + '</div>';
  }
  function areaTiles() {
    return '<div class="atiles">' + V.score.areas.map(function (a) {
      var w = worst(a.name), sc = a.score, col = sc >= 90 ? COL.green : (sc >= 70 ? COL.amber : COL.red), r = 22, c = 2 * Math.PI * r;
      return '<button type="button" class="atile" data-area="' + esc(a.name) + '" style="--ac:' + col + '"><svg viewBox="0 0 56 56" class="ar"><circle cx="28" cy="28" r="' + r + '" fill="none" stroke="var(--line)" stroke-width="5"/><circle class="arf" cx="28" cy="28" r="' + r + '" fill="none" stroke="' + col + '" stroke-width="5" stroke-linecap="round" transform="rotate(-90 28 28)" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + (c * (1 - sc / 100)).toFixed(1) + '"/><text x="28" y="32" text-anchor="middle" class="arn">' + sc + '</text></svg>' +
        '<span class="at"><b>' + esc(areaName(a.name)) + '</b><small>' + esc(I(AREA_HINT[a.name][0], AREA_HINT[a.name][1])) + '</small><span class="dots">' + (w.h ? '<i class="d h">' + w.h + '</i>' : '') + (w.m ? '<i class="d m">' + w.m + '</i>' : '') + (w.l ? '<i class="d l">' + w.l + '</i>' : '') + (!w.n ? '<i class="d ok">&#10003;</i>' : '') + '</span></span></button>';
    }).join('') + '</div>';
  }
  function summary() {
    var el = $('#tab-summary'); if (!el) return;
    var old = el.querySelector('.vz2'); if (old) old.remove();
    var hero = el.querySelector('.summary'); if (!hero) return;
    var d = document.createElement('div'); d.className = 'vz2';
    d.innerHTML = '<div class="sect"><h2>' + esc(I('Your PC in numbers', 'Ο υπολογιστής σου σε αριθμούς')) + '</h2><span>' + esc(I('click a tile for details', 'πάτα ένα πλακίδιο για λεπτομέρειες')) + '</span></div>' + kpis() +
      '<div class="sect"><h2>' + esc(I('How each area is doing', 'Πώς πάει κάθε περιοχή')) + '</h2><span>' + esc(I('click an area to see only its findings', 'πάτα μια περιοχή για να δεις μόνο τα ευρήματά της')) + '</span></div>' + areaTiles();
    hero.insertAdjacentElement('afterend', d);
  }

  /* ---------- Dashboard: the map of the PC ---------- */
  function pcMap() {
    var el = $('#pcMap'); if (!el) return;
    var A = ['Stability', 'Storage', 'Security', 'Network', 'Backup', 'Performance', 'Updates', 'Software'];
    var pos = [[110, 52], [370, 52], [630, 52], [890, 52], [110, 258], [370, 258], [630, 258], [890, 258]];
    var cx = 500, cy = 155, svg = '<svg viewBox="0 0 1000 310" class="pcmap" role="img" aria-label="' + esc(I('Map of your PC: each box is an area, the colour shows how it is doing', 'Χάρτης του υπολογιστή σου: κάθε κουτί είναι μια περιοχή, το χρώμα δείχνει πώς πάει')) + '">';
    svg += '<defs><linearGradient id="pmg" x1="0" x2="1"><stop offset="0" stop-color="#e82c2d" stop-opacity=".0"/><stop offset=".5" stop-color="#e82c2d" stop-opacity=".9"/><stop offset="1" stop-color="#e82c2d" stop-opacity=".0"/></linearGradient></defs>';
    A.forEach(function (a, i) {
      var p = pos[i], w = worst(a), x = p[0], y = p[1], top = y < cy, y2 = top ? y + 40 : y - 40;
      svg += '<path class="pml" d="M' + x + ' ' + y2 + ' C ' + x + ' ' + cy + ', ' + cx + ' ' + (top ? cy - 40 : cy + 40) + ', ' + cx + ' ' + (top ? cy - 26 : cy + 26) + '" fill="none" stroke="' + w.col + '" stroke-opacity=".55" stroke-width="2" stroke-dasharray="5 6"/>';
    });
    svg += '<g><rect x="' + (cx - 92) + '" y="' + (cy - 28) + '" width="184" height="56" rx="6" fill="#120a0a" stroke="#e82c2d" stroke-width="2" class="pmc"/><text x="' + cx + '" y="' + (cy - 3) + '" text-anchor="middle" class="pmt" fill="#fff">' + esc(g(D, 'meta.computer', 'PC')) + '</text><text x="' + cx + '" y="' + (cy + 16) + '" text-anchor="middle" class="pms">' + esc(I('score ', 'βαθμός ') + V.score.score + '/100') + '</text></g>';
    A.forEach(function (a, i) {
      var p = pos[i], w = worst(a), sc = areaScore(a), x = p[0], y = p[1];
      svg += '<g class="pmn" data-area="' + a + '" tabindex="0" role="button" aria-label="' + esc(areaName(a) + ' ' + sc) + '"><rect x="' + (x - 104) + '" y="' + (y - 40) + '" width="208" height="80" rx="6" fill="var(--panel)" stroke="' + w.col + '" stroke-width="2"/>' +
        '<rect x="' + (x - 104) + '" y="' + (y - 40) + '" width="6" height="80" fill="' + w.col + '"/>' +
        '<text x="' + (x - 88) + '" y="' + (y - 14) + '" class="pmt" fill="var(--text)">' + esc(areaName(a)) + '</text><text x="' + (x - 88) + '" y="' + (y + 4) + '" class="pms">' + esc((function (s) { return s.length > 27 ? s.slice(0, 26) + '…' : s; })(I(AREA_HINT[a][0], AREA_HINT[a][1]))) + '</text>' +
        '<text x="' + (x + 94) + '" y="' + (y - 12) + '" text-anchor="end" class="pmv" fill="' + w.col + '">' + sc + '</text>' +
        '<text x="' + (x - 88) + '" y="' + (y + 28) + '" class="pms" fill="' + w.col + '">' + (w.n ? (w.h ? w.h + ' ' + I('serious', 'σοβαρά') + ' ' : '') + (w.m ? w.m + ' ' + I('medium', 'μέτρια') + ' ' : '') + (w.l ? w.l + ' ' + I('small', 'μικρά') : '') : '&#10003; ' + I('all good', 'όλα καλά')) + '</text></g>';
    });
    svg += '</svg>';
    el.innerHTML = '<div class="win"><header><span>pc.map</span><span class="st">' + esc(I('click a box to see its findings', 'πάτα ένα κουτί για τα ευρήματά του')) + '</span></header><div class="body">' + svg + '</div></div>';
  }

  /* ---------- Findings: overview, area chips, sort ---------- */
  function findingsBar() {
    var el = $('#findViz'); if (!el) return;
    var c = V.counts, tot = Math.max(1, c.high + c.medium + c.low + c.info);
    var seg = [['high', c.high, COL.red, I('serious', 'σοβαρά')], ['medium', c.medium, COL.amber, I('medium', 'μέτρια')], ['low', c.low, '#c9c9d0', I('small', 'μικρά')], ['info', c.info, '#5b6475', I('tips', 'συμβουλές')]];
    var h = '<div class="fbar" role="img" aria-label="' + esc(seg.map(function (s) { return s[1] + ' ' + s[3]; }).join(', ')) + '">' + seg.filter(function (s) { return s[1]; }).map(function (s) { return '<i style="flex:' + s[1] + ';background:' + s[2] + '" title="' + esc(s[1] + ' ' + s[3]) + '"><b>' + s[1] + '</b></i>'; }).join('') + '</div>';
    h += '<div class="chips"><button type="button" class="ch' + (!UI.state.area ? ' on' : '') + '" data-area="">' + esc(I('All areas', 'Όλες οι περιοχές')) + '</button>' + V.score.areas.map(function (a) {
      var n = V.findings.filter(function (f) { return f.area === a.name; }).length, w = worst(a.name);
      return '<button type="button" class="ch' + (UI.state.area === a.name ? ' on' : '') + '" data-area="' + esc(a.name) + '" style="--ac:' + w.col + '"><i class="cd" style="background:' + w.col + '"></i>' + esc(areaName(a.name)) + ' <small>' + n + '</small></button>';
    }).join('') + '<span class="chsp"></span><label class="sr" for="findSort">' + esc(I('Sort', 'Ταξινόμηση')) + '</label><select id="findSort" class="sel sm"><option value="prio">' + esc(I('Most important first', 'Πρώτα τα πιο σημαντικά')) + '</option><option value="quick">' + esc(I('Quick wins first', 'Πρώτα τα γρήγορα')) + '</option><option value="area">' + esc(I('By area', 'Ανά περιοχή')) + '</option></select>' +
      '<button type="button" class="btn sm" id="fExpand">' + esc(I('Open all', 'Άνοιγμα όλων')) + '</button><button type="button" class="btn sm" id="fCollapse">' + esc(I('Close all', 'Κλείσιμο όλων')) + '</button></div>';
    el.innerHTML = h;
    var s = $('#findSort'); if (s) { s.value = UI.state.sort || 'prio'; }
  }
  document.addEventListener('click', function (e) {
    var t;
    if ((t = e.target.closest && e.target.closest('.atile, .pmn'))) { goArea(t.getAttribute('data-area')); return; }
    if ((t = e.target.closest && e.target.closest('.chips .ch'))) { UI.state.area = t.getAttribute('data-area') || ''; findingsBar(); UI.drawFindings(); return; }
    if (e.target && e.target.id === 'fExpand') { $$('#findList .finding').forEach(function (f) { f.classList.add('open'); var h = f.querySelector('.fh'); if (h) h.setAttribute('aria-expanded', 'true'); }); }
    if (e.target && e.target.id === 'fCollapse') { $$('#findList .finding').forEach(function (f) { f.classList.remove('open'); var h = f.querySelector('.fh'); if (h) h.setAttribute('aria-expanded', 'false'); }); }
  });
  document.addEventListener('change', function (e) { if (e.target && e.target.id === 'findSort') { UI.state.sort = e.target.value; UI.drawFindings(); } });
  document.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.classList && e.target.classList.contains('pmn')) { e.preventDefault(); goArea(e.target.getAttribute('data-area')); } });
  function render() { summary(); pcMap(); findingsBar(); }
  return { render: render };
})(V, UI);
