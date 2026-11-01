/* VEAGLE PC Check - Tools tab: beginner guide, PC type, ticket summary, safe fix script, CSV, many-PC table, glossary */
var TOOLS = (function (V, AI, CMP) {
  'use strict';
  var $ = V.$, $$ = V.$$, esc = V.esc, arr = V.arr, num = V.num, g = V.g, D = V.D;
  function I(en, el) { return V.I(en, el); }

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
  function ascii(s) { if (V.lang === 'el') return String(s == null ? '' : s); return String(s == null ? '' : s).replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/[\u2013\u2014]/g, '-').replace(/[^\x09\x0a\x0d\x20-\x7e]/g, '?'); }
  function saveFile(name, text, type, bom) {
    var blob = new Blob([(bom ? '\uFEFF' : '') + text], { type: type + ';charset=utf-8' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ---------- text builders ---------- */
  function ticket() {
    var f = V.openList();
    var L = [];
    L.push('PC HEALTH SUMMARY (VEAGLE PC Check v' + g(D, 'meta.version', '?') + ')');
    L.push('PC: ' + g(D, 'meta.computer', '?') + ' | ' + g(D, 'system.os.productName', 'Windows') + ' ' + g(D, 'system.os.displayVersion', '') + ' | ' + g(D, 'system.cpu.name', '?') + ' | ' + V.fmtGB(num(g(D, 'system.ram.totalGB', 0))) + ' RAM');
    L.push('Scanned: ' + V.fmtDT(g(D, 'meta.generated', null)) + ' (' + g(D, 'meta.mode', 'full') + ' scan' + (g(D, 'meta.isAdmin', true) === false ? ', NOT as administrator' : '') + ')');
    L.push('Health score: ' + V.score.score + '/100 - ' + V.score.label);
    L.push('Findings: ' + V.counts.high + ' high, ' + V.counts.medium + ' medium, ' + V.counts.low + ' low');
    L.push('');
    if (!f.length) L.push('No problems found.');
    f.slice(0, 12).forEach(function (x, i) { var y = V.tf(x); L.push((i + 1) + '. [' + x.sev.toUpperCase() + '] ' + y.title + ' (' + x.area + ')'); });
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
    var anySel = Object.keys(fixSel).some(function (k) { return fixSel[k]; });
    if (!anySel) return ascii('# ' + I('Nothing is selected yet. Tick the problems you want in the list above and this script fills in.', 'Δεν έχει επιλεγεί τίποτα ακόμα. Τσέκαρε στη λίστα παραπάνω τα προβλήματα που θες και το script γεμίζει.'));
    V.findings.forEach(function (f0) {
      var f = V.tf(f0), cmds = f.steps.filter(function (s) { return s.cmd; });
      if (!cmds.length || f.sev === 'info' || !fixSel[f.id]) return;
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
  var fleet = [], fixSel = {};
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

  var GLOSSARY_EL = [
    'Ένας λογαριασμός Windows που επιτρέπεται να αλλάζει το σύστημα. Μερικές διορθώσεις δουλεύουν μόνο όταν ένα πρόγραμμα ξεκινά «ως διαχειριστής».',
    'Το πρώτο πρόγραμμα που τρέχει όταν ξεκινά ο υπολογιστής, πριν από τα Windows. Το ανοίγεις με ένα πλήκτρο (συχνά Del ή F2) στην εκκίνηση.',
    'Ένα μικρό πρόγραμμα που επιτρέπει στα Windows να μιλούν με ένα μέρος του υπολογιστή (κάρτα γραφικών, Wi-Fi, εκτυπωτή).',
    'Το ενσωματωμένο λογισμικό μιας συσκευής, για παράδειγμα ενός SSD ή ενός router.',
    'Δύο είδη αποθήκευσης. Ο SSD είναι γρήγορος και δεν έχει κινούμενα μέρη. Ο HDD είναι ο παλιότερος περιστρεφόμενος δίσκος, φθηνότερος και πιο αργός.',
    'Μια αναφορά υγείας που κρατά κάθε δίσκος για τον εαυτό του.',
    'Η βραχυπρόθεσμη μνήμη του υπολογιστή. Περισσότερη RAM σημαίνει περισσότερα προγράμματα ανοιχτά χωρίς επιβράδυνση.',
    'Μια ρύθμιση του BIOS που κάνει τη μνήμη να τρέχει στην ταχύτητα που γράφει η ετικέτα της. Συχνά είναι κλειστή από προεπιλογή.',
    'Ένα μικρό τσιπ ασφαλείας στη μητρική. Τα Windows 11 και το BitLocker το χρησιμοποιούν.',
    'Μια ρύθμιση του BIOS που εμποδίζει επιβλαβή προγράμματα να ξεκινήσουν πριν από τα Windows.',
    'Η κρυπτογράφηση δίσκου των Windows. Αν κλέψουν το laptop, δεν μπορούν να διαβάσουν τα αρχεία χωρίς το κλειδί.',
    'Ένας φρουρός που αποφασίζει ποια κίνηση δικτύου επιτρέπεται να φτάσει στον υπολογιστή σου.',
    'Ο τηλεφωνικός κατάλογος του internet. Μετατρέπει ένα όνομα όπως google.com σε διεύθυνση.',
    'Ένας ενδιάμεσος διακομιστής από τον οποίο περνά όλη η κίνηση ιστού σου.',
    'Ένα στιγμιότυπο των ρυθμίσεων και των αρχείων συστήματος των Windows στο οποίο μπορείς να γυρίσεις. Δεν αποθηκεύει τα δικά σου αρχεία.',
    'Δύο εργαλεία των Windows που ελέγχουν και επισκευάζουν τα αρχεία συστήματος.',
    'Windows Hardware Error Architecture. Ένα μήνυμα WHEA σημαίνει ότι το ίδιο το υλικό ανέφερε πρόβλημα.',
    'Η μπλε οθόνη κρασαρίσματος. Τα Windows σταματούν επίτηδες για να προστατευτούν και δείχνουν έναν κωδικό.',
    'Μια αριθμημένη «πόρτα» του υπολογιστή από την οποία μιλούν τα προγράμματα δικτύου.',
    'Η μεγάλη βάση ρυθμίσεων των Windows. Μην την επεξεργάζεσαι εκτός αν ένας οδηγός σου λέει ακριβώς τι να αλλάξεις.'
  ];
  var GLOSSARY_EL_NAMES = ['Διαχειριστής', 'BIOS / UEFI', 'Driver', 'Firmware', 'SSD / HDD', 'SMART', 'RAM', 'XMP / EXPO', 'TPM', 'Secure Boot', 'BitLocker', 'Firewall (τείχος προστασίας)', 'DNS', 'Proxy', 'Σημείο επαναφοράς', 'DISM / SFC', 'WHEA', 'Μπλε οθόνη (BSOD)', 'Θύρα (port)', 'Registry'];

  function render() {
    var root = $('#tab-tools'); if (!root) return;
    var h = '';
    h += sect(I('New here? Start with this', 'Πρώτη φορά εδώ; Ξεκίνα από αυτό'), I('no computer knowledge needed', 'δεν χρειάζονται γνώσεις υπολογιστών'));
    h += box('how_to.txt', I('3 minutes', '3 λεπτά'),
      '<ol class="steps3"><li>' + I('<b>Look at the "Do this first" box</b> on the Dashboard. It shows the 3 most important things.', '<b>Κοίταξε το κουτί «Τι να κάνεις πρώτα»</b> στον Πίνακα. Δείχνει τα 3 σημαντικότερα πράγματα.') + '</li>' +
      '<li>' + I('<b>Open the Findings tab</b> and click one problem. Read "In plain words", then follow the numbered steps one by one. Each step says exactly what to click.', '<b>Άνοιξε την καρτέλα Ευρήματα</b> και πάτα ένα πρόβλημα. Διάβασε το «Με απλά λόγια» και μετά ακολούθησε τα αριθμημένα βήματα ένα ένα. Κάθε βήμα λέει ακριβώς τι να πατήσεις.') + '</li>' +
      '<li>' + I('<b>Do one thing at a time.</b> Restart the PC, then run the scan again. The Compare tab shows what got better.', '<b>Κάνε ένα πράγμα τη φορά.</b> Επανεκκίνησε τον υπολογιστή και τρέξε ξανά τη σάρωση. Η Σύνοψη δείχνει τι βελτιώθηκε.') + '</li></ol>' +
      '<p class="sub" style="margin-top:12px">' + I('Words next to a dotted underline have a hint: hold the mouse over them. The list at the bottom of this page explains every technical word.', 'Οι λέξεις με διακεκομμένη υπογράμμιση έχουν υπόδειξη: κράτα το ποντίκι πάνω τους. Η λίστα στο τέλος της σελίδας εξηγεί κάθε τεχνικό όρο.') + '</p>');
    h += box('run_a_command.txt', I('the one skill you need', 'η μία δεξιότητα που χρειάζεσαι'),
      '<p>' + I('<b>Some steps show a grey box with a command.</b> That is text you copy and paste, you do not have to understand it.', '<b>Κάποια βήματα δείχνουν ένα γκρι κουτί με μια εντολή.</b> Είναι κείμενο που αντιγράφεις και επικολλάς, δεν χρειάζεται να το καταλαβαίνεις.') + '</p>' +
      '<ol class="steps3"><li>' + I('Click <b>Copy</b> next to the command.', 'Πάτα <b>Αντιγραφή</b> δίπλα στην εντολή.') + '</li>' +
      '<li>' + I('Press the <b>Windows key</b>, type <b>PowerShell</b>. Right-click "Windows PowerShell" and choose <b>Run as administrator</b>. Click <b>Yes</b>. A blue or black window opens.', 'Πάτα το <b>πλήκτρο Windows</b>, πληκτρολόγησε <b>PowerShell</b>. Δεξί κλικ στο «Windows PowerShell» και διάλεξε <b>Εκτέλεση ως διαχειριστής</b>. Πάτα <b>Ναι</b>. Ανοίγει ένα μπλε ή μαύρο παράθυρο.') + '</li>' +
      '<li>' + I('Right-click inside the window (this pastes the text), then press <b>Enter</b>. Wait until the cursor comes back.', 'Δεξί κλικ μέσα στο παράθυρο (αυτό επικολλά το κείμενο) και μετά πάτα <b>Enter</b>. Περίμενε μέχρι να επιστρέψει ο δρομέας.') + '</li></ol>' +
      '<p class="sub" style="margin-top:12px">' + I('<b>Safe</b> means you cannot break anything. <b>Back up first</b> means copy your important files somewhere safe before you start. <b>Careful</b> means the change is in a sensitive place (BIOS or system): if you are not sure, ask someone or use the AI help tab.', '<b>Ασφαλές</b> σημαίνει ότι δεν μπορείς να χαλάσεις τίποτα. <b>Πρώτα αντίγραφο ασφαλείας</b> σημαίνει να αντιγράψεις τα σημαντικά αρχεία σου κάπου ασφαλές πριν ξεκινήσεις. <b>Προσοχή</b> σημαίνει ότι η αλλαγή γίνεται σε ευαίσθητο σημείο (BIOS ή σύστημα): αν δεν είσαι σίγουρος, ρώτα κάποιον ή χρησιμοποίησε την καρτέλα Βοήθεια AI.') + '</p>');
    h += sect(I('Pick your type of PC', 'Διάλεξε τον τύπο του PC σου'), I('changes which findings count more', 'αλλάζει ποια ευρήματα βαραίνουν περισσότερο'));
    h += '<div class="win" style="margin-bottom:18px"><div class="body"><div class="seg" id="profileSeg">' +
      Object.keys(V.PROFILES).map(function (k) { return '<button type="button" class="btn sm" data-profile="' + k + '" aria-pressed="' + (V.profile === k) + '">' + esc(V.PROFILES[k].label) + '</button>'; }).join(' ') +
      '</div><p class="sub" id="profileNote" style="margin-top:10px">' + esc(V.PROFILES[V.profile].note) + '</p></div></div>';

    if (V.readiness && V.readiness.rows.length && !V.readiness.alreadyWin11) { h += sect(I('Moving from Windows 10 to Windows 11', 'Μετάβαση από Windows 10 σε Windows 11'), I('what to do for your PC', 'τι να κάνεις για τον δικό σου υπολογιστή')); h += box('windows11_guide.txt', V.readiness.verdict, VIZ.win11Html()); }
    h += sect(I('Message for someone who helps you', 'Μήνυμα για κάποιον που σε βοηθά'), I('copy and paste into an email or ticket', 'αντίγραψε και επικόλλησε σε email ή ticket'));
    h += box('ticket.txt', I('short summary', 'σύντομη σύνοψη'), '<textarea id="ticketText" class="mono" rows="12" readonly style="width:100%"></textarea><div class="btns" style="margin-top:10px"><button class="btn sm" type="button" id="tkCopy">' + I('Copy summary', 'Αντιγραφή σύνοψης') + '</button></div><p class="sub" style="margin-top:8px">' + I('It contains the PC name. Remove that line if you do not want to share it.', 'Περιέχει το όνομα του PC. Σβήσε αυτή τη γραμμή αν δεν θέλεις να το μοιραστείς.') + '</p>');

    h += sect(I('Fix script: you choose what goes in', 'Script διορθώσεων: διαλέγεις εσύ τι μπαίνει'), I('every command stays switched off', 'κάθε εντολή μένει κλειστή'));
    var cmdF = V.findings.filter(function (f) { return f.sev !== 'info' && f.steps.some(function (st) { return st.cmd; }); });
    h += box('veagle-fix-script.ps1', I('safe by design', 'ασφαλές εκ σχεδιασμού'), '<p class="sub">' + I('Tick the problems you want in your script. Then copy or save it. <b>Nothing runs by itself:</b> every line starts with "# ", which makes Windows ignore it. You switch on only the lines you want (the file explains how).', 'Τσέκαρε τα προβλήματα που θες στο script σου. Μετά αντίγραψέ το ή αποθήκευσέ το. <b>Τίποτα δεν τρέχει μόνο του:</b> κάθε γραμμή ξεκινά με «# », που κάνει τα Windows να την αγνοούν. Ενεργοποιείς μόνο τις γραμμές που θες (το αρχείο εξηγεί πώς).') + '</p>' +
      (cmdF.length ? '<div class="btns" style="margin-top:8px"><button class="btn sm" type="button" id="fxAll">' + I('Tick all', 'Τσέκαρε όλα') + '</button><button class="btn sm" type="button" id="fxSafe">' + I('Only easy and safe', 'Μόνο εύκολα και ασφαλή') + '</button><button class="btn sm" type="button" id="fxNone">' + I('Untick all', 'Ξε-τσέκαρε όλα') + '</button></div><div class="fixlist" id="fixPick">' + cmdF.map(function (f) { var y = V.tf(f), m = V.META[f.id] || [10, 'Medium', 'Safe']; return '<label><input type="checkbox" data-fix="' + esc(f.id) + '"' + (fixSel[f.id] ? ' checked' : '') + '><span>[' + f.sev.toUpperCase() + '] ' + esc(y.title) + ' <span class="sub">(' + esc(m[1]) + ', ' + esc(m[2]) + ')</span></span></label>'; }).join('') + '</div>' : '<p class="sub">' + I('No finding has a command to put in a script.', 'Κανένα εύρημα δεν έχει εντολή για να μπει σε script.') + '</p>') +
      '<textarea id="fixText" class="mono" rows="10" readonly style="width:100%;margin-top:10px"></textarea><div class="btns" style="margin-top:10px"><button class="btn sm" type="button" id="fxCopy">' + I('Copy', 'Αντιγραφή') + '</button><button class="btn sm" type="button" id="fxSave">' + I('Save as file', 'Αποθήκευση ως αρχείο') + '</button></div>');

    h += sect(I('Export', 'Εξαγωγή'), I('for Excel or a helpdesk', 'για Excel ή helpdesk'));
    h += box('findings.csv', I('opens in Excel', 'ανοίγει στο Excel'), '<div class="btns"><button class="btn sm" type="button" id="csvSave">' + I('Save findings as CSV', 'Αποθήκευση ευρημάτων ως CSV') + '</button><button class="btn sm" type="button" id="csvCopy">' + I('Copy as text', 'Αντιγραφή ως κείμενο') + '</button></div>');

    h += sect(I('Many PCs in one table', 'Πολλά PC σε έναν πίνακα'), I('for family, friends or an office', 'για οικογένεια, φίλους ή γραφείο'));
    h += box('many_pcs.csv', I('optional', 'προαιρετικό'),
      '<p class="sub">' + I('Run the scan on each PC. Then open one report here and add the others: choose their <span class="mono">report.html</span> or <span class="mono">data.json</span> files (you can select many at once). The PCs are sorted with the sickest first.', 'Τρέξε τη σάρωση σε κάθε PC. Μετά άνοιξε εδώ μία αναφορά και πρόσθεσε τις υπόλοιπες: διάλεξε τα αρχεία <span class="mono">report.html</span> ή <span class="mono">data.json</span> τους (μπορείς πολλά μαζί). Τα PC ταξινομούνται με τον πιο «άρρωστο» πρώτο.') + '</p>' +
      '<label class="drop" for="fleetFile" id="fleetDrop"><b>' + I('Choose or drop the other reports here', 'Διάλεξε ή σύρε εδώ τις άλλες αναφορές') + '</b></label><input class="sr" type="file" id="fleetFile" multiple accept=".json,.html,application/json,text/html">' +
      '<div id="fleetOut" style="margin-top:14px">' + fleetHtml() + '</div><div class="btns" style="margin-top:10px"><button class="btn sm" type="button" id="fleetSave">' + I('Save table as CSV', 'Αποθήκευση πίνακα ως CSV') + '</button></div>');

    if (typeof TOOLS2 !== 'undefined') h += TOOLS2.html();

    h += sect(I('Windows secrets, just for fun', 'Μυστικά των Windows, για πλάκα'), I('nothing here changes your PC settings', 'τίποτα εδώ δεν αλλάζει τις ρυθμίσεις του PC σου'));
    h += box('secrets.txt', I('3 easter eggs', '3 easter eggs'),
      '<p class="sub">' + I('These are harmless extras that Microsoft or its programs hide. You do them yourself, by hand. Nothing in this app does them for you.', 'Είναι αβλαβή «μυστικά» που κρύβουν η Microsoft ή τα προγράμματά της. Τα κάνεις εσύ, με το χέρι. Τίποτα σε αυτή την εφαρμογή δεν τα κάνει για σένα.') + '</p>' +
      '<ol class="steps3">' +
      '<li>' + I('<b>God Mode</b>: one folder that lists nearly all Windows settings in one place. <b>Create it:</b> on the Desktop, right-click an empty spot, choose New, then Folder. While the name is highlighted, type exactly <span class="mono">GodMode.{ED7BA470-8E54-465E-825C-99712043E01C}</span> and press Enter. The folder turns into a control-panel icon. <b>Remove it:</b> delete the icon like any folder.', '<b>God Mode</b>: ένας φάκελος που δείχνει σχεδόν όλες τις ρυθμίσεις των Windows σε ένα σημείο. <b>Φτιάξ’ τον:</b> στην Επιφάνεια εργασίας, δεξί κλικ σε κενό σημείο, Δημιουργία, Φάκελος. Όσο το όνομα είναι επιλεγμένο, πληκτρολόγησε ακριβώς <span class="mono">GodMode.{ED7BA470-8E54-465E-825C-99712043E01C}</span> και πάτα Enter. Ο φάκελος γίνεται εικονίδιο πίνακα ελέγχου. <b>Αφαίρεσέ τον:</b> σβήσε το εικονίδιο σαν κάθε φάκελο.') + '</li>' +
      '<li>' + I('<b>Surf game in Edge</b>: a small hidden game. <b>Start it:</b> open Microsoft Edge, click the address bar, type <span class="mono">edge://surf</span> and press Enter. Steer with the arrow keys. Close the tab to stop.', '<b>Παιχνίδι surf στον Edge</b>: ένα μικρό κρυφό παιχνίδι. <b>Ξεκίνα το:</b> άνοιξε τον Microsoft Edge, πάτα τη γραμμή διευθύνσεων, πληκτρολόγησε <span class="mono">edge://surf</span> και πάτα Enter. Οδήγησε με τα βελάκια. Κλείσε την καρτέλα για να σταματήσεις.') + '</li>' +
      '<li>' + I('<b>The spinning cog</b>: the gear (Settings) icon in some Windows 11 apps spins like a fidget spinner. <b>Try it:</b> in an app that shows a gear icon, such as Notepad, right-click the gear. It does not work in every version, so it is fine if nothing happens.', '<b>Το γρανάζι που γυρίζει</b>: το εικονίδιο γραναζιού (Ρυθμίσεις) σε κάποιες εφαρμογές των Windows 11 γυρίζει σαν fidget spinner. <b>Δοκίμασέ το:</b> σε μια εφαρμογή με εικονίδιο γραναζιού, όπως το Σημειωματάριο, κάνε δεξί κλικ στο γρανάζι. Δεν δουλεύει σε κάθε έκδοση, οπότε δεν πειράζει αν δεν γίνει τίποτα.') + '</li></ol>');

    h += sect(I('Words explained', 'Εξηγήσεις λέξεων'), I('in plain language', 'με απλή γλώσσα'));
    h += box('glossary.txt', GLOSSARY.length + I(' words', ' λέξεις'), '<dl class="kv" style="grid-template-columns:180px 1fr">' + GLOSSARY.map(function (x, i) { return V.lang === 'el' ? '<dt>' + esc(GLOSSARY_EL_NAMES[i]) + '</dt><dd>' + esc(GLOSSARY_EL[i]) + '</dd>' : '<dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd>'; }).join('') + '</dl>');
    if (typeof PRO !== 'undefined') h += PRO.toolsHtml();
    root.innerHTML = h;
    refreshTexts();
    wire();
    if (typeof TOOLS2 !== 'undefined') TOOLS2.wire();
    if (typeof PRO !== 'undefined') PRO.wireTools();
  }

  function refreshTexts() {
    var a = $('#ticketText'); if (a) a.value = ticket();
    var b = $('#fixText'); if (b) b.value = fixScript();
    var root = g(D, 'meta.root', '') || 'C:\\path\\to\\VEAGLE-PC-Check';
    var rq = String(root).replace(/'/g, "''");
    var on = $('#schOn'); if (on) on.value = "$a = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument '-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File \"" + rq + "\\app\\collector.ps1\" -Quick -NoOpen'\r\n$t = New-ScheduledTaskTrigger -Weekly -WeeksInterval 4 -DaysOfWeek Sunday -At 8pm\r\n$s = New-ScheduledTaskSettingsSet -StartWhenAvailable\r\nRegister-ScheduledTask -TaskName 'VEAGLE PC Check monthly' -Action $a -Trigger $t -Settings $s -RunLevel Highest -Description 'Quick read-only PC health scan (VEAGLE PC Check)'";
    var off = $('#schOff'); if (off) off.value = "Unregister-ScheduledTask -TaskName 'VEAGLE PC Check monthly' -Confirm:$false";
    var n = $('#profileNote'); if (n) n.textContent = V.PROFILES[V.profile].note;
    $$('#profileSeg button').forEach(function (x) { x.setAttribute('aria-pressed', String(x.getAttribute('data-profile') === V.profile)); });
    var s = $('#profileSel'); if (s) s.value = V.profile;
  }

  function wire() {
    function on(id, fn) { var el = $(id); if (el) el.addEventListener('click', fn); }
    on('#tkCopy', function () { AI.toast(AI.copyText($('#ticketText').value) ? 'Summary copied.' : 'Copy failed. Select the text and press Ctrl+C.'); });
    on('#fxCopy', function () { AI.toast(AI.copyText($('#fixText').value) ? 'Fix script copied.' : 'Copy failed. Select the text and press Ctrl+C.'); });
    on('#fxSave', function () { saveFile('veagle-fix-script.ps1', $('#fixText').value, 'text/plain', true); AI.toast('Saved veagle-fix-script.ps1. All commands inside are switched off.'); });
    on('#schOnCopy', function () { AI.toast(AI.copyText($('#schOn').value) ? 'Copied. Paste it into PowerShell (as administrator).' : 'Copy failed.'); });
    on('#schOffCopy', function () { AI.toast(AI.copyText($('#schOff').value) ? 'Copied. Paste it into PowerShell (as administrator).' : 'Copy failed.'); });
    var fp = $('#fixPick');
    if (fp) fp.addEventListener('change', function (e) { var id = e.target.getAttribute && e.target.getAttribute('data-fix'); if (!id) return; fixSel[id] = e.target.checked; refreshTexts(); });
    function setAll(fn) { $$('#fixPick input').forEach(function (c) { var id = c.getAttribute('data-fix'), f = V.findings.filter(function (x) { return x.id === id; })[0], m = V.META[id] || [10, 'Medium', 'Safe']; c.checked = !!fn(f, m); fixSel[id] = c.checked; }); refreshTexts(); }
    on('#fxAll', function () { setAll(function () { return true; }); });
    on('#fxNone', function () { setAll(function () { return false; }); });
    on('#fxSafe', function () { setAll(function (f, m) { return m[1] === 'Easy' && m[2] === 'Safe'; }); });
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
