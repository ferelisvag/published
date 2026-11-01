/* VEAGLE PC Check - visuals and comfort: timeline, trends, health ring, checklist progress, theme and text size, Windows 11 guide */
var VIZ = (function (V) {
  'use strict';
  var esc = V.esc, arr = V.arr, num = V.num, g = V.g, D = V.D, I = function (en, el) { return V.I(en, el); };

  /* ---------- theme and text size (remembered on this device) ---------- */
  var PK = 'veagle.pccheck.pref';
  var pref = { light: false, big: false };
  try { var sv = JSON.parse(localStorage.getItem(PK) || '{}'); pref.light = !!sv.light; pref.big = !!sv.big; } catch (e) { }
  function applyPrefs() {
    document.body.classList.toggle('light', pref.light); document.body.classList.toggle('big', pref.big);
    var t = document.getElementById('btnTheme'), b = document.getElementById('btnBig');
    if (t) { t.textContent = pref.light ? '☾' : '☀'; t.setAttribute('aria-pressed', String(pref.light)); t.title = I(pref.light ? 'Dark theme' : 'Light theme', pref.light ? 'Σκούρο θέμα' : 'Ανοιχτό θέμα'); }
    if (b) { b.setAttribute('aria-pressed', String(pref.big)); b.title = I(pref.big ? 'Normal text size' : 'Bigger text', pref.big ? 'Κανονικά γράμματα' : 'Μεγαλύτερα γράμματα'); }
  }
  function savePrefs() { try { localStorage.setItem(PK, JSON.stringify(pref)); } catch (e) { } }
  function toggle(which) { pref[which] = !pref[which]; savePrefs(); applyPrefs(); }

  /* ---------- checklist of steps (stored only in this browser, nothing is executed) ---------- */
  var CK = 'veagle.pccheck.chk.' + String(g(D, 'meta.computer', 'pc')) + '.' + String(g(D, 'meta.generated', ''));
  var chk = {};
  try { chk = JSON.parse(localStorage.getItem(CK) || '{}') || {}; } catch (e) { chk = {}; }
  function chkOn(id, i) { return !!chk[id + '|' + i]; }
  function chkSet(id, i, v) { if (v) chk[id + '|' + i] = 1; else delete chk[id + '|' + i]; try { localStorage.setItem(CK, JSON.stringify(chk)); } catch (e) { } }
  function chkStats() {
    var total = 0, done = 0;
    V.findings.forEach(function (f) { if (f.sev === 'info') return; f.steps.forEach(function (s, i) { total++; if (chkOn(f.id, i)) done++; }); });
    return { total: total, done: done };
  }
  function findingDone(f) { return f.steps.length > 0 && f.steps.every(function (s, i) { return chkOn(f.id, i); }); }

  /* ---------- health ring ---------- */
  function ring(score, label, color) {
    var r = 70, c = 2 * Math.PI * r, off = c * (1 - Math.max(0, Math.min(100, score)) / 100);
    return '<svg class="ring" viewBox="0 0 180 180" role="img" aria-label="' + esc(I('Health score ', 'Βαθμός υγείας ') + score + '/100') + '"><circle cx="90" cy="90" r="' + r + '" fill="none" stroke="var(--line)" stroke-width="14"/>' +
      '<circle class="rg" cx="90" cy="90" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="14" stroke-linecap="round" transform="rotate(-90 90 90)" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + c.toFixed(1) + '" data-off="' + off.toFixed(1) + '"/>' +
      '<text x="90" y="92" text-anchor="middle" class="rnum">' + score + '</text><text x="90" y="116" text-anchor="middle" class="rsub" style="font-size:' + (String(label).length > 13 ? 9 : 12) + 'px">' + esc(label) + '</text></svg>';
  }
  function animateRings(root) {
    Array.prototype.forEach.call((root || document).querySelectorAll('circle.rg'), function (c) { requestAnimationFrame(function () { requestAnimationFrame(function () { c.style.strokeDashoffset = c.getAttribute('data-off'); }); }); });
  }

  /* ---------- timeline of events ---------- */
  var LANES = [
    { k: ['crash', 'hang'], en: 'Programs', el: 'Προγράμματα', c: '#ff6b6c' },
    { k: ['unclean', 'bsod'], en: 'Shutdowns, blue screens', el: 'Τερματισμοί, μπλε οθόνες', c: '#ff3b3d' },
    { k: ['disk', 'whea'], en: 'Drive and hardware', el: 'Δίσκος και υλικό', c: '#f5b44a' },
    { k: ['gpu'], en: 'Graphics', el: 'Γραφικά', c: '#c792ff' },
    { k: ['svc', 'ports', 'updfail'], en: 'Services and network', el: 'Υπηρεσίες και δίκτυο', c: '#9ec0ff' },
    { k: ['update', 'install', 'svcinst', 'uninstall'], en: 'Updates and installs', el: 'Ενημερώσεις, εγκαταστάσεις', c: '#5ee7ff', diamond: true },
    { k: ['boot'], en: 'Start-up time', el: 'Χρόνος εκκίνησης', c: '#7ddc9a', bars: true }
  ];
  var KN = { crash: ['crashed', 'κράσαρε'], hang: ['froze', 'πάγωσε'], unclean: ['unexpected shutdown', 'απροσδόκητος τερματισμός'], bsod: ['blue screen', 'μπλε οθόνη'], disk: ['drive error', 'σφάλμα δίσκου'], whea: ['hardware error', 'σφάλμα υλικού'], gpu: ['graphics driver error', 'σφάλμα driver γραφικών'], svc: ['service crashed', 'κράσαρε υπηρεσία'], ports: ['network ports ran out', 'εξαντλήθηκαν θύρες δικτύου'], updfail: ['update failed', 'απέτυχε ενημέρωση'], update: ['Windows update installed', 'εγκαταστάθηκε ενημέρωση Windows'], install: ['program installed', 'εγκαταστάθηκε πρόγραμμα'], svcinst: ['service installed', 'εγκαταστάθηκε υπηρεσία'], uninstall: ['program removed', 'αφαιρέθηκε πρόγραμμα'], boot: ['start-up took', 'εκκίνηση διήρκεσε'] };
  function timelineHtml(compact) {
    var EX = g(D, 'extras.timeline', null);
    var evs = arr(EX).map(function (e) { return { t: new Date(e.t).getTime(), k: e.k, x: e.x }; }).filter(function (e) { return isFinite(e.t) && KN[e.k]; });
    if (!evs.length) return '<div class="sub">' + esc(I('No timeline data in this scan. Run the full scan again.', 'Δεν υπάρχουν δεδομένα χρονολογίου σε αυτή τη σάρωση. Τρέξε ξανά την πλήρη σάρωση.')) + '</div>';
    var end = new Date(g(D, 'meta.generated', Date.now())).getTime(), days = V.days || 30, start = end - days * 86400000;
    var W = 1000, L = compact ? 26 : 215, R = 30, laneH = compact ? 16 : 30, top = 20, H = top + LANES.length * laneH + 22, usable = W - L - R;
    var lanes = compact ? LANES.filter(function (l) { return !l.bars; }) : LANES;
    H = top + lanes.length * laneH + 22;
    function X(t) { return L + Math.max(0, Math.min(1, (t - start) / (end - start))) * usable; }
    var svg = '<svg class="tl" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(I('Timeline of problems and changes in the last ' + days + ' days', 'Χρονολόγιο προβλημάτων και αλλαγών τις τελευταίες 30 ημέρες')) + '">';
    for (var d = 0; d <= days; d += 5) { var x = L + usable * d / days, dt = new Date(start + d * 86400000); svg += '<line x1="' + x + '" y1="' + top + '" x2="' + x + '" y2="' + (H - 18) + '" stroke="var(--line2)"/><text x="' + x + '" y="' + (H - 4) + '" text-anchor="middle" class="tlx">' + dt.getDate() + '/' + (dt.getMonth() + 1) + '</text>'; }
    var n = 0;
    lanes.forEach(function (ln, li) {
      var y = top + li * laneH + laneH / 2;
      svg += '<line x1="' + L + '" y1="' + y + '" x2="' + (W - R) + '" y2="' + y + '" stroke="var(--line2)" stroke-dasharray="2 4"/>';
      if (!compact) svg += '<text x="' + (L - 10) + '" y="' + (y + 4) + '" text-anchor="end" class="tll">' + esc(I(ln.en, ln.el)) + '</text>';
      evs.filter(function (e) { return ln.k.indexOf(e.k) >= 0 && e.t >= start && e.t <= end + 3600000; }).forEach(function (e) {
        var px = X(e.t), tip = new Date(e.t).toLocaleString(V.lang === 'el' ? 'el-GR' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + ' - ' + I(KN[e.k][0], KN[e.k][1]) + (e.k === 'boot' ? ' ' + e.x + ' s' : (e.x ? ': ' + e.x : ''));
        var dly = Math.min(1.4, (n++) * 0.012).toFixed(2);
        if (ln.bars) { var hgt = Math.max(2, Math.min(laneH - 4, parseFloat(e.x) / 100 * (laneH - 4))); svg += '<rect class="tlm" style="animation-delay:' + dly + 's" x="' + (px - 2) + '" y="' + (y + (laneH - 4) / 2 - hgt) + '" width="4" height="' + hgt + '" fill="' + ln.c + '"><title>' + esc(tip) + '</title></rect>'; }
        else if (ln.diamond) svg += '<path class="tlm" style="animation-delay:' + dly + 's" d="M' + px + ' ' + (y - 7) + ' l6 7 l-6 7 l-6 -7z" fill="' + ln.c + '" stroke="var(--bg)" stroke-width="1"><title>' + esc(tip) + '</title></path>';
        else svg += '<circle class="tlm" style="animation-delay:' + dly + 's" cx="' + px + '" cy="' + y + '" r="' + (compact ? 3.2 : 4.6) + '" fill="' + ln.c + '" fill-opacity=".85"><title>' + esc(tip) + '</title></circle>';
      });
    });
    return svg + '</svg>' + (compact ? '' : '<p class="sub" style="margin-top:8px">' + esc(I('Each dot is one event. Hold the mouse over a dot to read it. Look for dots that sit right after a diamond (an update or install): that is often the cause.', 'Κάθε τελεία είναι ένα συμβάν. Κράτα το ποντίκι πάνω σε μια τελεία για να το διαβάσεις. Ψάξε για τελείες ακριβώς μετά από ρόμβο (ενημέρωση ή εγκατάσταση): συχνά είναι η αιτία.')) + '</p>');
  }

  /* ---------- trends across scans ---------- */
  var TM = [
    { k: 'freeC', en: 'Free space on C:', el: 'Ελεύθερος χώρος στο C:', better: 'up', unit: ' GB', dec: 0 },
    { k: 'bootS', en: 'Start-up time', el: 'Χρόνος εκκίνησης', better: 'down', unit: ' s', dec: 0 },
    { k: 'sysErr', en: 'System errors (30 days)', el: 'Σφάλματα συστήματος (30 ημέρες)', better: 'down', unit: '', dec: 0 },
    { k: 'crashes', en: 'Program crashes (30 days)', el: 'Κρασαρίσματα προγραμμάτων (30 ημέρες)', better: 'down', unit: '', dec: 0 },
    { k: 'patchDays', en: 'Days since last Windows update', el: 'Ημέρες από την τελευταία ενημέρωση', better: 'down', unit: '', dec: 0 },
    { k: 'startup', en: 'Programs that start with Windows', el: 'Προγράμματα που ξεκινούν με τα Windows', better: 'down', unit: '', dec: 0 },
    { k: 'reliability', en: 'Windows reliability score', el: 'Βαθμός αξιοπιστίας Windows', better: 'up', unit: '/10', dec: 1 }
  ];
  function trendHtml() {
    var tr = arr(V.RAW && V.RAW.trend).filter(function (x) { return x && x.t; });
    if (tr.length < 2) return '<div class="sub">' + esc(I('Run the check again in a few weeks and your progress will be drawn here, one chart per measure.', 'Τρέξε ξανά τον έλεγχο σε μερικές εβδομάδες και η πρόοδός σου θα σχεδιαστεί εδώ, ένα γράφημα ανά μέτρηση.')) + '</div>';
    var cards = TM.map(function (m) {
      var pts = tr.map(function (x) { return x[m.k]; }).filter(function (v) { return v != null && isFinite(v); });
      if (pts.length < 2) return '';
      var w = 220, h = 56, mn = Math.min.apply(null, pts), mx = Math.max.apply(null, pts), sp = (mx - mn) || 1;
      var xy = pts.map(function (v, i) { return [6 + i * (w - 12) / (pts.length - 1), h - 8 - (v - mn) / sp * (h - 18)]; });
      var first = pts[0], last = pts[pts.length - 1], d = last - first, good = d === 0 ? null : (m.better === 'up' ? d > 0 : d < 0);
      var col = good === null ? '#a1a1aa' : (good ? '#7ddc9a' : '#ff6b6c');
      var line = xy.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
      var area = line + ' L' + xy[xy.length - 1][0].toFixed(1) + ' ' + (h - 4) + ' L' + xy[0][0].toFixed(1) + ' ' + (h - 4) + ' Z';
      var fmt = function (v) { return V.fmtNum(v, m.dec) + m.unit; };
      return '<div class="trend"><div class="tn">' + esc(I(m.en, m.el)) + '</div><svg viewBox="0 0 ' + w + ' ' + h + '" width="100%" role="img" aria-label="' + esc(I(m.en, m.el)) + '"><path d="' + area + '" fill="' + col + '" fill-opacity=".14"/><path class="tlp" d="' + line + '" fill="none" stroke="' + col + '" stroke-width="2" pathLength="1"/>' +
        xy.map(function (p, i) { return '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + (i === xy.length - 1 ? 3.6 : 2) + '" fill="' + col + '"/>'; }).join('') + '</svg>' +
        '<div class="tv"><b style="color:' + col + '">' + esc(fmt(last)) + '</b> <span class="sub">' + esc(I('was', 'ήταν')) + ' ' + esc(fmt(first)) + ' ' + (d === 0 ? '' : (d > 0 ? '&uarr;' : '&darr;')) + '</span></div></div>';
    }).join('');
    return cards ? '<div class="trends">' + cards + '</div><p class="sub" style="margin-top:8px">' + esc(I('Each chart shows your last scans, oldest on the left. Green means better, red means worse.', 'Κάθε γράφημα δείχνει τις τελευταίες σαρώσεις, η παλαιότερη αριστερά. Πράσινο σημαίνει καλύτερο, κόκκινο χειρότερο.')) + '</p>' : '';
  }

  /* ---------- Windows 11 upgrade guide ---------- */
  function win11Html() {
    var R = V.readiness; if (!R || !R.rows.length) return '';
    if (R.alreadyWin11) return '<p>' + esc(I('This PC already runs Windows 11. Nothing to do here.', 'Αυτός ο υπολογιστής τρέχει ήδη Windows 11. Δεν χρειάζεται τίποτα εδώ.')) + '</p>';
    var G = {
      '64-bit system': [I('This PC has 32-bit Windows. Windows 11 needs 64-bit. A clean install of 64-bit Windows is needed, which erases everything: ask a technician.', 'Αυτός ο υπολογιστής έχει 32-bit Windows. Τα Windows 11 θέλουν 64-bit. Χρειάζεται καθαρή εγκατάσταση 64-bit Windows, που σβήνει τα πάντα: ρώτα έναν τεχνικό.')],
      'Supported processor': [I('The processor is too old or could not be checked. Settings cannot fix this. Download Microsoft\'s "PC Health Check" app to confirm. If it says no, the choices are: keep using Windows 10 carefully (see below) or move to a newer PC.', 'Ο επεξεργαστής είναι πολύ παλιός ή δεν μπόρεσε να ελεγχθεί. Οι ρυθμίσεις δεν το διορθώνουν. Κατέβασε την εφαρμογή «PC Health Check» της Microsoft για επιβεβαίωση. Αν πει όχι, οι επιλογές είναι: να συνεχίσεις με Windows 10 προσεκτικά (δες παρακάτω) ή να πάρεις νεότερο υπολογιστή.')],
      'At least 4 GB of memory': [I('Add memory (RAM). A repair shop can do it in 10 minutes. Aim for 8 GB or more.', 'Πρόσθεσε μνήμη (RAM). Ένα συνεργείο το κάνει σε 10 λεπτά. Στόχος 8 GB ή περισσότερα.')],
      'At least 64 GB of storage': [I('The system drive is too small. Replace it with a bigger SSD (a technician can copy Windows over without losing anything).', 'Ο δίσκος συστήματος είναι πολύ μικρός. Αντικατέστησέ τον με μεγαλύτερο SSD (ένας τεχνικός μπορεί να αντιγράψει τα Windows χωρίς απώλειες).')],
      'UEFI firmware (not legacy BIOS)': [I('The PC starts in the old "legacy" mode. Windows has a tool (mbr2gpt) that converts the drive without erasing files, and then the BIOS must be switched to UEFI. It is delicate: back up first or ask a technician.', 'Ο υπολογιστής ξεκινά στην παλιά λειτουργία «legacy». Τα Windows έχουν εργαλείο (mbr2gpt) που μετατρέπει τον δίσκο χωρίς να σβήσει αρχεία, και μετά το BIOS πρέπει να αλλάξει σε UEFI. Είναι λεπτό: κάνε πρώτα αντίγραφο ασφαλείας ή ρώτα τεχνικό.')],
      'Secure Boot': [I('Turn Secure Boot on in the BIOS. Restart and keep pressing Del or F2 (the key is shown for a second when the PC starts). Look in the Boot or Security menu, set "Secure Boot" to Enabled, then press F10 to Save and Exit.', 'Άνοιξε το Secure Boot στο BIOS. Κάνε επανεκκίνηση και πάτα συνέχεια Del ή F2 (το πλήκτρο φαίνεται για λίγο στην εκκίνηση). Ψάξε στο μενού Boot ή Security, βάλε το «Secure Boot» σε Enabled και πάτα F10 για Αποθήκευση και Έξοδο.')],
      'TPM 2.0': [I('Turn the TPM on in the BIOS. Intel calls it "PTT", AMD calls it "fTPM". Restart, press Del or F2, look in the Security or Advanced menu, switch it to Enabled, then F10 to Save and Exit. If the PC has an old TPM 1.2, it cannot upgrade.', 'Άνοιξε το TPM στο BIOS. Η Intel το λέει «PTT», η AMD «fTPM». Κάνε επανεκκίνηση, πάτα Del ή F2, ψάξε στο μενού Security ή Advanced, βάλε το σε Enabled και μετά F10 για Αποθήκευση και Έξοδο. Αν ο υπολογιστής έχει παλιό TPM 1.2, δεν μπορεί να αναβαθμιστεί.')]
    };
    var bad = R.rows.filter(function (r) { return r.status === 'fail' || r.status === 'warn' || r.status === 'unknown'; });
    var h = '<p><b>' + esc(R.verdict) + '</b></p>';
    if (!bad.length) h += '<ol class="steps3"><li>' + esc(I('Back up your important files first.', 'Κάνε πρώτα αντίγραφο ασφαλείας των σημαντικών αρχείων.')) + '</li><li>' + esc(I('Open Settings, Windows Update. If you see "Upgrade to Windows 11", click "Download and install". It takes 30 to 60 minutes and the PC restarts several times.', 'Άνοιξε Ρυθμίσεις, Windows Update. Αν δεις «Αναβάθμιση στα Windows 11», πάτα «Λήψη και εγκατάσταση». Παίρνει 30 έως 60 λεπτά και ο υπολογιστής επανεκκινείται αρκετές φορές.')) + '</li><li>' + esc(I('If the offer does not appear yet, wait: Microsoft shows it to every PC in turns.', 'Αν η προσφορά δεν εμφανίζεται ακόμα, περίμενε: η Microsoft τη δείχνει σε κάθε υπολογιστή με τη σειρά.')) + '</li></ol>';
    else h += '<ol class="steps3">' + bad.map(function (r) { var t = (G[r.label] || [r.detail])[0]; return '<li><b>' + esc(r.label) + ':</b> ' + esc(t) + '</li>'; }).join('') + '</ol>';
    h += '<p class="sub" style="margin-top:12px">' + esc(I('Is it worth it? Regular security updates for Windows 10 ended in October 2025. Microsoft has offered paid "Extended Security Updates" for a limited time; check Settings, Windows Update for what is available to you now. Until you decide: keep the browser and antivirus updated and avoid risky downloads.', 'Αξίζει; Οι τακτικές ενημερώσεις ασφαλείας των Windows 10 έληξαν τον Οκτώβριο του 2025. Η Microsoft έχει προσφέρει επί πληρωμή «Extended Security Updates» για περιορισμένο διάστημα· δες στις Ρυθμίσεις, Windows Update τι ισχύει για σένα τώρα. Μέχρι να αποφασίσεις: κράτα ενημερωμένους τον browser και το antivirus και απόφυγε επικίνδυνες λήψεις.')) + '</p>';
    return h;
  }

  return { applyPrefs: applyPrefs, toggle: toggle, chkOn: chkOn, chkSet: chkSet, chkStats: chkStats, findingDone: findingDone, ring: ring, animateRings: animateRings, timelineHtml: timelineHtml, trendHtml: trendHtml, win11Html: win11Html };
})(V);

/* ---------- what the user has done or accepted changes the score (an estimate until the next scan) ---------- */
(function (V) {
  'use strict';
  var AK = 'veagle.pccheck.acc.' + String((V.D && V.D.meta && V.D.meta.computer) || 'pc'), acc = {};
  try { acc = JSON.parse(localStorage.getItem(AK) || '{}') || {}; } catch (e) { acc = {}; }
  V.isAccepted = function (id) { return !!acc[id]; };
  V.setAccepted = function (id, on) { if (on) acc[id] = 1; else delete acc[id]; try { localStorage.setItem(AK, JSON.stringify(acc)); } catch (e) { } V.userAdjust(); };
  V.isResolved = function (f) { return !!(f && (acc[f.id] || VIZ.findingDone(f))); };
  V.active = function () { return V.findings.filter(function (f) { return !V.isResolved(f); }); };
  V.openList = function () { return V.active().filter(function (f) { return f.sev !== 'info'; }); };
  V.userAdjust = function () {
    V.scoreRaw = V.scoreOf(V.findings);
    V.countsRaw = { high: 0, medium: 0, low: 0, info: 0 }; V.findings.forEach(function (x) { V.countsRaw[x.sev]++; });
    var act = V.active();
    V.score = V.scoreOf(act);
    V.counts = { high: 0, medium: 0, low: 0, info: 0 }; act.forEach(function (x) { V.counts[x.sev]++; });
    V.resolvedCount = V.findings.length - act.length;
  };
  V.userAdjust();
})(V);
