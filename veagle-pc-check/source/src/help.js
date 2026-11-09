/* VEAGLE PC Check 2.1.0 - "Help & AI" tab: send the scan to an IT helper (zip with the report and a form), "what is wrong?" picker,
   "since when" changes, remote-help readiness, devices, camera/microphone/location use. Nothing is sent by the app: the zip is saved and the person attaches it. */
var HELP = (function (V, UI, AI, SHARE, XLSX) {
  'use strict';
  var $ = V.$, $$ = V.$$, esc = V.esc, arr = V.arr, g = V.g, D = V.D;
  function I(en, el) { return V.I(en, el); }
  var st = { seg: 'it', sym: '', since: '', name: '', contact: '', pcNick: '', problem: '', often: '', before: '', tried: '', urgency: 'normal', avail: '', consent: false, to: '', mode: 'full', done: null };
  var SEVR = { high: 0, medium: 1, low: 2, info: 3 };

  function code() {
    var s = String(g(D, 'meta.computer', 'PC')) + '|' + String(g(D, 'meta.generated', '')), h = 2166136261, i;
    for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    var t = h.toString(36).toUpperCase().padStart(6, '0').slice(-6);
    return 'VPC-' + t.slice(0, 4) + '-' + t.slice(4);
  }

  /* ---------- 1. what is wrong? ---------- */
  var SYMS = [
    { k: 'slow', en: 'My PC is slow', el: 'Ο υπολογιστής είναι αργός', f: function (f) { return /^(perf-|sto-|soft-unused|sec-persist)/.test(f.id) || f.area === 'Performance'; },
      tipEn: 'Slowness is most often a full drive, too many programs starting with Windows, or too little memory.', tipEl: 'Η αργοπορία οφείλεται συνήθως σε γεμάτο δίσκο, πολλά προγράμματα που ξεκινούν με τα Windows ή λίγη μνήμη.' },
    { k: 'hot', en: 'It gets hot or the fan is loud', el: 'Ζεσταίνεται ή ο ανεμιστήρας θορυβεί', f: function (f) { return /^(perf-heat|perf-throttle|perf-gpuheat|perf-bottleneck|hw-age)/.test(f.id); },
      tipEn: 'Dust, old thermal paste and heavy programs are the usual reasons.', tipEl: 'Σκόνη, παλιά θερμική πάστα και βαριά προγράμματα είναι οι συνηθισμένες αιτίες.' },
    { k: 'crash', en: 'It freezes, restarts or shows blue screens', el: 'Κολλάει, επανεκκινεί ή βγάζει μπλε οθόνη', f: function (f) { return f.area === 'Stability' || /^cor-/.test(f.id); },
      tipEn: 'Look at the newest items first: they show what changed just before the problems.', tipEl: 'Ξεκίνα από τα πιο πρόσφατα: δείχνουν τι άλλαξε λίγο πριν τα προβλήματα.' },
    { k: 'net', en: 'No internet or slow Wi-Fi', el: 'Δεν έχω internet ή το Wi-Fi είναι αργό', f: function (f) { return f.area === 'Network' || /^net-/.test(f.id); },
      tipEn: 'Restart the router first (unplug for 30 seconds), then check these items.', tipEl: 'Πρώτα κάνε επανεκκίνηση στο router (βγάλε το καλώδιο ρεύματος για 30 δευτερόλεπτα), μετά δες αυτά.' },
    { k: 'disk', en: 'The drive is full', el: 'Ο δίσκος είναι γεμάτος', f: function (f) { return f.area === 'Storage'; },
      tipEn: 'Nothing is deleted by this app. Check the biggest folders on the Insights tab.', tipEl: 'Η εφαρμογή δεν σβήνει τίποτα. Δες τους μεγαλύτερους φακέλους στην καρτέλα Ανάλυση.' },
    { k: 'bat', en: 'The battery drains fast', el: 'Η μπαταρία αδειάζει γρήγορα', f: function (f) { return /bat/.test(f.id); },
      tipEn: 'Old batteries lose capacity. The wear number tells you how much.', tipEl: 'Οι παλιές μπαταρίες χάνουν χωρητικότητα. Η φθορά σου δείχνει πόσο.' },
    { k: 'bad', en: 'I think something is wrong (virus, strange pop-ups, I clicked something)', el: 'Νομίζω ότι κάτι δεν πάει καλά (ιός, περίεργα παράθυρα, πάτησα κάτι)', f: function (f) { return f.area === 'Security' || /^for-/.test(f.id); },
      tipEn: 'Do not worry. These items only show what Windows recorded. If you see a red one, send the report to your IT helper.', tipEl: 'Μην ανησυχείς. Αυτά δείχνουν μόνο ό,τι κατέγραψαν τα Windows. Αν δεις κόκκινο, στείλε την αναφορά στον IT.' },
    { k: 'upd', en: 'Windows updates do not work', el: 'Οι ενημερώσεις των Windows δεν δουλεύουν', f: function (f) { return f.area === 'Updates' || /^upd-/.test(f.id); },
      tipEn: 'Failed updates usually leave a trace here.', tipEl: 'Οι ενημερώσεις που αποτυγχάνουν αφήνουν συνήθως ίχνος εδώ.' },
    { k: 'dev', en: 'Sound, camera, printer or another device does not work', el: 'Ήχος, κάμερα, εκτυπωτής ή άλλη συσκευή δεν δουλεύει', f: function (f) { return /^(dev-|drv|prn-|use-sensors)/.test(f.id) || /driver/i.test(f.title || ''); },
      tipEn: 'See the Devices box below: it shows which device Windows reports as faulty.', tipEl: 'Δες το κουτί Συσκευές παρακάτω: δείχνει ποια συσκευή αναφέρουν τα Windows ως προβληματική.' }
  ];
  function symptomsHtml() {
    var h = '<div class="chips">' + SYMS.map(function (s) { return '<button type="button" class="ch' + (st.sym === s.k ? ' on' : '') + '" data-hsym="' + s.k + '">' + esc(I(s.en, s.el)) + '</button>'; }).join('') + '</div>';
    var s = SYMS.filter(function (x) { return x.k === st.sym; })[0];
    if (!s) return h + '<p class="sub">' + esc(I('Pick what bothers you. I will show only the findings that can be related to it.', 'Διάλεξε τι σε ενοχλεί. Θα δείξω μόνο τα ευρήματα που μπορεί να σχετίζονται.')) + '</p>';
    var list = V.openList().filter(s.f).sort(function (a, b) { return (SEVR[a.sev] - SEVR[b.sev]); }).slice(0, 6);
    h += '<p class="sub">' + esc(I(s.tipEn, s.tipEl)) + '</p>';
    if (!list.length) return h + '<div class="sub">' + esc(I('The scan found nothing related to this. That is good news. If it still happens, tell your IT helper when it happens.', 'Η σάρωση δεν βρήκε κάτι σχετικό. Αυτό είναι καλό. Αν συνεχίζει να συμβαίνει, πες στον IT πότε συμβαίνει.')) + '</div>';
    return h + list.map(function (f0) { var f = V.tf(f0); return '<div class="action" style="margin-top:8px"><div style="min-width:0"><div class="row" style="gap:8px"><span class="tag ' + f.sev + '">' + f.sev.toUpperCase() + '</span></div><div style="font-weight:700;margin:4px 0">' + esc(f.title) + '</div><button class="btn sm" type="button" data-open="' + esc(f.id) + '">' + esc(I('Show me how, step by step', 'Δείξε μου βήμα-βήμα')) + '</button></div></div>'; }).join('');
  }

  /* ---------- 2. since when ---------- */
  var CHG = ['update', 'install', 'svcinst', 'uninstall', 'acct', 'timechg', 'defoff', 'logclear'];
  var PRB = ['crash', 'hang', 'unclean', 'bsod', 'disk', 'whea', 'gpu', 'svc', 'updfail', 'ports'];
  function sinceHtml() {
    var tl = arr(g(D, 'extras.timeline', [])), KN = (typeof VIZ !== 'undefined' && VIZ.KN) || {};
    var h = '<label class="lbl" for="hSince">' + esc(I('When did the problem start? (an approximate date is fine)', 'Πότε ξεκίνησε το πρόβλημα; (κατά προσέγγιση)')) + '</label><input type="date" id="hSince" value="' + esc(st.since) + '">';
    if (!st.since) return h + '<p class="sub">' + esc(I('Pick the date and I will list what changed on this PC in the 7 days before it.', 'Διάλεξε την ημερομηνία και θα δείξω τι άλλαξε στον υπολογιστή τις 7 μέρες πριν.')) + '</p>';
    var d0 = new Date(st.since + 'T00:00:00').getTime(), a = d0 - 7 * 86400000, b = d0 + 86400000;
    var first = tl.length ? Math.min.apply(null, tl.map(function (e) { return new Date(e.t).getTime(); })) : null;
    var ev = tl.filter(function (e) { var t = new Date(e.t).getTime(); return t >= a && t <= b && KN[e.k] && (CHG.indexOf(e.k) >= 0 || PRB.indexOf(e.k) >= 0); }).sort(function (x, y) { return new Date(x.t) - new Date(y.t); });
    if (first && d0 < first) h += '<p class="sub">' + esc(I('The scan only remembers the last 30 days, so older changes cannot be shown.', 'Η σάρωση θυμάται μόνο τις τελευταίες 30 ημέρες, οπότε παλιότερες αλλαγές δεν φαίνονται.')) + '</p>';
    if (!ev.length) return h + '<div class="sub">' + esc(I('Nothing was recorded in that period.', 'Δεν καταγράφηκε τίποτα εκείνη την περίοδο.')) + '</div>';
    return h + '<div class="hlist">' + ev.map(function (e) {
      var k = KN[e.k], isP = PRB.indexOf(e.k) >= 0, x = e.x ? ' ' + String(e.x).slice(0, 90) : '';
      return '<div class="hrow"><span class="hdot" style="background:' + (isP ? '#E82C2D' : '#9ca3af') + '"></span><span class="hwhen">' + esc(V.fmtDT(e.t)) + '</span><span>' + esc(I(k[0], k[1]) + x) + '</span></div>';
    }).join('') + '</div><p class="sub">' + esc(I('Red = something went wrong. Grey = something changed (an update, a new program...). Changes just before the first red item are the first suspects.', 'Κόκκινο = κάτι πήγε στραβά. Γκρι = κάτι άλλαξε (ενημέρωση, νέο πρόγραμμα...). Οι αλλαγές ακριβώς πριν το πρώτο κόκκινο είναι οι πρώτοι ύποπτοι.')) + '</p>';
  }

  /* ---------- 3. remote-help readiness ---------- */
  function yn(v, okEn, okEl, noEn, noEl) { return '<div class="hrow"><span class="hdot" style="background:' + (v ? '#3ddc84' : '#9ca3af') + '"></span><span>' + esc(v ? I(okEn, okEl) : I(noEn, noEl)) + '</span></div>'; }
  function remoteHtml() {
    var r = g(D, 'extras.help.remote', null);
    if (!r) return '<div class="sub">' + esc(I('This scan is older than version 2.1.0 and has no remote-help data. Run the scan again.', 'Αυτή η σάρωση είναι παλιότερη από την έκδοση 2.1.0 και δεν έχει στοιχεία απομακρυσμένης βοήθειας. Τρέξε ξανά τη σάρωση.')) + '</div>';
    var tools = arr(r.tools), ok = r.quickAssist || tools.length > 0, h = '';
    h += '<div class="hverdict ' + (ok ? 'ok' : 'no') + '">' + esc(ok ? I('Yes, your helper can connect to this PC.', 'Ναι, ο τεχνικός μπορεί να συνδεθεί σε αυτόν τον υπολογιστή.') : I('I do not see a remote-help program. Windows normally has Quick Assist, so ask your helper.', 'Δεν βλέπω πρόγραμμα απομακρυσμένης βοήθειας. Τα Windows έχουν συνήθως το Quick Assist, ρώτα τον τεχνικό σου.')) + '</div>';
    h += yn(r.quickAssist, 'Quick Assist is available (built into Windows).', 'Το Quick Assist (Γρήγορη βοήθεια) υπάρχει, είναι μέρος των Windows.', 'Quick Assist was not found.', 'Το Quick Assist δεν βρέθηκε.');
    h += yn(tools.length > 0, 'Remote-help programs installed: ' + tools.join(', ') + '.', 'Εγκατεστημένα προγράμματα απομακρυσμένης βοήθειας: ' + tools.join(', ') + '.', 'No other remote-help program is installed (not needed).', 'Δεν υπάρχει άλλο πρόγραμμα απομακρυσμένης βοήθειας (δεν χρειάζεται).');
    h += yn(r.wifiUp || r.wiredUp, 'Internet connection is active (' + (r.wiredUp ? 'cable' : 'Wi-Fi') + ').', 'Η σύνδεση internet είναι ενεργή (' + (r.wiredUp ? 'καλώδιο' : 'Wi-Fi') + ').', 'No active network adapter was seen.', 'Δεν φάνηκε ενεργός προσαρμογέας δικτύου.');
    h += yn(r.isAdmin, 'The scan ran as Administrator, so you can approve changes the helper asks for.', 'Η σάρωση έτρεξε ως Διαχειριστής, άρα μπορείς να εγκρίνεις ό,τι ζητήσει ο τεχνικός.', 'The scan did not run as Administrator. Your helper may need your Windows password to change things.', 'Η σάρωση δεν έτρεξε ως Διαχειριστής. Ο τεχνικός μπορεί να χρειαστεί τον κωδικό σου για αλλαγές.');
    h += '<details class="hdet"><summary>' + esc(I('How to let your helper connect (step by step)', 'Πώς θα συνδεθεί ο τεχνικός (βήμα-βήμα)')) + '</summary><ol><li>' + esc(I('Your helper gives you a 6-digit code (or asks you to give yours).', 'Ο τεχνικός σου δίνει έναν 6ψήφιο κωδικό (ή σου ζητά τον δικό σου).')) + '</li><li>' + esc(I('Press the Windows key, type "Quick Assist" (in Greek: "Γρήγορη βοήθεια") and open it.', 'Πάτα το πλήκτρο Windows, γράψε "Γρήγορη βοήθεια" (ή "Quick Assist") και άνοιξέ το.')) + '</li><li>' + esc(I('Under "Get help", type the code and press "Submit".', 'Στο «Λήψη βοήθειας» γράψε τον κωδικό και πάτα «Υποβολή».')) + '</li><li>' + esc(I('Press "Allow" when it asks if your helper may see your screen. You can stop at any time with the red "Pause" or "End" button at the top.', 'Πάτα «Να επιτρέπεται» όταν ρωτήσει αν ο τεχνικός μπορεί να δει την οθόνη σου. Μπορείς να σταματήσεις οποιαδήποτε στιγμή με το κουμπί «Παύση» ή «Τέλος» πάνω.')) + '</li></ol></details>';
    if (r.rdpEnabled) h += '<div class="sub">' + esc(I('Technician note: Remote Desktop is switched ON on this PC' + (r.rdpNla ? ' (with Network Level Authentication).' : ' (without Network Level Authentication).'), 'Σημείωση για τεχνικό: η Απομακρυσμένη επιφάνεια εργασίας είναι ΕΝΕΡΓΗ σε αυτόν τον υπολογιστή' + (r.rdpNla ? ' (με ταυτοποίηση επιπέδου δικτύου).' : ' (χωρίς ταυτοποίηση επιπέδου δικτύου).'))) + '</div>';
    return h;
  }

  /* ---------- 4. devices ---------- */
  function devRow(name, status, code) {
    var bad = code && code !== 0 || (status && !/^OK$/i.test(status) && status !== 'Unknown' && status !== '');
    return '<div class="hrow"><span class="hdot" style="background:' + (bad ? '#E82C2D' : '#3ddc84') + '"></span><span>' + esc(name) + (bad ? ' - ' + esc(I('Windows reports a problem' + (code ? ' (code ' + code + ')' : ''), 'τα Windows αναφέρουν πρόβλημα' + (code ? ' (κωδικός ' + code + ')' : ''))) : '') + '</span></div>';
  }
  function devicesHtml() {
    var dv = g(D, 'extras.help.devices', null);
    if (!dv) return '<div class="sub">' + esc(I('This scan has no device list. Run the scan again with version 2.1.0.', 'Αυτή η σάρωση δεν έχει λίστα συσκευών. Τρέξε ξανά τη σάρωση με την έκδοση 2.1.0.')) + '</div>';
    function grp(titleEn, titleEl, items, emptyEn, emptyEl) {
      return '<div class="lbl" style="margin-top:10px">' + esc(I(titleEn, titleEl)) + '</div>' + (arr(items).length ? arr(items).map(function (x) { return devRow(x.name, x.status, x.code); }).join('') : '<div class="sub">' + esc(I(emptyEn, emptyEl)) + '</div>');
    }
    var h = grp('Sound devices', 'Συσκευές ήχου', dv.audio, 'No sound device was found.', 'Δεν βρέθηκε συσκευή ήχου.');
    h += grp('Speakers and headphones', 'Ηχεία και ακουστικά', dv.speakers, 'None found.', 'Δεν βρέθηκαν.');
    h += grp('Microphones', 'Μικρόφωνα', dv.mics, 'No microphone found.', 'Δεν βρέθηκε μικρόφωνο.');
    h += grp('Cameras', 'Κάμερες', dv.cameras, 'No camera found.', 'Δεν βρέθηκε κάμερα.');
    h += grp('Bluetooth', 'Bluetooth', dv.bluetooth, 'No Bluetooth device found.', 'Δεν βρέθηκε συσκευή Bluetooth.');
    var pr = arr(g(D, 'extras.more2.printers', []));
    h += '<div class="lbl" style="margin-top:10px">' + esc(I('Printers', 'Εκτυπωτές')) + '</div>' + (pr.length ? pr.map(function (x) { return devRow(x.name + (x.isDefault ? ' (' + I('default', 'προεπιλογή') + ')' : ''), x.status === 'Normal' || x.status === 0 || x.status == null ? 'OK' : String(x.status), 0); }).join('') : '<div class="sub">' + esc(I('No printer found.', 'Δεν βρέθηκε εκτυπωτής.')) + '</div>');
    var pb = arr(dv.problems);
    if (pb.length) h += '<div class="lbl" style="margin-top:10px">' + esc(I('Other devices Windows reports as faulty', 'Άλλες συσκευές που τα Windows αναφέρουν ως προβληματικές')) + '</div>' + pb.map(function (x) { return devRow(x.name + ' (' + x.cls + ')', 'Error', x.code); }).join('');
    return h;
  }

  /* ---------- 5. camera, microphone, location ---------- */
  function appLabel(x) {
    var a = String(x.app || '');
    if (x.classic) { var m = /([^\\]+)$/.exec(a); return (m ? m[1] : a); }
    return a.replace(/_[a-z0-9]{13}$/i, '');
  }
  function sensorsHtml() {
    var s = g(D, 'extras.help.sensors', null);
    if (!s) return '<div class="sub">' + esc(I('This scan has no data about camera and microphone use. Run the scan again with version 2.1.0.', 'Αυτή η σάρωση δεν έχει στοιχεία για τη χρήση κάμερας και μικροφώνου. Τρέξε ξανά τη σάρωση με την έκδοση 2.1.0.')) + '</div>';
    var CAP = [['webcam', 'Camera', 'Κάμερα'], ['microphone', 'Microphone', 'Μικρόφωνο'], ['location', 'Location', 'Τοποθεσία']];
    var h = '<p class="sub">' + esc(I('Windows remembers which program last used your camera, microphone or location. Look for names you do not know.', 'Τα Windows θυμούνται ποιο πρόγραμμα χρησιμοποίησε τελευταίο την κάμερα, το μικρόφωνο ή την τοποθεσία σου. Ψάξε για ονόματα που δεν γνωρίζεις.')) + '</p>';
    CAP.forEach(function (c) {
      var o = s[c[0]] || {}, it = arr(o.items).slice(0, 6);
      h += '<div class="lbl" style="margin-top:10px">' + esc(I(c[1], c[2])) + ' <span class="sub" style="display:inline">(' + esc(o.global === 'Deny' ? I('switched off for all', 'κλειστό για όλα') : I('allowed', 'επιτρέπεται')) + ')</span></div>';
      h += it.length ? it.map(function (x) {
        return '<div class="hrow"><span class="hdot" style="background:' + (x.inUse ? '#E82C2D' : '#9ca3af') + '"></span><span><b>' + esc(appLabel(x)) + '</b> <span class="sub" style="display:inline">' + esc(V.fmtDT(x.last)) + (x.inUse ? ' - ' + esc(I('in use now', 'σε χρήση τώρα')) : '') + '</span></span></div>';
      }).join('') : '<div class="sub">' + esc(I('No program has used it.', 'Κανένα πρόγραμμα δεν το έχει χρησιμοποιήσει.')) + '</div>';
    });
    h += '<p class="sub">' + esc(I('To change what each program may use: Settings, Privacy & security, then Camera, Microphone or Location.', 'Για να αλλάξεις τι επιτρέπεται σε κάθε πρόγραμμα: Ρυθμίσεις, Απόρρητο και ασφάλεια, και μετά Κάμερα, Μικρόφωνο ή Τοποθεσία.')) + '</p>';
    return h;
  }

  /* ---------- 6. send to the IT helper ---------- */
  function supportInfo() { return g(D, 'meta.support', null) || {}; }
  function sendHtml() {
    var sp = supportInfo(), to = st.to || sp.email || '', who = sp.name ? esc(sp.name) : esc(I('your IT helper', 'τον τεχνικό σου'));
    function f(id, labelEn, labelEl, val, ph, area) {
      return '<div class="field"><label class="lbl" for="' + id + '">' + esc(I(labelEn, labelEl)) + '</label>' + (area ? '<textarea id="' + id + '" data-hf="' + id.charAt(1).toLowerCase() + id.slice(2) + '" placeholder="' + esc(ph || '') + '">' + esc(val) + '</textarea>' : '<input type="text" id="' + id + '" data-hf="' + id.charAt(1).toLowerCase() + id.slice(2) + '" value="' + esc(val) + '" placeholder="' + esc(ph || '') + '">') + '</div>';
    }
    var h = '<p class="sub">' + esc(I('This makes one file (a .zip) that you attach to an e-mail or a message. Nothing is sent from here: you press send yourself.', 'Φτιάχνει ένα αρχείο (.zip) που επισυνάπτεις σε email ή μήνυμα. Από εδώ δεν στέλνεται τίποτα: το στέλνεις εσύ.')) + '</p>';
    h += f('hName', 'Your name', 'Το όνομά σου', st.name, I('e.g. John', 'π.χ. Γιάννης'));
    h += f('hContact', 'How can I reach you? (phone or e-mail)', 'Πώς μπορώ να σε βρω; (τηλέφωνο ή email)', st.contact, '');
    h += f('hPcNick', 'Which PC is this? (e.g. "kitchen laptop")', 'Ποιος υπολογιστής είναι; (π.χ. «το laptop της κουζίνας»)', st.pcNick, '');
    h += f('hProblem', 'What is happening?', 'Τι συμβαίνει;', st.problem, I('In your own words', 'Με δικά σου λόγια'), true);
    h += f('hOften', 'How often does it happen?', 'Πόσο συχνά συμβαίνει;', st.often, I('every day, once a week, only when...', 'κάθε μέρα, μία φορά την εβδομάδα, μόνο όταν...'));
    h += f('hBefore', 'What did you do just before it started?', 'Τι έκανες λίγο πριν ξεκινήσει;', st.before, I('installed something, update, moved the PC...', 'εγκατέστησα κάτι, ενημέρωση, μετακίνηση του υπολογιστή...'), true);
    h += f('hTried', 'What have you already tried?', 'Τι έχεις ήδη δοκιμάσει;', st.tried, I('restart, antivirus scan...', 'επανεκκίνηση, σάρωση με antivirus...'), true);
    h += '<div class="field"><label class="lbl" for="hUrg">' + esc(I('How urgent is it?', 'Πόσο επείγον είναι;')) + '</label><select id="hUrg" data-hf="urgency"><option value="low"' + (st.urgency === 'low' ? ' selected' : '') + '>' + esc(I('It can wait', 'Μπορεί να περιμένει')) + '</option><option value="normal"' + (st.urgency === 'normal' ? ' selected' : '') + '>' + esc(I('Normal', 'Κανονικό')) + '</option><option value="high"' + (st.urgency === 'high' ? ' selected' : '') + '>' + esc(I('Urgent, I cannot work', 'Επείγον, δεν μπορώ να δουλέψω')) + '</option></select></div>';
    h += f('hAvail', 'When can we talk or connect to the PC?', 'Πότε μπορούμε να μιλήσουμε ή να συνδεθούμε στον υπολογιστή;', st.avail, I('e.g. weekdays after 18:00', 'π.χ. καθημερινές μετά τις 18:00'));
    h += '<div class="lbl">' + esc(I('What goes into the file', 'Τι μπαίνει στο αρχείο')) + '</div>';
    h += '<label class="hrad"><input type="radio" name="hMode" value="full"' + (st.mode === 'full' ? ' checked' : '') + '> ' + esc(I('The full report (recommended): I can see everything and help faster. It contains your PC name, user name, program names and network details.', 'Η πλήρης αναφορά (προτείνεται): βλέπω τα πάντα και βοηθώ πιο γρήγορα. Περιέχει το όνομα του υπολογιστή, του χρήστη, ονόματα προγραμμάτων και στοιχεία δικτύου.')) + '</label>';
    h += '<label class="hrad"><input type="radio" name="hMode" value="safe"' + (st.mode === 'safe' ? ' checked' : '') + '> ' + esc(I('Share-safe report: personal details are hidden, but I may need to ask you more.', 'Αναφορά share-safe: τα προσωπικά στοιχεία κρύβονται, αλλά μπορεί να χρειαστεί να σε ρωτήσω περισσότερα.')) + '</label>';
    h += '<div class="field"><label class="lbl" for="hTo">' + esc(I('Send it to (e-mail)', 'Προς (email)')) + '</label><input type="text" id="hTo" data-hf="to" value="' + esc(to) + '" placeholder="' + esc(I('your helper\'s e-mail', 'το email του τεχνικού σου')) + '"></div>';
    h += '<label class="hrad"><input type="checkbox" id="hConsent"' + (st.consent ? ' checked' : '') + '> ' + esc(I('I understand that the file contains information about my PC and I send it only to ' + (sp.name || 'my IT helper') + '.', 'Καταλαβαίνω ότι το αρχείο περιέχει πληροφορίες για τον υπολογιστή μου και το στέλνω μόνο σε ' + (sp.name ? sp.name : 'τον τεχνικό μου') + '.')) + '</label>';
    h += '<div class="btns"><button class="btn" type="button" id="hSaveFull">' + esc(I('Just save a copy of the full report (I choose where)', 'Απλώς αποθήκευση αντιγράφου της πλήρους αναφοράς (διαλέγω πού)')) + '</button></div>';
    h += '<div class="btns"><button class="btn primary" type="button" id="hMake">' + esc(I('Create the file for ' + (sp.name || 'my IT helper'), 'Φτιάξε το αρχείο για ' + (sp.name ? sp.name : 'τον τεχνικό μου'))) + '</button></div>';
    if (st.done) {
      var d = st.done;
      h += '<div class="hverdict ok" style="margin-top:12px"><b>' + esc(I('Done. The file was saved: ', 'Έτοιμο. Το αρχείο αποθηκεύτηκε: ')) + esc(d.file) + '</b><br>' + esc(I('Report code: ', 'Κωδικός αναφοράς: ')) + '<b>' + esc(d.code) + '</b></div>';
      h += '<ol class="hsteps"><li>' + esc(I('The file is in your Downloads folder. If you cannot find it, press "Save a copy where I choose" and pick the Desktop.', 'Το αρχείο είναι στον φάκελο Λήψεις (Downloads). Αν δεν το βρίσκεις, πάτα «Αποθήκευση αντιγράφου όπου διαλέξω» και διάλεξε την Επιφάνεια εργασίας.')) + '</li><li>' + esc(I('Press the button below. Your e-mail program opens with a ready message.', 'Πάτα το κουμπί παρακάτω. Ανοίγει το email σου με έτοιμο μήνυμα.')) + '</li><li>' + esc(I('Attach the .zip file (paperclip) and press Send.', 'Επισύναψε το αρχείο .zip (συνδετήρας) και πάτα Αποστολή.')) + '</li></ol>';
      h += '<div class="btns"><a class="btn primary" id="hMail" href="' + esc(d.mailto) + '">' + esc(I('Open a new e-mail', 'Άνοιγμα νέου email')) + '</a><button class="btn" type="button" id="hCopyMsg">' + esc(I('Copy the message text', 'Αντιγραφή κειμένου μηνύματος')) + '</button></div>';
    }
    return h;
  }

  function infoObject(mode, rc) {
    var m = g(D, 'meta', {}), fc = {};
    V.openList().forEach(function (f) { fc[f.sev] = (fc[f.sev] || 0) + 1; });
    return {
      schema: 'veagle-send/1', code: rc, createdAt: new Date().toISOString(), language: V.lang,
      person: { name: st.name, contact: st.contact, pcNick: st.pcNick },
      problem: { text: st.problem, since: st.since, often: st.often, before: st.before, tried: st.tried, urgency: st.urgency, availability: st.avail },
      consent: { accepted: true, mode: mode },
      scan: { generated: m.generated, mode: m.mode, version: m.version, isAdmin: !!m.isAdmin, durationSec: m.durationSec, stepNotes: arr(m.stepIssues).length, score: V.score && V.score.score, findings: fc, shareSafe: mode === 'safe' }
    };
  }
  function infoText(info, mode) {
    var sp = supportInfo();
    var L = [];
    L.push('VEAGLE PC CHECK - ' + I('report for the IT helper', 'αναφορά για τον τεχνικό'));
    L.push(I('Report code: ', 'Κωδικός αναφοράς: ') + info.code);
    L.push('');
    L.push(I('Name: ', 'Όνομα: ') + (st.name || '-'));
    L.push(I('Contact: ', 'Επικοινωνία: ') + (st.contact || '-'));
    L.push(I('PC: ', 'Υπολογιστής: ') + (st.pcNick || '-') + (mode === 'full' ? ' (' + g(D, 'meta.computer', '') + ')' : ''));
    L.push('');
    L.push(I('What is happening: ', 'Τι συμβαίνει: ') + (st.problem || '-'));
    L.push(I('Started around: ', 'Ξεκίνησε περίπου: ') + (st.since || '-'));
    L.push(I('How often: ', 'Πόσο συχνά: ') + (st.often || '-'));
    L.push(I('Just before it started: ', 'Λίγο πριν ξεκινήσει: ') + (st.before || '-'));
    L.push(I('Already tried: ', 'Έχει ήδη δοκιμαστεί: ') + (st.tried || '-'));
    L.push(I('Urgency: ', 'Επείγον: ') + ({ low: I('can wait', 'μπορεί να περιμένει'), normal: I('normal', 'κανονικό'), high: I('urgent', 'επείγον') }[st.urgency]));
    L.push(I('Available: ', 'Διαθεσιμότητα: ') + (st.avail || '-'));
    L.push('');
    L.push(I('Scan: ', 'Σάρωση: ') + info.scan.generated + ' (' + info.scan.mode + ', v' + info.scan.version + ', ' + (info.scan.isAdmin ? I('as Administrator', 'ως Διαχειριστής') : I('NOT as Administrator', 'ΟΧΙ ως Διαχειριστής')) + ')');
    L.push(I('Score: ', 'Βαθμός: ') + info.scan.score + '/100');
    L.push(I('Report type: ', 'Τύπος αναφοράς: ') + (mode === 'safe' ? I('share-safe (personal details hidden)', 'share-safe (κρυμμένα προσωπικά στοιχεία)') : I('full', 'πλήρης')));
    L.push('');
    L.push(I('How to open: double-click the .html file in this folder. The same file can be imported into Veagle Clinic.', 'Πώς ανοίγει: διπλό κλικ στο αρχείο .html σε αυτόν τον φάκελο. Το ίδιο αρχείο μπαίνει και στο Veagle Clinic.'));
    L.push('');
    L.push('VEAGLE - ferelis.gr');
    return L.join('\r\n');
  }
  function download(name, bytes, type) {
    var blob = new Blob([bytes], { type: type || 'application/zip' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  }
  function saveAs(name, bytes, type, ext, label) {
    if (window.showSaveFilePicker) {
      var o = { suggestedName: name, types: [{ description: label, accept: {} }] };
      o.types[0].accept[type] = [ext];
      window.showSaveFilePicker(o).then(function (fh) { return fh.createWritable().then(function (w) { return w.write(bytes).then(function () { return w.close(); }); }); })
        .then(function () { AI.toast(I('Saved where you chose.', 'Αποθηκεύτηκε εκεί που διάλεξες.')); })
        .catch(function (e) { if (e && e.name !== 'AbortError') download(name, bytes, type); });
    } else { download(name, bytes, type); AI.toast(I('Saved to your Downloads folder.', 'Αποθηκεύτηκε στον φάκελο Λήψεις (Downloads).')); }
  }
  function make() {
    if (!st.name.trim()) { AI.toast(I('Please write your name first.', 'Γράψε πρώτα το όνομά σου.')); var n = $('#hName'); if (n) n.focus(); return; }
    if (!st.consent) { AI.toast(I('Please tick the box that explains what is sent.', 'Τσέκαρε πρώτα το κουτάκι που εξηγεί τι στέλνεται.')); return; }
    var rc = code(), mode = st.mode, enc = new TextEncoder();
    var html = mode === 'safe' ? SHARE.build().html : SHARE.buildFull().html;
    var safeName = String(st.pcNick || g(D, 'meta.computer', 'PC')).replace(/[^\wͰ-Ͽἀ-῿-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30) || 'PC';
    var info = infoObject(mode, rc), base = rc + '_' + safeName;
    var bytes = XLSX.zip([
      { name: base + '/' + base + '_report.html', data: enc.encode(html) },
      { name: base + '/info.json', data: enc.encode(JSON.stringify(info, null, 2)) },
      { name: base + '/' + I('INFO', 'ΠΛΗΡΟΦΟΡΙΕΣ') + '.txt', data: enc.encode('﻿' + infoText(info, mode)) }
    ]);
    var file = base + '.zip', sp = supportInfo(), to = st.to || sp.email || '';
    var subject = '[Veagle PC Check] ' + rc + ' - ' + st.name;
    var body = I('Hello,\n\nI attach the PC check report (code ' + rc + ').\n' + (st.problem ? 'Problem: ' + st.problem + '\n' : '') + '\nThank you,\n' + st.name, 'Γεια σου,\n\nεπισυνάπτω την αναφορά ελέγχου του υπολογιστή (κωδικός ' + rc + ').\n' + (st.problem ? 'Πρόβλημα: ' + st.problem + '\n' : '') + '\nΕυχαριστώ,\n' + st.name);
    download(file, bytes);
    st.done = { bytes: bytes, file: file, code: rc, subject: subject, body: body, mailto: 'mailto:' + encodeURIComponent(to).replace(/%40/g, '@') + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body) };
    render();
  }

  /* ---------- layout ---------- */
  function box(id, titleEn, titleEl, inner, open) {
    return '<details class="win hbox" id="' + id + '"' + (open ? ' open' : '') + '><summary><span>' + esc(I(titleEn, titleEl)) + '</span></summary><div class="body">' + inner + '</div></details>';
  }
  function render() {
    var top = $('#helpTop'), it = $('#helpIt'), ai = $('#aiWrap'); if (!top || !it || !ai) return;
    var openMap = {}; $$('#helpIt details.hbox').forEach(function (d) { openMap[d.id] = d.open; });
    var seg = st.seg;
    top.innerHTML = '<div class="sect"><h2>' + esc(I('Help & AI', 'Βοήθεια & AI')) + '</h2><span>' + esc(I('get help from a person or from an AI', 'βοήθεια από άνθρωπο ή από AI')) + '</span></div>' +
      '<div class="chips hseg"><button type="button" class="ch' + (seg === 'it' ? ' on' : '') + '" data-hseg="it">' + esc(I('Help from a person (IT)', 'Βοήθεια από άνθρωπο (IT)')) + '</button><button type="button" class="ch' + (seg === 'ai' ? ' on' : '') + '" data-hseg="ai">' + esc(I('Help from an AI', 'Βοήθεια από AI')) + '</button></div>';
    ai.style.display = seg === 'ai' ? '' : 'none';
    it.style.display = seg === 'it' ? '' : 'none';
    if (seg !== 'it') return;
    var o = function (id, d) { return id in openMap ? openMap[id] : d; };
    it.innerHTML = '<div class="hgrid">' +
      '<div>' + box('hbSend', 'Send the report to your IT helper', 'Στείλε την αναφορά στον τεχνικό σου', sendHtml(), o('hbSend', true)) + '</div>' +
      '<div>' + box('hbSym', 'What is wrong? Pick what bothers you', 'Τι δεν πάει καλά; Διάλεξε τι σε ενοχλεί', symptomsHtml(), o('hbSym', true)) +
      box('hbSince', 'Since when? What changed before the problem', 'Από πότε; Τι άλλαξε πριν το πρόβλημα', sinceHtml(), o('hbSince', false)) +
      box('hbRemote', 'Can my helper connect to this PC?', 'Μπορεί ο τεχνικός να συνδεθεί σε αυτόν τον υπολογιστή;', remoteHtml(), o('hbRemote', false)) +
      box('hbDev', 'Devices: sound, camera, Bluetooth, printers', 'Συσκευές: ήχος, κάμερα, Bluetooth, εκτυπωτές', devicesHtml(), o('hbDev', false)) +
      box('hbSens', 'Who used the camera, microphone or location?', 'Ποιος χρησιμοποίησε κάμερα, μικρόφωνο ή τοποθεσία;', sensorsHtml(), o('hbSens', false)) + '</div></div>';
  }

  function init() {
    var tab = $('#tab-ai'); if (!tab || tab.getAttribute('data-help')) { render(); return; }
    tab.setAttribute('data-help', '1');
    tab.addEventListener('click', function (e) {
      var t;
      if ((t = e.target.closest('[data-hseg]'))) { st.seg = t.getAttribute('data-hseg'); render(); return; }
      if ((t = e.target.closest('[data-hsym]'))) { var k = t.getAttribute('data-hsym'); st.sym = st.sym === k ? '' : k; render(); return; }
      if (e.target.closest('#hMake')) { make(); return; }
      if (e.target.closest('#hSaveAs') && st.done) { saveAs(st.done.file, st.done.bytes, 'application/zip', '.zip', 'ZIP'); return; }
      if (e.target.closest('#hSaveFull')) { var f = SHARE.buildFull().html, nm = (String(g(D, 'meta.computer', 'PC')).replace(/[\\\/:*?"<>|]+/g, '-').trim() || 'PC') + '.html'; saveAs(nm, new TextEncoder().encode(f), 'text/html', '.html', 'HTML'); return; }
      if (e.target.closest('#hCopyMsg') && st.done) { AI.toast(AI.copyText(st.done.subject + '\n\n' + st.done.body) ? I('Copied.', 'Αντιγράφηκε.') : I('Could not copy.', 'Δεν μπόρεσε να αντιγραφεί.')); }
    });
    tab.addEventListener('input', function (e) {
      var t = e.target, k = t.getAttribute && t.getAttribute('data-hf');
      if (k) st[k] = t.value;
    });
    tab.addEventListener('change', function (e) {
      var t = e.target;
      if (t.id === 'hSince') { st.since = t.value; render(); }
      else if (t.name === 'hMode') st.mode = t.value;
      else if (t.id === 'hConsent') st.consent = t.checked;
      else if (t.id === 'hUrg') st.urgency = t.value;
    });
    render();
  }
  return { init: init, render: render, code: code };
})(V, UI, AI, SHARE, XLSX);
