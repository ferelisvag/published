/* VEAGLE PC Check - main: boot intro, tabs, events */
(function (V, UI, AI) {
  'use strict';
  var $ = V.$, $$ = V.$$, g = V.g, D = V.D;

  function reduceMotion() { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }

  /* ---------- tabs ---------- */
  function go(tab, silent) {
    $$('#nav button').forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute('data-tab') === tab ? 'true' : 'false'); });
    $$('.tabpane').forEach(function (p) { p.classList.toggle('on', p.id === 'tab-' + tab); });
    if (!silent) { try { history.replaceState(null, '', '#' + tab); } catch (e) { } window.scrollTo(0, 0); }
    if (typeof SIDE !== 'undefined') SIDE.sync();
  }
  function refreshScore() {
    var open = $$('#findList .finding.open').map(function (x) { return x.getAttribute('data-id'); }), y = window.scrollY;
    V.userAdjust(); UI.renderAll();
    open.forEach(function (id) { var el = $('.finding[data-id="' + id + '"]'); if (el) { el.classList.add('open'); var h = el.querySelector('.fh'); if (h) h.setAttribute('aria-expanded', 'true'); } });
    window.scrollTo(0, y);
  }
  function findFinding(id) { return V.findings.filter(function (f) { return f.id === id; })[0]; }

  function wire() {
    $('#nav').addEventListener('click', function (e) { var b = e.target.closest('button[data-tab]'); if (b) go(b.getAttribute('data-tab')); });
    document.addEventListener('click', function (e) {
      var t;
      if ((t = e.target.closest('[data-tab-go]'))) { go(t.getAttribute('data-tab-go')); return; }
      if ((t = e.target.closest('[data-open]'))) { var id = t.getAttribute('data-open'); UI.state.sev = 'all'; UI.state.q = ''; UI.state.area = ''; go('findings'); UI.drawFindings(id); return; }
      if ((t = e.target.closest('[data-copy]'))) { var ok = AI.copyText(t.getAttribute('data-copy')); AI.toast(ok ? 'Command copied. Paste it into PowerShell (as Administrator where noted).' : 'Copy failed. Select the text and press Ctrl+C.'); return; }
      var vb = e.target.closest('[data-view]'); if (vb) { UI.setView(vb.getAttribute('data-view')); return; }
      if (e.target.closest('[data-clear-acc]')) { V.clearAccepted(); refreshScore(); AI.toast(V.I('Cleared. All findings count again.', 'Καθαρίστηκαν. Όλα τα ευρήματα μετράνε ξανά.')); return; }
      if ((t = e.target.closest('[data-accept]'))) { var aid = t.getAttribute('data-accept'); V.setAccepted(aid, !V.isAccepted(aid)); refreshScore(); AI.toast(V.isAccepted(aid) ? V.I('Accepted. It no longer counts against your score. You can undo it any time.', 'Αποδεκτό. Δεν μετράει πια στον βαθμό σου. Μπορείς να το αναιρέσεις οποτεδήποτε.') : V.I('It counts again.', 'Μετράει ξανά.')); return; }
      if ((t = e.target.closest('[data-ask]'))) { var f = findFinding(t.getAttribute('data-ask')); AI.setFocus(f ? f.title : ''); var fo = $('#aiFocus'); if (fo && f) { fo.value = 'Please explain finding "' + f.title + '" and how to fix it safely.'; } AI.refresh(); go('ai'); return; }
      if ((t = e.target.closest('#filters button'))) { UI.state.sev = t.getAttribute('data-sev'); $$('#filters button').forEach(function (b) { b.setAttribute('aria-pressed', String(b === t)); }); UI.drawFindings(); return; }
      if ((t = e.target.closest('.finding > .fh'))) { var box = t.parentNode; var open = !box.classList.contains('open'); box.classList.toggle('open', open); t.setAttribute('aria-expanded', String(open)); return; }
    });
    $('#findQ').addEventListener('input', function (e) { UI.state.q = e.target.value; UI.drawFindings(); });
    document.addEventListener('input', function (e) { if (e.target && e.target.id === 'appQ') { UI.setAppQ(e.target.value); UI.drawApps(); } });
    $('#btnPrint').addEventListener('click', function () { AI.toast(V.I('In the print window choose "Save as PDF" as the printer.', 'Στο παράθυρο εκτύπωσης διάλεξε «Αποθήκευση ως PDF» ως εκτυπωτή.')); PRO.printClient(); });
    $('#btnTheme').addEventListener('click', function () { VIZ.toggle('light'); });
    $('#btnBig').addEventListener('click', function () { VIZ.toggle('big'); });
    document.addEventListener('change', function (e) { var c = e.target && e.target.getAttribute && e.target.getAttribute('data-chk'); if (!c) return; var p = c.split('|'); var f0 = findFinding(p[0]), was = f0 && VIZ.findingDone(f0); VIZ.chkSet(p[0], +p[1], e.target.checked); var li = e.target.closest('li'); if (li) li.classList.toggle('done', e.target.checked); var fi = e.target.closest('.finding'); var f = findFinding(p[0]); if (fi && f) fi.classList.toggle('fdone', VIZ.findingDone(f)); var st = VIZ.chkStats(), tx = $('#progTxt'); if (tx) tx.textContent = V.I('You have done ' + st.done + ' of ' + st.total + ' steps', 'Έχεις κάνει ' + st.done + ' από ' + st.total + ' βήματα'); var pb = $('.pbar i'); if (pb) pb.style.width = Math.round(st.done / Math.max(1, st.total) * 100) + '%'; if (f0 && was !== VIZ.findingDone(f0)) refreshScore(); });
    $('#btnLang').addEventListener('click', function () { I18N.set(V.lang === 'el' ? 'en' : 'el'); UI.renderAll(); CMP.init(); TOOLS.init(); THEMES.relabel(); VIZ.applyPrefs(); I18N.apply(); });
    $('#btnShare').addEventListener('click', function () { SHARE.download(); });
    document.addEventListener('keydown', function (e) {
      if (e.target && /^(input|textarea)$/i.test(e.target.tagName)) return;
      if (e.key === '/') { e.preventDefault(); go('findings'); $('#findQ').focus(); }
    });
    window.addEventListener('hashchange', function () { var h = location.hash.replace('#', ''); if (/^(summary|dashboard|findings|insights|inventory|hardware|software|events|compare|tools|ai)$/.test(h)) go(h, true); });
  }

  /* ---------- boot intro ---------- */
  function bootIntro(done) {
    var el = $('#boot');
    if (!el || reduceMotion()) { if (el) el.classList.add('hide'); return done(); }
    var c = g(D, 'system.cpu.name', 'cpu'), r = g(D, 'system.ram.totalGB', '?'), gp = g(D, 'gpus.0.name', 'gpu');
    var lines = [
      'VEAGLE OS // PC CHECK v' + g(D, 'meta.version', '0.1') + '  -  ferelis.gr',
      '> loading scan data ............ OK',
      '> cpu    ' + String(c).replace(/\(R\)|\(TM\)/g, '').slice(0, 46),
      '> memory ' + r + ' GB',
      '> gpu    ' + String(gp).slice(0, 46),
      '> drives ' + V.arr(D.disks).filter(function (d) { return V.num(d.sizeGB) > 0; }).length + ' physical',
      '> events ' + V.fmtNum(V.num(g(D, 'events.system.total', 0)) + V.num(g(D, 'events.application.total', 0))) + ' in the last ' + g(D, 'events.days', 30) + ' days',
      '> running ' + (V.findings.length + V.good.length) + ' checks ......... OK',
      '> building report'
    ];
    var pre = $('#bootlog'), i = 0, finished = false;
    function end() { if (finished) return; finished = true; el.classList.add('hide'); done(); }
    function next() { if (finished) return; if (i >= lines.length) { setTimeout(end, 350); return; } pre.textContent += (i ? '\n' : '') + lines[i++]; setTimeout(next, 170); }
    el.addEventListener('click', end); document.addEventListener('keydown', end, { once: true });
    next();
  }

  function init() {
    if (!V.RAW) {
      $('#boot').classList.add('hide');
      $('#demo').innerHTML = '<div class="demo"><b>No scan data in this file.</b> Open the report that <span class="mono">VEAGLE-PC-Check.bat</span> creates inside the <span class="mono">Reports</span> folder. This is only the empty template.</div>';
      return;
    }
    (function () {
      var chip = $('#periodChip'), sel = $('#periodSel'); if (!chip || !sel) return;
      if (!V.periodChoice) return;
      chip.hidden = false;
      sel.innerHTML = [1, 7, 30, 60].map(function (n) { return '<option value="' + n + '">' + (n === 1 ? V.I('1 day (24 hours)', '1 ημέρα (24 ώρες)') : V.I(n + ' days', n + ' ημέρες')) + '</option>'; }).join('');
      sel.value = String(V.days);
      sel.addEventListener('change', function () { try { localStorage.setItem('veagle.pccheck.period', sel.value); } catch (e) { } try { if (typeof THEMES !== 'undefined') THEMES.keepOnce(); } catch (e) { } location.reload(); });
      chip.firstChild.nodeValue = V.I('Period ', 'Περίοδος ');
    })();
    wire(); UI.renderAll(); AI.init(); CMP.init(); TOOLS.init(); THEMES.init(); SIDE.init(); HELP.init();
    var h = location.hash.replace('#', '');
    if (/^(summary|dashboard|findings|insights|inventory|hardware|software|events|compare|tools|ai)$/.test(h)) go(h, true);
    var dm = g(D, 'meta.isAdmin', true) === false; if (dm) { var chip = document.createElement('span'); chip.className = 'chip warn'; chip.textContent = 'not run as admin: partial'; $('.topright').insertBefore(chip, $('#btnPrint')); }
    if (g(D, 'meta.mode', 'full') === 'quick') { var qc = document.createElement('span'); qc.className = 'chip warn'; qc.textContent = 'quick scan'; $('.topright').insertBefore(qc, $('#btnShare')); }
    if (g(D, 'meta.shareSafe', false)) { var sc = document.createElement('span'); sc.className = 'chip'; sc.textContent = 'share-safe copy: personal details removed'; $('.topright').insertBefore(sc, $('#btnShare')); var sb = $('#btnShare'); if (sb) sb.style.display = 'none'; }
    var bv = $('#brandVer'); if (bv) bv.textContent = 'v' + g(D, 'meta.version', '?');
    $('#footL').textContent = 'VEAGLE PC Check v' + g(D, 'meta.version', '?') + ' - read-only scan in ' + g(D, 'meta.durationSec', '?') + ' s, nothing was changed on this PC';
    VIZ.applyPrefs(); I18N.apply();
    if (window.MutationObserver) { var pend = false; new MutationObserver(function () { if (pend || V.lang !== 'el') return; pend = true; requestAnimationFrame(function () { pend = false; I18N.apply(); }); }).observe(document.body, { childList: true, subtree: true }); }
    bootIntro(function () { UI.countUp(); });
  }
  init();
})(V, UI, AI);
