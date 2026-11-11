/* VEAGLE PC Check - extras for professionals and curious people: insights tab, action plan, before/after, badges, client report, e-mail, inventory, "will it run", help icons, easter egg */
var PRO = (function (V, AI) {
  'use strict';
  var $ = V.$, $$ = V.$$, esc = V.esc, arr = V.arr, num = V.num, g = V.g, D = V.D;
  function I(en, el) { return V.I(en, el); }
  var X = (D && D.extras && D.extras.more) || {};
  var PK = 'veagle.pccheck.pro.' + String(g(D, 'meta.computer', 'pc'));
  var P = {};
  try { P = JSON.parse(localStorage.getItem(PK) || '{}') || {}; } catch (e) { P = {}; }
  function save() { try { localStorage.setItem(PK, JSON.stringify(P)); } catch (e) { } }
  function dt(iso) { try { return new Date(iso).toLocaleDateString(V.lang === 'el' ? 'el-GR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return ''; } }
  function minsOf(f) { var m = V.META[f.id]; return m ? m[0] : 10; }
  function nonInfo() { return V.openList(); }
  function mins(n) { return n >= 60 ? Math.floor(n / 60) + ' h ' + (n % 60 ? (n % 60) + ' min' : '') : n + ' min'; }
  function cFree() { var v = arr(D.volumes).filter(function (x) { return /^C:/i.test(x.letter); })[0]; return v || null; }
  function bar(pct, cls) { return '<div class="bar ' + (cls || '') + '"><i style="width:' + Math.max(0, Math.min(100, pct)) + '%"></i></div>'; }
  /* Windows Update history: result names in the reader's language (the collector writes English names) */
  function wuResult(x) {
    var t = { 1: ['In progress', 'Σε εξέλιξη'], 2: ['Succeeded', 'Επιτυχία'], 3: ['Succeeded with errors', 'Επιτυχία με σφάλματα'], 4: ['Failed', 'Απέτυχε'], 5: ['Aborted', 'Ακυρώθηκε'] }[x.resultCode];
    var op = x.operation === 'Uninstallation' ? I(' (uninstall)', ' (απεγκατάσταση)') : '';
    return (t ? I(t[0], t[1]) : (x.result || '-')) + op;
  }

  function card(title, st, inner, id) { return '<div class="win"' + (id ? ' id="' + id + '"' : '') + '><header><span>' + esc(title) + '</span><span class="st">' + esc(st || '') + '</span></header><div class="body">' + inner + '</div></div>'; }
  function sect(t, n) { return '<div class="sect"><h2>' + esc(t) + '</h2><span>' + esc(n || '') + '</span></div>'; }
  function hbars(rows, unit, max, fmt) {
    if (!rows.length) return '<div class="sub">' + esc(I('Nothing to show.', 'Δεν υπάρχει τίποτα να δείξω.')) + '</div>';
    var mx = max || Math.max.apply(null, rows.map(function (r) { return r.v; })) || 1;
    return '<div class="hb">' + rows.map(function (r) { return '<div class="hbr"><span class="hbl" title="' + esc(r.l) + '">' + esc(r.l) + '</span><span class="hbt"><i class="' + (r.c || '') + '" style="width:' + Math.max(2, r.v / mx * 100).toFixed(1) + '%"></i></span><b>' + esc(fmt ? fmt(r.v) : V.fmtNum(r.v, 0) + (unit || '')) + '</b></div>'; }).join('') + '</div>';
  }

  /* ---------- action plan: what happens to the score if you do the 3 first things ---------- */
  function planHtml() {
    var top = nonInfo().slice(0, 3); if (!top.length) return '';
    var ids = {}; top.forEach(function (f) { ids[f.id] = 1; });
    var after = V.scoreOf(V.active().filter(function (f) { return !ids[f.id]; }));
    var total = top.reduce(function (a, f) { return a + minsOf(f); }, 0);
    var col = function (s) { return s >= 85 ? '#3ddc84' : (s >= 65 ? '#f5b44a' : '#e82c2d'); };
    return '<div class="plan"><div class="plan-sc"><div class="pn" style="color:' + col(V.score.score) + '">' + V.score.score + '</div><div class="pl">' + esc(I('now', 'τώρα')) + '</div></div><div class="plan-ar">&rarr;</div>' +
      '<div class="plan-sc"><div class="pn" style="color:' + col(after.score) + '">' + after.score + '</div><div class="pl">' + esc(I('after the 3 steps', 'μετά τα 3 βήματα')) + '</div></div>' +
      '<div class="plan-tx"><b>' + esc(I('If you do the 3 things above, in about ' + mins(total) + ', your score goes from ' + V.score.score + ' to ' + after.score + '.', 'Αν κάνεις τα 3 παραπάνω σε περίπου ' + mins(total) + ', ο βαθμός σου πάει από ' + V.score.score + ' σε ' + after.score + '.')) + '</b><br><span class="sub">' + esc(I('The time is an estimate for a beginner. Nothing is changed unless you do it yourself.', 'Ο χρόνος είναι εκτίμηση για αρχάριο. Τίποτα δεν αλλάζει αν δεν το κάνεις εσύ.')) + '</span></div></div>';
  }

  /* ---------- before and after ---------- */
  function beforeAfter() {
    var Pv = V.RAW && V.RAW.previous; if (!Pv || !Pv.meta || !Pv.system) return null;
    var O = V.Engine(Pv), oi = {}, ni = {};
    O.findings.forEach(function (f) { oi[f.id] = 1; }); V.findings.forEach(function (f) { ni[f.id] = 1; });
    var fixed = O.findings.filter(function (f) { return !ni[f.id] && f.sev !== 'info'; });
    var fresh = V.findings.filter(function (f) { return !oi[f.id] && f.sev !== 'info'; });
    var days = Math.max(0, Math.round((new Date(g(D, 'meta.generated', 0)) - new Date(g(Pv, 'meta.generated', 0))) / 86400000));
    return { O: O, fixed: fixed, fresh: fresh, days: days, ds: V.score.score - O.score.score, before: O.score.score, after: V.score.score };
  }
  function beforeAfterHtml(forPrint) {
    var b = beforeAfter();
    if (!b) return '<div class="sub">' + esc(I('Run the scan again after you fix things, and this card will show what improved.', 'Τρέξε ξανά τη σάρωση αφού διορθώσεις πράγματα και αυτή η κάρτα θα δείξει τι βελτιώθηκε.')) + '</div>';
    var up = b.ds > 0, same = b.ds === 0;
    var h = '<div class="ba"><div class="bab"><div class="pn">' + b.before + '</div><div class="pl">' + esc(I('before', 'πριν')) + '</div></div><div class="plan-ar" style="color:' + (up ? '#3ddc84' : same ? '#a1a1aa' : '#e82c2d') + '">' + (up ? '&#9650;' : same ? '&#9654;' : '&#9660;') + ' ' + (b.ds > 0 ? '+' : '') + b.ds + '</div><div class="bab"><div class="pn">' + b.after + '</div><div class="pl">' + esc(I('now', 'τώρα')) + '</div></div>' +
      '<div class="plan-tx">' + esc(I('Compared with the scan ' + (b.days === 0 ? 'from earlier today' : b.days + ' day' + (b.days > 1 ? 's' : '') + ' ago') + ': ' + b.fixed.length + ' fixed, ' + b.fresh.length + ' new.', 'Σε σύγκριση με τη σάρωση ' + (b.days === 0 ? 'από νωρίτερα σήμερα' : 'πριν ' + b.days + (b.days > 1 ? ' ημέρες' : ' ημέρα')) + ': ' + b.fixed.length + ' διορθώθηκαν, ' + b.fresh.length + ' νέα.')) + '</div></div>';
    if (b.fixed.length) h += '<ul class="tick">' + b.fixed.slice(0, 8).map(function (f) { return '<li class="ok">&#10003; ' + esc(V.tf(f).title) + '</li>'; }).join('') + '</ul>';
    if (b.fresh.length) h += '<ul class="tick">' + b.fresh.slice(0, 8).map(function (f) { return '<li class="bad">! ' + esc(V.tf(f).title) + '</li>'; }).join('') + '</ul>';
    return h;
  }

  /* ---------- badges ---------- */
  function badges() {
    var c = cFree(), tr = arr(D.trend).length, f = V.active(), has = function (id) { return f.some(function (x) { return x.id === id; }); };
    var boots = arr(g(D, 'boot.history', [])).slice(0, 5), bootAvg = boots.length ? boots.reduce(function (a, b) { return a + num(b.seconds); }, 0) / boots.length : null;
    var errs = num(g(D, 'events.system.errors', 0)) + num(g(D, 'events.application.errors', 0));
    var startN = V.uniq ? V.uniq(arr(g(D, 'startup.items', [])).map(function (s) { return s.name; })).length : arr(g(D, 'startup.items', [])).length;
    var bk = (D.extras && D.extras.backup) || {}, od = bk.oneDriveFolders || {};
    return [
      { n: I('Roomy drive', 'Άνετος δίσκος'), h: I('At least 20 % free on C:', 'Τουλάχιστον 20 % ελεύθερο στο C:'), ok: !!(c && num(c.sizeGB) && num(c.freeGB) / num(c.sizeGB) >= 0.2), i: '&#9632;' },
      { n: I('Fresh Windows', 'Φρέσκα Windows'), h: I('A Windows update in the last 30 days', 'Ενημέρωση Windows τις τελευταίες 30 ημέρες'), ok: g(D, 'updates.lastPatchDaysAgo', 999) <= 30, i: '&#8635;' },
      { n: I('Quiet logs', 'Ήσυχα logs'), h: I('Under ' + Math.round(20 * V.days / 30) + ' errors in ' + V.days + ' days', 'Κάτω από ' + Math.round(20 * V.days / 30) + ' σφάλματα σε ' + V.days + ' ημέρες'), ok: errs < 20 * V.days / 30, i: '&#9835;' },
      { n: I('Fast start', 'Γρήγορη εκκίνηση'), h: I('Start-up under 40 seconds', 'Εκκίνηση κάτω από 40 δευτερόλεπτα'), ok: bootAvg != null && bootAvg < 40, i: '&#9889;' },
      { n: I('Armored', 'Θωρακισμένο'), h: I('No serious security finding', 'Κανένα σοβαρό εύρημα ασφάλειας'), ok: !f.some(function (x) { return x.area === 'Security' && (x.sev === 'high' || x.sev === 'medium'); }), i: '&#9632;' },
      { n: I('Backed up', 'Με αντίγραφα'), h: I('A backup of your files exists', 'Υπάρχει αντίγραφο των αρχείων σου'), ok: !has('bak-none') && !!(bk.fileHistory || od.documents || od.desktop || od.pictures), i: '&#9729;' },
      { n: I('Crash free', 'Χωρίς κρασαρίσματα'), h: I('No crashes or blue screens now', 'Κανένα κρασάρισμα ή μπλε οθόνη τώρα'), ok: !f.some(function (x) { return /^stab-(crashes|bsod|shutdown)$/.test(x.id) && x.sev !== 'info'; }), i: '&#10003;' },
      { n: I('Light start', 'Ελαφριά εκκίνηση'), h: I('12 or fewer start-up programs', '12 ή λιγότερα προγράμματα εκκίνησης'), ok: startN <= 12, i: '&#9650;' },
      { n: I('Up to date apps', 'Ενημερωμένες εφαρμογές'), h: I('No program waiting for an update', 'Κανένα πρόγραμμα δεν περιμένει ενημέρωση'), ok: !g(D, 'apps.wingetSkipped', false) && arr(g(D, 'apps.outdated', [])).length === 0, i: '&#8593;' },
      { n: I('Regular checker', 'Τακτικός έλεγχος'), h: I('Three scans or more in your history', 'Τρεις ή περισσότερες σαρώσεις στο ιστορικό σου'), ok: tr >= 3, i: '&#9201;' },
      { n: I('Top score', 'Κορυφαίος βαθμός'), h: I('Health score 95 or more', 'Βαθμός υγείας 95 ή πάνω'), ok: V.score.score >= 95, i: '&#9733;' }
    ];
  }
  function badgesHtml() {
    var b = badges(), n = b.filter(function (x) { return x.ok; }).length;
    return '<div class="badges">' + b.map(function (x) { return '<div class="badge ' + (x.ok ? 'on' : '') + '" title="' + esc(x.h) + '"><span class="bi">' + x.i + '</span><b>' + esc(x.n) + '</b><small>' + esc(x.ok ? I('earned', 'κερδήθηκε') : x.h) + '</small></div>'; }).join('') + '</div>' +
      '<p class="sub" style="margin-top:8px">' + esc(I(n + ' of ' + b.length + ' badges earned. Grey ones show what to do to earn them.', n + ' από ' + b.length + ' επιτεύγματα. Τα γκρι δείχνουν τι να κάνεις για να τα κερδίσεις.')) + '</p>';
  }


  /* ---------- 8: your progress over time (kept only in this browser) ---------- */
  var HK = 'veagle.pccheck.hist.' + String(g(D, 'meta.computer', 'pc'));
  function loadHist() { try { return JSON.parse(localStorage.getItem(HK) || '[]') || []; } catch (e) { return []; } }
  function trackScan() {
    var h = loadHist(), gen = g(D, 'meta.generated', ''); if (!gen || !V.scoreRaw) return h;
    if (!h.some(function (x) { return x.t === gen; })) { h.push({ t: gen, s: V.scoreRaw.score, hi: V.countsRaw.high, me: V.countsRaw.medium, lo: V.countsRaw.low, ver: g(D, 'meta.version', '') }); h.sort(function (a, b) { return a.t < b.t ? -1 : 1; }); if (h.length > 80) h = h.slice(-80); try { localStorage.setItem(HK, JSON.stringify(h)); } catch (e) { } }
    return h;
  }
  function ticksTotal() {
    var pre = 'veagle.pccheck.chk.' + String(g(D, 'meta.computer', 'pc')) + '.', n = 0;
    try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf(pre) === 0) { try { n += Object.keys(JSON.parse(localStorage.getItem(k) || '{}')).length; } catch (e) { } } } } catch (e) { }
    return n;
  }
  function progressHtml() {
    var h = trackScan(), first = h[0], last = h[h.length - 1], best = h.reduce(function (m, x) { return Math.max(m, x.s); }, 0);
    var tile = function (v, l) { return '<div class="pst"><b>' + esc(v) + '</b><small>' + esc(l) + '</small></div>'; };
    var pts = h.map(function (x) { return x.s; });
    var chart = '';
    if (pts.length >= 2) {
      var w = 520, hh = 90, mn = Math.min.apply(null, pts.concat([0])), mx = 100, xy = pts.map(function (v, i) { return [10 + i * (w - 20) / (pts.length - 1), hh - 10 - (v - mn) / (mx - mn) * (hh - 20)]; });
      var line = xy.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
      chart = '<svg viewBox="0 0 ' + w + ' ' + hh + '" width="100%" role="img" aria-label="' + esc(I('Score of each scan', 'Βαθμός κάθε σάρωσης')) + '"><path d="' + line + '" fill="none" stroke="#3ddc84" stroke-width="2.5"/>' + xy.map(function (p, i) { return '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="4" fill="#3ddc84"><title>' + esc(dt(h[i].t) + ': ' + h[i].s) + '</title></circle>'; }).join('') + '</svg>';
    }
    var delta = h.length >= 2 ? last.s - first.s : null;
    return '<div class="pstats">' + tile(String(h.length), I('reports opened for this PC', 'αναφορές που άνοιξες για αυτό το PC')) + tile(String(last ? last.s : '-'), I('score of the latest scan', 'βαθμός της τελευταίας σάρωσης')) + tile(String(best), I('best score so far', 'καλύτερος βαθμός ως τώρα')) + (delta != null ? tile((delta > 0 ? '+' : '') + delta, I('since the first report', 'από την πρώτη αναφορά')) : '') + tile(String(ticksTotal()), I('steps you ticked', 'βήματα που τσέκαρες')) + tile(String(V.acceptedCount()), I('items you accepted', 'πράγματα που αποδέχτηκες')) + '</div>' + chart +
      '<p class="sub" style="margin-top:8px">' + esc(I('These numbers are kept only in this browser, on this PC. If you open the reports on another PC or clear the browser data, they start again from zero. Nothing is sent anywhere.', 'Αυτά τα νούμερα κρατιούνται μόνο σε αυτόν τον browser, σε αυτόν τον υπολογιστή. Αν ανοίξεις τα reports σε άλλον υπολογιστή ή καθαρίσεις τα δεδομένα του browser, ξεκινούν ξανά από το μηδέν. Δεν στέλνεται τίποτα πουθενά.')) + '</p>';
  }

  /* ---------- steps of the scan that may be incomplete (1.1.0) ---------- */
  function stepIssuesHtml() {
    var a = (V.RAW && V.RAW.meta && V.RAW.meta.stepIssues) || [];
    if (!Array.isArray(a)) a = [a];
    a = a.filter(function (x) { return x && x.step; });
    if (!a.length) return '';
    var li = a.map(function (x) {
      var sm = (x.samples || []); if (!Array.isArray(sm)) sm = [sm];
      return '<li><b>' + esc(I('Step ', 'Βήμα ') + x.step + ': ' + (x.label || '')) + '</b> <span class="sub">(' + esc(I(x.errors + ' small error(s)', x.errors + ' μικρό(ά) σφάλμα(τα)')) + ')</span>' +
        (sm.length ? '<div class="sub" style="font-family:monospace;font-size:11px;opacity:.8">' + sm.map(esc).join('<br>') + '</div>' : '') + '</li>';
    }).join('');
    return '<details class="howto on" id="stepIssues"><summary>' + esc(I('Scan notes: ' + a.length + ' check(s) may be incomplete', 'Σημειώσεις σάρωσης: ' + a.length + ' έλεγχος(οι) μπορεί να είναι ελλιπείς')) + '</summary><div>' +
      '<p>' + esc(I('While scanning, some small checks could not read everything. This is usually because the scan was not run as Administrator, or because a Windows feature does not exist on this PC. It does NOT mean there is a problem with your PC. It only means the result for these steps may be less complete.', 'Κατά τη σάρωση, μερικοί μικροί έλεγχοι δεν μπόρεσαν να διαβάσουν τα πάντα. Συνήθως επειδή η σάρωση δεν έτρεξε ως Διαχειριστής ή επειδή κάποιο χαρακτηριστικό των Windows δεν υπάρχει σε αυτόν τον υπολογιστή. ΔΕΝ σημαίνει ότι έχει πρόβλημα ο υπολογιστής σου. Σημαίνει μόνο ότι το αποτέλεσμα αυτών των βημάτων μπορεί να είναι λιγότερο πλήρες.')) + '</p>' +
      '<ul>' + li + '</ul><p class="sub">' + esc(I('Tip: run the scan again with "Run as administrator" to get the most complete result.', 'Συμβουλή: τρέξε ξανά τη σάρωση με «Εκτέλεση ως διαχειριστής» για το πιο πλήρες αποτέλεσμα.')) + '</p></div></details>';
  }

  /* ---------- summary additions ---------- */
  function summary() {
    var el = $('#tab-summary'); if (!el) return;
    var pl = planHtml();
    periodNote(el);
    var host = el.querySelector('.action') ? el.querySelector('.action').parentNode : null;
    var firstAct = el.querySelector('.action');
    if (pl && firstAct) {
      var last = el.querySelectorAll('.action'); last = last[last.length - 1];
      var d = document.createElement('div'); d.innerHTML = pl; last.parentNode.insertBefore(d.firstChild, last.nextSibling);
    }
    if (V.scoreRaw && V.scoreRaw.score !== V.score.score) {
      var sp = el.querySelector('.summary .sub'); 
      if (sp) { var nt = document.createElement('p'); nt.className = 'sub est'; nt.innerHTML = '<b>' + esc(I('Scan result: ' + V.scoreRaw.score + '. With the steps you ticked and what you accepted: ' + V.score.score + '.', 'Αποτέλεσμα σάρωσης: ' + V.scoreRaw.score + '. Με τα βήματα που τικάρισες και όσα αποδέχτηκες: ' + V.score.score + '.')) + '</b> ' + esc(I('This is an estimate. Run the scan again to confirm what you fixed.', 'Είναι εκτίμηση. Τρέξε ξανά τη σάρωση για να επιβεβαιωθεί ό,τι διόρθωσες.')); sp.parentNode.insertBefore(nt, sp.nextSibling); }
    }
    var si = stepIssuesHtml();
    if (si) { var sb = document.createElement('div'); sb.innerHTML = si; var anc = el.querySelector('.vz2') || el.querySelector('.summary'); if (anc) anc.insertAdjacentElement('afterend', sb.firstChild); }
    var tail = document.createElement('div');
    tail.innerHTML = sect(I('What improved', 'Τι βελτιώθηκε'), I('your last scan against this one', 'η προηγούμενη σάρωση απέναντι σε αυτή')) + '<div class="win"><div class="body">' + beforeAfterHtml() + '</div></div>' +
      sect(I('Your progress', 'Η πρόοδός σου'), I('how your PC and your fixes developed over time', 'πώς εξελίχθηκαν ο υπολογιστής σου και οι διορθώσεις σου')) + '<div class="win"><div class="body">' + progressHtml() + '</div></div>' +
      sect(I('Your badges', 'Τα επιτεύγματά σου'), I('small goals for a healthy PC', 'μικροί στόχοι για έναν υγιή υπολογιστή')) + '<div class="win"><div class="body">' + badgesHtml() + '</div></div>';
    var btns = el.querySelector('.btns:last-child');
    if (btns) el.insertBefore(tail, btns); else el.appendChild(tail);
  }

  /* ---------- insights tab ---------- */
  var BR_PRESETS = [
    { n: 'Microsoft 365 (Word, Excel)', ram: 4, cores: 2, disk: 6, vram: 0 },
    { n: 'Video calls (Teams, Zoom, Meet)', ram: 8, cores: 4, disk: 2, vram: 0 },
    { n: 'Adobe Photoshop', ram: 16, cores: 4, disk: 10, vram: 2 },
    { n: 'Adobe Premiere Pro (HD video)', ram: 16, cores: 6, disk: 20, vram: 4 },
    { n: 'DaVinci Resolve', ram: 16, cores: 6, disk: 20, vram: 4 },
    { n: 'AutoCAD', ram: 16, cores: 4, disk: 12, vram: 2 },
    { n: 'Blender', ram: 16, cores: 6, disk: 10, vram: 4 },
    { n: 'Popular online games (Fortnite, Valorant)', ram: 8, cores: 4, disk: 40, vram: 2 },
    { n: 'Big modern games (GTA V, Cyberpunk 2077)', ram: 16, cores: 6, disk: 100, vram: 6 },
    { n: 'Local AI image or chat models', ram: 16, cores: 6, disk: 30, vram: 8 },
    { n: 'Virtual machines (VirtualBox, VMware)', ram: 16, cores: 6, disk: 60, vram: 0, virt: true }
  ];
  function runHtml(idx) {
    var p = BR_PRESETS[idx] || BR_PRESETS[0];
    var ram = num(g(D, 'system.ram.totalGB', 0)), cores = num(g(D, 'system.cpu.cores', 0)), vr = 0;
    arr(D.gpus).forEach(function (x) { vr = Math.max(vr, num(x.vramGB)); });
    var bestFree = 0; arr(D.volumes).forEach(function (v) { bestFree = Math.max(bestFree, num(v.freeGB)); });
    var rows = [
      [I('Memory (RAM)', 'Μνήμη (RAM)'), ram, p.ram, ' GB'], [I('Processor cores', 'Πυρήνες επεξεργαστή'), cores, p.cores, ''],
      [I('Free disk space', 'Ελεύθερος χώρος δίσκου'), bestFree, p.disk, ' GB']
    ];
    if (p.vram) rows.push([I('Graphics memory', 'Μνήμη γραφικών'), vr, p.vram, ' GB']);
    var worst = 'ok';
    var h = rows.map(function (r) {
      var st = r[1] >= r[2] ? 'ok' : (r[1] >= r[2] * 0.7 ? 'warn' : 'bad'); if (st === 'bad') worst = 'bad'; else if (st === 'warn' && worst !== 'bad') worst = 'warn';
      return '<div class="rr"><span>' + esc(r[0]) + '</span>' + bar(Math.min(100, r[1] / (r[2] || 1) * 100), st === 'ok' ? '' : (st === 'warn' ? 'warn' : 'bad')) + '<b class="st-' + st + '">' + esc(V.fmtNum(r[1], 1) + r[3] + ' / ' + r[2] + r[3]) + '</b></div>';
    }).join('');
    var virtOk = p.virt ? (g(D, 'system.cpu.virtualizationEnabled', false) || g(D, 'security.hypervisorPresent', false)) : true;
    if (p.virt) { h += '<div class="rr"><span>' + esc(I('Virtualization in BIOS', 'Εικονικοποίηση στο BIOS')) + '</span><span></span><b class="st-' + (virtOk ? 'ok' : 'bad') + '">' + esc(virtOk ? I('on', 'ανοιχτή') : I('off', 'κλειστή')) + '</b></div>'; if (!virtOk) worst = 'bad'; }
    var verdict = worst === 'ok' ? I('Yes, it should run well.', 'Ναι, θα πρέπει να τρέχει καλά.') : (worst === 'warn' ? I('It will run, but not smoothly. Expect slowdowns.', 'Θα τρέχει, αλλά όχι ομαλά. Περίμενε καθυστερήσεις.') : I('Probably not comfortably. At least one part is below the recommended level.', 'Μάλλον όχι άνετα. Τουλάχιστον ένα εξάρτημα είναι κάτω από το προτεινόμενο.'));
    return '<div class="verdict ' + worst + '">' + esc(verdict) + '</div>' + h + '<p class="sub" style="margin-top:8px">' + esc(I('The numbers are typical recommended values. Always check the official page of the program.', 'Οι αριθμοί είναι τυπικές προτεινόμενες τιμές. Έλεγξε πάντα την επίσημη σελίδα του προγράμματος.')) + '</p>';
  }
  function heatGauge(t) {
    var v = Math.max(20, Math.min(100, t)), a = Math.PI * (1 - (v - 20) / 80), cx = 90, cy = 90, r = 70;
    var x = cx + r * Math.cos(a), y = cy - r * Math.sin(a), col = t >= 90 ? '#e82c2d' : (t >= 75 ? '#f5b44a' : '#3ddc84');
    return '<svg viewBox="0 0 180 108" class="gauge" role="img" aria-label="' + t + ' C"><path d="M20 90 A70 70 0 0 1 160 90" fill="none" stroke="var(--line)" stroke-width="12" stroke-linecap="round"/><path d="M20 90 A70 70 0 0 1 ' + x.toFixed(1) + ' ' + y.toFixed(1) + '" fill="none" stroke="' + col + '" stroke-width="12" stroke-linecap="round"/><text x="90" y="86" text-anchor="middle" class="rnum" style="font-size:30px;fill:var(--text)">' + t + '&deg;C</text></svg>';
  }
  function insights() {
    var el = $('#tab-insights'); if (!el) return;
    var h = '';
    h += sect(I('Insights', 'Ανάλυση'), I('what is going on inside this PC, with pictures', 'τι συμβαίνει μέσα στον υπολογιστή, με εικόνες'));
    h += '<div class="grid">';
    /* RAM and CPU */
    var tr = arr(g(D, 'startup.topRam', [])), tc = arr(g(D, 'startup.topCpu', []));
    h += '<div class="s6">' + card(I('Who uses the memory', 'Ποιος χρησιμοποιεί τη μνήμη'), I('top 10 right now', 'οι 10 πρώτοι τώρα'), hbars(tr.slice(0, 10).map(function (p) { return { l: p.name + (p.instances > 1 ? ' x' + p.instances : ''), v: num(p.ramMB), c: num(p.ramMB) > 1500 ? 'warn' : '' }; }), ' MB', 0, function (v) { return v >= 1024 ? V.fmtNum(v / 1024, 1) + ' GB' : V.fmtNum(v, 0) + ' MB'; })) + '</div>';
    h += '<div class="s6">' + card(I('Who used the processor', 'Ποιος χρησιμοποίησε τον επεξεργαστή'), I('CPU time since start', 'χρόνος CPU από την εκκίνηση'), hbars(tc.slice(0, 8).map(function (p) { return { l: p.name, v: num(p.cpuSeconds) }; }), ' s', 0, function (v) { return v >= 3600 ? V.fmtNum(v / 3600, 1) + ' h' : (v >= 60 ? V.fmtNum(v / 60, 0) + ' min' : v + ' s'); })) + '</div>';
    /* heat */
    var T = X.thermal || {};
    h += '<div class="s4">' + card(I('Temperature', 'Θερμοκρασία'), T.tempC != null ? I('during the scan', 'κατά τη σάρωση') : I('no sensor', 'χωρίς αισθητήρα'),
      (T.tempC != null ? heatGauge(T.tempC) : '<div class="sub">' + esc(I('Windows does not share a temperature sensor on this PC. Many desktops do not.', 'Τα Windows δεν δίνουν αισθητήρα θερμοκρασίας σε αυτόν τον υπολογιστή. Πολλά desktop δεν το κάνουν.')) + '</div>') +
      '<div class="sub">' + esc(I('Slow-downs in 30 days: ', 'Επιβραδύνσεις σε 30 ημέρες: ')) + '<b>' + num(T.throttleEvents30d) + '</b>' + (T.clockMHz && T.maxClockMHz ? '<br>' + esc(I('Processor speed now: ', 'Ταχύτητα επεξεργαστή τώρα: ')) + T.clockMHz + ' / ' + T.maxClockMHz + ' MHz' : '') + '</div>') + '</div>';
    /* slow start */
    var ss = arr(X.slowStart);
    h += '<div class="s4">' + card(I('What slows down start-up', 'Τι καθυστερεί την εκκίνηση'), ss.length ? I('measured by Windows', 'μετρημένο από τα Windows') : '', hbars(ss.slice(0, 8).map(function (x) { return { l: x.name, v: num(x.avgSec), c: x.avgSec >= 5 ? 'warn' : '' }; }), ' s', 0, function (v) { return V.fmtNum(v, 1) + ' s'; })) + '</div>';
    /* dns */
    var ds = arr(X.dnsSpeed);
    h += '<div class="s4">' + card(I('Speed of the internet phone book (DNS)', 'Ταχύτητα DNS'), ds.length ? I('lower is better', 'λιγότερο = καλύτερα') : I('full scan only', 'μόνο στην πλήρη σάρωση'), hbars(ds.map(function (x, i) { return { l: x.label + ' ' + x.ip, v: num(x.ms), c: i === 0 ? 'warn' : '' }; }), ' ms', 0, function (v) { return v + ' ms'; })) + '</div>';
    /* connections */
    var cn = arr(X.connections);
    h += '<div class="s6">' + card(I('Programs talking to the internet', 'Προγράμματα που μιλούν με το internet'), cn.length + I(' programs', ' προγράμματα'), hbars(cn.slice(0, 12).map(function (x) { return { l: x.process, v: num(x.n) }; }), '', 0, function (v) { return v + ' conn.'; }) + '<p class="sub">' + esc(I('Only connections to the internet are shown, not to your home network.', 'Εμφανίζονται μόνο συνδέσεις με το internet, όχι με το οικιακό δίκτυο.')) + '</p>') + '</div>';
    /* certs + wu */
    var wu = X.wu || {}, ce = arr(X.certs);
    h += '<div class="s6">' + card(I('Windows Update and licences', 'Windows Update και άδειες'), '',
      '<dl class="kv" style="grid-template-columns:230px 1fr">' + [[I('Last successful update', 'Τελευταία επιτυχής ενημέρωση'), wu.lastSuccessDays != null ? I(wu.lastSuccessDays + ' days ago', 'πριν ' + wu.lastSuccessDays + ' ημέρες') : '-'], [I('Failed in 30 days', 'Απέτυχαν σε 30 ημέρες'), String(arr(wu.failed30).length)], [I('Restart waiting', 'Επανεκκίνηση σε αναμονή'), wu.restartPending ? I('yes', 'ναι') : I('no', 'όχι')], [I('Updates paused or off', 'Ενημερώσεις σε παύση ή κλειστές'), (wu.paused || wu.serviceDisabled || wu.policyOff) ? I('yes', 'ναι') : I('no', 'όχι')],
        [I('Office', 'Office'), X.office && X.office.installed ? (X.office.releaseIds || X.office.version || I('installed', 'εγκατεστημένο')) : I('not found', 'δεν βρέθηκε')], [I('OneDrive', 'OneDrive'), X.oneDrive && X.oneDrive.installed ? (X.oneDrive.signedIn ? I('signed in', 'συνδεδεμένο') : I('not signed in', 'όχι συνδεδεμένο')) : I('not found', 'δεν βρέθηκε')]].map(function (p) { return '<dt>' + esc(p[0]) + '</dt><dd>' + esc(p[1]) + '</dd>'; }).join('') + '</dl>' +
      (arr(wu.history).length ? '<div class="lbl">' + esc(I('Recent update history', 'Πρόσφατο ιστορικό ενημερώσεων')) + '</div><div class="tbl"><table><thead><tr><th>' + esc(I('Date', 'Ημερομηνία')) + '</th><th>' + esc(I('Update', 'Ενημέρωση')) + '</th><th>' + esc(I('Result', 'Αποτέλεσμα')) + '</th><th>' + esc(I('Code', 'Κωδικός')) + '</th></tr></thead><tbody>' +
        arr(wu.history).slice(0, 10).map(function (x) { var bad = x.resultCode === 4 || x.resultCode === 5; return '<tr class="' + (bad ? 'hot' : '') + '"><td>' + esc(V.fmtDT(x.date)) + '</td><td>' + esc(x.title || '-') + '</td><td>' + esc(wuResult(x)) + '</td><td style="white-space:nowrap">' + esc(x.hResult || '-') + '</td></tr>'; }).join('') + '</tbody></table></div>' : '') +
      (ce.length ? '<div class="lbl">' + esc(I('Certificates that expire soon', 'Πιστοποιητικά που λήγουν σύντομα')) + '</div>' + hbars(ce.slice(0, 6).map(function (x) { return { l: x.name, v: Math.max(0, x.days), c: x.days < 0 ? 'bad' : (x.days < 15 ? 'warn' : '') }; }), '', 45, function (v) { return v + ' ' + I('days', 'ημέρες'); }) : '')) + '</div>';
    h += '</div>';
    /* tables */
    var ex = arr(X.browserExt);
    h += sect(I('Browser add-ons', 'Πρόσθετα του browser'), ex.length + I(' found', ' βρέθηκαν'));
    h += '<div class="win"><div class="body">' + (ex.length ? '<div class="tbl"><table><thead><tr><th>' + esc(I('Browser', 'Browser')) + '</th><th>' + esc(I('Add-on', 'Πρόσθετο')) + '</th><th>' + esc(I('Can read all websites', 'Διαβάζει όλες τις σελίδες')) + '</th><th>' + esc(I('Sensitive powers', 'Ευαίσθητα δικαιώματα')) + '</th></tr></thead><tbody>' +
      ex.slice(0, 60).map(function (e) { var strong = (e.allUrls && arr(e.risky).length >= 2) || arr(e.risky).some(function (p) { return /^(proxy|debugger|nativeMessaging)$/.test(p); }); return '<tr class="' + (strong ? 'hot' : '') + '"><td>' + esc(e.browser) + '</td><td>' + esc(e.name) + '</td><td>' + (e.allUrls ? esc(I('yes', 'ναι')) : '-') + '</td><td>' + esc(arr(e.risky).join(', ') || '-') + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="sub">' + esc(I('No add-ons found in Chrome, Edge, Brave or Firefox.', 'Δεν βρέθηκαν πρόσθετα σε Chrome, Edge, Brave ή Firefox.')) + '</div>') + '</div></div>';
    var ac = arr(X.accounts);
    h += sect(I('Accounts on this PC', 'Λογαριασμοί σε αυτόν τον υπολογιστή'), ac.length + I(' accounts', ' λογαριασμοί'));
    h += '<div class="win"><div class="body">' + (ac.length ? '<div class="tbl"><table><thead><tr><th>' + esc(I('Name', 'Όνομα')) + '</th><th>' + esc(I('Active', 'Ενεργός')) + '</th><th>' + esc(I('Administrator', 'Διαχειριστής')) + '</th><th>' + esc(I('Needs password', 'Θέλει κωδικό')) + '</th><th>' + esc(I('Last sign-in', 'Τελευταία είσοδος')) + '</th></tr></thead><tbody>' +
      ac.map(function (a) { var yn = function (b) { return b ? I('yes', 'ναι') : I('no', 'όχι'); }; return '<tr class="' + ((a.enabled && (a.noPassword || a.isGuest)) ? 'hot' : '') + '"><td>' + esc(a.name) + '</td><td>' + yn(a.enabled) + '</td><td>' + yn(a.isAdmin) + '</td><td>' + yn(!a.noPassword) + '</td><td>' + (a.lastLogonDays == null ? '-' : esc(I(a.lastLogonDays + ' days ago', 'πριν ' + a.lastLogonDays + ' ημέρες'))) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="sub">' + esc(I('Account list not available (needs administrator rights).', 'Η λίστα λογαριασμών δεν είναι διαθέσιμη (θέλει δικαιώματα διαχειριστή).')) + '</div>') + '</div></div>';
    /* history table */
    var hist = arr(D.trend).slice(-12).reverse();
    h += sect(I('Scan by scan', 'Σάρωση προς σάρωση'), hist.length + I(' scans kept on this PC', ' σαρώσεις αποθηκευμένες σε αυτόν τον υπολογιστή'));
    h += '<div class="win"><div class="body">' + (hist.length ? '<div class="tbl"><table><thead><tr><th>' + esc(I('Date', 'Ημερομηνία')) + '</th><th>' + esc(I('Free on C:', 'Ελεύθερο C:')) + '</th><th>' + esc(I('Start-up', 'Εκκίνηση')) + '</th><th>' + esc(I('System errors', 'Σφάλματα συστήματος')) + '</th><th>' + esc(I('Crashes', 'Κρασαρίσματα')) + '</th><th>' + esc(I('Reliability', 'Αξιοπιστία')) + '</th><th>' + esc(I('Version', 'Έκδοση')) + '</th></tr></thead><tbody>' +
      hist.map(function (x) { var f = function (v, u) { return v == null ? '-' : V.fmtNum(v, u || 0); }; return '<tr><td>' + esc(dt(x.t)) + '</td><td>' + f(x.freeC) + ' GB</td><td>' + f(x.bootS) + ' s</td><td>' + f(x.sysErr) + '</td><td>' + f(x.crashes) + '</td><td>' + f(x.reliability, 1) + '</td><td>' + esc(x.v || '') + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="sub">' + esc(I('No history yet.', 'Δεν υπάρχει ιστορικό ακόμη.')) + '</div>') + '</div></div>';
    /* will it run */
    h += sect(I('Will it run?', 'Θα τρέξει;'), I('pick a program or game', 'διάλεξε πρόγραμμα ή παιχνίδι'));
    h += '<div class="win"><div class="body"><label class="lbl" for="runSel">' + esc(I('I want to use...', 'Θέλω να χρησιμοποιήσω...')) + '</label><select id="runSel" class="sel">' + BR_PRESETS.map(function (p, i) { return '<option value="' + i + '">' + esc(p.n) + '</option>'; }).join('') + '</select><div id="runOut">' + runHtml(P.run || 0) + '</div></div></div>';
    el.innerHTML = h;
    var sel = $('#runSel'); if (sel) { sel.value = String(P.run || 0); sel.addEventListener('change', function () { P.run = +sel.value; save(); $('#runOut').innerHTML = runHtml(P.run); }); }
  }

  /* ---------- tools: client report, e-mail, inventory ---------- */
  function ageYears() { var b = g(D, 'system.bios.date', null); if (!b) return null; var y = (new Date(g(D, 'meta.generated', Date.now())) - new Date(b)) / (365.25 * 86400000); return y > 0 ? Math.round(y * 10) / 10 : null; }
  function inventoryCsv() {
    function q(v) { v = v == null ? '' : String(v); return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
    var inv = X.inventory || {}, s = D.system || {}, c = V.counts;
    var vols = arr(D.volumes).map(function (v) { return v.letter + ' ' + V.fmtNum(v.sizeGB, 0) + 'GB'; }).join(' | ');
    var cols = ['scanDate', 'computer', 'maker', 'model', 'serial', 'cpu', 'ramGB', 'drives', 'windows', 'build', 'windowsInstalled', 'biosDate', 'ageYears', 'healthScore', 'high', 'medium', 'low'];
    var row = [String(g(D, 'meta.generated', '')).slice(0, 10), g(D, 'meta.computer', ''), inv.maker || s.manufacturer, inv.model || s.model, inv.serial, g(s, 'cpu.name', ''), g(s, 'ram.totalGB', ''), vols, g(s, 'os.productName', ''), g(s, 'os.build', ''), String(inv.osInstall || g(s, 'os.installDate', '')).slice(0, 10), String(inv.biosDate || g(s, 'bios.date', '')).slice(0, 10), ageYears(), V.score.score, c.high, c.medium, c.low];
    return cols.join(',') + '\r\n' + row.map(q).join(',') + '\r\n' + 'Created with VEAGLE PC Check - ferelis.gr';
  }
  function dl(name, text) {
    var blob = new Blob(['\uFEFF' + text], { type: 'text/csv;charset=utf-8' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function toolsHtml() {
    var h = sect(I('For professionals', 'Για επαγγελματίες'), I('client report, e-mail, inventory', 'αναφορά πελάτη, email, απογραφή'));
    h += '<div class="win" style="margin-bottom:18px"><header><span>client-report.pdf</span><span class="st">' + esc(I('print or save as PDF', 'εκτύπωση ή PDF')) + '</span></header><div class="body">' +
      '<p class="sub" style="margin:0">' + esc(I('Makes a clean report with a cover page, the plain-words summary, the action plan and your notes. Fill in what you want, then press the button and choose "Save as PDF" in the print window. Everything stays on this PC.', 'Φτιάχνει καθαρή αναφορά με εξώφυλλο, τη σύνοψη με απλά λόγια, το πλάνο δράσης και τις σημειώσεις σου. Συμπλήρωσε ό,τι θες, πάτα το κουμπί και διάλεξε «Αποθήκευση ως PDF» στο παράθυρο εκτύπωσης. Όλα μένουν σε αυτόν τον υπολογιστή.')) + '</p>' +
      '<div class="two"><div class="field"><label class="lbl" for="crCust">' + esc(I('Customer name', 'Όνομα πελάτη')) + '</label><input type="text" id="crCust" value="' + esc(P.cust || '') + '" autocomplete="off"></div>' +
      '<div class="field"><label class="lbl" for="crTech">' + esc(I('Prepared by', 'Συντάχθηκε από')) + '</label><input type="text" id="crTech" value="' + esc(P.tech || '') + '" autocomplete="off"></div></div>' +
      '<div class="field"><label class="lbl" for="crStamp">' + esc(I('Visit stamp (for example: visit 12/11, replaced SSD)', 'Σφραγίδα επίσκεψης (π.χ.: επίσκεψη 12/11, αλλαγή SSD)')) + '</label><input type="text" id="crStamp" value="' + esc(P.stamp || '') + '" autocomplete="off"></div>' +
      '<div class="field"><label class="lbl" for="crNote">' + esc(I('Your notes (printed in the report)', 'Οι σημειώσεις σου (τυπώνονται στην αναφορά)')) + '</label><textarea id="crNote" rows="4">' + esc(P.note || '') + '</textarea></div>' +
      '<div class="field"><label class="lbl" for="crImg">' + esc(I('Photo or stamp image (optional, stays in this browser)', 'Φωτογραφία ή εικόνα σφραγίδας (προαιρετικά, μένει σε αυτόν τον browser)')) + '</label><input type="file" id="crImg" accept="image/*"> <span id="crImgInfo" class="sub">' + (P.img ? esc(I('image saved', 'η εικόνα αποθηκεύτηκε')) + ' <button class="btn sm" type="button" id="crImgDel">' + esc(I('remove', 'αφαίρεση')) + '</button>' : '') + '</span></div>' +
      '<div class="btns"><button class="btn primary" type="button" id="crPrint">' + esc(I('Make the client report', 'Φτιάξε την αναφορά πελάτη')) + '</button></div></div></div>';
    h += '<div class="two" style="margin-bottom:18px"><div class="win"><header><span>e-mail</span><span class="st">' + esc(I('you press send', 'το στέλνεις εσύ')) + '</span></header><div class="body">' +
      '<p class="sub" style="margin:0">' + esc(I('Prepares an e-mail to the person who helps you. Step 1 saves the share-safe copy of this report (personal details removed). Step 2 opens your e-mail program with a short message. You attach the saved file and press send yourself. Nothing is sent by this app.', 'Ετοιμάζει ένα email προς τον άνθρωπο που σε βοηθά. Το βήμα 1 σώζει το αντίγραφο για κοινοποίηση (χωρίς προσωπικά στοιχεία). Το βήμα 2 ανοίγει το πρόγραμμα email σου με σύντομο μήνυμα. Επισυνάπτεις εσύ το αρχείο και πατάς αποστολή. Η εφαρμογή δεν στέλνει τίποτα.')) + '</p>' +
      '<div class="field"><label class="lbl" for="mlTo">' + esc(I('To (e-mail address)', 'Προς (διεύθυνση email)')) + '</label><input type="text" id="mlTo" value="' + esc(P.to || '') + '" autocomplete="off"></div>' +
      '<div class="btns"><button class="btn primary" type="button" id="mlGo">' + esc(I('Save the file and open my e-mail', 'Σώσε το αρχείο και άνοιξε το email μου')) + '</button></div></div></div>' +
      '<div class="win"><header><span>inventory.csv</span><span class="st">' + esc(I('one row for this PC', 'μία γραμμή για αυτόν τον υπολογιστή')) + '</span></header><div class="body">' +
      '<p class="sub" style="margin:0">' + esc(I('A row for your inventory sheet: maker, model, serial number, processor, memory, drives, Windows, BIOS age and health score. The serial number is only in this file, never in the AI package or the share-safe copy.', 'Μία γραμμή για τη λίστα εξοπλισμού σου: κατασκευαστής, μοντέλο, σειριακός αριθμός, επεξεργαστής, μνήμη, δίσκοι, Windows, ηλικία BIOS και βαθμός υγείας. Ο σειριακός αριθμός υπάρχει μόνο σε αυτό το αρχείο, ποτέ στο πακέτο για AI ή στο αντίγραφο για κοινοποίηση.')) + '</p>' +
      '<dl class="kv">' + [[I('Maker and model', 'Κατασκευαστής και μοντέλο'), ((X.inventory || {}).maker || g(D, 'system.manufacturer', '')) + ' ' + ((X.inventory || {}).model || g(D, 'system.model', ''))], [I('Serial number', 'Σειριακός αριθμός'), (X.inventory || {}).serial || '-'], [I('BIOS age', 'Ηλικία BIOS'), ageYears() == null ? '-' : ageYears() + I(' years', ' έτη')]].map(function (p) { return '<dt>' + esc(p[0]) + '</dt><dd>' + esc(p[1]) + '</dd>'; }).join('') + '</dl>' +
      '<div class="btns"><button class="btn" type="button" id="xlsBtn2">' + esc(I('Export everything to Excel', 'Εξαγωγή όλων σε Excel')) + '</button><button class="btn" type="button" id="invSave">' + esc(I('Save inventory row (CSV)', 'Σώσε γραμμή απογραφής (CSV)')) + '</button></div></div></div></div>';
    return h;
  }
  function clientDoc() {
    var s = V.score, c = V.counts, top = nonInfo().slice(0, 6), pl = planHtml(), ba = beforeAfter();
    var col = s.score >= 85 ? '#1a9d58' : (s.score >= 65 ? '#c98a12' : '#c1181a');
    var logo = ($('.brand img') || {}).src || '', SP = g(D, 'meta.support', null) || {};
    var h = '<div class="cd-cover"><img src="' + logo + '" alt="" class="cd-logo"><h1>' + esc(I('PC health report', 'Αναφορά υγείας υπολογιστή')) + '</h1>' +
      (P.cust ? '<div class="cd-line"><span>' + esc(I('Prepared for', 'Για')) + '</span><b>' + esc(P.cust) + '</b></div>' : '') +
      '<div class="cd-line"><span>' + esc(I('Computer', 'Υπολογιστής')) + '</span><b>' + esc(g(D, 'meta.computer', '')) + ' &middot; ' + esc(((X.inventory || {}).maker || g(D, 'system.manufacturer', '')) + ' ' + ((X.inventory || {}).model || g(D, 'system.model', ''))) + '</b></div>' +
      '<div class="cd-line"><span>' + esc(I('Scan date', 'Ημερομηνία σάρωσης')) + '</span><b>' + esc(dt(g(D, 'meta.generated', ''))) + '</b></div>' +
      ((P.tech || SP.name) ? '<div class="cd-line"><span>' + esc(I('Prepared by', 'Συντάχθηκε από')) + '</span><b>' + esc(P.tech || SP.name) + '</b></div>' : '') +
      ((SP.email || SP.phone || SP.site) ? '<div class="cd-line"><span>' + esc(I('Contact', 'Επικοινωνία')) + '</span><b>' + esc([SP.email, SP.phone, SP.site].filter(Boolean).join(' \u00b7 ')) + '</b></div>' : '') +
      (P.stamp ? '<div class="cd-stamp">' + esc(P.stamp) + '</div>' : '') + (P.img ? '<img class="cd-img" src="' + P.img + '" alt="">' : '') +
      '<div class="cd-score" style="border-color:' + col + ';color:' + col + '"><b>' + s.score + '</b><span>/100</span><small>' + esc(s.label) + '</small></div></div>';
    h += '<div class="cd-page"><h2>' + esc(I('In plain words', 'Με απλά λόγια')) + '</h2><p>' + esc(I(c.high + ' serious, ' + c.medium + ' medium and ' + c.low + ' small findings were found.', 'Βρέθηκαν ' + c.high + ' σοβαρά, ' + c.medium + ' μέτρια και ' + c.low + ' μικρά ευρήματα.')) + '</p>';
    h += '<h2>' + esc(I('What to do first', 'Τι να γίνει πρώτα')) + '</h2>' + (top.length ? '<ol class="cd-ol">' + top.map(function (f0) { var f = V.tf(f0); return '<li><b>' + esc(f.title) + '</b> <small>(' + esc(f.sev.toUpperCase()) + ', ~' + mins(minsOf(f0)) + ')</small><br><span>' + esc(f.why) + '</span></li>'; }).join('') + '</ol>' : '<p>' + esc(I('Nothing needs fixing.', 'Δεν χρειάζεται διόρθωση τίποτα.')) + '</p>');
    if (pl) h += '<div class="cd-plan">' + pl + '</div>';
    if (ba) h += '<h2>' + esc(I('What improved since the last visit', 'Τι βελτιώθηκε από την προηγούμενη επίσκεψη')) + '</h2>' + beforeAfterHtml(true);
    try {
      var bl = V.RT.basicList(), hs = V.RT.hardScore();
      h += '<h2>' + esc(I('Basic security checklist', 'Λίστα βασικής ασφάλειας')) + '</h2><table class="cd-tb">' + bl.map(function (b) { return '<tr><td>' + esc(I(b.en, b.el)) + '</td><td>' + (b.st === 'ok' ? '&#10003; ' + esc(I('OK', 'Εντάξει')) : (b.st === 'warn' ? '! ' + esc(I('needs a look', 'θέλει μια ματιά')) : '&#10005; ' + esc(I('needs fixing', 'θέλει διόρθωση')))) + (b.items.length ? ' - ' + esc(b.items.slice(0, 2).map(function (f) { return V.tf(f).title; }).join('; ')) : '') + '</td></tr>'; }).join('') + (hs ? '<tr><td>' + esc(I('Hardening score', 'Βαθμός σκληροποίησης')) + '</td><td>' + hs.score + '/100 (' + hs.passed + '/' + hs.total + ')</td></tr>' : '') + '</table>';
    } catch (e) { }
    h += '<h2>' + esc(I('Your PC at a glance', 'Ο υπολογιστής σου με μια ματιά')) + '</h2><table class="cd-tb">' + [[I('Processor', 'Επεξεργαστής'), g(D, 'system.cpu.name', '')], [I('Memory', 'Μνήμη'), V.fmtGB(g(D, 'system.ram.totalGB', 0))], [I('Windows', 'Windows'), g(D, 'system.os.productName', '') + ' ' + g(D, 'system.os.displayVersion', '')], [I('Drives', 'Δίσκοι'), arr(D.volumes).map(function (v) { return v.letter + ' ' + V.fmtGB(v.freeGB) + ' ' + I('free of', 'ελεύθερα από') + ' ' + V.fmtGB(v.sizeGB); }).join(', ')]].map(function (r) { return '<tr><td>' + esc(r[0]) + '</td><td>' + esc(r[1]) + '</td></tr>'; }).join('') + '</table>';
    if (P.note) h += '<h2>' + esc(I('Notes', 'Σημειώσεις')) + '</h2><p class="cd-note">' + esc(P.note).replace(/\n/g, '<br>') + '</p>';
    h += '<div class="cd-disc"><b>' + esc(I('Important note', 'Σημαντική ενημέρωση')) + '</b> ' + esc(I(NOTE_B[0], NOTE_B[1])) + ' ' + esc(I(DISC[0], DISC[1])) + '</div>';
    h += '<div class="cd-foot">VEAGLE PC Check ' + esc(g(D, 'meta.version', '')) + ' &middot; ferelis.gr &middot; ' + esc(I('read-only scan: nothing on this PC was changed', 'σάρωση μόνο ανάγνωσης: τίποτα δεν άλλαξε σε αυτόν τον υπολογιστή')) + '</div></div>';
    return h;
  }
  function printClient() {
    var old = $('#clientDoc'); if (old) old.remove();
    var d = document.createElement('div'); d.id = 'clientDoc'; d.innerHTML = clientDoc(); document.body.appendChild(d);
    document.body.classList.add('printclient');
    var done = function () { document.body.classList.remove('printclient'); var x = $('#clientDoc'); if (x) x.remove(); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    setTimeout(function () { window.print(); }, 60);
  }
  function mailGo() {
    P.to = ($('#mlTo') || {}).value || ''; save();
    try { SHARE.download(); } catch (e) { }
    var top = nonInfo().slice(0, 5);
    var body = I('Hello,\n\nI ran VEAGLE PC Check on my PC.\nHealth score: ' + V.score.score + '/100 (' + V.counts.high + ' serious, ' + V.counts.medium + ' medium, ' + V.counts.low + ' small findings).\n\nMain things found:\n', 'Γεια σου,\n\nέτρεξα το VEAGLE PC Check στον υπολογιστή μου.\nΒαθμός υγείας: ' + V.score.score + '/100 (' + V.counts.high + ' σοβαρά, ' + V.counts.medium + ' μέτρια, ' + V.counts.low + ' μικρά ευρήματα).\n\nΤα κυριότερα:\n') +
      top.map(function (f) { return '- ' + V.tf(f).title; }).join('\n') + I('\n\nThe report file (personal details removed) is attached.\n', '\n\nΣυνημμένο είναι το αρχείο της αναφοράς (χωρίς προσωπικά στοιχεία).\n');
    var subj = 'PC Check - ' + g(D, 'meta.computer', 'PC') + ' - ' + V.score.score + '/100';
    var a = document.createElement('a'); a.href = 'mailto:' + encodeURIComponent(P.to).replace(/%40/g, '@') + '?subject=' + encodeURIComponent(subj) + '&body=' + encodeURIComponent(body);
    document.body.appendChild(a); a.click(); a.remove();
    AI.toast(I('The file was saved in your Downloads folder. Attach it to the e-mail that opened, then press send.', 'Το αρχείο σώθηκε στα Λήψεις. Επισύναψέ το στο email που άνοιξε και πάτα αποστολή.'));
  }
  function wireTools() {
    function on(id, fn) { var e = $(id); if (e) e.addEventListener('click', fn); }
    function bind(id, key) { var e = $(id); if (e) e.addEventListener('input', function () { P[key] = e.value; save(); }); }
    bind('#crCust', 'cust'); bind('#crTech', 'tech'); bind('#crStamp', 'stamp'); bind('#crNote', 'note');
    on('#crPrint', printClient); on('#mlGo', mailGo); on('#xlsBtn2', function () { if (typeof INV !== 'undefined') INV.exportXlsx(); });
    on('#invSave', function () { dl('veagle-inventory-' + String(g(D, 'meta.computer', 'pc')).replace(/[^\w-]/g, '') + '.csv', inventoryCsv()); AI.toast(I('Saved the inventory row.', 'Η γραμμή απογραφής σώθηκε.')); });
    on('#crImgDel', function () { delete P.img; save(); var i = $('#crImgInfo'); if (i) i.textContent = ''; });
    var fi = $('#crImg');
    if (fi) fi.addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0]; if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        var im = new Image();
        im.onload = function () {
          var k = Math.min(1, 280 / Math.max(im.width, im.height)), cv = document.createElement('canvas'); cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k);
          cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
          try { P.img = cv.toDataURL('image/jpeg', 0.82); save(); var i = $('#crImgInfo'); if (i) i.textContent = I('image saved', 'η εικόνα αποθηκεύτηκε'); } catch (err) { }
        };
        im.src = rd.result;
      };
      rd.readAsDataURL(f);
    });
  }

  /* ---------- "?" help on every window ---------- */
  var HELP = {
    wHealth: ['The health score starts at 100 and loses points for every finding: serious ones lose the most. 85 or more is healthy, under 65 needs attention.', 'Ο βαθμός υγείας ξεκινά από 100 και χάνει πόντους για κάθε εύρημα: τα σοβαρά χάνουν τους περισσότερους. 85 και πάνω είναι υγιής, κάτω από 65 θέλει προσοχή.'],
    wRadar: ['Each corner is one area of the PC. The bigger the shape, the healthier. A dent shows the weak area.', 'Κάθε γωνία είναι μια περιοχή του υπολογιστή. Όσο πιο μεγάλο το σχήμα, τόσο πιο υγιής. Μια εσοχή δείχνει την αδύναμη περιοχή.'],
    wActions: ['The three things that will improve your PC the most, in order. Press the button to see exact clicks.', 'Τα τρία πράγματα που θα βελτιώσουν περισσότερο τον υπολογιστή, με σειρά. Πάτα το κουμπί για τα ακριβή κλικ.'],
    wCpu: ['The processor is the brain of the PC. Cores are like workers: more cores means more tasks at the same time.', 'Ο επεξεργαστής είναι ο εγκέφαλος του υπολογιστή. Οι πυρήνες είναι σαν εργάτες: περισσότεροι πυρήνες σημαίνει περισσότερες δουλειές ταυτόχρονα.'],
    wMem: ['RAM is the short-term memory. When it is nearly full the PC becomes slow. 8 GB is the minimum today, 16 GB is comfortable.', 'Η RAM είναι η βραχυπρόθεσμη μνήμη. Όταν γεμίσει σχεδόν, ο υπολογιστής αργεί. 8 GB είναι το ελάχιστο σήμερα, 16 GB είναι άνετα.'],
    wGpu: ['The graphics card draws the picture on the screen. It matters for games, video editing and design work.', 'Η κάρτα γραφικών ζωγραφίζει την εικόνα στην οθόνη. Μετράει για παιχνίδια, μοντάζ βίντεο και σχεδιαστικές δουλειές.'],
    wStorage: ['Drives keep your files. Keep at least 15 % free: a very full drive makes Windows slow and updates fail.', 'Οι δίσκοι κρατούν τα αρχεία σου. Κράτα τουλάχιστον 15 % ελεύθερο: ένας πολύ γεμάτος δίσκος κάνει τα Windows αργά και αποτυγχάνουν οι ενημερώσεις.'],
    wSecurity: ['Shows the protection that guards your PC: antivirus, firewall, disk encryption and the security chip.', 'Δείχνει την προστασία του υπολογιστή: antivirus, firewall, κρυπτογράφηση δίσκου και το chip ασφαλείας.'],
    wBoot: ['How long Windows takes to start. Under 40 seconds is fast. Over 90 seconds usually means too many start-up programs or an old hard disk.', 'Πόσο χρειάζονται τα Windows για να ξεκινήσουν. Κάτω από 40 δευτερόλεπτα είναι γρήγορα. Πάνω από 90 συνήθως σημαίνει πολλά προγράμματα εκκίνησης ή παλιό σκληρό δίσκο.'],
    wHeat: ['A calendar of problems: each square is one day, a darker square is a day with more errors. Look for a sudden dark day.', 'Ημερολόγιο προβλημάτων: κάθε τετράγωνο είναι μία μέρα, πιο σκούρο σημαίνει περισσότερα σφάλματα. Ψάξε για μια ξαφνικά σκούρα μέρα.'],
    wBattery: ['A laptop battery loses capacity with age. Wear shows how much it has lost compared with new.', 'Η μπαταρία του laptop χάνει χωρητικότητα με τον καιρό. Η φθορά δείχνει πόσο έχασε σε σχέση με καινούργια.'],
    wNet: ['Your network connection: which adapter you use, its speed and the addresses.', 'Η σύνδεσή σου στο δίκτυο: ποιον προσαρμογέα χρησιμοποιείς, η ταχύτητα και οι διευθύνσεις.']
  };
  function decorate() {
    Object.keys(HELP).forEach(function (id) {
      var w = $('#' + id), hd = w && w.querySelector('header'); if (!hd || hd.querySelector('.hq')) return;
      var b = document.createElement('button'); b.type = 'button'; b.className = 'hq'; b.textContent = '?'; b.setAttribute('aria-label', I('What is this?', 'Τι είναι αυτό;')); b.title = I('What is this?', 'Τι είναι αυτό;');
      b.setAttribute('data-help', id); hd.insertBefore(b, hd.querySelector('.st'));
    });
    insights(); if (typeof INV !== 'undefined') INV.render(); notices(); howFind();
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.hq'); if (!b) return;
    var w = b.closest('.win'), old = w.querySelector('.hqpop');
    if (old) { old.remove(); return; }
    var h = HELP[b.getAttribute('data-help')]; if (!h) return;
    var d = document.createElement('div'); d.className = 'hqpop'; d.textContent = I(h[0], h[1]);
    w.querySelector('header').insertAdjacentElement('afterend', d);
  });


  /* ---------- notices: a short note on top of the report and a general disclaimer at the end ---------- */
  var NOTE_A = ['If your PC works well, you do not have to change anything. This report helps you get to know it: what is hidden and running inside, how to make it faster and more stable, and how to raise its level of security.', 'Αν ο υπολογιστής σου δουλεύει καλά, δεν είναι απαραίτητο να αλλάξεις τίποτα. Η αναφορά όμως σε βοηθά να τον γνωρίσεις: τι κρύβεται και τι τρέχει μέσα του, πώς να τον κάνεις πιο γρήγορο και πιο σταθερό και πώς να ανεβάσεις το επίπεδο ασφάλειάς του.'];
  var NOTE_B = ['The findings are hints and estimates, not diagnoses and not a guarantee. A hint does not always mean a problem. This app changed nothing on your PC and sent nothing anywhere. Whatever you decide to do, you do yourself, at your own responsibility. Before important changes, keep a backup of your files and, if you are not sure, ask an expert.', 'Τα ευρήματα είναι ενδείξεις και εκτιμήσεις, όχι διαγνώσεις και όχι εγγύηση. Μια ένδειξη δεν σημαίνει πάντα πρόβλημα. Η εφαρμογή δεν άλλαξε τίποτα στον υπολογιστή σου και δεν έστειλε τίποτα πουθενά. Όσα αποφασίσεις να κάνεις, τα κάνεις εσύ, με δική σου ευθύνη. Πριν από σημαντικές αλλαγές κράτα αντίγραφο ασφαλείας των αρχείων σου και, αν δεν είσαι σίγουρος, ρώτα έναν ειδικό.'];
  var DISC = ['VEAGLE PC Check is a free tool provided "as is", without any warranty of any kind. It reads information from your PC and shows it with explanations and estimates that can be incomplete or wrong, because every PC and every version of Windows is different. It is not a replacement for professional advice, repair or security services. The authors are not responsible for any loss of data, damage, downtime or any other consequence of using the app or of following its suggestions. Instructions with commands change your system: use them only if you understand them and, for important changes, after you have made a backup. Names of programs, products and companies belong to their owners and are used only to describe what was found. Everything stays on your PC: nothing is collected or uploaded by the app. If you share the report or the AI package, you decide what to share, so read it first.',
    'Το VEAGLE PC Check είναι δωρεάν εργαλείο που παρέχεται «ως έχει», χωρίς καμία εγγύηση οποιουδήποτε είδους. Διαβάζει πληροφορίες από τον υπολογιστή σου και τις δείχνει με εξηγήσεις και εκτιμήσεις που μπορεί να είναι ελλιπείς ή λανθασμένες, γιατί κάθε υπολογιστής και κάθε έκδοση των Windows είναι διαφορετική. Δεν αντικαθιστά επαγγελματική συμβουλή, επισκευή ή υπηρεσίες ασφάλειας. Οι δημιουργοί δεν ευθύνονται για απώλεια δεδομένων, ζημιά, διακοπή λειτουργίας ή οποιαδήποτε άλλη συνέπεια από τη χρήση της εφαρμογής ή την εφαρμογή των προτάσεών της. Οι οδηγίες με εντολές αλλάζουν το σύστημά σου: χρησιμοποίησέ τες μόνο αν τις καταλαβαίνεις και, για σημαντικές αλλαγές, αφού κάνεις αντίγραφο ασφαλείας. Τα ονόματα προγραμμάτων, προϊόντων και εταιρειών ανήκουν στους κατόχους τους και χρησιμοποιούνται μόνο για να περιγράψουν τι βρέθηκε. Όλα μένουν στον υπολογιστή σου: η εφαρμογή δεν συλλέγει και δεν ανεβάζει τίποτα. Αν μοιραστείς την αναφορά ή το πακέτο για AI, εσύ αποφασίζεις τι θα μοιραστείς, γι’ αυτό διάβασέ το πρώτα.'];
  function notices() {
    var top = $('#noticeTop'), foot = $('#noticeFoot');
    if (top) {
      var closed = !!P.noteClosed;
      top.className = 'notice' + (closed ? ' small' : '');
      top.innerHTML = '<div class="nt"><b>' + esc(I('Before you read the results', 'Πριν διαβάσεις τα αποτελέσματα')) + '</b><button type="button" class="btn sm" id="noteTog" aria-expanded="' + (!closed) + '">' + esc(closed ? I('Show the full note', 'Δες ολόκληρη την ενημέρωση') : I('Understood', 'Κατάλαβα')) + '</button></div>' +
        '<p>' + esc(I(NOTE_A[0], NOTE_A[1])) + '</p>' + (closed ? '' : '<p class="nb">' + esc(I(NOTE_B[0], NOTE_B[1])) + '</p>');
    }
    if (foot) foot.innerHTML = '<b>' + esc(I('General disclaimer', 'Γενική αποποίηση ευθύνης')) + '</b><p>' + esc(I(DISC[0], DISC[1])) + '</p>';
  }
  document.addEventListener('click', function (e) { if (e.target && e.target.id === 'noteTog') { P.noteClosed = !P.noteClosed; save(); notices(); } });


  /* ---------- plain-words explanations for ticks, "accept" and the period choice ---------- */
  function howFind() {
    var el = $('#howFind'); if (!el) return;
    el.innerHTML = '<details class="howto"><summary>' + esc(I('How to use this page (read once)', 'Πώς χρησιμοποιείς αυτή τη σελίδα (διάβασέ το μία φορά)')) + '</summary><div>' +
      '<ol>' +
      '<li>' + esc(I('Click a finding to open it. Inside you see, in plain words, what it means and the exact clicks to fix it.', 'Πάτα ένα εύρημα για να ανοίξει. Μέσα βλέπεις με απλά λόγια τι σημαίνει και τα ακριβή κλικ για να το διορθώσεις.')) + '</li>' +
      '<li><b>' + esc(I('Tick each step', 'Τσέκαρε κάθε βήμα')) + '</b> ' + esc(I('after you do it. When every step of a finding is ticked, it stops counting and your score goes up. Ticking changes nothing on your PC: it is only your own checklist.', 'αφού το κάνεις. Όταν είναι τσεκαρισμένα όλα τα βήματα ενός ευρήματος, το εύρημα δεν μετράει πια και ο βαθμός σου ανεβαίνει. Το τσεκάρισμα δεν αλλάζει τίποτα στον υπολογιστή: είναι μόνο η δική σου λίστα.')) + '</li>' +
      '<li><b>' + esc(I('"I accept this"', '«Το αποδέχομαι»')) + '</b> ' + esc(I('is for things you know about and want to keep as they are (for example an Office you bought and will not replace). It stops counting against the score. You can undo it any time with the same button.', 'είναι για πράγματα που τα ξέρεις και θες να μείνουν όπως είναι (π.χ. ένα Office που αγόρασες και δεν θα αλλάξεις). Δεν μετράει πια στον βαθμό. Μπορείς να το αναιρέσεις οποτεδήποτε με το ίδιο κουμπί.')) + '</li>' +
      '<li>' + esc(I('The new score is only an estimate. To really confirm your fixes, close this report, run the scan again and open the new report.', 'Ο νέος βαθμός είναι μόνο εκτίμηση. Για να επιβεβαιώσεις πραγματικά τις διορθώσεις σου, κλείσε αυτό το report, τρέξε ξανά τη σάρωση και άνοιξε το καινούργιο.')) + '</li>' +
      '<li>' + esc(I('Your ticks are remembered in this browser for this scan. Accepted items are remembered for this PC, also in the next scans.', 'Τα τσεκαρίσματά σου θυμούνται σε αυτόν τον browser για αυτή τη σάρωση. Τα αποδεκτά θυμούνται για αυτόν τον υπολογιστή, και στις επόμενες σαρώσεις.')) + '</li>' +
      '</ol></div></details>';
  }
  function periodNote(el) {
    if (!V.periodChoice || !el) return;
    var d = V.days, lab = d === 1 ? I('the last 24 hours', 'τις τελευταίες 24 ώρες') : I('the last ' + d + ' days', 'τις τελευταίες ' + d + ' ημέρες');
    var h = document.createElement('details'); h.className = 'howto' + (d !== 30 ? ' on' : '');
    h.innerHTML = '<summary>' + esc(I('Period of the problems: you are looking at ' + lab, 'Περίοδος των προβλημάτων: βλέπεις ' + lab)) + '</summary><div><p>' + esc(I('Windows keeps the record of old errors for weeks, even after you have fixed the cause. So a fixed problem can still show up in the report for a while. Use the "Period" box at the top to choose how far back to look:', 'Τα Windows κρατούν το αρχείο των παλιών σφαλμάτων για εβδομάδες, ακόμα κι αφού έχεις διορθώσει την αιτία. Έτσι ένα πρόβλημα που διορθώθηκε μπορεί να φαίνεται ακόμα στο report για λίγο. Διάλεξε από το κουτί «Περίοδος» πάνω πάνω πόσο πίσω θες να κοιτάς:')) + '</p><ul>' +
      '<li><b>' + esc(I('1 day', '1 ημέρα')) + '</b>: ' + esc(I('right after you fixed something. Shows only what happened in the last 24 hours, so you can see if the problem is gone.', 'αμέσως μετά από μια διόρθωση. Δείχνει μόνο τι έγινε τις τελευταίες 24 ώρες, ώστε να δεις αν το πρόβλημα έφυγε.')) + '</li>' +
      '<li><b>' + esc(I('7 days', '7 ημέρες')) + '</b>: ' + esc(I('a few days after the fix, or to see what has been happening this week.', 'λίγες μέρες μετά τη διόρθωση, ή για να δεις τι γίνεται αυτή την εβδομάδα.')) + '</li>' +
      '<li><b>' + esc(I('30 days', '30 ημέρες')) + '</b>: ' + esc(I('the normal view.', 'η κανονική προβολή.')) + '</li>' +
      '<li><b>' + esc(I('60 days', '60 ημέρες')) + '</b>: ' + esc(I('for problems that build up slowly or happen only now and then.', 'για προβλήματα που χτίζονται αργά ή εμφανίζονται μόνο πότε πότε.')) + '</li></ul><p class="sub">' + esc(I('Changing the period reloads this report (nothing is lost). Things like Windows Update history or the antivirus status always look at their own time frame.', 'Όταν αλλάζεις περίοδο, το report ξαναφορτώνει (δεν χάνεται τίποτα). Πράγματα όπως το ιστορικό του Windows Update ή η κατάσταση του antivirus κοιτάζουν πάντα το δικό τους χρονικό διάστημα.')) + '</p></div>';
    var anchor = el.querySelector('.vz2') || el.querySelector('.summary');
    if (anchor) anchor.insertAdjacentElement('beforebegin', h);
  }

  /* ---------- easter egg: click the eagle 7 times, type "veagle", or the old cheat code ---------- */
  var ART = '   __     _______    _    ____ _     _____\n   \\ \\   / | ____|  / \\  / ___| |   | ____|\n    \\ \\ / /|  _|   / _ \\| |  _| |   |  _|\n     \\ V / | |___ / ___ | |_| | |___| |___\n      \\_/  |_____/_/   \\_\\____|_____|_____|';
  function egg() {
    if ($('#egg')) return;
    var d = document.createElement('div'); d.id = 'egg';
    var lines = [I('> show me the problem.', '> δείξε μου το πρόβλημα.'), I('> there is always another way.', '> υπάρχει πάντα κι άλλος δρόμος.'), '> ' + V.findings.length + I(' checks, ', ' έλεγχοι, ') + V.good.length + I(' passed. nothing was changed.', ' πέρασαν. τίποτα δεν άλλαξε.'), '> ferelis.gr'];
    d.innerHTML = '<div class="eg"><img src="' + (($('.brand img') || {}).src || '') + '" alt=""><pre>' + esc(ART) + '</pre><pre id="egT"></pre><small>' + esc(I('click or press Esc to close', 'πάτα ή Esc για να κλείσει')) + '</small></div>';
    document.body.appendChild(d);
    var t = $('#egT'), i = 0, j = 0;
    (function tick() { if (!document.body.contains(d)) return; if (i >= lines.length) return; if (j <= lines[i].length) { t.textContent = lines.slice(0, i).join('\n') + (i ? '\n' : '') + lines[i].slice(0, j++); setTimeout(tick, 32); } else { i++; j = 0; setTimeout(tick, 380); } })();
    function close() { d.remove(); document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    d.addEventListener('click', close); document.addEventListener('keydown', onKey);
  }
  (function eggWire() {
    var clicks = 0, tm = null, typed = '', KON = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65], ki = 0;
    document.addEventListener('click', function (e) { if (!(e.target.closest && e.target.closest('.brand'))) return; clicks++; clearTimeout(tm); tm = setTimeout(function () { clicks = 0; }, 1500); if (clicks >= 7) { clicks = 0; egg(); } });
    document.addEventListener('keydown', function (e) {
      if (e.target && /^(input|textarea|select)$/i.test(e.target.tagName)) return;
      ki = (e.keyCode === KON[ki]) ? ki + 1 : (e.keyCode === KON[0] ? 1 : 0); if (ki === KON.length) { ki = 0; egg(); }
      if (e.key && e.key.length === 1) { typed = (typed + e.key.toLowerCase()).slice(-6); if (typed === 'veagle') { typed = ''; egg(); } }
    });
  })();

  return { printClient: printClient, summary: summary, insights: insights, decorate: decorate, toolsHtml: toolsHtml, wireTools: wireTools, inventoryCsv: inventoryCsv, badges: badges, beforeAfterHtml: beforeAfterHtml };
})(V, AI);
