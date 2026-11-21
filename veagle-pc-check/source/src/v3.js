/* VEAGLE PC Check 3.0: start-up programs that are really active, gaming and protection checks, folders, unsigned downloads, browsers, who talks to the internet. Read-only: nothing here changes anything. */
var V3 = (function (V) {
  'use strict';
  var esc = V.esc, arr = V.arr, num = V.num, g = V.g, D = V.D;
  function I(en, el) { return V.I(en, el); }
  var EX = (D && D.extras) || {}, M6 = EX.more6 || {}, M7 = EX.more7 || {}, X1 = EX.more || {}, X5 = EX.more5 || {};
  function sect(t, n) { return '<div class="sect"><h2>' + esc(t) + '</h2><span>' + esc(n || '') + '</span></div>'; }
  function tag(cls, t) { return '<span class="tag ' + cls + '">' + esc(t) + '</span>'; }
  function tbl(heads, rows) {
    return '<div class="tbl"><table><thead><tr>' + heads.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + (c && c.html != null ? c.html : esc(c == null ? '' : c)) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
  }
  function win(title, st, inner) { return '<div class="win"><header><span>' + esc(title) + '</span><span class="st">' + esc(st || '') + '</span></header><div class="body">' + inner + '</div></div>'; }
  function kv(p) { return '<dl class="kv">' + p.filter(function (x) { return x[1] !== '' && x[1] != null; }).map(function (x) { return '<dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd>'; }).join('') + '</dl>'; }
  function tile(big, label, col) { return '<div class="win" style="flex:1 1 200px;margin:0"><div class="body"><div style="font-size:28px;font-weight:700;' + (col ? 'color:' + col : '') + '">' + esc(big) + '</div><div class="muted" style="margin-top:4px">' + esc(label) + '</div></div></div>'; }
  function yn(b) { return b == null ? '' : (b ? I('yes', 'ναι') : I('no', 'όχι')); }
  function onoff(b) { return b == null ? '' : (b ? I('on', 'ανοιχτό') : I('off', 'κλειστό')); }

  /* ---- start-up programs: active now, allowed but not running, switched off in Windows ---- */
  function startupHtml() {
    var SS = V.RT.startupState ? V.RT.startupState() : { known: false, list: [] };
    if (!SS.list.length) return '';
    var L = SS.list, c = { active: 0, idle: 0, off: 0, unknown: 0 };
    L.forEach(function (x) { c[x.state] = (c[x.state] || 0) + 1; });
    var h = sect(I('Programs that start with Windows', 'Προγράμματα που ξεκινούν με τα Windows'), I('all of them are listed, and the ones that are really active are marked', 'αναφέρονται όλα, και επισημαίνονται όσα είναι πραγματικά ενεργά'));
    if (SS.known) {
      h += '<div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:10px">' +
        tile(String(c.active), I('active now: they started with Windows and are running', 'ενεργά τώρα: ξεκίνησαν με τα Windows και τρέχουν'), c.active > 10 ? '#f5b44a' : '#3ddc84') +
        tile(String(c.idle), I('allowed to start, but not running when scanned', 'επιτρέπεται να ξεκινούν, αλλά δεν έτρεχαν όταν έγινε η σάρωση')) +
        tile(String(c.off), I('registered, but switched off in Windows', 'είναι καταχωρημένα, αλλά κλειστά από τα Windows')) + '</div>';
    } else {
      h += '<div class="muted" style="margin-bottom:8px">' + esc(I('This scan could not tell which of them are active. Run the 3.0 scan again to see it.', 'Αυτή η σάρωση δεν μπόρεσε να πει ποια είναι ενεργά. Τρέξε ξανά τη σάρωση 3.0 για να το δεις.')) + '</div>';
    }
    var chip = { active: tag('medium', I('active now', 'ενεργό τώρα')), idle: tag('info', I('allowed, not running', 'επιτρέπεται, δεν τρέχει')), off: tag('info', I('switched off', 'κλειστό')), unknown: tag('info', I('unknown', 'άγνωστο')) };
    h += '<div class="win"><div class="body">' + tbl([I('Program', 'Πρόγραμμα'), I('State', 'Κατάσταση'), I('Kind', 'Είδος'), I('For', 'Για')], L.map(function (x) {
      return [x.name, { html: chip[x.state] || '' }, x.launcher ? I('launcher, updater or chat app', 'launcher, updater ή εφαρμογή συνομιλίας') : '', x.scope === 'system' ? I('system accounts', 'λογαριασμούς συστήματος') : (x.scope === 'machine' ? I('everyone', 'όλους τους χρήστες') : (x.scope === 'user' ? I('you', 'εσένα') : ''))];
    })) + '<p class="sub" style="margin:8px 0 0">' + esc(I('To switch one off: press Ctrl+Shift+Esc, open "Startup apps" and use the switch. The program still works, it just does not start before you open it. The list reads the places Windows keeps, so a program can also start from a scheduled task or a service, which are listed in the Software tab.', 'Για να κλείσεις ένα: πάτα Ctrl+Shift+Esc, άνοιξε τις «Εφαρμογές εκκίνησης» και χρησιμοποίησε τον διακόπτη. Το πρόγραμμα δουλεύει κανονικά, απλώς δεν ξεκινά πριν το ανοίξεις. Η λίστα διαβάζει τα μέρη που κρατούν τα Windows, οπότε ένα πρόγραμμα μπορεί να ξεκινά και από προγραμματισμένη εργασία ή υπηρεσία, που φαίνονται στην καρτέλα Software.')) + '</p></div></div>';
    return h + otherStartHtml();
  }

  /* ---- other places programs start from (not shown in Task Manager) ---- */
  function otherStartHtml() {
    var M3 = (D && D.extras && D.extras.more3) || {};
    var tasks = (M3.taskDetail || []).filter(function (t) { return /Logon|Boot|SessionStateChange|Event|Registration/i.test(String(t.trigger || '')) && String(t.path || ''); });
    var svcs = (M3.svcDetail || []).filter(function (s) { return s && s.name; });
    if (!tasks.length && !svcs.length) return '';
    var h = sect(I('Other places programs start from', 'Άλλα σημεία από τα οποία ξεκινούν προγράμματα'), I('Task Manager shows only part of what starts by itself. These two lists are things it does not show: scheduled tasks that run at sign-in and programs that run as Windows services. Only non-Microsoft items are listed.', 'Ο Διαχειριστής εργασιών δείχνει μόνο ένα μέρος από όσα ξεκινούν μόνα τους. Αυτές οι δύο λίστες είναι όσα δεν δείχνει: προγραμματισμένες εργασίες που τρέχουν με τη σύνδεση και προγράμματα που τρέχουν ως υπηρεσίες των Windows. Μπαίνουν μόνο όσα δεν είναι της Microsoft.'));
    var short = function (p) { p = String(p || ''); var i = p.lastIndexOf('\\'); return i >= 0 ? p.slice(i + 1) : p; };
    if (svcs.length) {
      var run = svcs.filter(function (s) { return /running/i.test(s.state); }).length;
      h += '<div class="win"><div class="head">' + esc(I('Programs that start as services', 'Προγράμματα που ξεκινούν ως υπηρεσίες')) + ' (' + svcs.length + ', ' + run + ' ' + esc(I('running', 'τρέχουν')) + ')</div><div class="body">' + tbl([I('Service', 'Υπηρεσία'), I('State', 'Κατάσταση'), I('Runs', 'Τρέχει'), I('Note', 'Σημείωση')], svcs.map(function (s) {
        return [s.display || s.name, { html: /running/i.test(s.state) ? tag('medium', I('running', 'τρέχει')) : tag('info', I('stopped', 'σταματημένη')) }, short(s.path), s.unusual ? I(s.unusual, ({'runs from a user profile folder': 'τρέχει από φάκελο χρήστη', 'runs from a temporary or shared folder': 'τρέχει από προσωρινό ή κοινό φάκελο'})[s.unusual] || s.unusual) : ''];
      })) + '<p class="sub" style="margin:8px 0 0">' + esc(I('These start before you sign in, even if you never open the program. To stop one: press the Windows key, type Services, find it, open it and set "Startup type" to Manual. Ask first if you are not sure what it does.', 'Αυτές ξεκινούν πριν συνδεθείς, ακόμα κι αν δεν ανοίξεις ποτέ το πρόγραμμα. Για να σταματήσεις μία: πάτα το πλήκτρο Windows, γράψε Υπηρεσίες (Services), βρες την, άνοιξέ την και βάλε το «Τύπος εκκίνησης» σε Χειροκίνητη. Ρώτα πρώτα αν δεν ξέρεις τι κάνει.')) + '</p></div></div>';
    }
    if (tasks.length) {
      h += '<div class="win"><div class="head">' + esc(I('Scheduled tasks that run at sign-in', 'Προγραμματισμένες εργασίες που τρέχουν με τη σύνδεση')) + ' (' + tasks.length + ')</div><div class="body">' + tbl([I('Task', 'Εργασία'), I('When', 'Πότε'), I('Runs', 'Τρέχει'), I('As', 'Ως')], tasks.map(function (t) {
        return [String(t.name).replace(/[_{].*$/, '').replace(/S-1-5-[\d-]+/, ''), String(t.trigger), short(t.path), t.runAs || ''];
      })) + '<p class="sub" style="margin:8px 0 0">' + esc(I('Most of these are updaters (Adobe, Brave, Edge, NVIDIA). They are normal. To stop one: press the Windows key, type Task Scheduler, find the task and use "Disable". Nothing is deleted.', 'Οι περισσότερες είναι ενημερωτές (Adobe, Brave, Edge, NVIDIA). Είναι φυσιολογικές. Για να σταματήσεις μία: πάτα το πλήκτρο Windows, γράψε Task Scheduler (Προγραμματιστής εργασιών), βρες την εργασία και πάτα «Απενεργοποίηση». Δεν σβήνεται τίποτα.')) + '</p></div></div>';
    }
    return h;
  }

  /* ---- Windows protection ---- */
  function protectionHtml() {
    var S = g(D, 'security', null); if (!S) return '';
    var DX = M7.defenderExtra || {};
    var vbs = S.vbsStatus == null ? '' : (S.vbsStatus === 2 ? I('running', 'τρέχει') : (S.vbsStatus === 1 ? I('on, not running', 'ενεργοποιημένο, δεν τρέχει') : I('off', 'κλειστό')));
    var hv = S.hvci == null ? '' : onoff(Number(S.hvci) === 1);
    var cfa = DX.controlledFolders == null ? '' : (DX.controlledFolders === 1 ? I('on', 'ανοιχτό') : (DX.controlledFolders === 2 ? I('audit only', 'μόνο καταγραφή') : I('off', 'κλειστό')));
    var np = DX.networkProtection == null ? '' : (DX.networkProtection === 1 ? I('on', 'ανοιχτό') : (DX.networkProtection === 2 ? I('audit only', 'μόνο καταγραφή') : I('off', 'κλειστό')));
    var rows = [
      [I('Secure Boot', 'Secure Boot'), S.secureBoot == null ? '' : onoff(S.secureBoot)],
      [I('TPM chip', 'Τσιπ TPM'), S.tpm ? (S.tpm.ready ? I('ready', 'έτοιμο') : (S.tpm.present ? I('present, not ready', 'υπάρχει, δεν είναι έτοιμο') : I('not found', 'δεν βρέθηκε'))) : ''],
      [I('Core isolation: memory integrity (HVCI)', 'Απομόνωση πυρήνα: ακεραιότητα μνήμης (HVCI)'), hv],
      [I('Virtualization-based security', 'Ασφάλεια με εικονικοποίηση (VBS)'), vbs],
      [I('Defender: ransomware folder protection', 'Defender: προστασία φακέλων από ransomware'), cfa],
      [I('Defender: network protection', 'Defender: προστασία δικτύου'), np],
      [I('Defender: attack surface rules', 'Defender: κανόνες μείωσης επιφάνειας επίθεσης'), DX.asrRules == null ? '' : String(DX.asrRules)],
      [I('Defender: blocks unwanted programs', 'Defender: μπλοκάρει ανεπιθύμητα προγράμματα'), DX.pua == null ? '' : (DX.pua === 1 ? I('on', 'ανοιχτό') : (DX.pua === 2 ? I('audit only', 'μόνο καταγραφή') : I('off', 'κλειστό')))],
      [I('Defender: cloud protection', 'Defender: προστασία από το cloud'), DX.cloud == null ? '' : (DX.cloud > 0 ? I('on', 'ανοιχτό') : I('off', 'κλειστό'))]
    ];
    var h = win(I('Windows protection at a glance', 'Η προστασία των Windows με μια ματιά'), '', kv(rows) + '<p class="sub" style="margin:8px 0 0">' + esc(I('These are optional extras of Windows. "Off" is not a fault: ransomware folder protection and attack surface rules are for people who want a stricter setup, and can block some programs. Memory integrity can block some old drivers.', 'Αυτά είναι προαιρετικά πρόσθετα των Windows. Το «κλειστό» δεν είναι βλάβη: η προστασία φακέλων από ransomware και οι κανόνες επιφάνειας επίθεσης είναι για όσους θέλουν αυστηρότερη ρύθμιση και μπορεί να μπλοκάρουν κάποια προγράμματα. Η ακεραιότητα μνήμης μπορεί να μπλοκάρει παλιούς οδηγούς.')) + '</p>');
    return h;
  }

  /* ---- gaming checks ---- */
  function launcherCount() { var SS = V.RT.startupState ? V.RT.startupState() : { list: [] }; return SS.list.filter(function (x) { return x.launcher && x.state === 'active'; }).length; }
  function gamingHtml() {
    var gp = arr(g(D, 'gpus', []))[0];
    var gameish = launcherCount() > 0 || (gp && /geforce|radeon|rtx|gtx|rx\s?\d/i.test(String(gp.name)));
    if (!gameish) return '';
    var st = g(D, 'settings', {}) || {}, mods = arr(g(D, 'system.ram.modules', []));
    var m0 = mods[0], ramTxt = '';
    if (m0) {
      var cfg = num(m0.configuredMHz), rated = num(m0.speedMHz);
      ramTxt = mods.length + ' x ' + m0.gb + ' GB ' + (m0.type || '') + ' at ' + cfg + ' MHz' + (rated && cfg < rated - 100 ? I(' (rated ' + rated + ' MHz: it may be running slower than it can)', ' (η ονομαστική είναι ' + rated + ' MHz: ίσως τρέχει πιο αργά απ’ ό,τι μπορεί)') : '');
    }
    var boots = arr(g(D, 'boot.history', [])).slice(0, 5), bavg = boots.length ? Math.round(boots.reduce(function (a, b) { return a + num(b.seconds || b.sec || b.s || 0); }, 0) / boots.length) : 0;
    var pred = V.active().filter(function (f) { return f.id === 'pred-disk'; })[0];
    var mouse = M7.mouse || {};
    var rows = [
      [I('Screen', 'Οθόνη'), gp && gp.width ? gp.width + ' x ' + gp.height + (gp.refreshHz ? ' at ' + gp.refreshHz + ' Hz' : '') : ''],
      [I('Graphics card and driver', 'Κάρτα γραφικών και οδηγός'), gp ? gp.name + ', ' + I('driver ', 'οδηγός ') + (gp.driverFriendly || gp.driverVersion) : ''],
      [I('Memory (RAM)', 'Μνήμη (RAM)'), ramTxt],
      [I('Hardware-accelerated GPU scheduling', 'Επιτάχυνση χρονοπρογραμματισμού GPU (HAGS)'), onoff(st.gpuScheduling)],
      [I('Game Mode', 'Game Mode'), onoff(st.gameMode)],
      [I('Fast Startup', 'Γρήγορη εκκίνηση (Fast Startup)'), onoff(st.fastStartup)],
      [I('Mouse pointer precision (acceleration)', 'Ακρίβεια δείκτη ποντικιού (επιτάχυνση)'), mouse.speed == null ? '' : (mouse.speed > 0 ? I('on (many gamers switch it off)', 'ανοιχτή (πολλοί gamers την κλείνουν)') : I('off', 'κλειστή'))],
      [I('Power plan', 'Σχέδιο ενέργειας'), st.powerPlan],
      [I('Launchers and chat apps running from start-up', 'Launchers και εφαρμογές συνομιλίας που τρέχουν από την εκκίνηση'), String(launcherCount())],
      [I('Average start-up time', 'Μέσος χρόνος εκκίνησης'), bavg ? bavg + ' s' : ''],
      [I('Drive space outlook', 'Πρόβλεψη χώρου δίσκου'), pred ? pred.title : '']
    ];
    return win(I('Gaming checks', 'Έλεγχοι για gaming'), '', kv(rows) + '<p class="sub" style="margin:8px 0 0">' + esc(I('Only readings. Whether to change any of these is your choice: they are common tuning options, not faults.', 'Μόνο ενδείξεις. Το αν θα αλλάξεις κάποιο είναι δική σου επιλογή: είναι συνηθισμένες ρυθμίσεις βελτιστοποίησης, όχι βλάβες.')) + '</p>');
  }

  /* ---- folders ---- */
  function foldersHtml() {
    var F = M7.folders || {}, ds = F.desktop || {}, dl = F.downloads || {};
    if (ds.items == null && dl.items == null && M7.hiberfilMB == null) return '';
    var rows = [
      [I('Items on the Desktop', 'Στοιχεία στην Επιφάνεια εργασίας'), ds.items == null ? '' : ds.items],
      [I('Files in Downloads', 'Αρχεία στο Downloads'), dl.files == null ? '' : dl.files + ' (' + V.fmtGB((dl.mb || 0) / 1024) + ')'],
      [I('Downloads files older than 6 months', 'Αρχεία Downloads παλαιότερα των 6 μηνών'), dl.old == null ? '' : dl.old],
      [I('Hibernation file', 'Αρχείο αδρανοποίησης'), M7.hiberfilMB == null ? '' : V.fmtGB(M7.hiberfilMB / 1024)]
    ];
    return win(I('Desktop, Downloads and hibernation file', 'Επιφάνεια εργασίας, Downloads και αρχείο αδρανοποίησης'), '', kv(rows) + '<p class="sub" style="margin:8px 0 0">' + esc(I('Only counted, never opened. Old files in Downloads are the easiest place to free space: look through them yourself and delete what you no longer need.', 'Μόνο μετρήθηκαν, δεν ανοίχτηκαν. Τα παλιά αρχεία στο Downloads είναι ο πιο εύκολος τρόπος να ελευθερώσεις χώρο: κοίτα τα εσύ και σβήσε όσα δεν χρειάζεσαι.')) + '</p>');
  }

  /* ---- unsigned downloads: check them yourself on VirusTotal (opens only when you click) ---- */
  function unsignedHtml() {
    var dl = arr(g(D, 'extras.forensics.downloads', [])).filter(function (x) { return x.sig && x.sig !== 'Valid' && /\.(exe|msi|dll|scr|ps1|cpl|msix|appx)$/i.test(String(x.name)); });
    if (!dl.length) return '';
    var h = sect(I('Downloaded programs without a valid signature', 'Προγράμματα που κατέβηκαν χωρίς έγκυρη υπογραφή'), I('check them yourself; nothing is sent from this page', 'έλεγξέ τα εσύ· από αυτή τη σελίδα δεν στέλνεται τίποτα'));
    h += '<div class="win"><div class="body">' + tbl([I('File', 'Αρχείο'), I('From', 'Από'), I('Signature', 'Υπογραφή'), I('Check', 'Έλεγχος')], dl.slice(0, 20).map(function (x) {
      var link = x.sha256 ? '<a class="btn" target="_blank" rel="noopener noreferrer" href="https://www.virustotal.com/gui/file/' + encodeURIComponent(x.sha256) + '">' + esc(I('Look it up on VirusTotal', 'Αναζήτηση στο VirusTotal')) + '</a>' : esc(I('no fingerprint', 'χωρίς αποτύπωμα'));
      return [x.name, x.host || '', String(x.sig), { html: link }];
    })) + '<p class="sub" style="margin:8px 0 0">' + esc(I('The button opens the VirusTotal site in a new tab and asks about the fingerprint (SHA-256) of the file, not the file itself, so nothing is uploaded. "Not found" does not mean safe, and a few warnings from rarely used engines are common for small programs. An unsigned program is not always bad: many small free tools are unsigned.', 'Το κουμπί ανοίγει το VirusTotal σε νέα καρτέλα και ρωτά για το αποτύπωμα (SHA-256) του αρχείου, όχι για το ίδιο το αρχείο, άρα δεν ανεβαίνει τίποτα. Το «δεν βρέθηκε» δεν σημαίνει ασφαλές, και λίγες προειδοποιήσεις από σπάνιες μηχανές είναι συνηθισμένες σε μικρά προγράμματα. Ένα πρόγραμμα χωρίς υπογραφή δεν είναι πάντα κακό: πολλά μικρά δωρεάν εργαλεία δεν έχουν.')) + '</p></div></div>';
    return h;
  }

  function insightsHtml() {
    var parts = [startupHtml(), unsignedHtml()];
    var cards = [protectionHtml(), gamingHtml(), foldersHtml()].filter(Boolean);
    if (cards.length) parts.push(sect(I('Checks at a glance', 'Έλεγχοι με μια ματιά'), I('read only', 'μόνο ανάγνωση')) + '<div class="grid">' + cards.map(function (c) { return '<div class="s6">' + c + '</div>'; }).join('') + '</div>');
    return parts.join('');
  }

  /* ---- Privacy tab extras: browsers, who talks to the internet, saved Wi-Fi ---- */
  function browsersHtml() {
    var bs = V.RT.browserPriv ? V.RT.browserPriv() : []; if (!bs.length) return '';
    var dohTxt = function (b) { if (b.doh == null || b.doh === '') return ''; var v = String(b.doh).toLowerCase(); if (b.engine === 'gecko') return v === '2' || v === '3' ? I('on', 'ανοιχτό') : I('off', 'κλειστό'); return v === 'secure' ? I('on', 'ανοιχτό') : (v === 'automatic' ? I('automatic', 'αυτόματο') : I('off', 'κλειστό')); };
    var rows = bs.map(function (b) {
      return [b.browser,
        b.signedIn == null ? '' : yn(b.signedIn),
        b.safe == null ? '' : onoff(b.safe) + (b.enhanced ? I(' (enhanced)', ' (ενισχυμένη)') : ''),
        b.cookies3p == null ? (b.tracking == null ? '' : onoff(b.tracking)) : (b.cookies3p === 1 ? I('blocked', 'μπλοκαρισμένα') : (b.cookies3p === 2 ? I('blocked in private windows', 'μπλοκαρισμένα σε ιδιωτικά παράθυρα') : I('allowed', 'επιτρέπονται'))),
        b.dnt == null ? '' : onoff(b.dnt),
        b.suggest == null ? '' : onoff(b.suggest),
        dohTxt(b),
        b.passwords == null ? '' : onoff(b.passwords)];
    });
    return sect(I('Your browsers', 'Οι browsers σου'), I('only on/off switches were read, never sites, names or passwords', 'διαβάστηκαν μόνο διακόπτες ναι/όχι, ποτέ σελίδες, ονόματα ή κωδικοί')) +
      '<div class="win"><div class="body">' + tbl([I('Browser', 'Browser'), I('Sync account', 'Συγχρονισμός'), I('Safe Browsing', 'Ασφ. περιήγηση'), I('3rd-party cookies', 'Cookies τρίτων'), I('Do Not Track', 'Do Not Track'), I('Suggestions', 'Προτάσεις'), I('Encrypted DNS', 'Κρυπτ. DNS'), I('Saves passwords', 'Κωδικοί')], rows) +
      '<p class="sub" style="margin:8px 0 0">' + esc(I('Search suggestions send what you type to the search engine while you type. Signing in to sync copies bookmarks and history to your account. Both are normal and useful, just good to know. Change them in the browser: Settings > Privacy and security.', 'Οι προτάσεις αναζήτησης στέλνουν στη μηχανή αναζήτησης αυτό που γράφεις καθώς το γράφεις. Η σύνδεση για συγχρονισμό αντιγράφει σελιδοδείκτες και ιστορικό στον λογαριασμό σου. Και τα δύο είναι φυσιολογικά και χρήσιμα, απλώς καλό είναι να τα ξέρεις. Άλλαξέ τα στον browser: Ρυθμίσεις > Απόρρητο και ασφάλεια.')) + '</p></div></div>';
  }
  function talkersHtml() {
    var cn = arr(X1.connections); if (!cn.length) return '';
    var own = {}; arr(M6.connOwners).forEach(function (o) { own[String(o.process).toLowerCase()] = o; });
    var rows = cn.slice().sort(function (a, b) { return num(b.n) - num(a.n); }).map(function (c) {
      var o = own[String(c.process).toLowerCase()] || {};
      return [c.process, o.company || o.product || '', c.n, arr(c.remotes).length];
    });
    return sect(I('Who is talking to the internet', 'Ποιος μιλά με το internet'), I('the connections that were open when the scan ran', 'οι συνδέσεις που ήταν ανοιχτές όταν έτρεξε η σάρωση')) +
      '<div class="win"><div class="body">' + tbl([I('Program', 'Πρόγραμμα'), I('Made by', 'Φτιάχτηκε από'), I('Open connections', 'Ανοιχτές συνδέσεις'), I('Different servers', 'Διαφορετικοί διακομιστές')], rows) +
      '<p class="sub" style="margin:8px 0 0">' + esc(I('Most programs talk to the internet for a good reason: updates, sync, chat, your browser. Look for a program you do not know. The scan saw only what was open at that moment and did not look at what was sent.', 'Τα περισσότερα προγράμματα μιλούν με το internet για καλό λόγο: ενημερώσεις, συγχρονισμός, συνομιλία, ο browser σου. Ψάξε για κάποιο πρόγραμμα που δεν γνωρίζεις. Η σάρωση είδε μόνο όσα ήταν ανοιχτά εκείνη τη στιγμή και δεν κοίταξε τι στάλθηκε.')) + '</p></div></div>';
  }
  function wifiHtml() {
    var w = arr(X1.wifiSaved); if (!w.length) return '';
    var open = w.filter(function (x) { return /open|none|wep/i.test(String(x.auth)); }).length;
    return win(I('Saved Wi-Fi networks', 'Αποθηκευμένα δίκτυα Wi-Fi'), w.length + '', kv([[I('Networks this PC remembers', 'Δίκτυα που θυμάται ο υπολογιστής'), w.length], [I('Open or weak (no password or WEP)', 'Ανοιχτά ή αδύναμα (χωρίς κωδικό ή WEP)'), open]]) + '<p class="sub" style="margin:8px 0 0">' + esc(I('Names are not shown here. A remembered open network can be joined automatically in a cafe, so it is worth forgetting the ones you no longer use: Settings > Network & internet > Wi-Fi > Manage known networks.', 'Τα ονόματα δεν εμφανίζονται εδώ. Ένα θυμημένο ανοιχτό δίκτυο μπορεί να συνδεθεί μόνο του σε καφέ, οπότε αξίζει να ξεχάσεις όσα δεν χρησιμοποιείς: Ρυθμίσεις > Δίκτυο και internet > Wi-Fi > Διαχείριση γνωστών δικτύων.')) + '</p>');
  }
  /* ---- check your accounts (links open only when clicked) ---- */
  function accountsHtml() {
    var lnk = function (u, t) { return '<a href="' + u + '" target="_blank" rel="noopener noreferrer">' + esc(t) + '</a>'; };
    var rows = [
      [I('Devices signed in to your Microsoft account', 'Συσκευές συνδεδεμένες στον λογαριασμό Microsoft'), { html: lnk('https://account.microsoft.com/devices', I('open account.microsoft.com/devices', 'άνοιξε το account.microsoft.com/devices')) }],
      [I('Has your email appeared in a data leak?', 'Έχει εμφανιστεί το email σου σε διαρροή δεδομένων;'), { html: lnk('https://haveibeenpwned.com/', I('open haveibeenpwned.com', 'άνοιξε το haveibeenpwned.com')) }]
    ];
    return sect(I('Check your accounts', 'Έλεγξε τους λογαριασμούς σου'), I('these links open a website only when you click them. This report sends nothing and never asks for a password.', 'αυτοί οι σύνδεσμοι ανοίγουν ιστοσελίδα μόνο όταν τους πατήσεις. Η αναφορά δεν στέλνει τίποτα και δεν ζητά ποτέ κωδικό.')) +
      '<div class="win"><div class="body">' + tbl([I('What', 'Τι'), I('Where', 'Πού')], rows) + '<p class="sub" style="margin:8px 0 0">' + esc(I('On the Microsoft page, remove devices you no longer own or recognise. On the leak page, type only your email address (never a password). If it appears, change the password of that site and turn on two-step sign-in.', 'Στη σελίδα της Microsoft αφαίρεσε συσκευές που δεν έχεις πια ή δεν αναγνωρίζεις. Στη σελίδα διαρροών γράψε μόνο το email σου (ποτέ κωδικό). Αν εμφανιστεί, άλλαξε τον κωδικό σε εκείνο το site και άναψε την επαλήθευση σε δύο βήματα.')) + '</p></div></div>';
  }
  function privacyHtml() { return accountsHtml() + browsersHtml() + talkersHtml() + (wifiHtml() ? sect(I('Wi-Fi', 'Wi-Fi'), '') + wifiHtml() : ''); }

  return { insightsHtml: insightsHtml, privacyHtml: privacyHtml };
})(V);
