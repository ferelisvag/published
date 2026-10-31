/* VEAGLE PC Check - Tools tab: beginner guide, PC type, ticket summary, safe fix script, CSV, many-PC table, glossary */
var TOOLS = (function (V, AI, CMP) {
  'use strict';
  var $ = V.$, $$ = V.$$, esc = V.esc, arr = V.arr, num = V.num, g = V.g, D = V.D;

  var GLOSSARY = [
    ['Administrator', 'A Windows login that is allowed to change the system. Some fixes only work when a program is started "as administrator".'],
    ['BIOS / UEFI', 'The first program that runs when the PC starts, before Windows. You open it with a key (often Del or F2) while the PC starts.'],
    ['Driver', 'A small program that lets Windows talk to a part of the PC (graphics card, Wi-Fi, printer).'],
    ['Firmware', 'The built-in software of a device, for example of an SSD or router.'],
    ['SSD / HDD', 'Two kinds of storage. An SSD is fast and has no moving parts. An HDD is the older spinning disk, cheaper and slower.'],
    ['SMART', 'A health report that every drive keeps about itself.'],
    ['RAM', 'The short-term memory of the PC. More RAM means more programs open at once without slowing down.'],
    ['XMP / EXPO', 'A BIOS setting that makes memory run at the speed printed on its label. It is often off by default.'],
    ['TPM', 'A small security chip on the motherboard. Windows 11 and BitLocker use it.'],
    ['Secure Boot', 'A BIOS setting that stops harmful programs from starting before Windows.'],
    ['BitLocker', 'Windows disk encryption. If someone steals the laptop they cannot read the files without the key.'],
    ['Firewall', 'A guard that decides which network traffic may reach your PC.'],
    ['DNS', 'The phone book of the internet. It turns a name like google.com into an address.'],
    ['Proxy', 'A middleman server that all your web traffic goes through.'],
    ['Restore point', 'A snapshot of Windows settings and system files that you can go back to. It does not save your own files.'],
    ['DISM / SFC', 'Two Windows tools that check and repair the system files.'],
    ['WHEA', 'Windows Hardware Error Architecture. A WHEA message means the hardware reported its own problem.'],
    ['Blue screen (BSOD)', 'The blue crash screen. Windows stops on purpose to protect itself and shows a code.'],
    ['Port', 'A numbered door on your PC through which network programs talk.'],
    ['Registry', 'The big settings database of Windows. Do not edit it unless a guide tells you exactly what to change.']
  ];

  function stamp() { var d = new Date(); function p(n) { return (n < 10 ? '0' : '') + n; } return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()); }
  function ascii(s) { return String(s == null ? '' : s).replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/[\u2013\u2014]/g, '-').replace(/[^\x09\x0a\x0d\x20-\x7e]/g, '?'); }
  function saveFile(name, text, type, bom) {
    var blob = new Blob([(bom ? '\uFEFF' : '') + text], { type: type + ';charset=utf-8' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ---------- text builders ---------- */
  function ticket() {
    var f = V.findings.filter(function (x) { return x.sev !== 'info'; });
    var L = [];
    L.push('PC HEALTH SUMMARY (VEAGLE PC Check v' + g(D, 'meta.version', '?') + ')');
    L.push('PC: ' + g(D, 'meta.computer', '?') + ' | ' + g(D, 'system.os.productName', 'Windows') + ' ' + g(D, 'system.os.displayVersion', '') + ' | ' + g(D, 'system.cpu.name', '?') + ' | ' + V.fmtGB(num(g(D, 'system.ram.totalGB', 0))) + ' RAM');
    L.push('Scanned: ' + V.fmtDT(g(D, 'meta.generated', null)) + ' (' + g(D, 'meta.mode', 'full') + ' scan' + (g(D, 'meta.isAdmin', true) === false ? ', NOT as administrator' : '') + ')');
    L.push('Health score: ' + V.score.score + '/100 - ' + V.score.label);
    L.push('Findings: ' + V.counts.high + ' high, ' + V.counts.medium + ' medium, ' + V.counts.low + ' low');
    L.push('');
    if (!f.length) L.push('No problems found.');
    f.slice(0, 12).forEach(function (x, i) { L.push((i + 1) + '. [' + x.sev.toUpperCase() + '] ' + x.title + ' (' + x.area + ')'); });
    if (f.length > 12) L.push('... and ' + (f.length - 12) + ' more in the full report.');
    L.push('');
    L.push('Details: the full report.html is attached or available on request.');
    return ascii(L.join('\n'));
  }

  function fixScript() {
    var L = [];
    L.push('# VEAGLE PC Check - fix script for ' + g(D, 'meta.computer', 'this PC'));
    L.push('# Made ' + new Date().toISOString().slice(0, 10) + ' from your scan. Nothing in this file runs yet.');
    L.push('#');
    L.push('# EVERY command below is switched OFF (it starts with "# ").');
    L.push('# HOW TO USE IT:');
    L.push('#  1. Read a section. Understand what it does. If unsure, skip it.');
    L.push('#  2. To switch a command ON, delete the "# " in front of it.');
    L.push('#  3. Press the Windows key, type PowerShell, right-click it, choose Run as administrator.');
    L.push('#  4. Type:  Set-ExecutionPolicy -Scope Process Bypass   and press Enter (this only lasts for this window).');
    L.push('#  5. Type the path of this file, for example  & "C:\\Users\\You\\Downloads\\veagle-fix-script.ps1"');
    L.push('#  6. Restart the PC when done, then run VEAGLE PC Check again to see the result.');
    L.push('#');
    L.push('# Back up your important files before you change anything. Sections marked CAREFUL can break things if done wrong.');
    L.push('');
    var n = 0;
    V.findings.forEach(function (f) {
      var cmds = f.steps.filter(function (s) { return s.cmd; });
      if (!cmds.length || f.sev === 'info') return;
      n++;
      var m = V.META[f.id] || [10, 'Medium', 'Safe'];
      L.push('# ' + new Array(70).join('='));
      L.push('# ' + n + '. [' + f.sev.toUpperCase() + '] ' + f.title);
      L.push('#    ' + m[2].toUpperCase() + ', about ' + m[0] + ' min, difficulty: ' + m[1]);
      f.why.split(/\.\s+/).forEach(function (line) { if (line) L.push('#    ' + line.replace(/\.?$/, '.')); });
      f.steps.forEach(function (s, i) {
        L.push('#    Step ' + (i + 1) + ': ' + s.t);
        if (s.cmd) L.push('# ' + s.cmd);
      });
      L.push('');
    });
    if (!n) L.push('# No findings with commands. Nothing to do here.');
    return ascii(L.join('\r\n'));
  }

  function csvCell(v) { v = String(v == null ? '' : v); return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function findingsCsv() {
    var rows = [['No', 'Severity', 'Area', 'Title', 'Why', 'Evidence', 'Steps', 'Minutes', 'Difficulty', 'Risk']];
    V.findings.forEach(function (f, i) {
      var m = V.META[f.id] || [10, 'Medium', 'Safe'];
      rows.push([i + 1, f.sev, f.area, f.title, f.why, f.evidence, f.steps.map(function (s) { return s.t + (s.cmd ? ' [' + s.cmd + ']' : ''); }).join(' | '), m[0], m[1], m[2]]);
    });
    rows.push([]); rows.push(['Created with VEAGLE PC Check v' + g(D, 'meta.version', '?') + ' - ferelis.gr']);
    return rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n');
  }

  /* ---------- many PCs ---------- */
  var fleet = [];
  function rowOf(E, name) {
    var cvol = arr(E.D.volumes).filter(function (v) { return /^C:/i.test(v.letter); })[0];
    var bad = arr(E.D.disks).filter(function (d) { return d.health && !/healthy/i.test(d.health); }).length;
    return {
      pc: name || E.g(E.D, 'meta.computer', '?'), os: (E.g(E.D, 'system.os.productName', '') + ' ' + E.g(E.D, 'system.os.displayVersion', '')).trim(),
      date: E.g(E.D, 'meta.generated', null), score: E.score.score, high: E.counts.high, medium: E.counts.medium, low: E.counts.low,
      free: cvol ? Math.round(num(cvol.freeGB)) : null, patch: E.g(E.D, 'updates.lastPatchDaysAgo', null), ram: Math.round(num(E.g(E.D, 'system.ram.totalGB', 0))), disks: bad ? bad + ' bad' : 'ok'
    };
  }
  function fleetHtml() {
    var rows = [rowOf(V)].concat(fleet).sort(function (a, b) { return a.score - b.score; });
    var h = '<div class="tablewrap"><table><thead><tr><th>PC</th><th>Windows</th><th>Scanned</th><th class="num">Score</th><th class="num">High</th><th class="num">Med</th><th class="num">Low</th><th class="num">C: free GB</th><th class="num">Last update (days)</th><th class="num">RAM GB</th><th>Drives</th></tr></thead><tbody>';
    rows.forEach(function (r) {
      h += '<tr><td>' + esc(r.pc) + '</td><td>' + esc(r.os) + '</td><td>' + esc(V.fmtDate(r.date)) + '</td><td class="num"><b>' + r.score + '</b></td><td class="num">' + r.high + '</td><td class="num">' + r.medium + '</td><td class="num">' + r.low + '</td><td class="num">' + (r.free == null ? '-' : r.free) + '</td><td class="num">' + (r.patch == null ? '-' : r.patch) + '</td><td class="num">' + r.ram + '</td><td>' + esc(r.disks) + '</td></tr>';
    });
    return h + '</tbody></table></div>';
  }
  function fleetCsv() {
    var rows = [['PC', 'Windows', 'Scanned', 'Score', 'High', 'Medium', 'Low', 'C free GB', 'Days since update', 'RAM GB', 'Drives']];
    [rowOf(V)].concat(fleet).sort(function (a, b) { return a.score - b.score; }).forEach(function (r) { rows.push([r.pc, r.os, V.fmtDate(r.date), r.score, r.high, r.medium, r.low, r.free, r.patch, r.ram, r.disks]); });
    return rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n');
  }
  function addFiles(files) {
    var list = Array.prototype.slice.call(files || []), left = list.length, msg = [];
    if (!left) return;
    list.forEach(function (f) {
      var r = new FileReader();
      r.onload = function () { try { var d = CMP.parse(r.result); fleet.push(rowOf(V.Engine(d), g(d, 'meta.computer', f.name))); } catch (e) { msg.push(f.name + ': ' + (e.message || e)); } done(); };
      r.onerror = function () { msg.push(f.name + ': could not be read'); done(); };
      r.readAsText(f);
    });
    function done() { if (--left > 0) return; $('#fleetOut').innerHTML = fleetHtml() + (msg.length ? '<div class="demo" style="margin-top:12px">' + esc(msg.join('\n')) + '</div>' : ''); }
  }

  /* ---------- render ---------- */
  function sect(t, n) { return '<div class="sect"><h2>' + esc(t) + '</h2><span>' + esc(n || '') + '</span></div>'; }
  function box(name, st, inner) { return '<div class="win" style="margin-bottom:18px"><header><span>' + esc(name) + '</span><span class="st">' + esc(st || '') + '</span></header><div class="body">' + inner + '</div></div>'; }

  function render() {
    var root = $('#tab-tools'); if (!root) return;
    var h = '';
    h += sect('New here? Start with this', 'no computer knowledge needed');
    h += box('how_to.txt', '3 minutes',
      '<ol class="steps3"><li><b>Look at the "Do this first" box</b> on the Dashboard. It shows the 3 most important things.</li>' +
      '<li><b>Open the Findings tab</b> and click one problem. Read "In plain words", then follow the numbered steps one by one. Each step says exactly what to click.</li>' +
      '<li><b>Do one thing at a time.</b> Restart the PC, then run the scan again. The Compare tab shows what got better.</li></ol>' +
      '<p class="sub" style="margin-top:12px">Words next to a dotted underline have a hint: hold the mouse over them. The list at the bottom of this page explains every technical word.</p>');
    h += box('run_a_command.txt', 'the one skill you need',
      '<p><b>Some steps show a grey box with a command.</b> That is text you copy and paste, you do not have to understand it.</p>' +
      '<ol class="steps3"><li>Click <b>Copy</b> next to the command.</li>' +
      '<li>Press the <b>Windows key</b>, type <b>PowerShell</b>. Right-click "Windows PowerShell" and choose <b>Run as administrator</b>. Click <b>Yes</b>. A blue or black window opens.</li>' +
      '<li>Right-click inside the window (this pastes the text), then press <b>Enter</b>. Wait until the cursor comes back.</li></ol>' +
      '<p class="sub" style="margin-top:12px"><b>Safe</b> means you cannot break anything. <b>Back up first</b> means copy your important files somewhere safe before you start. <b>Careful</b> means the change is in a sensitive place (BIOS or system): if you are not sure, ask someone or use the AI help tab.</p>');
    h += sect('Pick your type of PC', 'changes which findings count more');
    h += '<div class="win" style="margin-bottom:18px"><div class="body"><div class="seg" id="profileSeg">' +
      Object.keys(V.PROFILES).map(function (k) { return '<button type="button" class="btn sm" data-profile="' + k + '" aria-pressed="' + (V.profile === k) + '">' + esc(V.PROFILES[k].label) + '</button>'; }).join(' ') +
      '</div><p class="sub" id="profileNote" style="margin-top:10px">' + esc(V.PROFILES[V.profile].note) + '</p></div></div>';

    h += sect('Message for someone who helps you', 'copy and paste into an email or ticket');
    h += box('ticket.txt', 'short summary', '<textarea id="ticketText" class="mono" rows="12" readonly style="width:100%"></textarea><div class="btns" style="margin-top:10px"><button class="btn sm" type="button" id="tkCopy">Copy summary</button></div><p class="sub" style="margin-top:8px">It contains the PC name. Remove that line if you do not want to share it.</p>');

    h += sect('Fix script you can read first', 'every command is switched off');
    h += box('veagle-fix-script.ps1', 'safe by design', '<p class="sub">This file collects all the commands from the findings. <b>Nothing runs by itself:</b> every line starts with "# ", which makes Windows ignore it. You switch on only the lines you want (the file explains how).</p><textarea id="fixText" class="mono" rows="10" readonly style="width:100%;margin-top:10px"></textarea><div class="btns" style="margin-top:10px"><button class="btn sm" type="button" id="fxCopy">Copy</button><button class="btn sm" type="button" id="fxSave">Save as file</button></div>');

    h += sect('Export', 'for Excel or a helpdesk');
    h += box('findings.csv', 'opens in Excel', '<div class="btns"><button class="btn sm" type="button" id="csvSave">Save findings as CSV</button><button class="btn sm" type="button" id="csvCopy">Copy as text</button></div>');

    h += sect('Many PCs in one table', 'for family, friends or an office');
    h += box('many_pcs.csv', 'optional',
      '<p class="sub">Run the scan on each PC. Then open one report here and add the others: choose their <span class="mono">report.html</span> or <span class="mono">data.json</span> files (you can select many at once). The PCs are sorted with the sickest first.</p>' +
      '<label class="drop" for="fleetFile" id="fleetDrop"><b>Choose or drop the other reports here</b></label><input class="sr" type="file" id="fleetFile" multiple accept=".json,.html,application/json,text/html">' +
      '<div id="fleetOut" style="margin-top:14px">' + fleetHtml() + '</div><div class="btns" style="margin-top:10px"><button class="btn sm" type="button" id="fleetSave">Save table as CSV</button></div>');

    h += sect('Words explained', 'in plain language');
    h += box('glossary.txt', GLOSSARY.length + ' words', '<dl class="kv" style="grid-template-columns:180px 1fr">' + GLOSSARY.map(function (x) { return '<dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd>'; }).join('') + '</dl>');
    root.innerHTML = h;
    refreshTexts();
    wire();
  }

  function refreshTexts() {
    var a = $('#ticketText'); if (a) a.value = ticket();
    var b = $('#fixText'); if (b) b.value = fixScript();
    var n = $('#profileNote'); if (n) n.textContent = V.PROFILES[V.profile].note;
    $$('#profileSeg button').forEach(function (x) { x.setAttribute('aria-pressed', String(x.getAttribute('data-profile') === V.profile)); });
    var s = $('#profileSel'); if (s) s.value = V.profile;
  }

  function wire() {
    function on(id, fn) { var el = $(id); if (el) el.addEventListener('click', fn); }
    on('#tkCopy', function () { AI.toast(AI.copyText($('#ticketText').value) ? 'Summary copied.' : 'Copy failed. Select the text and press Ctrl+C.'); });
    on('#fxCopy', function () { AI.toast(AI.copyText($('#fixText').value) ? 'Fix script copied.' : 'Copy failed. Select the text and press Ctrl+C.'); });
    on('#fxSave', function () { saveFile('veagle-fix-script.ps1', $('#fixText').value, 'text/plain', true); AI.toast('Saved veagle-fix-script.ps1. All commands inside are switched off.'); });
    on('#csvSave', function () { saveFile('veagle-findings-' + stamp() + '.csv', findingsCsv(), 'text/csv', true); AI.toast('Saved the findings as CSV.'); });
    on('#csvCopy', function () { AI.toast(AI.copyText(findingsCsv()) ? 'Copied.' : 'Copy failed.'); });
    on('#fleetSave', function () { saveFile('veagle-many-pcs-' + stamp() + '.csv', fleetCsv(), 'text/csv', true); AI.toast('Saved the table as CSV.'); });
    var ff = $('#fleetFile'); if (ff) ff.addEventListener('change', function (e) { addFiles(e.target.files); });
    var dr = $('#fleetDrop');
    if (dr) { ['dragenter', 'dragover'].forEach(function (ev) { dr.addEventListener(ev, function (e) { e.preventDefault(); dr.classList.add('over'); }); });
      ['dragleave', 'drop'].forEach(function (ev) { dr.addEventListener(ev, function (e) { e.preventDefault(); dr.classList.remove('over'); }); });
      dr.addEventListener('drop', function (e) { addFiles(e.dataTransfer && e.dataTransfer.files); }); }
    $$('#profileSeg button').forEach(function (b) { b.addEventListener('click', function () { setProfile(b.getAttribute('data-profile')); }); });
  }

  function setProfile(k) {
    V.setProfile(k);
    UI.renderAll(); refreshTexts();
    AI.toast('PC type: ' + V.PROFILES[V.profile].label + '. Findings were re-ordered.');
  }

  function init() {
    var sel = $('#profileSel');
    if (sel) { sel.innerHTML = Object.keys(V.PROFILES).map(function (k) { return '<option value="' + k + '">' + esc(V.PROFILES[k].label) + '</option>'; }).join(''); sel.addEventListener('change', function () { setProfile(sel.value); }); }
    render();
  }
  return { init: init, glossary: GLOSSARY };
})(V, AI, CMP);
