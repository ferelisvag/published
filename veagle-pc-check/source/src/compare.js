/* VEAGLE PC Check - compare two scans (before / after) */
var CMP = (function (V) {
  'use strict';
  var $ = V.$, esc = V.esc, arr = V.arr, num = V.num;

  function parse(text) {
    var t = String(text).replace(/^\uFEFF/, '').trim();
    if (t.charAt(0) === '<') {
      var key = 'window.__PCDATA__ = ';
      var i = t.indexOf(key);
      if (i < 0) throw new Error('This HTML file has no scan data inside. Use a report.html that VEAGLE PC Check created.');
      var j = t.indexOf(';<' + '/script>', i);
      if (j < 0) throw new Error('Could not read the scan data from this HTML file.');
      t = t.slice(i + key.length, j);
    }
    var d = JSON.parse(t);
    if (!d || !d.system || !d.meta) throw new Error('This does not look like a VEAGLE PC Check scan.');
    return d;
  }

  function avgBoot(E) { var h = arr(E.g(E.D, 'boot.history', [])).slice(0, 5); return h.length ? E.sum(h, function (x) { return x.seconds; }) / h.length : null; }
  function cFree(E) { var v = arr(E.D.volumes).filter(function (x) { return /^C:/i.test(x.letter); })[0]; return v ? num(v.freeGB) : null; }
  function has(E, path) { return E.g(E.D, path, null) != null; }

  var METRICS = [
    { k: 'Health score', better: 'up', f: function (E) { return E.score.score; }, fmt: function (v) { return String(v); } },
    { k: 'High findings', better: 'down', f: function (E) { return E.counts.high; } },
    { k: 'Medium findings', better: 'down', f: function (E) { return E.counts.medium; } },
    { k: 'Low findings', better: 'down', f: function (E) { return E.counts.low; } },
    { k: 'Free space on C:', better: 'up', f: cFree, fmt: function (v) { return V.fmtGB(v); }, dec: 0 },
    { k: 'Apps with updates', better: 'down', f: function (E) { return has(E, 'apps.outdated') && !E.g(E.D, 'apps.wingetSkipped', false) ? arr(E.D.apps.outdated).length : null; } },
    { k: 'Programs starting with Windows', better: 'down', f: function (E) { return has(E, 'startup.items') ? E.uniq(arr(E.D.startup.items).map(function (s) { return s.name; })).length : null; } },
    { k: 'Average boot time (s)', better: 'down', f: avgBoot, fmt: function (v) { return V.fmtNum(v, 0) + ' s'; } },
    { k: 'Errors in the event log', better: 'down', f: function (E) { return has(E, 'events.system.errors') ? num(E.D.events.system.errors) + num(E.g(E.D, 'events.application.errors', 0)) : null; }, fmt: function (v) { return V.fmtNum(v); } },
    { k: 'Program crashes', better: 'down', f: function (E) { return has(E, 'events.appCrashes') ? E.sum(arr(E.D.events.appCrashes), function (c) { return c.count; }) : null; } },
    { k: 'Days since last Windows update', better: 'down', f: function (E) { return E.g(E.D, 'updates.lastPatchDaysAgo', null); } },
    { k: 'Installed programs', better: 'none', f: function (E) { return has(E, 'apps.count') ? num(E.D.apps.count) : null; } }
  ];

  function fmtVal(m, v) { if (v == null) return '-'; return m.fmt ? m.fmt(v) : V.fmtNum(v, 0); }
  function delta(m, a, b) {
    if (a == null || b == null) return '<span class="delta same">-</span>';
    var d = b - a;
    if (Math.abs(d) < 0.05) return '<span class="delta same">no change</span>';
    var good = m.better === 'none' ? null : (m.better === 'up' ? d > 0 : d < 0);
    var arrow = d > 0 ? '&uarr; ' : '&darr; ';
    var txt = (d > 0 ? '+' : '') + V.fmtNum(d, Math.abs(d) < 10 && d % 1 !== 0 ? 1 : 0);
    return '<span class="delta ' + (good === null ? 'same' : (good ? 'down' : 'up')) + '">' + arrow + txt + (good === null ? '' : (good ? ' better' : ' worse')) + '</span>';
  }
  function tag(sev) { return '<span class="tag ' + sev + '">' + sev.toUpperCase() + '</span>'; }

  function show(oldData, fileName) {
    var out = $('#cmpResult');
    var O = V.Engine(oldData), N = V;
    var oi = {}, ni = {};
    O.findings.forEach(function (f) { oi[f.id] = f; });
    N.findings.forEach(function (f) { ni[f.id] = f; });
    var fixed = O.findings.filter(function (f) { return !ni[f.id] && f.sev !== 'info'; });
    var fresh = N.findings.filter(function (f) { return !oi[f.id] && f.sev !== 'info'; });
    var still = N.findings.filter(function (f) { return oi[f.id] && f.sev !== 'info'; });
    var ds = N.score.score - O.score.score;
    var h = '<div class="grid" style="margin:18px 0">';
    h += '<div class="win s4"><header><span>before</span><span class="st">' + esc(V.fmtDT(oldData.meta.generated)) + '</span></header><div class="body"><span class="huge">' + O.score.score + '</span><span class="sub">' + esc(O.score.label) + ' &middot; ' + esc(fileName || '') + '</span></div></div>';
    h += '<div class="win s4"><header><span>now</span><span class="st">' + esc(V.fmtDT(V.D.meta.generated)) + '</span></header><div class="body"><span class="huge">' + N.score.score + '</span><span class="sub">' + esc(N.score.label) + '</span></div></div>';
    h += '<div class="win s4 ' + (ds < 0 ? 'alert' : '') + '"><header><span>change</span></header><div class="body"><span class="huge">' + (ds > 0 ? '+' : '') + ds + '</span><span class="sub">' + fixed.length + ' fixed, ' + fresh.length + ' new, ' + still.length + ' still open</span></div></div>';
    h += '</div>';
    h += '<div class="tablewrap"><table><thead><tr><th>Measure</th><th class="num">Before</th><th class="num">Now</th><th>Change</th></tr></thead><tbody>';
    METRICS.forEach(function (m) {
      var a = m.f(O), b = m.f(N);
      h += '<tr><td>' + esc(m.k) + '</td><td class="num">' + esc(fmtVal(m, a)) + '</td><td class="num">' + esc(fmtVal(m, b)) + '</td><td>' + delta(m, a, b) + '</td></tr>';
    });
    h += '</tbody></table></div>';
    function list(title, a, note) {
      var body = a.length ? '<div class="list">' + a.map(function (f) { return '<div style="display:block"><div class="row">' + tag(f.sev) + '<span class="area">' + esc(f.area) + '</span></div><div style="font-family:var(--head);font-weight:700;margin-top:4px">' + esc(f.title) + '</div></div>'; }).join('') + '</div>' : '<div class="sub">' + esc(note) + '</div>';
      return '<div class="win s4"><header><span>' + esc(title) + '</span><span class="st">' + a.length + '</span></header><div class="body">' + body + '</div></div>';
    }
    h += '<div class="grid" style="margin-top:18px">' + list('fixed since then', fixed, 'Nothing was resolved between the two scans.') + list('new since then', fresh, 'No new findings.') + list('still open', still, 'Nothing is open any more.') + '</div>';
    if (oldData.meta.mode === 'quick' || V.D.meta.mode === 'quick') h += '<p class="sub" style="margin-top:14px">One of the scans was a quick scan, so some measures are missing and shown as "-".</p>';
    out.innerHTML = h;
  }

  function handle(file) {
    var out = $('#cmpResult');
    if (!file) return;
    var r = new FileReader();
    r.onload = function () {
      try { show(parse(r.result), file.name); }
      catch (e) { out.innerHTML = '<div class="demo">' + esc(e.message || String(e)) + '</div>'; }
    };
    r.onerror = function () { out.innerHTML = '<div class="demo">The file could not be read.</div>'; };
    r.readAsText(file);
  }

  function init() {
    var root = $('#tab-compare'); if (!root) return;
    root.innerHTML = '<div class="sect"><h2>Compare with an earlier scan</h2><span>see what got better or worse after your fixes</span></div>' +
      '<label class="drop" id="cmpDrop" for="cmpFile"><b>Drop an earlier scan here, or click to choose</b><span class="sub">Use the <span class="mono">data.json</span> or <span class="mono">report.html</span> from an older folder inside <span class="mono">Reports</span>. The file is read in your browser only.</span></label>' +
      '<input class="sr" type="file" id="cmpFile" accept=".json,.html,application/json,text/html">' +
      '<div id="cmpResult"></div>';
    var drop = $('#cmpDrop');
    $('#cmpFile').addEventListener('change', function (e) { handle(e.target.files && e.target.files[0]); });
    ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
    drop.addEventListener('drop', function (e) { handle(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]); });
  }
  return { init: init, parse: parse, show: show };
})(V);
