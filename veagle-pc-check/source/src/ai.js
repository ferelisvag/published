/* VEAGLE PC Check - AI hand-off: package builder, redaction, copy/open */
var AI = (function (V) {
  'use strict';
  var $ = V.$, esc = V.esc, arr = V.arr, num = V.num, g = V.g, D = V.D;

  var OPTIONS = [
    { k: 'hardware', label: 'Hardware and Windows summary', on: true },
    { k: 'findings', label: 'Findings with evidence', on: true },
    { k: 'outdated', label: 'Apps that have updates', on: true },
    { k: 'startup', label: 'Startup items and third-party services', on: true },
    { k: 'events', label: 'Event Viewer summary (top groups, crashes)', on: true },
    { k: 'devices', label: 'Drivers and device problems', on: true },
    { k: 'apps', label: 'Full list of installed programs', on: false }
  ];
  var opt = {}; OPTIONS.forEach(function (o) { opt[o.k] = o.on; });
  var focusFinding = '';

  /* ---------------- redaction ---------------- */
  function reEsc(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function makeRedactor() {
    var tally = {};
    function hit(k, n) { tally[k] = (tally[k] || 0) + (n || 1); }
    var user = g(D, 'meta.user', ''), pc = g(D, 'meta.computer', ''), dom = g(D, 'meta.domain', '');
    function fn(text) {
      var t = String(text == null ? '' : text);
      t = t.replace(/([A-Za-z]:\\Users\\)[^\\\/\s"'<>|]+/gi, function (m, p) { hit('user paths'); return p + '<USER>'; });
      t = t.replace(/S-1-5-21(?:-\d+){3,4}/g, function () { hit('account IDs'); return '<SID>'; });
      t = t.replace(/\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b/g, function () { hit('e-mail addresses'); return '<EMAIL>'; });
      t = t.replace(/\b(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\b/g, function () { hit('MAC addresses'); return '<MAC>'; });
      t = t.replace(/(?<![\d.])(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|169\.254\.\d{1,3}\.\d{1,3})(?![\d.]*\d)/g, function () {
        hit('IP addresses'); return '<IP>';
      });
      t = t.replace(/\\\\[A-Za-z0-9_.-]+\\/g, function () { hit('network share names'); return '\\\\<HOST>\\'; });
      function whole(name) { return new RegExp('(?<![\\p{L}\\p{N}])' + reEsc(name) + '(?![\\p{L}\\p{N}])', 'giu'); }
      // longest names first, so the PC name is replaced before a user name that is a part of it
      var names = [];
      if (pc && pc.length >= 2) names.push({ n: pc, k: 'PC name', ph: '<PC>' });
      if (dom && dom.length >= 2 && dom.toLowerCase() !== pc.toLowerCase()) names.push({ n: dom, k: 'domain name', ph: '<DOMAIN>' });
      if (user && user.length >= 2) names.push({ n: user, k: 'user name', ph: '<USER>' });
      names.sort(function (a, b) { return b.n.length - a.n.length; });
      names.forEach(function (x) { t = t.replace(whole(x.n), function () { hit(x.k); return x.ph; }); });
      return t;
    }
    fn.tally = tally;
    return fn;
  }

  /* ---------------- package ---------------- */
  function line(a, b) { return b == null || b === '' ? '' : a + ': ' + b + '\n'; }
  function buildPackage() {
    var R = makeRedactor();
    var s = D.system || {}, c = s.cpu || {}, o = s.os || {}, r = s.ram || {}, t = '';
    var focus = ($('#aiFocus') ? $('#aiFocus').value.trim() : '');
    var lang = ($('#aiLang') ? $('#aiLang').value.trim() : '') || 'English';

    t += 'You are an expert Windows 11 technician. Below is a read-only scan of my PC. All of this data was collected by the VEAGLE PC Check app (VEAGLE - ferelis.gr), which was built with the help of Claude. Personal data (user name, PC name, IP and MAC addresses, e-mail addresses) was replaced with placeholders.\n\n';
    t += 'I am NOT technical. Explain everything like I am a complete beginner: simple words, no jargon (or explain each term in one sentence), and tell me exactly where to click.\n\nPlease:\n1. Summarise the real condition of this PC in plain language.\n2. Rank the problems by impact, explain the likely root cause of each, and say clearly when something is probably harmless noise.\n3. Give me a step-by-step plan, safest and highest-impact steps first, with exact commands or menu paths.\n4. Ask me before any step that could cause data loss or change security settings.\n5. Tell me what extra information you need (for example a specific log or command output) and how to get it.\n\n';
    if (focusFinding) t += 'Please start with this finding: ' + focusFinding + '\n';
    t += 'What I need help with: ' + (focus || 'general health, stability and speed of the PC') + '\n';
    t += 'Reply in: ' + lang + '\n\n';
    t += '=================== SCAN collected by VEAGLE PC Check v' + g(D, 'meta.version', '?') + ' (VEAGLE - ferelis.gr, built with Claude), ' + g(D, 'meta.generated', '') + ' ===================\n';
    t += 'Health score by the tool: ' + V.score.score + '/100 (' + V.score.label + '). Findings: ' + V.counts.high + ' high, ' + V.counts.medium + ' medium, ' + V.counts.low + ' low.\n\n';

    if (opt.hardware) {
      t += '## HARDWARE AND WINDOWS\n';
      t += line('Machine', ((s.manufacturer || '') + ' ' + (s.model || '') + ' (' + (s.chassis || '') + ')').trim());
      t += line('Motherboard', (g(s, 'board.manufacturer', '') + ' ' + g(s, 'board.product', '')).trim());
      t += line('BIOS', (g(s, 'bios.vendor', '') + ' ' + g(s, 'bios.version', '') + ', ' + V.fmtDate(g(s, 'bios.date', null))).trim());
      t += line('CPU', c.name ? c.name + ', ' + c.cores + ' cores / ' + c.threads + ' threads, ' + c.baseMHz + ' MHz' : '');
      t += line('RAM', r.totalGB ? r.totalGB + ' GB total, ' + V.fmtNum(num(r.freeGB), 1) + ' GB free at scan time; modules: ' + arr(r.modules).map(function (m) { return m.gb + ' GB ' + (m.type || '') + ' ' + m.configuredMHz + '/' + m.speedMHz + ' MT/s ' + (m.manufacturer || ''); }).join('; ') : '');
      arr(D.gpus).forEach(function (x) { t += line('GPU', x.name + ', ' + (x.vramGB || '?') + ' GB, driver ' + (x.driverFriendly || x.driverVersion) + ' (' + V.fmtDate(x.driverDate) + '), ' + x.width + 'x' + x.height + '@' + x.refreshHz + 'Hz'); });
      t += line('Windows', (o.productName || o.caption) + ' ' + (o.displayVersion || '') + ' build ' + (o.build || '') + '.' + (o.ubr || '') + ', installed ' + V.fmtDate(o.installDate) + ', uptime ' + V.fmtUptime(o.uptimeHours));
      arr(D.disks).forEach(function (d) { if (num(d.sizeGB) > 0) t += line('Drive', d.name + ' (' + d.mediaType + '/' + d.busType + ') ' + d.sizeGB + ' GB, health ' + d.health + (d.reliability ? ', temp ' + (d.reliability.temperatureC || '?') + ' C, wear ' + (d.reliability.wearPercent == null ? '?' : d.reliability.wearPercent) + '%, power-on ' + (d.reliability.powerOnHours || '?') + ' h' : '')); });
      arr(D.volumes).forEach(function (v) { t += line('Volume', v.letter + ' ' + (v.fs || '') + ', ' + v.freeGB + ' GB free of ' + v.sizeGB + ' GB' + (v.bitlocker ? ', BitLocker ' + v.bitlocker.protection : '')); });
      var sec = D.security || {};
      t += line('Security', 'SecureBoot=' + sec.secureBoot + ', TPM=' + (sec.tpm ? (sec.tpm.ready ? 'ready ' + (sec.tpm.specVersion || '') : 'not ready') : 'none') + ', UAC=' + sec.uac + ', firewall ' + g(sec, 'firewall.domain', '?') + '/' + g(sec, 'firewall.private', '?') + '/' + g(sec, 'firewall.public', '?') + ', antivirus: ' + arr(sec.antivirus).map(function (a) { return a.name + (a.enabled ? ' on' : ' off'); }).join(', ') + ', Hyper-V/hypervisor=' + sec.hypervisorPresent + ', VBS=' + sec.vbsStatus + ', memory integrity=' + sec.memoryIntegrity);
      var st = D.settings || {};
      t += line('Settings', 'power plan ' + st.powerPlan + ', FastStartup=' + st.fastStartup + ', TRIM=' + st.trim + ', pagefile auto=' + st.pagefileAuto + ', temp files ' + g(st, 'tempMB.user', '?') + '+' + g(st, 'tempMB.windows', '?') + ' MB');
      t += line('Updates', 'last Windows update ' + g(D, 'updates.lastPatchDaysAgo', '?') + ' days ago; pending reboot=' + sec.pendingReboot + '; DISM CheckHealth=' + g(D, 'dism.state', 'n/a') + (g(D, 'dism.text', '') ? ' (' + g(D, 'dism.text', '') + ')' : ''));
      if (V.battery) t += line('Battery', 'design ' + V.battery.designMWh + ' mWh, now ' + V.battery.fullChargeMWh + ' mWh, wear ' + V.battery.wearPercent + '%, cycles ' + (V.battery.cycleCount == null ? '?' : V.battery.cycleCount));
      if (V.readiness.rows.length && !V.readiness.alreadyWin11) t += line('Windows 11 readiness', V.readiness.verdict + ' (' + V.readiness.rows.map(function (r) { return r.label + '=' + r.status; }).join(', ') + ')');
      if (g(D, 'meta.mode', 'full') === 'quick') t += line('Scan mode', 'QUICK scan (DISM, winget, optional features and old-driver checks were skipped)');
      var hist = arr(g(D, 'boot.history', [])).slice(0, 8);
      if (hist.length) t += line('Boot times (s), newest first', hist.map(function (x) { return x.seconds; }).join(', '));
      var ex = D.extras;
      if (ex) {
        var rl = ex.reliability || {}, sm = ex.securityMore || {}, nt = ex.networkTest || {}, bk = ex.backup || {}, df = sm.defender || null;
        if (rl.stabilityIndex != null) t += line('Reliability', 'Windows stability index ' + rl.stabilityIndex + '/10 (7-day average)' + (arr(rl.bugchecks).length ? '; blue screen codes: ' + arr(rl.bugchecks).map(function (b) { return b.code; }).join(', ') : ''));
        if (df) t += line('Defender', 'definitions ' + df.signatureAgeDays + ' days old, quick scan ' + (df.quickScanAgeDays == null ? 'never/unknown' : df.quickScanAgeDays + ' days ago') + ', tamper protection=' + df.tamperProtected + ', threats in 30 days=' + df.threats30d);
        t += line('Security details', 'NLA=' + sm.nlaRequired + ', autologon=' + sm.autoLogon + ', UAC prompt level=' + sm.uacPromptLevel + ', SMB1=' + sm.smb1Enabled + ', activation status=' + sm.activation + ', non-admin shares=' + arr(sm.shares).length + ', unsigned drivers=' + arr(sm.unsignedDrivers).length);
        if (arr(sm.listening).length) t += line('Open ports (listening)', arr(sm.listening).slice(0, 25).map(function (p) { return p.port + '/' + (p.process || '?'); }).join(', '));
        if (nt.ping || nt.dns) t += line('Network test', 'router ping ' + g(nt, 'ping.avgMs', '?') + ' ms, lost ' + g(nt, 'ping.lost', '?') + '/' + g(nt, 'ping.sent', '?') + '; DNS ' + (g(nt, 'dns.ok', null) ? g(nt, 'dns.ms', '?') + ' ms' : 'failed') + '; time source ' + g(nt, 'timeSync.source', '?') + '; Wi-Fi ' + (nt.wifi ? nt.wifi.signalPct + '% ' + nt.wifi.band : 'n/a') + '; proxy=' + nt.proxyEnabled);
        t += line('Backups', 'restore points ' + g(bk, 'restorePoints.count', '?') + ', File History=' + bk.fileHistory + ', OneDrive folder backup (docs/desktop/pictures)=' + [g(bk, 'oneDriveFolders.documents', false), g(bk, 'oneDriveFolders.desktop', false), g(bk, 'oneDriveFolders.pictures', false)].join('/') + ', Windows RE=' + bk.winRE);
      }
      t += '\n';
    }
    if (opt.findings) {
      t += '## FINDINGS FROM THE TOOL\n';
      V.findings.forEach(function (f, i) {
        t += (i + 1) + '. [' + f.sev.toUpperCase() + '/' + f.area + '] ' + f.title + '\n   Why: ' + f.why + '\n' + (f.evidence ? '   Evidence: ' + f.evidence + '\n' : '');
      });
      t += '\n';
    }
    if (opt.outdated) {
      var out = arr(g(D, 'apps.outdated', []));
      t += '## APPS WITH UPDATES AVAILABLE (' + out.length + ')\n';
      out.forEach(function (a) { t += '- ' + a.name + ': ' + a.version + ' -> ' + a.available + '\n'; });
      t += '\n';
    }
    if (opt.startup) {
      var items = arr(g(D, 'startup.items', []));
      t += '## STARTUP ITEMS (' + items.length + ')\n';
      items.forEach(function (x) { t += '- ' + x.name + ' | ' + (x.command || '').slice(0, 140) + '\n'; });
      var sv = arr(g(D, 'startup.thirdPartyServices', []));
      t += '\n## THIRD-PARTY SERVICES SET TO AUTOMATIC (' + sv.length + ')\n';
      sv.forEach(function (x) { t += '- ' + (x.display || x.name) + ' [' + x.state + ']\n'; });
      var failed = arr(g(D, 'startup.failedAutoServices', []));
      if (failed.length) t += '\n## AUTOMATIC SERVICES THAT ARE NOT RUNNING\n' + failed.map(function (x) { return '- ' + x.name + ' (exit code ' + x.exitCode + ')'; }).join('\n') + '\n';
      var slow = arr(g(D, 'boot.slowStarters', []));
      if (slow.length) t += '\n## PROGRAMS THAT SLOWED RECENT BOOTS\n' + slow.map(function (x) { return '- ' + x.name + ' x' + x.times; }).join('\n') + '\n';
      var pr = arr(g(D, 'startup.topRam', [])).slice(0, 8);
      if (pr.length) t += '\n## BIGGEST MEMORY USERS\n' + pr.map(function (x) { return '- ' + x.name + ' x' + x.instances + ': ' + x.ramMB + ' MB'; }).join('\n') + '\n';
      t += '\n';
    }
    if (opt.events) {
      var e = D.events || {};
      t += '## EVENT VIEWER, last ' + (e.days || 30) + ' days (errors/warnings)\n';
      ['system', 'application'].forEach(function (k) {
        t += k.toUpperCase() + ' log: ' + g(e, k + '.errors', 0) + ' errors, ' + g(e, k + '.warnings', 0) + ' warnings. Top groups:\n';
        arr(g(e, k + '.groups', [])).slice(0, 25).forEach(function (x) { t += '- ' + x.count + 'x ' + x.provider + ' ' + x.id + ' (' + x.level + '): ' + (x.sample || '') + '\n'; });
      });
      var ca = arr(e.appCrashes);
      if (ca.length) t += 'Program crashes: ' + ca.map(function (x) { return x.app + ' x' + x.count; }).join(', ') + '; hangs: ' + (e.appHangs || 0) + '\n';
      t += '\n';
    }
    if (opt.devices) {
      var pd = arr(g(D, 'drivers.problemDevices', []));
      t += '## DEVICES WITH PROBLEMS (' + pd.length + ')\n' + pd.map(function (x) { return '- ' + x.name + ' [' + x.status + ' ' + x.problem + ']'; }).join('\n') + '\n';
      var od = arr(g(D, 'drivers.oldDrivers', []));
      if (od.length) t += '\n## OLDER NON-MICROSOFT DRIVERS\n' + od.map(function (x) { return '- ' + x.device + ' (' + x.provider + ' ' + x.version + ', ' + V.fmtDate(x.date) + ')'; }).join('\n') + '\n';
      t += '\n';
    }
    if (opt.apps) {
      var apps = arr(g(D, 'apps.list', []));
      t += '## INSTALLED PROGRAMS (' + apps.length + ')\n' + apps.map(function (a) { return '- ' + a.name + ' ' + (a.version || ''); }).join('\n') + '\n\n';
    }
    t += '=================== END OF SCAN ===================\nSource: VEAGLE PC Check, VEAGLE - ferelis.gr, built with the help of Claude.\n';
    return { text: R(t), tally: R.tally };
  }

  /* ---------------- clipboard / open ---------------- */
  function toast(msg) {
    var el = $('#toast'); if (!el) return;
    el.textContent = msg; el.className = 'on';
    clearTimeout(toast.t); toast.t = setTimeout(function () { el.className = ''; }, 4200);
  }
  function copyText(text) {
    var ok = false;
    try {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.top = '0'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length);
      ok = document.execCommand('copy'); document.body.removeChild(ta);
    } catch (e) { ok = false; }
    if (!ok && navigator.clipboard) { try { navigator.clipboard.writeText(text); ok = true; } catch (e2) { } }
    return ok;
  }
  function kb(text) { return (new Blob([text]).size / 1024).toFixed(1) + ' KB'; }

  var current = { text: '', tally: {} };
  function refresh() {
    current = buildPackage();
    var pv = $('#aiPreview'); if (pv) pv.value = current.text;
    var sz = $('#pkgSize'); if (sz) sz.textContent = kb(current.text) + ', about ' + V.fmtNum(current.text.length / 4) + ' tokens';
    var rm = $('#removedList');
    if (rm) {
      var keys = Object.keys(current.tally);
      rm.innerHTML = '<span class="lbl" style="border:0;padding:3px 0">Removed:</span>' + (keys.length ? keys.map(function (k) { return '<span>' + esc(k) + ' x' + current.tally[k] + '</span>'; }).join('') : '<span>nothing needed removing</span>');
    }
  }
  function copyAndOpen(url, name) {
    refresh();
    var ok = copyText(current.text);
    var w = null;
    try { w = window.open(url, '_blank', 'noopener'); } catch (e) { }
    toast(ok ? 'Copied ' + kb(current.text) + '. In ' + name + ', click the message box and press Ctrl+V.' + (w ? '' : ' Your browser blocked the new tab, open ' + url + ' yourself.') : 'Copy failed. Use Download .txt and attach the file instead.');
  }
  function download() {
    refresh();
    var blob = new Blob([current.text], { type: 'text/plain;charset=utf-8' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'veagle-pc-check-for-ai.txt';
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    toast('Saved veagle-pc-check-for-ai.txt. Attach it to your chat with the assistant.');
  }

  function init() {
    var box = $('#aiChecks'); if (!box) return;
    box.innerHTML = OPTIONS.map(function (o) { return '<label><input type="checkbox" data-opt="' + o.k + '"' + (o.on ? ' checked' : '') + '>' + esc(o.label) + '</label>'; }).join('');
    box.addEventListener('change', function (e) { var k = e.target.getAttribute('data-opt'); if (k) { opt[k] = e.target.checked; refresh(); } });
    ['#aiFocus', '#aiLang'].forEach(function (s) { var el = $(s); if (el) el.addEventListener('input', function () { clearTimeout(init.t); init.t = setTimeout(refresh, 250); }); });
    $('#btnClaude').addEventListener('click', function () { copyAndOpen('https://claude.ai/new', 'Claude'); });
    var dc = $('#dashClaude'); if (dc) dc.addEventListener('click', function () { copyAndOpen('https://claude.ai/new', 'Claude'); });
    $('#btnCopy').addEventListener('click', function () { refresh(); toast(copyText(current.text) ? 'Copied ' + kb(current.text) + '. Paste it into any assistant with Ctrl+V.' : 'Copy failed. Use Download .txt instead.'); });
    $('#btnDownload').addEventListener('click', download);
    Array.prototype.slice.call(document.querySelectorAll('[data-ai]')).forEach(function (b) {
      b.addEventListener('click', function () { var u = b.getAttribute('data-ai'); copyAndOpen(u, b.textContent.trim()); });
    });
    refresh();
  }

  return { init: init, refresh: refresh, toast: toast, copyText: copyText, build: buildPackage, setFocus: function (t) { focusFinding = t || ''; refresh(); }, redactor: makeRedactor };
})(V);
