/* VEAGLE PC Check 2.6.0 - Privacy tab: what this PC shares, what your apps may use, who can get in. Read-only: nothing here changes anything. */
var PRIV = (function (V) {
  'use strict';
  var $ = V.$, esc = V.esc, arr = V.arr, num = V.num, g = V.g, D = V.D;
  function I(en, el) { return V.I(en, el); }
  var EX = (D && D.extras) || {}, X5 = EX.more5 || {}, X1 = EX.more || {}, SENS = g(D, 'extras.help.sensors', null) || {};
  var GRP = [
    ['ms', 'What goes to Microsoft', 'Τι πηγαίνει στη Microsoft', 'Data that Windows or Microsoft services can send out of this PC.', 'Δεδομένα που τα Windows ή οι υπηρεσίες της Microsoft μπορούν να στείλουν έξω από αυτόν τον υπολογιστή.'],
    ['ads', 'Ads, tips and profiling', 'Διαφημίσεις, συμβουλές και προφίλ', 'Switches that let Windows and websites show things based on you.', 'Διακόπτες που αφήνουν τα Windows και τις ιστοσελίδες να δείχνουν πράγματα με βάση εσένα.'],
    ['apps', 'Camera, microphone and location', 'Κάμερα, μικρόφωνο και τοποθεσία', 'Whether apps in general may use them.', 'Αν οι εφαρμογές γενικά επιτρέπεται να τα χρησιμοποιούν.'],
    ['local', 'What this PC remembers about you', 'Τι θυμάται αυτός ο υπολογιστής για σένα', 'Traces of your activity kept on this PC itself.', 'Ίχνη της δραστηριότητάς σου που μένουν στον ίδιο τον υπολογιστή.']
  ];
  var CAP = {
    webcam: ['Camera', 'Κάμερα'], microphone: ['Microphone', 'Μικρόφωνο'], location: ['Location', 'Τοποθεσία'],
    contacts: ['Contacts', 'Επαφές'], appointments: ['Calendar', 'Ημερολόγιο'], email: ['E-mail', 'Email'], chat: ['Messages', 'Μηνύματα'], phoneCall: ['Phone calls', 'Κλήσεις'], phoneCallHistory: ['Call history', 'Ιστορικό κλήσεων'],
    radios: ['Control Wi-Fi, Bluetooth', 'Έλεγχος Wi-Fi και Bluetooth'], bluetooth: ['Bluetooth devices', 'Συσκευές Bluetooth'], userAccountInformation: ['Your name and picture', 'Όνομα και φωτογραφία σου'],
    documentsLibrary: ['Documents folder', 'Φάκελος Έγγραφα'], picturesLibrary: ['Pictures folder', 'Φάκελος Εικόνες'], videosLibrary: ['Videos folder', 'Φάκελος Βίντεο'], broadFileSystemAccess: ['All your files', 'Όλα τα αρχεία σου'],
    appDiagnostics: ['Info about other apps', 'Πληροφορίες για άλλες εφαρμογές'], userNotificationListener: ['Your notifications', 'Οι ειδοποιήσεις σου'], graphicsCaptureProgrammatic: ['Screen capture', 'Λήψη οθόνης'], gazeInput: ['Eye tracking', 'Παρακολούθηση ματιών'], activity: ['Activity', 'Δραστηριότητα']
  };
  function appName(a) { return String(a || '').split('\\').pop().replace(/_[a-z0-9]{13}$/i, '').replace(/^Microsoft\./, ''); }
  function when(iso) { return iso ? V.fmtDT(iso) : ''; }
  function box(title, st, inner) { return '<div class="win"><header><span>' + esc(title) + '</span><span class="st">' + esc(st || '') + '</span></header><div class="body">' + inner + '</div></div>'; }
  function sect(t, n) { return '<div class="sect"><h2>' + esc(t) + '</h2><span>' + esc(n || '') + '</span></div>'; }
  function badge(open) { return '<span class="tag ' + (open ? 'medium' : 'info') + '">' + esc(open ? I('shares more', 'μοιράζεται περισσότερα') : I('closed', 'κλειστό')) + '</span>'; }
  function kv(p) { return '<dl class="kv">' + p.filter(function (x) { return x[1] !== '' && x[1] != null; }).map(function (x) { return '<dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd>'; }).join('') + '</dl>'; }
  function tile(big, label, col) { return '<div class="win" style="flex:1 1 220px;margin:0"><div class="body"><div style="font-size:30px;font-weight:700;' + (col ? 'color:' + col : '') + '">' + esc(big) + '</div><div class="muted" style="margin-top:4px">' + esc(label) + '</div></div></div>'; }

  function capCard(key, glob, allowed, recent, apps) {
    var nm = CAP[key] ? I(CAP[key][0], CAP[key][1]) : key;
    var gl = String(glob || '');
    var st = gl === 'Deny' ? I('off for all apps', 'κλειστό για όλες τις εφαρμογές') : (gl === 'Allow' ? I('on', 'ανοιχτό') : gl);
    var h = '<div class="s4"><div class="win"><header><span>' + esc(nm) + '</span><span class="st">' + esc(st) + '</span></header><div class="body">' +
      '<div class="muted" style="margin-bottom:6px">' + esc(I(allowed + ' app(s) allowed, ' + recent + ' used it in the last 30 days', allowed + ' εφαρμογή/ές με άδεια, ' + recent + ' το χρησιμοποίησαν τις τελευταίες 30 ημέρες')) + '</div>';
    h += apps.length ? apps.slice(0, 6).map(function (a) { return '<div class="row" style="gap:8px;justify-content:space-between"><span>' + esc(appName(a.app)) + '</span><span class="muted">' + esc(a.last ? when(a.last) : I('never used', 'δεν χρησιμοποιήθηκε')) + '</span></div>'; }).join('') : '<div class="muted">' + esc(I('No app has this permission.', 'Καμία εφαρμογή δεν έχει αυτή την άδεια.')) + '</div>';
    return h + '</div></div></div>';
  }
  function sensorCaps() {
    var out = [];
    ['webcam', 'microphone', 'location'].forEach(function (k) {
      var s = SENS[k]; if (!s) return;
      var its = arr(s.items), recent = its.filter(function (x) { return x.last && (Date.now() - new Date(x.last).getTime()) < 30 * 864e5; }).length;
      out.push({ key: k, global: s.global, allowed: its.filter(function (x) { return x.allow === 'Allow'; }).length, recent: recent, apps: its.filter(function (x) { return x.allow === 'Allow'; }).map(function (x) { return { app: String(x.app).split('\\').pop(), last: x.last }; }) });
    });
    return out;
  }

  function render() {
    var el = $('#tab-privacy'); if (!el) return;
    var items = V.RT.privAll ? V.RT.privAll() : [];
    var open = items.filter(function (x) { return x.open && x.id !== 'findMyDevice'; });
    var wide = V.RT.wideApps ? V.RT.wideApps() : [];
    var pf = V.active().filter(function (f) { return f.area === 'Privacy' && f.sev !== 'info'; });
    var SG = X5.signIn || {}, LK = X5.lockMore || {}, P = X5.power || {}, SEC = EX.securityMore || {};
    var accts = arr(X1.accounts).filter(function (u) { return u.enabled; });
    var h = '<div class="win" style="margin-bottom:16px"><div class="body"><b>' + esc(I('This page is about you, not about your PC.', 'Αυτή η σελίδα αφορά εσένα, όχι τον υπολογιστή σου.')) + '</b> ' +
      esc(I('It shows what Windows shares or remembers, what your apps are allowed to see and use, and who can get into this PC. Everything here was only read. Nothing was changed and nothing was sent anywhere. Closing a switch is always your choice: nothing here is required for the PC to work, and every row says exactly where to click.', 'Δείχνει τι μοιράζονται ή θυμούνται τα Windows, τι επιτρέπεται να βλέπουν και να χρησιμοποιούν οι εφαρμογές σου, και ποιος μπορεί να μπει σε αυτόν τον υπολογιστή. Όλα αυτά απλώς διαβάστηκαν. Δεν άλλαξε τίποτα και δεν στάλθηκε τίποτα πουθενά. Το κλείσιμο ενός διακόπτη είναι πάντα δική σου επιλογή: τίποτα εδώ δεν είναι απαραίτητο για να δουλεύει ο υπολογιστής, και κάθε γραμμή λέει ακριβώς πού να πατήσεις.')) + '</div></div>';
    h += '<div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:8px">' +
      tile(open.length + ' / ' + items.length, I('privacy switches that share more than needed', 'διακόπτες απορρήτου που μοιράζονται παραπάνω'), open.length > 6 ? '#e82c2d' : (open.length > 2 ? '#f5b44a' : '#3ddc84')) +
      tile(String(wide.length), I('wide app permissions (not from Microsoft)', 'ευρείες άδειες εφαρμογών (όχι της Microsoft)'), wide.length > 2 ? '#f5b44a' : '#3ddc84') +
      tile(String(pf.length), I('privacy and account findings to look at', 'ευρήματα απορρήτου και λογαριασμών'), pf.length ? '#f5b44a' : '#3ddc84') + '</div>';
    if (pf.length) h += '<div class="muted" style="margin:6px 0 0">' + esc(I('See them in the Findings page, area "Privacy".', 'Δες τα στη σελίδα Ευρήματα, περιοχή «Απόρρητο».')) + ' <button type="button" class="btn" data-area-go="Privacy">' + esc(I('Open the findings', 'Άνοιξε τα ευρήματα')) + '</button></div>';

    h += sect(I('Every privacy switch', 'Κάθε διακόπτης απορρήτου'), I('"shares more" means Windows is set to send or remember more than it needs to', '«μοιράζεται περισσότερα» σημαίνει ότι τα Windows στέλνουν ή θυμούνται περισσότερα απ’ όσα χρειάζονται'));
    GRP.forEach(function (gr) {
      var rows = items.filter(function (x) { return x.group === gr[0]; }); if (!rows.length) return;
      h += '<div class="win" style="margin-bottom:14px"><header><span>' + esc(I(gr[1], gr[2])) + '</span><span class="st">' + esc(I(gr[3], gr[4])) + '</span></header><div class="body"><div class="tbl"><table><thead><tr><th>' + esc(I('Setting', 'Ρύθμιση')) + '</th><th>' + esc(I('State', 'Κατάσταση')) + '</th><th>' + esc(I('How to change it', 'Πώς αλλάζει')) + '</th></tr></thead><tbody>' +
        rows.map(function (x) { return '<tr><td>' + esc(I(x.en, x.el)) + '</td><td>' + (x.id === 'findMyDevice' ? '<span class="tag info">' + esc(I('your choice', 'δική σου επιλογή')) + '</span>' : badge(x.open)) + '</td><td class="muted">' + esc(I(x.fen, x.fel)) + '</td></tr>'; }).join('') + '</tbody></table></div></div></div>';
    });

    var caps = sensorCaps().concat(arr(X5.permissions).filter(function (p) { return p.allowed > 0 && CAP[p.key]; }).map(function (p) { return { key: p.key, global: p.global, allowed: p.allowed, recent: p.usedRecently, apps: arr(p.apps) }; }));
    h += sect(I('What apps are allowed to use', 'Τι επιτρέπεται να χρησιμοποιούν οι εφαρμογές'), I('programs that have a permission, and when they last used it (Windows keeps this list itself)', 'προγράμματα με άδεια και πότε την χρησιμοποίησαν τελευταία φορά (τη λίστα την κρατούν τα ίδια τα Windows)'));
    if (!caps.length) h += '<div class="win"><div class="body muted">' + esc(I('No app permissions could be read on this PC.', 'Δεν διαβάστηκαν άδειες εφαρμογών σε αυτόν τον υπολογιστή.')) + '</div></div>';
    else h += '<div class="grid">' + caps.map(function (c) { return capCard(c.key, c.global, c.allowed, c.recent, c.apps); }).join('') + '</div>' +
      '<div class="muted" style="margin-top:8px">' + esc(I('To change a permission: Settings > Privacy & security, click the permission, and switch the app off. If a program stops working, switch it back on.', 'Για να αλλάξεις μια άδεια: Ρυθμίσεις > Απόρρητο και ασφάλεια, πάτα την άδεια και κλείσε την εφαρμογή. Αν ένα πρόγραμμα σταματήσει να δουλεύει, ξανάνοιξέ το.')) + '</div>';

    h += sect(I('Accounts and sign-in', 'Λογαριασμοί και είσοδος'), I('who can get into this PC, and how', 'ποιος μπορεί να μπει σε αυτόν τον υπολογιστή και πώς'));
    var admins = accts.filter(function (u) { return u.isAdmin; }).length, onlyMs = SG.msAccounts > 0 && SG.localAccounts === 0, nopw = accts.filter(function (u) { return u.noPassword && !u.isGuest && !u.msa && !onlyMs; }).length, guest = accts.some(function (u) { return u.isGuest; });
    h += '<div class="grid"><div class="s6">' + box(I('Accounts on this PC', 'Λογαριασμοί σε αυτόν τον υπολογιστή'), accts.length ? accts.length + '' : '', kv([
      [I('Active accounts', 'Ενεργοί λογαριασμοί'), accts.length || ''],
      [I('Administrators', 'Διαχειριστές'), accts.length ? admins : ''],
      [I('Microsoft accounts / local accounts', 'Λογαριασμοί Microsoft / τοπικοί'), SG.msAccounts != null ? SG.msAccounts + ' / ' + SG.localAccounts : ''],
      [I('Accounts allowed to have no password', 'Λογαριασμοί που επιτρέπεται να μην έχουν κωδικό'), accts.length ? nopw : ''],
      [I('"Guest" account', 'Λογαριασμός «Guest»'), accts.length ? (guest ? I('on', 'ανοιχτός') : I('off', 'κλειστός')) : ''],
      [I('Windows signs in by itself', 'Τα Windows μπαίνουν μόνα τους'), SEC.autoLogon === true ? I('yes (no password)', 'ναι (χωρίς κωδικό)') : (SEC.autoLogon === false ? I('no', 'όχι') : '')]
    ])) + '</div><div class="s6">' + box(I('Sign-in and locking', 'Είσοδος και κλείδωμα'), '', kv([
      [I('PIN set for this user', 'PIN για αυτόν τον χρήστη'), SG.pinSet == null ? '' : (SG.pinSet ? I('yes', 'ναι') : I('no', 'όχι'))],
      [I('Fingerprint or face sensor', 'Αισθητήρας δακτυλικού ή προσώπου'), SG.biometricDevice == null ? '' : (SG.biometricDevice ? I('found', 'βρέθηκε') : I('none', 'δεν υπάρχει'))],
      [I('Screen saver asks for a password', 'Η προφύλαξη οθόνης ζητά κωδικό'), LK.saverOn == null ? '' : (LK.saverOn === 1 && LK.saverSecure === 1 ? I('yes, after ' + Math.round(num(LK.saverSecs) / 60) + ' min', 'ναι, μετά από ' + Math.round(num(LK.saverSecs) / 60) + ' λεπτά') : I('no', 'όχι'))],
      [I('Company inactivity lock', 'Κλείδωμα αδράνειας της εταιρείας'), LK.inactivitySecs ? Math.round(num(LK.inactivitySecs) / 60) + ' min' : ''],
      [I('Screen turns off after (plugged in)', 'Η οθόνη σβήνει μετά από (στην πρίζα)'), P.acDisplayMin == null ? '' : (P.acDisplayMin === 0 ? I('never', 'ποτέ') : P.acDisplayMin + ' min')],
      [I('Lock the PC yourself', 'Κλείδωσε μόνος σου τον υπολογιστή'), I('hold the Windows key and press L', 'κράτα πατημένο το πλήκτρο Windows και πάτα L')]
    ])) + '</div></div>';
    el.innerHTML = h;
    var b = el.querySelector('[data-area-go]'); if (b) b.addEventListener('click', function () { if (typeof VIZ2 !== 'undefined' && VIZ2.goArea) VIZ2.goArea('Privacy'); });
  }
  return { render: render };
})(V);
