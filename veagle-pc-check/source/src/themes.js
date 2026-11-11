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
    { id: 'cyber', en: 'Cyber', el: 'Cyber', light: false, big: false },
    { id: 'iqon', en: 'IQON', el: 'IQON', light: false, big: false },
    { id: 'compass', en: 'Compass', el: 'Compass', light: true, big: false },
    { id: 'fable', en: 'Fable52', el: 'Fable52', light: false, big: false }
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


  /* ---------- the newer looks: IQON and Compass (state is always also written in words) ---------- */
  function stWord(sc) { return sc >= 85 ? I('OK', 'ΟΚ') : (sc >= 60 ? I('Check', 'Έλεγξε') : I('Fix', 'Διόρθωσε')); }
  function stCls(sc) { return sc >= 85 ? 'ok' : (sc >= 60 ? 'mid' : 'bad'); }
  function areaBtn(a, cls, inner) { return '<button type="button" class="' + cls + ' ' + stCls(a.score) + '" data-tharea="' + esc(a.name) + '" aria-label="' + esc(areaName(a.name) + ' ' + a.score + ', ' + stWord(a.score)) + '">' + inner + '</button>'; }
  function ring(score, r, w, cls) {
    var C = 2 * Math.PI * r, d = (Math.max(0, Math.min(100, score)) / 100 * C).toFixed(1);
    return '<svg class="' + cls + '" viewBox="0 0 ' + (2 * (r + w)) + ' ' + (2 * (r + w)) + '" aria-hidden="true"><circle cx="' + (r + w) + '" cy="' + (r + w) + '" r="' + r + '" class="rt" fill="none" stroke-width="' + w + '"/><circle cx="' + (r + w) + '" cy="' + (r + w) + '" r="' + r + '" class="rv" fill="none" stroke-width="' + w + '" stroke-linecap="round" stroke-dasharray="' + d + ' ' + C.toFixed(1) + '" transform="rotate(-90 ' + (r + w) + ' ' + (r + w) + ')"/></svg>';
  }
  function prioBox(cap) {
    var p = prio(); if (!p) return '<div class="nx-prio"><b>' + esc(I('Nothing to do right now.', 'Δεν υπάρχει κάτι να κάνεις τώρα.')) + '</b></div>';
    var ex = V.tf(p);
    return '<div class="nx-prio"><div class="thh">' + esc(cap) + '</div><b>' + esc(ex.title) + '</b><p>' + esc(meta(p)) + '</p><button class="btn sm" type="button" data-open="' + esc(p.id) + '">' + esc(I('Open', 'Άνοιγμα')) + '</button></div>';
  }
  function note() { return '<p class="nx-note">' + esc(I('Estimate from this scan. It changes when you tick steps or accept a finding. Nothing is changed on your PC.', 'Εκτίμηση από αυτή τη σάρωση. Αλλάζει όταν τσεκάρεις βήματα ή αποδέχεσαι ένα εύρημα. Τίποτα δεν αλλάζει στον υπολογιστή σου.')) + '</p>'; }
  function cntRow() { var c = counts(); return '<div class="nx-cnt"><span><b>' + c.high + '</b>' + esc(I('High', 'Υψηλή')) + '</span><span><b>' + c.medium + '</b>' + esc(I('Medium', 'Μέτρια')) + '</span><span><b>' + c.low + '</b>' + esc(I('Low', 'Χαμηλή')) + '</span></div>'; }
  function iqon() {
    var A = V.score.areas;
    return '<div class="iq-wrap"><div class="iq-main"><div class="iq-gauge">' + ring(V.score.score, 86, 14, 'iq-ring') + '<div class="iq-num"><b>' + V.score.score + '</b><small>' + esc(I('HEALTH', 'ΥΓΕΙΑ')) + '</small></div></div><div class="iq-txt"><h2>' + esc(headline()) + '</h2>' + cntRow() + note() + '</div></div>' +
      '<div class="iq-tiles">' + A.map(function (a) { return areaBtn(a, 'iq-tile', '<span class="iq-ic" aria-hidden="true">' + esc(areaName(a.name).charAt(0)) + '</span><span class="iq-n">' + esc(areaName(a.name)) + '</span><b>' + a.score + '</b><em>' + esc(stWord(a.score)) + '</em>'); }).join('') + '</div>' + prioBox(I('Do this first', 'Κάνε πρώτα αυτό')) + '</div>';
  }
  /* ---------- Compass: a decision map, a time budget and a calm-days calendar. A different kind of report top: it answers "what should I do with the time I have?" ---------- */
  var cmBudget = 30;
  function cmItems() {
    return V.openList().filter(function (f) { return f.sev !== 'info'; }).map(function (f) {
      var m = (V.META[f.id] || [10])[0] || 10, w = { high: 3, medium: 2, low: 1 }[f.sev] || 1;
      return { f: f, min: m, w: w, d: w / Math.max(m, 1) };
    });
  }
  function cmPlan(budget) {
    var its = cmItems().sort(function (a, b) { return b.w - a.w || a.min - b.min; }), used = 0, sel = {}, list = [];
    its.forEach(function (it) { if (used + it.min <= budget) { used += it.min; sel[it.f.id] = 1; list.push(it); } });
    return { all: its, sel: sel, list: list, used: used };
  }
  function sevWord(s) { return s === 'high' ? I('High', 'Υψηλή') : (s === 'medium' ? I('Medium', 'Μέτρια') : I('Low', 'Χαμηλή')); }
  function cmMapSvg(P) {
    var W = 720, H = 330, L = 78, R = 34, T = 18, B = 40, maxM = 120;
    P.all.forEach(function (it) { if (it.min > maxM) maxM = it.min; });
    var a = Math.log(2), b = Math.log(maxM);
    function X(m) { return L + (Math.log(Math.max(2, m)) - a) / (b - a) * (W - L - R); }
    var bandY = { 3: T + 40, 2: T + 120, 1: T + 200 }, s = '<svg class="cm-svg" viewBox="0 0 ' + W + ' ' + H + '" role="group" aria-label="' + esc(I('Decision map: each circle is one finding. Left means quick to fix, higher means more important.', 'Χάρτης αποφάσεων: κάθε κύκλος είναι ένα εύρημα. Αριστερά σημαίνει γρήγορο, πιο ψηλά σημαίνει πιο σημαντικό.')) + '">';
    var bx = X(cmBudget);
    s += '<rect x="' + L + '" y="' + T + '" width="' + Math.max(0, bx - L).toFixed(1) + '" height="' + (H - T - B) + '" class="cm-budgetzone"/>';
    [[3, I('HIGH', 'ΥΨΗΛΗ')], [2, I('MEDIUM', 'ΜΕΤΡΙΑ')], [1, I('LOW', 'ΧΑΜΗΛΗ')]].forEach(function (r) {
      s += '<line x1="' + L + '" y1="' + (bandY[r[0]] + 36) + '" x2="' + (W - R) + '" y2="' + (bandY[r[0]] + 36) + '" class="cm-grid"/><text x="' + (L - 10) + '" y="' + (bandY[r[0]] + 4) + '" text-anchor="end" class="cm-ax">' + esc(r[1]) + '</text>';
    });
    [5, 15, 30, 60, 120].forEach(function (m) { if (m <= maxM) s += '<line x1="' + X(m).toFixed(1) + '" y1="' + T + '" x2="' + X(m).toFixed(1) + '" y2="' + (H - B) + '" class="cm-grid v"/><text x="' + X(m).toFixed(1) + '" y="' + (H - B + 16) + '" text-anchor="middle" class="cm-ax">' + m + ' ' + esc(I('min', 'λ')) + '</text>'; });
    s += '<line x1="' + bx.toFixed(1) + '" y1="' + (T - 4) + '" x2="' + bx.toFixed(1) + '" y2="' + (H - B) + '" class="cm-now"/><text x="' + bx.toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle" class="cm-nowt">' + esc(I('your time: ' + cmBudget + ' min', 'ο χρόνος σου: ' + cmBudget + ' λ')) + '</text>';
    s += '<text x="' + (L + 6) + '" y="' + (T + 12) + '" class="cm-q">' + esc(I('QUICK AND IMPORTANT: START HERE', 'ΓΡΗΓΟΡΑ ΚΑΙ ΣΗΜΑΝΤΙΚΑ: ΞΕΚΙΝΑ ΑΠΟ ΕΔΩ')) + '</text><text x="' + (W - R) + '" y="' + (T + 12) + '" text-anchor="end" class="cm-q">' + esc(I('IMPORTANT BUT LONG: PLAN IT', 'ΣΗΜΑΝΤΙΚΑ ΑΛΛΑ ΜΑΚΡΙΑ: ΠΡΟΓΡΑΜΜΑΤΙΣΕ')) + '</text>';
    var tot = {}, slot = {};
    P.all.forEach(function (it) { var k = it.w + ':' + it.min; tot[k] = (tot[k] || 0) + 1; });
    P.all.forEach(function (it) {
      var k = it.w + ':' + it.min, idx = slot[k] = (slot[k] === undefined ? 0 : slot[k] + 1), n = tot[k], per = Math.min(n, 6), rows = Math.ceil(n / 6);
      var cx = X(it.min) + ((idx % 6) - (per - 1) / 2) * 15, cy = bandY[it.w] + Math.floor(idx / 6) * 15 - (rows - 1) * 7.5, r = 6 + Math.min(4, (it.f.steps || []).length > 4 ? 4 : 0);
      var tt = V.tf(it.f).title + ' · ' + sevWord(it.f.sev) + ' · ' + it.min + ' ' + I('min', 'λεπτά') + (P.sel[it.f.id] ? ' · ' + I('in your plan', 'στο πλάνο σου') : '');
      s += '<g class="cm-b' + (P.sel[it.f.id] ? ' in' : '') + '" data-open="' + esc(it.f.id) + '" tabindex="0" role="button" aria-label="' + esc(tt) + '"><title>' + esc(tt) + '</title><circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + r + '"/></g>';
    });
    return s + '</svg>';
  }
  function cmPlanHtml(P) {
    if (!P.all.length) return '<p class="cm-none">' + esc(I('Nothing to fix. Enjoy your PC.', 'Δεν υπάρχει κάτι να διορθώσεις. Απόλαυσε τον υπολογιστή σου.')) + '</p>';
    var tot = P.all.reduce(function (n, it) { return n + it.min; }, 0), hi = P.list.filter(function (it) { return it.f.sev === 'high'; }).length;
    var h = '<p class="cm-sum"><b>' + P.list.length + '</b> ' + esc(I(P.list.length === 1 ? 'thing fits' : 'things fit', P.list.length === 1 ? 'βήμα χωράει' : 'βήματα χωράνε')) + ' ' + esc(I('in your time', 'στον χρόνο σου')) + ' (' + P.used + ' ' + esc(I('min', 'λ')) + (hi ? ', ' + hi + ' ' + esc(I('of them High', 'από αυτά Υψηλής σημασίας')) : '') + '). ' + esc(I('Everything together would take about ' + tot + ' min.', 'Όλα μαζί θα έκαναν περίπου ' + tot + ' λεπτά.')) + '</p>';
    if (!P.list.length) h += '<p class="cm-none">' + esc(I('Nothing fits in this time. Move the slider to the right.', 'Τίποτα δεν χωράει σε αυτόν τον χρόνο. Μετακίνησε το ρυθμιστικό δεξιά.')) + '</p>';
    var acc = 0;
    h += '<ol class="cm-list">' + P.list.map(function (it) {
      acc += it.min; var t = V.tf(it.f);
      return '<li><span class="cm-t">' + acc + ' ' + esc(I('min', 'λ')) + '</span><span class="cm-n"><b>' + esc(t.title) + '</b><em>' + esc(sevWord(it.f.sev)) + ' · ' + it.min + ' ' + esc(I('min', 'λ')) + '</em></span><button class="btn sm" type="button" data-open="' + esc(it.f.id) + '">' + esc(I('Open', 'Άνοιγμα')) + '</button></li>';
    }).join('') + '</ol>';
    return h;
  }
  function cmCalm() {
    var EX = g(D, 'extras.timeline', null);
    if (!EX || !EX.length) return '<p class="cm-none">' + esc(I('No daily history in this scan.', 'Δεν υπάρχει ημερήσιο ιστορικό σε αυτή τη σάρωση.')) + '</p>';
    var days = V.days || 30, end = new Date(g(D, 'meta.generated', Date.now())).getTime(), bad = { crash: 1, hang: 1, unclean: 1, bsod: 1, disk: 1, whea: 1, gpu: 1 }, cnt = [], i;
    for (i = 0; i < days; i++) cnt.push(0);
    EX.forEach(function (e) { var t = new Date(e.t).getTime(); if (!isFinite(t) || !bad[e.k]) return; var d = Math.floor((end - t) / 86400000); if (d >= 0 && d < days) cnt[d]++; });
    var calm = cnt.filter(function (c) { return c === 0; }).length, h = '<p class="cm-sum"><b>' + calm + '</b> ' + esc(I('of the last ' + days + ' days were calm (no crash, freeze or error).', 'από τις τελευταίες ' + days + ' ημέρες ήταν ήρεμες (χωρίς κρασάρισμα, πάγωμα ή σφάλμα).')) + '</p><div class="cm-days" role="list">';
    for (i = days - 1; i >= 0; i--) {
      var c = cnt[i], dt = new Date(end - i * 86400000), lbl = dt.toLocaleDateString(V.lang === 'el' ? 'el-GR' : 'en-GB', { day: 'numeric', month: 'short' }) + ': ' + (c ? c + ' ' + I(c === 1 ? 'problem' : 'problems', c === 1 ? 'πρόβλημα' : 'προβλήματα') : I('calm', 'ήρεμη'));
      h += '<span class="cm-d l' + (c === 0 ? 0 : (c < 3 ? 1 : (c < 10 ? 2 : 3))) + '" role="listitem" title="' + esc(lbl) + '" aria-label="' + esc(lbl) + '">' + (c ? (c > 99 ? '99+' : c) : '') + '</span>';
    }
    return h + '</div><p class="cm-key">' + esc(I('Left = oldest day, right = the day of the scan. A number is how many problems happened that day.', 'Αριστερά = η παλιότερη ημέρα, δεξιά = η ημέρα της σάρωσης. Ο αριθμός δείχνει πόσα προβλήματα έγιναν εκείνη την ημέρα.')) + '</p>';
  }
  function compass() {
    var P = cmPlan(cmBudget);
    return '<div class="cm-wrap"><div class="cm-top"><div class="cm-score"><b>' + V.score.score + '</b><small>/100</small></div><div class="cm-head"><div class="thh">' + esc(I('YOUR PC TODAY', 'Ο ΥΠΟΛΟΓΙΣΤΗΣ ΣΟΥ ΣΗΜΕΡΑ')) + '</div><h2>' + esc(headline()) + '</h2>' + note() + '</div></div>' +
      '<section class="cm-sec"><div class="thh">' + esc(I('1 · HOW MUCH TIME DO YOU HAVE?', '1 · ΠΟΣΟ ΧΡΟΝΟ ΕΧΕΙΣ;')) + '</div><label class="cm-lab" for="cmMin">' + esc(I('I have', 'Έχω')) + ' <b id="cmMinV">' + cmBudget + '</b> ' + esc(I('minutes', 'λεπτά')) + '</label><input id="cmMin" type="range" min="5" max="120" step="5" value="' + cmBudget + '"><div id="cmPlan">' + cmPlanHtml(P) + '</div></section>' +
      '<section class="cm-sec"><div class="thh">' + esc(I('2 · THE MAP OF YOUR PROBLEMS (click a circle)', '2 · Ο ΧΑΡΤΗΣ ΤΩΝ ΠΡΟΒΛΗΜΑΤΩΝ ΣΟΥ (πάτα έναν κύκλο)')) + '</div><div id="cmMap">' + cmMapSvg(P) + '</div><p class="cm-key"><span class="cm-dot in"></span>' + esc(I('= in your plan', '= στο πλάνο σου')) + ' &nbsp; <span class="cm-dot"></span>' + esc(I('= later', '= αργότερα')) + '. ' + esc(I('Bigger circle = more steps. Time is the estimate for the whole finding.', 'Μεγαλύτερος κύκλος = περισσότερα βήματα. Ο χρόνος είναι η εκτίμηση για όλο το εύρημα.')) + '</p></section>' +
      '<section class="cm-sec"><div class="thh">' + esc(I('3 · HOW CALM WERE THE LAST DAYS?', '3 · ΠΟΣΟ ΗΡΕΜΕΣ ΗΤΑΝ ΟΙ ΤΕΛΕΥΤΑΙΕΣ ΜΕΡΕΣ;')) + '</div>' + cmCalm() + '</section></div>';
  }
  document.addEventListener('input', function (e) {
    if (!e.target || e.target.id !== 'cmMin') return;
    cmBudget = parseInt(e.target.value, 10) || 30;
    var P = cmPlan(cmBudget), v = document.getElementById('cmMinV'), p = document.getElementById('cmPlan'), m = document.getElementById('cmMap');
    if (v) v.textContent = cmBudget; if (p) p.innerHTML = cmPlanHtml(P); if (m) m.innerHTML = cmMapSvg(P);
  });
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-tharea]'); if (!b) return;
    if (typeof VIZ2 !== 'undefined' && VIZ2.goArea) VIZ2.goArea(b.getAttribute('data-tharea'));
  });

  /* ---------- Fable52: the story of your PC. A living Summary: a "rose" of the 8 areas that grows from the centre, numbers that count up,
     a heartbeat line of the last days, sparks orbiting the score. Motion can be paused; reduced-motion is respected. Display only. ---------- */
  var fb = null, fbPlayed = false, fbBootWait = false, FBKEY = 'veagle.pccheck.fable.still', fbStill = false;
  try { fbStill = localStorage.getItem(FBKEY) === '1'; } catch (e) { }
  function fbReduced() { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }
  function fbCalm() { return fbStill || fbReduced(); }
  function fbDays() {
    var EX = g(D, 'extras.timeline', null); if (!EX || !EX.length) return null;
    var days = V.days || 30, end = new Date(g(D, 'meta.generated', Date.now())).getTime(), bad = { crash: 1, hang: 1, unclean: 1, bsod: 1, disk: 1, whea: 1, gpu: 1 }, cnt = [], i;
    for (i = 0; i < days; i++) cnt.push(0);
    var who = {}, tot = 0;
    EX.forEach(function (e) { var t = new Date(e.t).getTime(); if (!isFinite(t) || !bad[e.k]) return; var d = Math.floor((end - t) / 86400000); if (d >= 0 && d < days) { cnt[days - 1 - d]++; tot++; if ((e.k === 'crash' || e.k === 'hang') && e.x) who[e.x] = (who[e.x] || 0) + 1; } });
    var top = Object.keys(who).sort(function (x, y) { return who[y] - who[x]; })[0];
    return { cnt: cnt, days: days, end: end, total: tot, top: top && who[top] >= 3 && who[top] * 2 >= tot ? { name: top, n: who[top] } : null };
  }
  function fbRose() {
    var A = V.score.areas, n = A.length, c = 200, R0 = 68, R1 = 172, step = 360 / n, gap = 2.6, s = '', lab = '';
    function P(r, a) { var t = (a - 90) * Math.PI / 180; return (c + r * Math.cos(t)).toFixed(1) + ' ' + (c + r * Math.sin(t)).toFixed(1); }
    function sec(r0, r1, a0, a1) { return 'M' + P(r0, a0) + 'L' + P(r1, a0) + 'A' + r1 + ' ' + r1 + ' 0 0 1 ' + P(r1, a1) + 'L' + P(r0, a1) + 'A' + r0 + ' ' + r0 + ' 0 0 0 ' + P(r0, a0) + 'Z'; }
    A.forEach(function (a, i) {
      var a0 = i * step - step / 2 + gap, a1 = (i + 1) * step - step / 2 - gap, sc = Math.max(0, Math.min(100, a.score)), r = (R0 + 8 + (R1 - R0 - 8) * sc / 100).toFixed(1), cls = stCls(a.score), mid = i * step;
      var t = (mid - 90) * Math.PI / 180, lx = c + 190 * Math.cos(t), ly = c + 190 * Math.sin(t), anc = Math.cos(t) > .3 ? 'start' : (Math.cos(t) < -.3 ? 'end' : 'middle');
      if (anc === 'middle') ly += Math.sin(t) < 0 ? -16 : 8;
      s += '<g class="fb-pt ' + cls + '" style="--i:' + i + '" data-tharea="' + esc(a.name) + '" tabindex="0" role="button" aria-label="' + esc(areaName(a.name) + ' ' + a.score + ', ' + stWord(a.score)) + '"><title>' + esc(areaName(a.name) + ' ' + a.score + ' · ' + stWord(a.score)) + '</title><path class="trk" d="' + sec(R0, R1, a0, a1) + '"/><path class="val" d="' + sec(R0, r, a0, a1) + '"/></g>';
      lab += '<text class="fb-lb ' + cls + '" style="--i:' + i + '" x="' + lx.toFixed(1) + '" y="' + ly.toFixed(1) + '" text-anchor="' + anc + '"><tspan class="n">' + esc(areaName(a.name)) + '</tspan><tspan class="v" x="' + lx.toFixed(1) + '" dy="15">' + a.score + ' · ' + esc(stWord(a.score)) + '</tspan></text>';
    });
    return '<svg class="fb-svg" viewBox="-96 -22 592 444" role="group" aria-label="' + esc(I('The 8 areas of your PC. A longer petal means a better score. Click one to see its findings.', 'Οι 8 τομείς του υπολογιστή σου. Μεγαλύτερο πέταλο σημαίνει καλύτερο σκορ. Πάτα ένα για να δεις τα ευρήματά του.')) + '">' +
      '<defs><linearGradient id="fbR" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff6163"/><stop offset="1" stop-color="#b10f1c"/></linearGradient><linearGradient id="fbW" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#b4b4be"/></linearGradient><radialGradient id="fbC"><stop offset="0" stop-color="#1b1b20"/><stop offset="1" stop-color="#08080a"/></radialGradient></defs>' +
      '<circle cx="200" cy="200" r="180" class="fb-orb"/><circle cx="200" cy="200" r="' + R1 + '" class="fb-rim"/>' + s +
      '<circle cx="200" cy="200" r="60" class="fb-breath"/><circle cx="200" cy="200" r="60" class="fb-breath b2"/><circle cx="200" cy="200" r="60" fill="url(#fbC)" class="fb-core"/><circle cx="200" cy="200" r="53" class="fb-orb2"/>' +
      '<text x="200" y="214" text-anchor="middle" class="fb-sc" data-count="' + V.score.score + '">' + V.score.score + '</text><text x="200" y="236" text-anchor="middle" class="fb-sc2">/ 100</text>' + lab + '</svg>';
  }
  function fbPulse() {
    var d = fbDays(); if (!d) return '';
    var W = 1000, H = 130, base = 92, n = d.days, dx = (W - 40) / n, p = 'M0 ' + base, calm = 0, worst = 0, wi = -1, i;
    for (i = 0; i < n; i++) {
      var c = d.cnt[i], x = 20 + dx * (i + .5);
      if (!c) { calm++; continue; }
      if (c > worst) { worst = c; wi = i; }
      var h = Math.min(78, 16 + 17 * Math.sqrt(c));
      p += 'L' + (x - 9).toFixed(1) + ' ' + base + 'L' + (x - 5).toFixed(1) + ' ' + (base - 5) + 'L' + (x - 2.5).toFixed(1) + ' ' + (base + 9) + 'L' + x.toFixed(1) + ' ' + (base - h).toFixed(1) + 'L' + (x + 3).toFixed(1) + ' ' + (base + 12) + 'L' + (x + 6).toFixed(1) + ' ' + base;
    }
    p += 'L' + W + ' ' + base;
    var loc = V.lang === 'el' ? 'el-GR' : 'en-GB', f = function (k) { return new Date(d.end - (n - 1 - k) * 86400000).toLocaleDateString(loc, { day: 'numeric', month: 'short' }); };
    var txt = '<b data-count="' + calm + '">' + calm + '</b> ' + esc(I('of the last ' + n + ' days were calm: no crash, no freeze, no hardware error.', 'από τις τελευταίες ' + n + ' ημέρες ήταν ήρεμες: χωρίς κρασάρισμα, πάγωμα ή σφάλμα υλικού.')) + (wi >= 0 ? ' ' + esc(I('The hardest day was ' + f(wi) + ' (' + worst + (worst === 1 ? ' problem' : ' problems') + ').', 'Η πιο δύσκολη ημέρα ήταν η ' + f(wi) + ' (' + worst + (worst === 1 ? ' πρόβλημα' : ' προβλήματα') + ').')) : '') + (d.top ? ' ' + esc(I('Most of the problems (' + d.top.n + ' of ' + d.total + ') came from one program: ', 'Τα περισσότερα προβλήματα (' + d.top.n + ' από ' + d.total + ') ήρθαν από ένα πρόγραμμα: ')) + '<b class="nm">' + esc(d.top.name) + '</b>.' : '');
    return '<div class="fb-card fb-pulse fb-rv" style="--i:6"><div class="thh">' + esc(I('THE HEARTBEAT OF THE LAST ' + n + ' DAYS', 'Ο ΠΑΛΜΟΣ ΤΩΝ ΤΕΛΕΥΤΑΙΩΝ ' + n + ' ΗΜΕΡΩΝ')) + '</div><svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" class="fb-ecg" role="img" aria-label="' + esc(I('Heartbeat line: every spike is a day with problems, a taller spike means more problems.', 'Γραμμή παλμού: κάθε αιχμή είναι μια ημέρα με προβλήματα, ψηλότερη αιχμή σημαίνει περισσότερα.')) + '"><defs><linearGradient id="fbE" x1="0" x2="1"><stop offset="0" stop-color="#5a5a64"/><stop offset=".55" stop-color="#ffffff"/><stop offset="1" stop-color="#ff4a4c"/></linearGradient></defs><line x1="0" y1="' + base + '" x2="' + W + '" y2="' + base + '" class="bl"/><path d="' + p + '" pathLength="1" class="ln" stroke="url(#fbE)"/><path d="' + p + '" pathLength="1" class="glow"/></svg><div class="fb-ax"><span>' + esc(f(0)) + '</span><span>' + esc(I('each spike = a day with problems', 'κάθε αιχμή = μια ημέρα με προβλήματα')) + '</span><span>' + esc(f(n - 1)) + '</span></div><p class="fb-ptx">' + txt + '</p></div>';
  }
  function fbStory() {
    var A = V.score.areas.slice().sort(function (a, b) { return b.score - a.score; }), best = A[0], worst = A[A.length - 1], p = prio(), s;
    s = '<span class="fb-rv" style="--i:2">' + I('This scan gives your PC <b>' + V.score.score + ' out of 100</b>.', 'Αυτή η σάρωση δίνει στον υπολογιστή σου <b>' + V.score.score + ' στα 100</b>.') + '</span> ';
    if (best && worst && best.name !== worst.name) s += '<span class="fb-rv" style="--i:3">' + I('Its strongest side is <b>' + esc(areaName(best.name)) + '</b> (' + best.score + '). The side that needs you most is <b class="r">' + esc(areaName(worst.name)) + '</b> (' + worst.score + ').', 'Το πιο δυνατό του σημείο είναι: <b>' + esc(areaName(best.name)) + '</b> (' + best.score + '). Αυτό που σε χρειάζεται περισσότερο είναι: <b class="r">' + esc(areaName(worst.name)) + '</b> (' + worst.score + ').') + '</span> ';
    s += '<span class="fb-rv" style="--i:4">' + (p ? I('If you do only one thing, make it this: <b>' + esc(V.tf(p).title) + '</b>.', 'Αν κάνεις μόνο ένα πράγμα, ας είναι αυτό: <b>' + esc(V.tf(p).title) + '</b>.') : I('There is nothing you need to do right now.', 'Δεν υπάρχει κάτι που πρέπει να κάνεις τώρα.')) + '</span>';
    return s;
  }
  function fbSteps() {
    var L = V.openList().filter(function (f) { return f.sev !== 'info'; }).slice(0, 3); if (!L.length) return '';
    return '<div class="fb-steps">' + L.map(function (f, i) {
      var t = V.tf(f);
      return '<div class="fb-card fb-step fb-rv ' + esc(f.sev) + '" style="--i:' + (7 + i) + '"><span class="fb-no" aria-hidden="true">0' + (i + 1) + '</span><span class="fb-sev">' + esc(sevWord(f.sev)) + '</span><b>' + esc(t.title) + '</b><p>' + esc(meta(f)) + '</p><button class="btn sm" type="button" data-open="' + esc(f.id) + '">' + esc(I('Show me how', 'Δείξε μου πώς')) + ' &rarr;</button></div>';
    }).join('') + '</div>';
  }
  function fable() {
    var c = counts(), st = VIZ.chkStats();
    return '<div class="fb-wrap"><div class="fb-hero"><div class="fb-rose"><canvas id="fbCv" aria-hidden="true"></canvas>' + fbRose() + '</div>' +
      '<div class="fb-side"><div class="fb-eye fb-rv" style="--i:0">FABLE52 <i></i> ' + esc(I('THE STORY OF YOUR PC', 'Η ΙΣΤΟΡΙΑ ΤΟΥ ΥΠΟΛΟΓΙΣΤΗ ΣΟΥ')) + '</div><h2 class="fb-rv' + (headline().length > 34 ? ' lg' : '') + '" style="--i:1">' + esc(headline()) + '</h2><p class="fb-story">' + fbStory() + '</p>' +
      '<div class="fb-nums fb-rv" style="--i:5"><div class="h"><b data-count="' + c.high + '">' + c.high + '</b><span>' + esc(I('High', 'Υψηλή')) + '</span></div><div><b data-count="' + c.medium + '">' + c.medium + '</b><span>' + esc(I('Medium', 'Μέτρια')) + '</span></div><div><b data-count="' + c.low + '">' + c.low + '</b><span>' + esc(I('Low', 'Χαμηλή')) + '</span></div><div><b>' + st.done + '<small>/' + st.total + '</small></b><span>' + esc(I('Steps done', 'Βήματα που έγιναν')) + '</span></div></div>' +
      note() + '<button class="btn sm fb-still" type="button" data-fbstill aria-pressed="' + (fbStill ? 'true' : 'false') + '">' + esc(fbStill ? I('Play motion', 'Ενεργοποίηση κίνησης') : I('Pause motion', 'Παύση κίνησης')) + '</button></div></div>' +
      fbPulse() + (fbSteps() ? '<div class="thh fb-h3">' + esc(I('YOUR NEXT THREE MOVES', 'ΟΙ ΤΡΕΙΣ ΕΠΟΜΕΝΕΣ ΚΙΝΗΣΕΙΣ ΣΟΥ')) + '</div>' + fbSteps() : '') + '</div>';
  }
  function fbCount(root, go) {
    Array.prototype.forEach.call(root.querySelectorAll('[data-count]'), function (el) {
      var to = parseInt(el.getAttribute('data-count'), 10) || 0; if (!go || to === 0) { el.textContent = to; return; }
      var t0 = null, dur = 1300;
      function f(ts) { if (!el.isConnected) return; if (t0 === null) t0 = ts; var k = Math.min(1, (ts - t0) / dur); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(f); }
      el.textContent = 0; requestAnimationFrame(f);
    });
  }
  function stopFable() { if (fb) { fb.dead = true; fb = null; } }
  function startFable() {
    var cv = document.getElementById('fbCv'), pane = document.getElementById('tab-summary'); if (!cv || !cv.getContext) return;
    var st = { dead: false }, ctx = cv.getContext('2d'), A = V.score.areas, badShare = A.filter(function (a) { return a.score < 60; }).length / Math.max(1, A.length), P = [], i;
    stopFable(); fb = st;
    for (i = 0; i < 84; i++) P.push({ a: Math.random() * 6.283, r: .36 + Math.random() * .53, sp: (.0016 + Math.random() * .0034), len: .10 + Math.random() * .32, red: Math.random() < Math.max(.12, badShare), w: .6 + Math.random() * 1.6, al: .12 + Math.random() * .5 });
    function size() { var r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1); if (cv.width !== Math.round(r.width * dpr) || cv.height !== Math.round(r.height * dpr)) { cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); } return dpr; }
    function draw(move) {
      size(); var w = cv.width, h = cv.height, cx = w / 2, cy = h / 2, R = Math.min(w / 592 * 200, h / 444 * 200) * 1.02;
      ctx.clearRect(0, 0, w, h); ctx.lineCap = 'round';
      P.forEach(function (p) {
        if (move) p.a += p.sp;
        ctx.beginPath(); ctx.arc(cx, cy, R * p.r, p.a - p.len, p.a);
        ctx.strokeStyle = p.red ? 'rgba(255,74,76,' + p.al + ')' : 'rgba(255,255,255,' + (p.al * .7) + ')'; ctx.lineWidth = p.w * (w / 600); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx + R * p.r * Math.cos(p.a), cy + R * p.r * Math.sin(p.a), p.w * (w / 600) * 1.3, 0, 6.283); ctx.fillStyle = p.red ? 'rgba(255,120,122,' + Math.min(1, p.al + .3) + ')' : 'rgba(255,255,255,' + Math.min(1, p.al + .2) + ')'; ctx.fill();
      });
    }
    if (fbCalm()) { draw(false); return; }
    (function loop() { if (st.dead || !cv.isConnected) return; if (!document.hidden && pane && pane.classList.contains('on')) draw(true); requestAnimationFrame(loop); })();
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-fbstill]'); if (!b) return;
    fbStill = !fbStill; try { localStorage.setItem(FBKEY, fbStill ? '1' : '0'); } catch (x) { }
    document.body.classList.toggle('fb-still', fbStill); fbPlayed = false; decorate();
  });
  document.addEventListener('keydown', function (e) {
    if ((e.key !== 'Enter' && e.key !== ' ') || !e.target || !e.target.getAttribute || !e.target.getAttribute('data-tharea') || e.target.tagName === 'BUTTON') return;
    e.preventDefault(); if (typeof VIZ2 !== 'undefined' && VIZ2.goArea) VIZ2.goArea(e.target.getAttribute('data-tharea'));
  });
  (function () {
    var raf = 0, mx = 0, my = 0;
    document.addEventListener('pointermove', function (e) {
      if (cur !== 'fable' || fbCalm()) return; mx = e.clientX; my = e.clientY;
      if (!raf) raf = requestAnimationFrame(function () { raf = 0; document.body.style.setProperty('--mx', mx + 'px'); document.body.style.setProperty('--my', my + 'px'); });
    }, { passive: true });
  })();

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
    stopCyber(); stopFable();
    document.body.classList.toggle('fb-still', cur === 'fable' && fbStill);
    pane.classList.toggle('thfull', !!guide.full);
    var h = '';
    if (cur === 'cockpit') h = cockpit(); else if (cur === 'guide') h = guideHtml(); else if (cur === 'cyber') h = cyberHtml();
    else if (cur === 'iqon') h = iqon(); else if (cur === 'compass') h = compass(); else if (cur === 'fable') h = fable();
    if (!h) return;
    var d = document.createElement('div'); d.id = 'thHero'; d.className = 'thhero th-' + cur; d.innerHTML = h;
    pane.insertBefore(d, pane.firstChild);
    if (cur === 'cyber') startCyber();
    if (cur === 'fable') {
      /* play the entrance once per theme choice, and only after the start-up screen is gone */
      var boot = document.getElementById('boot'), hidden = !boot || boot.classList.contains('hide'), go = hidden && !fbPlayed && !fbCalm();
      if (go) d.classList.add('fb-go');
      if (hidden) fbPlayed = true;
      else if (!fbBootWait && window.MutationObserver) { fbBootWait = true; var mo = new MutationObserver(function () { if (boot.classList.contains('hide')) { mo.disconnect(); if (cur === 'fable') decorate(); } }); mo.observe(boot, { attributes: true }); }
      fbCount(d, go); startFable();
    }
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
    guide.step = 0; fbPlayed = false;
    if (cur !== 'classic' || fromUser) VIZ.set('light', t.light);
    if (fromUser) { VIZ.set('big', t.big); if (cur === 'guide') UI.setView('simple'); }
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
