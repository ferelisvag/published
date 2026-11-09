/* VEAGLE PC Check 1.3.0 - menu on the left (icon rail, plus a list of areas next to the findings), with a switch back to the old menu on top */
var SIDE = (function (V, UI) {
  'use strict';
  var $ = V.$, $$ = V.$$, esc = V.esc;
  function I(en, el) { return V.I(en, el); }
  var KEY = 'veagle.pccheck.nav';
  var ICON = {
    summary: '<path d="M3 11l9-7 9 7v9H3z"/>',
    dashboard: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
    findings: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>',
    insights: '<circle cx="12" cy="11" r="6"/><path d="M9 20h6"/>',
    inventory: '<rect x="3" y="4" width="18" height="12"/><path d="M8 20h8M12 16v4"/>',
    hardware: '<rect x="6" y="6" width="12" height="12"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
    software: '<path d="M4 4h16v16H4z"/><path d="M8 9l3 3-3 3M13 15h4"/>',
    events: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    compare: '<path d="M8 3v18M16 3v18M3 8h5M16 16h5"/>',
    tools: '<path d="M14 6a4 4 0 105 5l-9 9-3-3 9-9z"/>',
    ai: '<path d="M4 5h16v11H9l-5 4z"/>'
  };
  var pref = 'side', printing = false, ready = false;
  try { var sv = localStorage.getItem(KEY); if (sv === 'top' || sv === 'side') pref = sv; } catch (e) { }
  var mq = window.matchMedia ? window.matchMedia('(max-width: 900px)') : null;

  function effective() { return (printing || pref === 'top' || (mq && mq.matches)) ? 'top' : 'side'; }
  function curTab() { var b = $('#nav button[aria-selected="true"]'); return b ? b.getAttribute('data-tab') : 'summary'; }

  function decorateButtons() {
    $$('#nav button[data-tab]').forEach(function (b) {
      if (b.querySelector('.ni')) return;
      var k = b.getAttribute('data-tab'), svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'ni'); svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true'); svg.innerHTML = ICON[k] || '';
      b.insertBefore(svg, b.firstChild);
      var t = null; for (var i = 0; i < b.childNodes.length; i++) { if (b.childNodes[i].nodeType === 3 && b.childNodes[i].nodeValue.trim()) { t = b.childNodes[i]; break; } }
      if (t) { var sp = document.createElement('span'); sp.className = 'rl'; b.insertBefore(sp, t); sp.appendChild(t); }
    });
  }

  function ctx() {
    var el = $('#ctxPanel'); if (!el) return;
    var on = effective() === 'side' && curTab() === 'findings';
    document.body.classList.toggle('ctx-on', on);
    if (!on) return;
    var areas = (V.score && V.score.areas) || [], AN = (typeof VIZ2 !== 'undefined' && VIZ2.areaName) ? VIZ2.areaName : function (a) { return a; };
    var cur = (UI.state && UI.state.area) || '';
    var h = '<h2>' + esc(I('Findings', 'Ευρήματα')) + '</h2><small>' + esc(I('Groups by area', 'Ομάδες ανά περιοχή')) + '</small>';
    h += '<button type="button" class="area' + (!cur ? ' on' : '') + '" data-ctx-area=""><i class="dot" style="background:#9ca3af"></i>' + esc(I('All areas', 'Όλες οι περιοχές')) + '<span class="c">' + V.findings.length + '</span></button>';
    areas.forEach(function (a) {
      var n = V.findings.filter(function (f) { return f.area === a.name; }).length, w = (typeof VIZ2 !== 'undefined' && VIZ2.worst) ? VIZ2.worst(a.name) : { col: '#9ca3af' };
      h += '<button type="button" class="area' + (cur === a.name ? ' on' : '') + '" data-ctx-area="' + esc(a.name) + '"><i class="dot" style="background:' + w.col + '"></i>' + esc(AN(a.name)) + '<span class="c">' + n + '</span></button>';
    });
    el.innerHTML = h;
  }

  function apply() {
    var mode = effective(), body = document.body;
    body.classList.toggle('nav-side', mode === 'side');
    var tr = $('.topright'), st = $('#sideTop'), inn = $('.topbar .in');
    if (tr && st && inn) { if (mode === 'side') { if (tr.parentNode !== st) st.appendChild(tr); } else if (tr.parentNode !== inn) inn.appendChild(tr); }
    var bn = $('#btnNav');
    if (bn) { bn.setAttribute('aria-pressed', String(pref === 'side')); bn.title = I('Menu: on the left or on top', 'Μενού: αριστερά ή πάνω'); bn.style.display = (mq && mq.matches) ? 'none' : ''; }
    ctx();
  }

  function init() {
    if (ready) { apply(); return; }
    ready = true;
    decorateButtons();
    var bn = $('#btnNav');
    if (bn) bn.addEventListener('click', function () { pref = pref === 'side' ? 'top' : 'side'; try { localStorage.setItem(KEY, pref); } catch (e) { } apply(); });
    document.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('[data-ctx-area]'); if (!t) return;
      UI.state.area = t.getAttribute('data-ctx-area') || ''; UI.state.sev = 'all'; UI.state.q = '';
      var fq = $('#findQ'); if (fq) fq.value = '';
      if (typeof VIZ2 !== 'undefined') VIZ2.render();
      UI.drawFindings(); ctx();
    });
    if (mq && mq.addEventListener) mq.addEventListener('change', apply);
    window.addEventListener('beforeprint', function () { printing = true; apply(); });
    window.addEventListener('afterprint', function () { printing = false; apply(); });
    apply();
  }
  return { init: init, sync: function () { if (ready) apply(); }, mode: effective };
})(V, UI);
