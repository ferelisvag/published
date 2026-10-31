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
  }
  function findFinding(id) { return V.findings.filter(function (f) { return f.id === id; })[0]; }

  function wire() {
    $('#nav').addEventListener('click', function (e) { var b = e.target.closest('button[data-tab]'); if (b) go(b.getAttribute('data-tab')); });
    document.addEventListener('click', function (e) {
      var t;
      if ((t = e.target.closest('[data-tab-go]'))) { go(t.getAttribute('data-tab-go')); return; }
      if ((t = e.target.closest('[data-open]'))) { var id = t.getAttribute('data-open'); UI.state.sev = 'all'; UI.state.q = ''; go('findings'); UI.drawFindings(id); return; }
      if ((t = e.target.closest('[data-copy]'))) { var ok = AI.copyText(t.getAttribute('data-copy')); AI.toast(ok ? 'Command copied. Paste it into PowerShell (as Administrator where noted).' : 'Copy failed. Select the text and press Ctrl+C.'); return; }
      if ((t = e.target.closest('[data-ask]'))) { var f = findFinding(t.getAttribute('data-ask')); AI.setFocus(f ? f.title : ''); var fo = $('#aiFocus'); if (fo && f) { fo.value = 'Please explain finding "' + f.title + '" and how to fix it safely.'; } AI.refresh(); go('ai'); return; }
      if ((t = e.target.closest('#filters button'))) { UI.state.sev = t.getAttribute('data-sev'); $$('#filters button').forEach(function (b) { b.setAttribute('aria-pressed', String(b === t)); }); UI.drawFindings(); return; }
      if ((t = e.target.closest('.finding > .fh'))) { var box = t.parentNode; var open = !box.classList.contains('open'); box.classList.toggle('open', open); t.setAttribute('aria-expanded', String(open)); return; }
    });
    $('#findQ').addEventListener('input', function (e) { UI.state.q = e.target.value; UI.drawFindings(); });
    document.addEventListener('input', function (e) { if (e.target && e.target.id === 'appQ') { UI.setAppQ(e.target.value); UI.drawApps(); } });
    $('#btnPrint').addEventListener('click', function () { window.print(); });
    $('#btnShare').addEventListener('click', function () { SHARE.download(); });
    document.addEventListener('keydown', function (e) {
      if (e.target && /^(input|textarea)$/i.test(e.target.tagName)) return;
      if (e.key === '/') { e.preventDefault(); go('findings'); $('#findQ').focus(); }
    });
    window.addEventListener('hashchange', function () { var h = location.hash.replace('#', ''); if (/^(dashboard|findings|hardware|software|events|compare|ai)$/.test(h)) go(h, true); });
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
    wire(); UI.renderAll(); AI.init(); CMP.init();
    var h = location.hash.replace('#', '');
    if (/^(dashboard|findings|hardware|software|events|compare|ai)$/.test(h)) go(h, true);
    var dm = g(D, 'meta.isAdmin', true) === false; if (dm) { var chip = document.createElement('span'); chip.className = 'chip warn'; chip.textContent = 'not run as admin: partial'; $('.topright').insertBefore(chip, $('#btnPrint')); }
    if (g(D, 'meta.mode', 'full') === 'quick') { var qc = document.createElement('span'); qc.className = 'chip warn'; qc.textContent = 'quick scan'; $('.topright').insertBefore(qc, $('#btnShare')); }
    if (g(D, 'meta.shareSafe', false)) { var sc = document.createElement('span'); sc.className = 'chip'; sc.textContent = 'share-safe copy: personal details removed'; $('.topright').insertBefore(sc, $('#btnShare')); var sb = $('#btnShare'); if (sb) sb.style.display = 'none'; }
    $('#footL').textContent = 'VEAGLE PC Check v' + g(D, 'meta.version', '?') + ' - read-only scan in ' + g(D, 'meta.durationSec', '?') + ' s, nothing was changed on this PC';
    bootIntro(function () { UI.countUp(); });
  }
  init();
})(V, UI, AI);
