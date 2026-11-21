/* VEAGLE PC Check 3.1: troubleshooting assistant. Reads the findings and the raw numbers the scan already has and turns them into likely causes (with confidence and evidence), a plain-language summary, an explained score, trend labels, a gaming score, a memory check, driver age, security and update health, and the 5 most useful actions. Read-only: it never collects or changes anything, and it runs fully on this page with rules (no cloud AI). */
var ASSIST = (function (V) {
  'use strict';
  var esc = V.esc, arr = V.arr, num = V.num, g = V.g;
  function I(en, el) { return V.I(en, el); }
  function D() { return V.D || {}; }
  function EXd() { return D().extras || {}; }
  function sect(t, n) { return '<div class="sect"><h2>' + esc(t) + '</h2><span>' + esc(n || '') + '</span></div>'; }
  function tag(cls, t) { return '<span class="tag ' + cls + '">' + esc(t) + '</span>'; }
  function tbl(heads, rows) {
    return '<div class="tbl"><table><thead><tr>' + heads.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + (c && c.html != null ? c.html : esc(c == null ? '' : c)) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
  }
  function win(title, st, inner) { return '<div class="win"><header><span>' + esc(title) + '</span><span class="st">' + esc(st || '') + '</span></header><div class="body">' + inner + '</div></div>'; }
  function act(id) { var a = V.active(); for (var i = 0; i < a.length; i++) if (a[i].id === id) return a[i]; return null; }
  function anyAct(ids) { for (var i = 0; i < ids.length; i++) { var f = act(ids[i]); if (f) return f; } return null; }
  function T(f) { var t = V.tf ? V.tf(f) : f; return t.title; }
  function step1(f) { var t = V.tf ? V.tf(f) : f; return t.steps && t.steps[0] ? t.steps[0].t : ''; }
  function cnt(log, re, ids) { try { return V.evCount(log, re, ids) || 0; } catch (e) { return 0; } }
  var AREA_EL = { Stability: 'Σταθερότητα', Storage: 'Αποθήκευση', Security: 'Ασφάλεια', Privacy: 'Απόρρητο', Network: 'Δίκτυο', Backup: 'Αντίγραφα', Performance: 'Απόδοση', Updates: 'Ενημερώσεις', Software: 'Λογισμικό' };
  function areaName(a) { return I(a, AREA_EL[a] || a); }
  var META_EL = { Easy: 'Εύκολο', Medium: 'Μέτριο', 'Ask a pro': 'Ρώτα τεχνικό', Safe: 'Ασφαλές', Careful: 'Με προσοχή', 'Back up first': 'Πρώτα αντίγραφο' };
  function mw(w) { return I(w, META_EL[w] || w); }
  var PRI_ORDER = { high: 0, medium: 1, low: 2 };
  function priWord(p) { return p === 'high' ? I('HIGH', 'ΥΨΗΛΗ') : (p === 'medium' ? I('MEDIUM', 'ΜΕΣΑΙΑ') : I('LOW', 'ΧΑΜΗΛΗ')); }
  function confWord(c) { return c === 'high' ? I('High', 'Υψηλή') : (c === 'medium' ? I('Medium', 'Μέτρια') : I('Low', 'Χαμηλή')); }
  function confTag(c) { return tag(c === 'high' ? 'medium' : (c === 'medium' ? 'low' : 'info'), I('Confidence: ', 'Βεβαιότητα: ') + confWord(c)); }
  function ul(items) { return '<ul style="margin:6px 0 0 18px;padding:0">' + items.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>'; }

  /* ---------------- blue screen knowledge ---------------- */
  var BC = {
    '0x124': 'hw', '0x101': 'hw', '0x7f': 'hw', '0x9c': 'hw', '0x1a': 'mem', '0x19': 'mem', '0x4e': 'mem', '0x50': 'mem', '0x109': 'mem',
    '0xa': 'drv', '0xd1': 'drv', '0x1e': 'drv', '0x3b': 'drv', '0x7e': 'drv', '0xbe': 'drv', '0xc2': 'drv', '0xc4': 'drv', '0xc5': 'drv', '0x133': 'drv', '0x139': 'drv',
    '0x24': 'stor', '0x7a': 'stor', '0xf4': 'stor', '0x77': 'stor', '0x154': 'stor', '0xea': 'gpu', '0x116': 'gpu', '0x117': 'gpu', '0x119': 'gpu', '0x141': 'gpu',
    '0x9f': 'power', '0xef': 'sys', '0xc000021a': 'sys'
  };
  var BC_EXTRA = { '0x9c': 'MACHINE_CHECK_EXCEPTION', '0xc4': 'DRIVER_VERIFIER_DETECTED_VIOLATION', '0x77': 'KERNEL_STACK_INPAGE_ERROR', '0x141': 'VIDEO_ENGINE_TIMEOUT_DETECTED', '0xc000021a': 'STATUS_SYSTEM_PROCESS_TERMINATED' };
  var CAT = {
    hw: { pri: 'high', en: 'Hardware, CPU or memory controller', el: 'Υλικό, επεξεργαστής ή ελεγκτής μνήμης', ce: 'CPU or RAM instability, an overclock or XMP/EXPO profile, a BIOS problem, a weak power supply.', cl: 'Αστάθεια επεξεργαστή ή RAM, overclock ή προφίλ XMP/EXPO, πρόβλημα στο BIOS, αδύναμο τροφοδοτικό.' },
    mem: { pri: 'high', en: 'Memory (RAM)', el: 'Μνήμη (RAM)', ce: 'Faulty or badly seated RAM, unstable XMP/EXPO speed, or a driver damaging memory.', cl: 'Χαλασμένη ή κακοτοποθετημένη RAM, ασταθής ταχύτητα XMP/EXPO, ή οδηγός που χαλά τη μνήμη.' },
    drv: { pri: 'medium', en: 'A driver or a program running deep in Windows', el: 'Οδηγός ή πρόγραμμα βαθιά μέσα στα Windows', ce: 'A faulty or old driver (network, storage, antivirus, graphics), sometimes RAM.', cl: 'Προβληματικός ή παλιός οδηγός (δίκτυο, αποθήκευση, antivirus, γραφικά), μερικές φορές RAM.' },
    stor: { pri: 'high', en: 'Drive or file system', el: 'Δίσκος ή σύστημα αρχείων', ce: 'A failing drive, a loose cable, a drive controller driver, or file system damage.', cl: 'Δίσκος που χαλά, χαλαρό καλώδιο, οδηγός ελεγκτή δίσκου ή βλάβη στο σύστημα αρχείων.' },
    gpu: { pri: 'medium', en: 'Graphics card or graphics driver', el: 'Κάρτα γραφικών ή οδηγός γραφικών', ce: 'A graphics driver problem, overheating, an unstable overclock, or a weak power supply under load.', cl: 'Πρόβλημα οδηγού γραφικών, υπερθέρμανση, ασταθές overclock ή αδύναμο τροφοδοτικό υπό φορτίο.' },
    power: { pri: 'medium', en: 'Power management and sleep', el: 'Διαχείριση ενέργειας και ύπνος', ce: 'A device or driver that does not wake up or sleep correctly (USB, network, graphics).', cl: 'Συσκευή ή οδηγός που δεν ξυπνά ή δεν κοιμάται σωστά (USB, δίκτυο, γραφικά).' },
    sys: { pri: 'medium', en: 'Windows system files or a failing drive', el: 'Αρχεία συστήματος Windows ή δίσκος που χαλά', ce: 'Damaged system files, a bad update, or a drive that stopped answering.', cl: 'Κατεστραμμένα αρχεία συστήματος, κακή ενημέρωση ή δίσκος που σταμάτησε να απαντά.' }
  };
  function bugList() {
    var ex = EXd(), src = arr(ex.dumps).filter(function (d) { return d && d.code; });
    if (!src.length) src = arr(g(ex, 'reliability.bugchecks', [])).filter(function (d) { return d && d.code; }).map(function (b) { return { code: b.code, time: b.time }; });
    var out = [], seen = {};
    src.forEach(function (d) {
      var k = V.bugKey(d.code), e = seen[k];
      if (!e) { e = seen[k] = { k: k, n: 0, last: null, cat: BC[k] || '' }; out.push(e); }
      e.n++; if (d.time && (!e.last || d.time > e.last)) e.last = d.time;
    });
    out.forEach(function (e) { var a = e.last ? V.ageDays(e.last) : null; e.age = a; e.recent = a == null || a <= 60; });
    return out;
  }
  function bugVaried() { var L = bugList().filter(function (b) { return b.recent; }), n = 0; L.forEach(function (b) { n += b.n; }); return L.length >= 3 && n >= 3; }
  function bugName(k) { var b = V.BUGCODES && V.BUGCODES[k]; return b ? b[0] : (BC_EXTRA[k] || ''); }
  function bugText(k) { var b = V.BUGCODES && V.BUGCODES[k]; return b ? b[1] : ''; }
  function bugCount(cats, old) { var n = 0; bugList().forEach(function (b) { if (cats.indexOf(b.cat) >= 0 && (old ? !b.recent : b.recent)) n += b.n; }); return n; }
  function bugIds(cats) { return bugList().filter(function (b) { return cats.indexOf(b.cat) >= 0 && b.recent; }).map(function (b) { return b.k + (b.n > 1 ? ' (x' + b.n + ')' : ''); }).join(', '); }

  /* ---------------- likely causes ---------------- */
  function conf(sum) { return sum >= 4 ? 'high' : (sum >= 2 ? 'medium' : 'low'); }
  function causes() {
    var out = [], whea = cnt('system', /WHEA-Logger/), wheaFatal = cnt('system', /WHEA-Logger/, [1, 18, 20]), kp = cnt('system', /Kernel-Power/, [41]);
    var stor = cnt('system', /stornvme|storahci|storport|iastor|nvme/i), disk = cnt('system', /^disk$/i, [7, 11, 15, 51, 52, 153, 154]), ntfs = cnt('system', /^ntfs$/i, [55, 98, 137, 140]);
    var gpu = cnt('system', /^(nvlddmkm|amdkmdag|amdwddmg|atikmpag|igfx.*|Display)$/i, [13, 14, 141, 153, 4101]);
    var hwB = bugCount(['hw']), memB = bugCount(['mem']), drvB = bugCount(['drv']), storB = bugCount(['stor', 'sys']), gpuB = bugCount(['gpu']), pwB = bugCount(['power']);
    function add(key, pri, title, ev, why, causes, steps) {
      if (!ev.length) return;
      var sum = 0; ev.forEach(function (e) { sum += e.w; });
      var cf = conf(sum); if (cf === 'low') pri = pri === 'high' ? 'medium' : 'low'; else if (cf === 'medium' && pri === 'high' && key !== 'hw' && key !== 'mem') pri = 'medium';
      out.push({ key: key, pri: pri, title: title, conf: cf, sum: sum, ev: ev.map(function (e) { return e.t; }), why: why, causes: causes, steps: steps });
    }
    function E(t, w) { return { t: t, w: w }; }
    function fE(id, w) { var f = act(id); return f ? E(T(f), w) : null; }
    function cl(a) { return a.filter(function (x) { return x; }); }

    /* A: hardware instability */
    var evA = cl([
      whea > 0 ? E(I(whea + ' hardware error reports (WHEA)', whea + ' αναφορές σφάλματος υλικού (WHEA)'), whea >= 5 ? 2 : 1.5) : null,
      wheaFatal > 0 ? E(I(wheaFatal + ' of them are uncorrected (fatal) hardware errors', wheaFatal + ' από αυτές είναι μη διορθωμένα (σοβαρά) σφάλματα υλικού'), 1.5) : null,
      bugVaried() ? E(I('Several different blue-screen codes in a row (typical of memory or hardware, not one driver)', 'Πολλοί διαφορετικοί κωδικοί μπλε οθόνης στη σειρά (τυπικό μνήμης ή υλικού, όχι ενός οδηγού)'), 1.5) : null,
      kp > 0 ? E(I(kp + ' unexpected shutdowns (Kernel-Power 41)', kp + ' απρόσμενοι τερματισμοί (Kernel-Power 41)'), 1) : null,
      hwB > 0 ? E(I('Blue screen codes that point to hardware: ' + bugIds(['hw']), 'Κωδικοί μπλε οθόνης που δείχνουν υλικό: ' + bugIds(['hw'])), 2) : null,
      fE('stab-memdiag', 1), fE('perf-throttle', 0.5)
    ]);
    if (whea > 0 || hwB > 0 || bugVaried()) add('hw', 'high', I('Likely hardware instability', 'Πιθανή αστάθεια υλικού'), evA,
      I('Hardware reports, unexpected shutdowns and crash dumps that appear together usually mean the CPU, the memory or the power delivery is not completely stable.', 'Όταν αναφορές υλικού, απρόσμενοι τερματισμοί και dump κρασαρισμάτων εμφανίζονται μαζί, συνήθως ο επεξεργαστής, η μνήμη ή η τροφοδοσία δεν είναι απόλυτα σταθερά.'),
      [I('CPU instability', 'Αστάθεια επεξεργαστή'), I('RAM instability (often the XMP/EXPO speed)', 'Αστάθεια RAM (συχνά η ταχύτητα XMP/EXPO)'), I('Memory controller', 'Ελεγκτής μνήμης'), I('An overclock', 'Overclock'), I('A BIOS issue', 'Πρόβλημα BIOS'), I('Power supply', 'Τροφοδοτικό')],
      [I('Reset the BIOS to default settings (no overclock) and use the PC for a few days.', 'Επανάφερε το BIOS στις προεπιλογές (χωρίς overclock) και χρησιμοποίησε τον υπολογιστή μερικές ημέρες.'), I('If the errors continue, turn XMP/EXPO off for a test.', 'Αν τα σφάλματα συνεχίζονται, κλείσε προσωρινά το XMP/EXPO για δοκιμή.'), I('Test the memory (Windows Memory Diagnostic, or MemTest86 for a longer test).', 'Έλεγξε τη μνήμη (Windows Memory Diagnostic ή MemTest86 για πιο μακρύ τεστ).'), I('Update the BIOS only if the maker has a newer stable version.', 'Ενημέρωσε το BIOS μόνο αν ο κατασκευαστής έχει νεότερη σταθερή έκδοση.')]);
    else if (kp > 0 && (hwB + memB + drvB + storB + gpuB + pwB) > 0) add('hw', 'medium', I('Unexpected shutdowns together with crashes', 'Απρόσμενοι τερματισμοί μαζί με κρασαρίσματα'), evA.concat([E(I('Crash dumps: ' + bugList().map(function (b) { return b.k; }).join(', '), 'Dump κρασαρισμάτων: ' + bugList().map(function (b) { return b.k; }).join(', ')), 1)]),
      I('The PC lost power or stopped suddenly and also blue-screened. The details below show which part is the most likely one.', 'Ο υπολογιστής έχασε ρεύμα ή σταμάτησε απότομα και έκανε και μπλε οθόνη. Παρακάτω φαίνεται ποιο μέρος είναι το πιθανότερο.'),
      [I('Power supply or power cable', 'Τροφοδοτικό ή καλώδιο ρεύματος'), I('A driver crash', 'Κρασάρισμα οδηγού'), I('Overheating', 'Υπερθέρμανση')],
      [I('Check that the power cable and the plug are firm.', 'Έλεγξε ότι το καλώδιο και η πρίζα είναι σταθερά.'), I('Update the graphics and chipset drivers.', 'Ενημέρωσε τους οδηγούς γραφικών και chipset.')]);

    /* B: memory */
    add('mem', 'high', I('Likely memory (RAM) problem', 'Πιθανό πρόβλημα μνήμης (RAM)'), cl([
      memB > 0 ? E(I('Blue screen codes that point to memory: ' + bugIds(['mem']), 'Κωδικοί μπλε οθόνης που δείχνουν μνήμη: ' + bugIds(['mem'])), 2) : null,
      fE('stab-memdiag', 2), whea > 0 && memB > 0 ? E(I('Hardware error reports (WHEA) at the same time', 'Αναφορές υλικού (WHEA) την ίδια περίοδο'), 1) : null, fE('perf-xmp', 0.5)
    ]), I('These crash codes are most often caused by memory that is faulty, badly seated or running faster than it can hold steady.', 'Αυτοί οι κωδικοί προκαλούνται συχνότερα από μνήμη που είναι χαλασμένη, κακοτοποθετημένη ή τρέχει πιο γρήγορα απ ό,τι αντέχει.'),
      [I('A faulty module', 'Χαλασμένη μονάδα'), I('A module not fully seated', 'Μονάδα που δεν έχει μπει καλά'), I('An unstable XMP/EXPO speed', 'Ασταθής ταχύτητα XMP/EXPO'), I('A driver damaging memory', 'Οδηγός που χαλά τη μνήμη')],
      [I('Run the Windows Memory Diagnostic (command mdsched.exe) and let it finish.', 'Τρέξε το Windows Memory Diagnostic (εντολή mdsched.exe) και άφησέ το να τελειώσει.'), I('Test with one module at a time, then with XMP/EXPO off.', 'Δοκίμασε με μία μονάδα τη φορά, και μετά με το XMP/EXPO κλειστό.')]);

    /* C: storage */
    var sd = act('stab-disk'), sdReal = !!sd && sd.sev !== 'low';
    var evC = cl([
      sdReal && disk > 0 ? E(I(disk + ' drive timeout or error events', disk + ' συμβάντα καθυστέρησης ή σφάλματος δίσκου'), disk >= 5 ? 2 : 1) : null,
      sdReal && stor > 0 ? E(I(stor + ' storage driver events (StorNVMe/StorAHCI)', stor + ' συμβάντα οδηγού αποθήκευσης (StorNVMe/StorAHCI)'), stor >= 5 ? 1.5 : 1) : null,
      ntfs > 0 ? E(I(ntfs + ' file system errors', ntfs + ' σφάλματα συστήματος αρχείων'), 1) : null,
      storB > 0 ? E(I('Blue screen codes that point to the drive: ' + bugIds(['stor', 'sys']), 'Κωδικοί μπλε οθόνης που δείχνουν τον δίσκο: ' + bugIds(['stor', 'sys'])), 2) : null,
      fE('sto-diskhealth', 2), fE('sto-smart', 2), fE('pred-ssd', 1), fE('cor-disk', 1), fE('sto-dirty', 1),
      sd && !sdReal ? E(T(sd) + I(' (looks harmless: it belongs to a virtual or disconnected drive)', ' (φαίνεται ακίνδυνο: ανήκει σε εικονικό ή αποσυνδεδεμένο δίσκο)'), 0.5) : (sd ? E(T(sd), 1) : null)
    ]);
    var evCsum = 0; evC.forEach(function (e) { evCsum += e.w; });
    if (evCsum >= 2) add('stor', 'high', I('Possible drive or storage problem', 'Πιθανό πρόβλημα δίσκου ή αποθήκευσης'), evC,
      I('Timeouts, driver events and health warnings from the drive are the typical trail of a drive that is slow to answer or starting to fail.', 'Καθυστερήσεις, συμβάντα οδηγού και προειδοποιήσεις υγείας από τον δίσκο είναι το τυπικό σημάδι δίσκου που αργεί να απαντήσει ή αρχίζει να χαλά.'),
      [I('A failing SSD or hard drive', 'SSD ή σκληρός δίσκος που χαλά'), I('A loose or bad cable (SATA drives)', 'Χαλαρό ή χαλασμένο καλώδιο (δίσκοι SATA)'), I('Old storage controller driver or drive firmware', 'Παλιός οδηγός ελεγκτή ή firmware δίσκου'), I('File system damage', 'Βλάβη στο σύστημα αρχείων')],
      [I('Make a backup of the important files first.', 'Κάνε πρώτα αντίγραφο ασφαλείας των σημαντικών αρχείων.'), I('Check the drive health with the maker tool (Samsung Magician, WD Dashboard, Crucial Storage Executive, etc).', 'Έλεγξε την υγεία του δίσκου με το εργαλείο του κατασκευαστή (Samsung Magician, WD Dashboard, Crucial Storage Executive κ.λπ.).'), I('Update the drive firmware and the chipset or storage driver.', 'Ενημέρωσε το firmware του δίσκου και τον οδηγό chipset ή αποθήκευσης.')]);

    /* D: graphics */
    add('gpu', 'medium', I('Graphics driver or graphics card problem', 'Πρόβλημα οδηγού ή κάρτας γραφικών'), cl([
      gpu >= 5 ? E(I(gpu + ' graphics driver errors or resets', gpu + ' σφάλματα ή επαναφορές οδηγού γραφικών'), gpu >= 20 ? 2 : 1.5) : null,
      gpuB > 0 ? E(I('Blue screen codes that point to graphics: ' + bugIds(['gpu']), 'Κωδικοί μπλε οθόνης που δείχνουν γραφικά: ' + bugIds(['gpu'])), 2) : null,
      fE('stab-gpu', 1), fE('cor-gpu', 1), fE('perf-gpuheat', 1), fE('upd-gpu', 0.5)
    ]), I('The graphics driver stopped answering and Windows had to reset it. This happens with driver bugs, heat or an unstable overclock.', 'Ο οδηγός γραφικών σταμάτησε να απαντά και τα Windows τον επανέφεραν. Συμβαίνει με σφάλματα οδηγού, ζέστη ή ασταθές overclock.'),
      [I('A driver bug or an old driver', 'Σφάλμα ή παλιός οδηγός'), I('Overheating', 'Υπερθέρμανση'), I('Overclock or undervolt', 'Overclock ή undervolt'), I('Power supply under load', 'Τροφοδοτικό υπό φορτίο')],
      [I('Install the newest driver from NVIDIA, AMD or Intel, using the clean install option.', 'Εγκατάστησε τον νεότερο οδηγό από NVIDIA, AMD ή Intel, με την επιλογή καθαρής εγκατάστασης.'), I('Remove any graphics overclock and check the temperature while playing.', 'Αφαίρεσε κάθε overclock των γραφικών και έλεγξε τη θερμοκρασία όσο παίζεις.')]);

    /* E: driver */
    if (drvB > 0 && hwB === 0) add('drv', 'medium', I('Likely driver problem', 'Πιθανό πρόβλημα οδηγού'), cl([
      E(I('Blue screen codes that point to a driver: ' + bugIds(['drv']), 'Κωδικοί μπλε οθόνης που δείχνουν οδηγό: ' + bugIds(['drv'])), 2),
      fE('upd-devices', 1), fE('stab-services', 0.5), fE('sec-unsigned', 0.5)
    ]), I('These crash codes mean a driver did something Windows does not allow. The dump file names the driver, but Windows does not keep the name in the scan.', 'Αυτοί οι κωδικοί σημαίνουν ότι ένας οδηγός έκανε κάτι που τα Windows δεν επιτρέπουν. Το αρχείο dump έχει το όνομα του οδηγού, αλλά η σάρωση δεν το κρατά.'),
      [I('A network, Wi-Fi or Bluetooth driver', 'Οδηγός δικτύου, Wi-Fi ή Bluetooth'), I('A storage or antivirus driver', 'Οδηγός αποθήκευσης ή antivirus'), I('A recently installed program or device', 'Πρόσφατα εγκατεστημένο πρόγραμμα ή συσκευή')],
      [I('Update the network, chipset and graphics drivers from the manufacturer.', 'Ενημέρωσε τους οδηγούς δικτύου, chipset και γραφικών από τον κατασκευαστή.'), I('Think about what was installed just before the first crash and remove it for a test.', 'Σκέψου τι εγκαταστάθηκε λίγο πριν το πρώτο κρασάρισμα και αφαίρεσέ το για δοκιμή.')]);

    /* F: power and sleep */
    add('power', 'medium', I('Sleep or power-management problem', 'Πρόβλημα ύπνου ή διαχείρισης ενέργειας'), cl([
      pwB > 0 ? E(I('Blue screen code about power state: ' + bugIds(['power']), 'Κωδικός μπλε οθόνης για την κατάσταση ενέργειας: ' + bugIds(['power'])), 2) : null,
      fE('cor-wake', 1.5), fE('cor-power', 1.5), fE('stab-shutdown', 1)
    ]), I('The problems appear around sleep, wake-up or power changes.', 'Τα προβλήματα εμφανίζονται γύρω από ύπνο, επανεκκίνηση από ύπνο ή αλλαγές ενέργειας.'),
      [I('A USB or network device that blocks sleep', 'Συσκευή USB ή δικτύου που εμποδίζει τον ύπνο'), I('Fast Startup', 'Γρήγορη εκκίνηση (Fast Startup)'), I('Power supply or outlet', 'Τροφοδοτικό ή πρίζα')],
      [I('Try turning Fast Startup off and unplug USB devices you do not need.', 'Δοκίμασε να κλείσεις τη Γρήγορη εκκίνηση και βγάλε τις USB συσκευές που δεν χρειάζεσαι.')]);

    /* G: startup overload */
    var noHw = whea === 0 && hwB === 0 && memB === 0 && storB === 0;
    var evG = cl([fE('perf-boot', 1.5), fE('perf-startup', 1.5), fE('perf-slowstart', 1), fE('perf-services', 0.5)]);
    if (evG.length >= 2) {
      if (noHw) evG.push(E(I('No hardware errors were found, so hardware is not the likely reason', 'Δεν βρέθηκαν σφάλματα υλικού, άρα το υλικό δεν είναι πιθανή αιτία'), 1));
      add('startup', 'low', I('Likely start-up software overload', 'Πιθανή υπερφόρτωση εκκίνησης από λογισμικό'), evG,
        I('Slow start-up with many programs starting with Windows and no hardware errors is the typical sign of too much software starting together.', 'Αργή εκκίνηση με πολλά προγράμματα που ξεκινούν μαζί με τα Windows και χωρίς σφάλματα υλικού είναι το τυπικό σημάδι υπερβολικού λογισμικού που ξεκινά μαζί.'),
        [I('Too many programs starting with Windows', 'Πάρα πολλά προγράμματα ξεκινούν με τα Windows'), I('A slow drive (hard disk)', 'Αργός δίσκος (σκληρός δίσκος)'), I('A few programs that take long to start', 'Λίγα προγράμματα που αργούν να ξεκινήσουν')],
        [I('Switch off the programs you do not need at start (Ctrl+Shift+Esc, Startup apps). See the start-up table in the Insights tab.', 'Κλείσε τα προγράμματα που δεν χρειάζεσαι στην εκκίνηση (Ctrl+Shift+Esc, Εφαρμογές εκκίνησης). Δες τον πίνακα εκκίνησης στην καρτέλα Insights.')]);
    }

    /* H: updates */
    add('upd', 'low', I('Problems that may come from Windows updates', 'Προβλήματα που μπορεί να προέρχονται από ενημερώσεις Windows'), cl([
      fE('cor-start', 1.5), fE('upd-fail', 1.5), fE('stab-pending', 1), fE('upd-paused', 1), fE('upd-off', 1), fE('stab-wu', 1)
    ]), I('Failed, paused or half-finished updates can leave Windows in a strange state.', 'Ενημερώσεις που απέτυχαν, είναι σε παύση ή έμειναν μισές μπορεί να αφήσουν τα Windows σε περίεργη κατάσταση.'),
      [I('A failed update', 'Ενημέρωση που απέτυχε'), I('A restart that never happened', 'Επανεκκίνηση που δεν έγινε'), I('Updates paused or turned off', 'Ενημερώσεις σε παύση ή κλειστές')],
      [I('Restart the PC, then open Settings, Windows Update and check for updates.', 'Κάνε επανεκκίνηση και μετά άνοιξε Ρυθμίσεις, Windows Update και έλεγξε για ενημερώσεις.')]);

    /* I: heat */
    add('heat', 'medium', I('Heat or CPU slow-downs', 'Ζέστη ή επιβραδύνσεις του επεξεργαστή'), cl([
      fE('perf-heat', 1.5), fE('perf-throttle', 1.5), fE('perf-gpuheat', 1)
    ]), I('The processor or graphics card slowed itself down to protect itself from heat.', 'Ο επεξεργαστής ή η κάρτα γραφικών επιβράδυναν τον εαυτό τους για να προστατευτούν από τη ζέστη.'),
      [I('Dust in the fans or the heatsink', 'Σκόνη στους ανεμιστήρες ή στην ψύκτρα'), I('A fan that does not spin enough', 'Ανεμιστήρας που δεν γυρίζει αρκετά'), I('Old thermal paste', 'Παλιά θερμοαγώγιμη πάστα')],
      [I('Clean the dust with compressed air (PC switched off) and check the fans spin.', 'Καθάρισε τη σκόνη με πεπιεσμένο αέρα (με τον υπολογιστή σβηστό) και έλεγξε ότι γυρίζουν οι ανεμιστήρες.')]);

    /* J: security */
    add('sec', 'medium', I('Signs worth reviewing for unwanted activity', 'Σημάδια που αξίζει να ελεγχθούν για ανεπιθύμητη δραστηριότητα'), cl([
      fE('for-logon-brute', 1.5), fE('for-log-cleared', 1.5), fE('for-access-backdoor', 2), fE('for-ps-suspicious', 1.5), fE('for-run-tools', 1), fE('sec-persist', 1), fE('for-svc-new', 1), fE('for-def-off', 1), fE('for-def-excl', 1)
    ]), I('These are clues, not proof. Many of them have a normal explanation (a tool you installed yourself, a game folder excluded from the antivirus). They are listed because they are worth one calm look.', 'Είναι ενδείξεις, όχι απόδειξη. Πολλές έχουν φυσιολογική εξήγηση (εργαλείο που εγκατέστησες εσύ, φάκελος παιχνιδιού που αποκλείστηκε από το antivirus). Αναφέρονται γιατί αξίζουν μια ήρεμη ματιά.'),
      [I('A tool you installed yourself', 'Εργαλείο που εγκατέστησες εσύ'), I('Failed sign-in attempts from the network', 'Αποτυχημένες προσπάθειες σύνδεσης από το δίκτυο'), I('Something that really should not be there', 'Κάτι που πράγματι δεν θα έπρεπε να υπάρχει')],
      [I('Open the Traces section in Insights and go through each item. Anything you do not recognise: ask a helper before deleting.', 'Άνοιξε την ενότητα Ίχνη στο Insights και δες κάθε στοιχείο. Ό,τι δεν αναγνωρίζεις: ρώτα έναν βοηθό πριν σβήσεις.')]);

    /* K: old blue screen records only */
    var oldL = bugList().filter(function (b) { return !b.recent; });
    if (oldL.length) {
      var mo = Math.max.apply(null, oldL.map(function (b) { return b.age; }).concat([0]));
      add('old', 'low', I('Old blue screen records (none recently)', 'Παλιές καταγραφές μπλε οθόνης (καμία πρόσφατα)'), [E(I('Codes seen more than 2 months ago: ' + oldL.map(function (b) { return b.k + (b.n > 1 ? ' (x' + b.n + ')' : ''); }).join(', ') + ' (about ' + Math.round(mo / 30) + ' months ago)', 'Κωδικοί που φάνηκαν πριν από πάνω από 2 μήνες: ' + oldL.map(function (b) { return b.k + (b.n > 1 ? ' (x' + b.n + ')' : ''); }).join(', ') + ' (πριν περίπου ' + Math.round(mo / 30) + ' μήνες)'), 1)],
        I('The crash files are still on the disk, but nothing similar happened lately. This is history, not a current problem.', 'Τα αρχεία κρασαρίσματος υπάρχουν ακόμα στον δίσκο, αλλά τελευταία δεν έγινε κάτι παρόμοιο. Είναι ιστορικό, όχι τρέχον πρόβλημα.'),
        [I('A driver or an update that was fixed since', 'Οδηγός ή ενημέρωση που διορθώθηκε από τότε'), I('A one-time event', 'Μεμονωμένο γεγονός')],
        [I('No action needed. If a blue screen comes back, run the scan again right away.', 'Δεν χρειάζεται ενέργεια. Αν ξαναβγεί μπλε οθόνη, τρέξε τη σάρωση αμέσως.')]);
    }

    out.sort(function (a, b) { return (PRI_ORDER[a.pri] - PRI_ORDER[b.pri]) || (b.sum - a.sum); });
    return out;
  }

  function causesHtml(list) {
    if (!list.length) return '<div class="win"><div class="body"><b>' + esc(I('No clear problem pattern was found.', 'Δεν βρέθηκε κάποιο καθαρό μοτίβο προβλήματος.')) + '</b><p class="sub" style="margin:6px 0 0">' + esc(I('The assistant looks for findings that point to the same cause (for example hardware reports together with crash dumps). None did. Single items in the lists below can still be worth a look.', 'Ο βοηθός ψάχνει ευρήματα που δείχνουν την ίδια αιτία (π.χ. αναφορές υλικού μαζί με dump κρασαρισμάτων). Δεν βρέθηκε κάτι τέτοιο. Μεμονωμένα στοιχεία στις λίστες παρακάτω μπορεί να αξίζουν μια ματιά.')) + '</p></div></div>';
    return list.map(function (c) {
      return '<div class="win" style="margin-bottom:12px"><header><span>' + esc(c.title) + '</span><span class="st">' + esc(I('priority ', 'προτεραιότητα ') + priWord(c.pri)) + '</span></header><div class="body">' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">' + confTag(c.conf) + tag(c.pri === 'high' ? 'high' : (c.pri === 'medium' ? 'medium' : 'low'), I('Priority: ', 'Προτεραιότητα: ') + priWord(c.pri)) + '</div>' +
        '<p style="margin:0 0 6px">' + esc(c.why) + '</p>' +
        '<div class="lbl">' + esc(I('Evidence', 'Αποδείξεις')) + '</div>' + ul(c.ev) +
        '<div class="lbl" style="margin-top:10px">' + esc(I('Possible causes', 'Πιθανές αιτίες')) + '</div>' + ul(c.causes) +
        '<div class="lbl" style="margin-top:10px">' + esc(I('What to try, in this order', 'Τι να δοκιμάσεις, με αυτή τη σειρά')) + '</div><ol style="margin:6px 0 0 18px;padding:0">' + c.steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>' +
        '</div></div>';
    }).join('') + '<p class="sub">' + esc(I('Confidence is a rule-based estimate from how many separate signs agree: High needs several, Low means a single hint. It is never a certain diagnosis.', 'Η βεβαιότητα είναι εκτίμηση με κανόνες, από το πόσα ξεχωριστά σημάδια συμφωνούν: Υψηλή θέλει αρκετά, Χαμηλή σημαίνει μία μόνο ένδειξη. Δεν είναι ποτέ βέβαιη διάγνωση.')) + '</p>';
  }

  /* ---------------- trends ---------------- */
  var TM = [
    { k: 'freeC', en: 'Free space on C:', el: 'Ελεύθερος χώρος στο C:', up: true, thr: 5, u: ' GB' },
    { k: 'bootS', en: 'Start-up time', el: 'Χρόνος εκκίνησης', up: false, thr: 3, u: ' s' },
    { k: 'sysErr', en: 'System errors', el: 'Σφάλματα συστήματος', up: false, thr: 20, u: '' },
    { k: 'appErr', en: 'Program errors', el: 'Σφάλματα προγραμμάτων', up: false, thr: 20, u: '' },
    { k: 'crashes', en: 'Program crashes', el: 'Κρασαρίσματα προγραμμάτων', up: false, thr: 3, u: '' },
    { k: 'dumps', en: 'Crash dump files', el: 'Αρχεία dump κρασαρισμάτων', up: false, thr: 1, u: '' },
    { k: 'patchDays', en: 'Days since last Windows update', el: 'Ημέρες από την τελευταία ενημέρωση', up: false, thr: 7, u: '' },
    { k: 'startup', en: 'Programs that start with Windows', el: 'Προγράμματα που ξεκινούν με τα Windows', up: false, thr: 2, u: '' },
    { k: 'outdated', en: 'Programs with a newer version', el: 'Προγράμματα με νεότερη έκδοση', up: false, thr: 3, u: '' },
    { k: 'reliability', en: 'Windows reliability score', el: 'Βαθμός αξιοπιστίας Windows', up: true, thr: 0.4, u: '/10' },
    { k: 'ssdWear', en: 'SSD wear', el: 'Φθορά SSD', up: false, thr: 1, u: '%' },
    { k: 'batWear', en: 'Battery wear', el: 'Φθορά μπαταρίας', up: false, thr: 2, u: '%' },
    { k: 'tempMax', en: 'Highest temperature', el: 'Μέγιστη θερμοκρασία', up: false, thr: 4, u: ' C' }
  ];
  function avg(a) { var s = 0; a.forEach(function (x) { s += x; }); return a.length ? s / a.length : 0; }
  function judge(pts, upBetter, thr) {
    if (pts.length < 2) return null;
    var n = Math.max(1, Math.min(3, Math.floor(pts.length / 2))), f = avg(pts.slice(0, n)), l = avg(pts.slice(pts.length - n)), d = l - f;
    if (Math.abs(d) < thr) return { st: 'stable', f: f, l: l };
    return { st: ((d > 0) === upBetter) ? 'better' : 'worse', f: f, l: l };
  }
  function trendWord(st) { return st === 'better' ? I('Improving', 'Βελτιώνεται') : (st === 'worse' ? I('Degrading', 'Χειροτερεύει') : I('Stable', 'Σταθερό')); }
  function trendTag(st) { return tag(st === 'worse' ? 'high' : (st === 'better' ? 'medium' : 'info'), trendWord(st)); }
  function trends() {
    var tr = arr(V.RAW && V.RAW.trend).filter(function (x) { return x && x.t; }), out = [];
    TM.forEach(function (m) {
      var pts = tr.map(function (x) { return x[m.k]; }).filter(function (v) { return v != null && isFinite(v); });
      var j = judge(pts, m.up, m.thr); if (j) out.push({ m: m, j: j, n: pts.length });
    });
    var bh = arr(g(D(), 'boot.history', [])).filter(function (b) { return b && b.seconds != null; }).slice().sort(function (a, b) { return String(a.time) < String(b.time) ? -1 : 1; }).slice(-12);
    var bj = judge(bh.map(function (b) { return num(b.seconds); }), false, 5);
    return { rows: out, boot: bj ? { j: bj, pts: bh } : null, scans: tr.length };
  }
  function trendsHtml(T0) {
    if (!T0.rows.length && !T0.boot) return '<div class="sub">' + esc(I('Run the check again in a few weeks and the assistant will say for each measure if it is improving, stable or degrading.', 'Τρέξε ξανά τον έλεγχο σε μερικές εβδομάδες και ο βοηθός θα λέει για κάθε μέτρηση αν βελτιώνεται, είναι σταθερή ή χειροτερεύει.')) + '</div>';
    var fmt = function (m, v) { return V.fmtNum(v, m.k === 'reliability' ? 1 : (Math.abs(v) < 10 && v % 1 ? 1 : 0)) + m.u; };
    var rows = T0.rows.map(function (r) { return [I(r.m.en, r.m.el), fmt(r.m, r.j.f), fmt(r.m, r.j.l), { html: trendTag(r.j.st) }]; });
    var h = tbl([I('Measure', 'Μέτρηση'), I('Earlier', 'Παλαιότερα'), I('Now', 'Τώρα'), I('Direction', 'Κατεύθυνση')], rows);
    if (T0.boot) {
      h += '<div class="lbl" style="margin-top:12px">' + esc(I('Boot time of the last starts', 'Χρόνος εκκίνησης των τελευταίων εκκινήσεων')) + '</div><p style="margin:6px 0">' + esc(T0.boot.pts.map(function (b) { return Math.round(num(b.seconds)) + ' s'; }).join('  ->  ')) + ' ' + trendTag(T0.boot.j.st) + '</p>';
    }
    return h + '<p class="sub" style="margin:8px 0 0">' + esc(I('Each measure compares the first scans with the latest ones from Reports\\history.jsonl on this PC (' + T0.scans + ' scans). Small changes count as Stable.', 'Κάθε μέτρηση συγκρίνει τις πρώτες σαρώσεις με τις τελευταίες από το Reports\\history.jsonl σε αυτόν τον υπολογιστή (' + T0.scans + ' σαρώσεις). Οι μικρές αλλαγές θεωρούνται Σταθερό.')) + '</p>';
  }

  /* ---------------- score explained ---------------- */
  function expl() { var m = {}; ((V.score && V.score.explain) || []).forEach(function (e) { m[e.id] = e; }); return m; }
  function scoreHtml() {
    var EX = expl();
    var list = V.active().filter(function (f) { return f.sev !== 'info' && EX[f.id]; }).slice().sort(function (a, b) { return EX[b.id].points - EX[a.id].points; });
    var h = '<p style="margin:0 0 8px">' + esc(I('The score starts at 100. Each area (Stability, Storage, Security...) starts at 100 too. Every open finding keeps only part of its area: high keeps 80%, medium 92%, low 97%. The overall score is a weighted average of the areas (Stability counts most), pulled a little towards the worst area, so one serious problem cannot hide behind many fine areas. Findings of the type "info" take nothing off. The points below are exact: how much higher the score would be if only that finding was fixed.', 'Ο βαθμός ξεκινά από 100. Κάθε περιοχή (Σταθερότητα, Αποθήκευση, Ασφάλεια...) ξεκινά κι αυτή από 100. Κάθε ανοιχτό εύρημα κρατά μόνο ένα μέρος της περιοχής του: το υψηλό 80%, το μεσαίο 92%, το χαμηλό 97%. Ο συνολικός βαθμός είναι σταθμισμένος μέσος όρος των περιοχών (η Σταθερότητα μετρά περισσότερο), τραβηγμένος λίγο προς τη χειρότερη περιοχή, ώστε ένα σοβαρό πρόβλημα να μην κρύβεται πίσω από πολλές καλές περιοχές. Τα ευρήματα τύπου «info» δεν αφαιρούν τίποτα. Οι πόντοι παρακάτω είναι ακριβείς: πόσο ψηλότερος θα ήταν ο βαθμός αν διορθωνόταν μόνο εκείνο το εύρημα.')) + '</p>';
    h += '<p style="margin:0 0 8px"><b>' + V.score.score + ' / 100</b></p>';
    if (list.length) h += tbl([I('Points', 'Πόντοι'), I('Area', 'Περιοχή'), I('Reason', 'Λόγος')], list.map(function (f) { return ['-' + V.fmtNum(EX[f.id].points, 1), areaName(f.area), T(f)]; }));
    else h += '<p class="sub">' + esc(I('Nothing is taking points off right now.', 'Τίποτα δεν αφαιρεί πόντους αυτή τη στιγμή.')) + '</p>';
    var rows = V.score.areas.map(function (a) {
      var rs = list.filter(function (f) { return f.area === a.name; }).map(function (f) { return '-' + V.fmtNum(EX[f.id].areaPoints, 1) + ': ' + T(f); });
      return [areaName(a.name), a.score + ' / 100', rs.length ? { html: '<div class="sub">' + rs.map(esc).join('<br>') + '</div>' } : I('nothing', 'τίποτα')];
    });
    h += '<div class="lbl" style="margin-top:12px">' + esc(I('Score by area', 'Βαθμός ανά περιοχή')) + '</div>' + tbl([I('Area', 'Περιοχή'), I('Score', 'Βαθμός'), I('Why', 'Γιατί')], rows);
    return h;
  }

  /* ---------------- gaming readiness ---------------- */
  function gaming() {
    var gp = arr(D().gpus)[0]; if (!gp) return null;
    var X = EXd(), gm = X.gaming, X5 = X.more5 || {}, X8 = X.more8 || {};
    var rows = [], score = 100;
    function row(en, el, bad, known, w, okEn, okEl, f, custom) {
      var st = bad ? 'bad' : (known ? 'ok' : 'na');
      if (bad) score -= w;
      rows.push({ en: en, el: el, st: st, note: bad ? (custom ? custom[0] : (f ? T(f) : '')) : (known ? I(okEn, okEl) : I('not read by this scan', 'δεν διαβάστηκε από αυτή τη σάρωση')), step: bad ? (custom ? custom[1] : (f ? step1(f) : '')) : '' });
    }
    var f1 = act('gam-mode'), f2 = act('gam-hags'), f3 = act('upd-gpu'), f4 = act('gam-where'), f5 = act('gam-hz'), f6 = act('perf-power'), f7 = anyAct(['perf-xmp', 'perf-dual']), f8 = act('gam-dvr'), f9 = act('stab-gpu'), f10 = act('perf-gpuheat');
    row('Game Mode', 'Game Mode', !!f1, !!gm, 2, 'on (or at the Windows default)', 'ανοιχτό (ή στην προεπιλογή των Windows)', f1);
    row('GPU scheduling (HAGS)', 'Προγραμματισμός GPU (HAGS)', !!f2, !!gm, 5, 'on or not a problem', 'ανοιχτό ή όχι πρόβλημα', f2);
    var rb = X5.rebar, rbKnown = !!(rb && rb.checked && rb.bar1MiB != null), rbBad = rbKnown && rb.bar1MiB <= 256 && num(gp.vramGB) >= 4;
    row('Resizable BAR', 'Resizable BAR', rbBad, rbKnown, 4, 'on (' + (rb && rb.bar1MiB) + ' MiB window)', 'ανοιχτό (παράθυρο ' + (rb && rb.bar1MiB) + ' MiB)', null,
      [I('Resizable BAR looks off (256 MiB window)', 'Το Resizable BAR φαίνεται κλειστό (παράθυρο 256 MiB)'), I('In the BIOS turn on "Above 4G decoding" and "Resizable BAR". A few games run a bit faster. Only do this if you are comfortable in the BIOS: a wrong change can stop the PC from starting until it is undone.', 'Στο BIOS άνοιξε το «Above 4G decoding» και το «Resizable BAR». Μερικά παιχνίδια τρέχουν λίγο πιο γρήγορα. Κάντο μόνο αν νιώθεις άνετα στο BIOS: μια λάθος αλλαγή μπορεί να μην αφήσει τον υπολογιστή να ξεκινήσει μέχρι να αναιρεθεί.')]);
    row('Graphics driver age', 'Ηλικία οδηγού γραφικών', !!f3, gp.driverDate != null || !!gp.driverFriendly, 8, 'driver ' + (gp.driverFriendly || gp.driverVersion) + ' is not old', 'ο οδηγός ' + (gp.driverFriendly || gp.driverVersion) + ' δεν είναι παλιός', f3);
    row('Where the games are stored', 'Πού είναι τα παιχνίδια', !!f4, arr(X8.games).length > 0, 10, 'on a fast drive', 'σε γρήγορο δίσκο', f4);
    row('Screen refresh rate', 'Ρυθμός ανανέωσης οθόνης', !!f5, num(gp.refreshHz) > 0, 3, gp.refreshHz + ' Hz', gp.refreshHz + ' Hz', f5);
    row('Power plan', 'Σχέδιο παροχής ενέργειας', !!f6, !!g(D(), 'settings.powerPlan', ''), 8, g(D(), 'settings.powerPlan', ''), g(D(), 'settings.powerPlan', ''), f6);
    row('Memory speed and channels', 'Ταχύτητα και κανάλια μνήμης', !!f7, arr(g(D(), 'system.ram.modules', [])).length > 0, 8, 'XMP/EXPO and channels look fine', 'XMP/EXPO και κανάλια φαίνονται εντάξει', f7);
    row('Background game recording', 'Εγγραφή παιχνιδιών στο παρασκήνιο', !!f8, !!gm, 2, 'off', 'κλειστή', f8);
    row('Graphics stability', 'Σταθερότητα γραφικών', !!f9, true, 15, 'no repeated driver resets', 'χωρίς επαναλαμβανόμενες επαναφορές οδηγού', f9);
    row('Graphics heat', 'Θερμοκρασία γραφικών', !!f10, true, 8, 'no heat problem found', 'δεν βρέθηκε πρόβλημα ζέστης', f10);
    rows.push({ en: 'USB power saving', el: 'Εξοικονόμηση ενέργειας USB', st: 'na', note: I('not measured by this scan', 'δεν μετριέται από αυτή τη σάρωση'), step: '' });
    score = Math.max(0, score);
    return { score: score, rows: rows, gpu: gp };
  }
  function gamingHtml(G) {
    if (!G) return '<div class="sub">' + esc(I('No graphics card was found in the scan.', 'Δεν βρέθηκε κάρτα γραφικών στη σάρωση.')) + '</div>';
    var col = G.score >= 85 ? '#3ddc84' : (G.score >= 65 ? '#f5b44a' : '#e82c2d');
    var weak = G.rows.filter(function (r) { return r.st === 'bad'; });
    var h = '<div style="display:flex;gap:18px;flex-wrap:wrap;align-items:center;margin-bottom:10px"><div style="font-size:34px;font-weight:700;color:' + col + '">' + G.score + '<span style="font-size:16px"> / 100</span></div><div class="muted">' + esc(G.gpu.name + (G.gpu.refreshHz ? ' - ' + G.gpu.refreshHz + ' Hz' : '')) + '</div></div>';
    h += tbl([I('Check', 'Έλεγχος'), I('Result', 'Αποτέλεσμα'), I('Detail', 'Λεπτομέρεια')], G.rows.map(function (r) {
      return [I(r.en, r.el), { html: r.st === 'bad' ? tag('medium', I('weak point', 'αδύναμο σημείο')) : (r.st === 'ok' ? tag('info', 'OK') : tag('info', I('unknown', 'άγνωστο'))) }, r.note];
    }));
    if (weak.length) h += '<div class="lbl" style="margin-top:12px">' + esc(I('Recommendations', 'Προτάσεις')) + '</div>' + ul(weak.map(function (r) { return I(r.en, r.el) + ': ' + r.step; }).filter(function (x) { return x.length > 3; }));
    else h += '<p class="sub" style="margin:10px 0 0">' + esc(I('No weak points found. The PC is set up well for gaming.', 'Δεν βρέθηκαν αδύναμα σημεία. Ο υπολογιστής είναι καλά ρυθμισμένος για παιχνίδια.')) + '</p>';
    return h + '<p class="sub" style="margin:8px 0 0">' + esc(I('The score takes points off for each weak point (graphics stability and storage count most). It only reads settings: nothing is changed.', 'Ο βαθμός αφαιρεί πόντους για κάθε αδύναμο σημείο (σταθερότητα γραφικών και αποθήκευση μετράνε περισσότερο). Διαβάζει μόνο ρυθμίσεις: τίποτα δεν αλλάζει.')) + '</p>';
  }

  /* ---------------- memory stability ---------------- */
  function cpuGen(name) {
    name = String(name || ''); var m;
    if ((m = name.match(/(\d{1,2})(?:th|st|nd|rd)\s*Gen.*?Core/i))) return { v: 'intel', gen: parseInt(m[1], 10), tier: (name.match(/\bi([3579])\b|i([3579])-/i) || [])[1] || (name.match(/i([3579])/i) || [])[1] };
    if (/Core\(TM\)\s*Ultra|Core\s*Ultra/i.test(name)) return { v: 'intel', gen: 15 };
    if ((m = name.match(/Ryzen\s*([3579])\s*(\d)(\d{3})/i))) return { v: 'amd', gen: parseInt(m[2], 10) };
    return null;
  }
  function officialMT(c, type) {
    if (!c) return 0;
    if (c.v === 'intel') {
      if (/DDR5/i.test(type)) return c.gen >= 13 ? 5600 : (c.gen === 12 ? 4800 : (c.gen >= 15 ? 6400 : 0));
      if (/DDR4/i.test(type)) return c.gen >= 11 ? 3200 : (c.gen >= 10 ? (String(c.tier) === '3' ? 2666 : 2933) : (c.gen >= 8 ? 2666 : 2400));
      return 0;
    }
    if (c.v === 'amd') {
      if (/DDR5/i.test(type)) return c.gen >= 9 ? 5600 : 5200;
      if (/DDR4/i.test(type)) return c.gen >= 5 ? 3200 : (c.gen >= 3 ? 3200 : (c.gen === 2 ? 2933 : 2666));
    }
    return 0;
  }
  function memory() {
    var R = g(D(), 'system.ram', null), mods = arr(R && R.modules); if (!mods.length) return null;
    var slots = num(R.slots), type = mods[0].type || '', cfg = 0, parts = {}, sizes = {};
    mods.forEach(function (m) { cfg = Math.max(cfg, num(m.configuredMHz) || num(m.speedMHz)); parts[m.partNumber || ''] = 1; sizes[m.gb] = 1; });
    var cg = cpuGen(g(D(), 'system.cpu.name', '')), spec = officialMT(cg, type), over = spec ? cfg - spec : 0;
    var whea = cnt('system', /WHEA-Logger/), memB = bugCount(['mem', 'hw']);
    var pts = 0, why = [];
    if (mods.length >= 4) { pts += 1; why.push(I(mods.length + ' memory modules fill the memory controller (the highest load).', mods.length + ' μονάδες μνήμης γεμίζουν τον ελεγκτή μνήμης (το μεγαλύτερο φορτίο).')); }
    if (over > 200) { pts += 1; why.push(I('The memory runs at ' + cfg + ' MT/s, above the ' + spec + ' MT/s the processor officially supports (that is what XMP/EXPO does, it is normal for gaming PCs but it is the first thing to lower if the PC becomes unstable).', 'Η μνήμη τρέχει στα ' + cfg + ' MT/s, πάνω από τα ' + spec + ' MT/s που υποστηρίζει επίσημα ο επεξεργαστής (αυτό κάνει το XMP/EXPO, είναι φυσιολογικό στα gaming PC, αλλά είναι το πρώτο που χαμηλώνεις αν ο υπολογιστής γίνει ασταθής).')); if (mods.length >= 4) pts += 1; }
    if (Object.keys(parts).length > 1 || Object.keys(sizes).length > 1) { pts += 1; why.push(I('The modules are not identical (different part numbers or sizes).', 'Οι μονάδες δεν είναι ίδιες (διαφορετικά part numbers ή μεγέθη).')); }
    if (whea > 0 || memB > 0) { pts += 2; why.push(I('Memory or hardware errors were recorded (WHEA or crash codes), so this is not only theory.', 'Καταγράφηκαν σφάλματα μνήμης ή υλικού (WHEA ή κωδικοί κρασαρίσματος), άρα δεν είναι μόνο θεωρία.')); }
    if (!why.length) why.push(I('Nothing in the memory set-up adds extra risk.', 'Τίποτα στη ρύθμιση της μνήμης δεν προσθέτει επιπλέον ρίσκο.'));
    return { risk: pts >= 3 ? 'high' : (pts === 2 ? 'medium' : 'low'), why: why, mods: mods, slots: slots, cfg: cfg, spec: spec, cpu: g(D(), 'system.cpu.name', ''), errors: whea > 0 || memB > 0 };
  }
  function memoryHtml(M) {
    if (!M) return '<div class="sub">' + esc(I('The scan could not read the memory modules.', 'Η σάρωση δεν μπόρεσε να διαβάσει τις μονάδες μνήμης.')) + '</div>';
    var h = '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:8px">' + tag(M.risk === 'high' ? 'high' : (M.risk === 'medium' ? 'medium' : 'low'), I('Risk: ', 'Ρίσκο: ') + (M.risk === 'high' ? I('High', 'Υψηλό') : (M.risk === 'medium' ? I('Medium', 'Μέτριο') : I('Low', 'Χαμηλό')))) +
      '<span class="muted">' + esc(M.mods.length + ' / ' + (M.slots || '?') + I(' slots used', ' υποδοχές σε χρήση') + ' - ' + M.cfg + ' MT/s' + (M.spec ? I(' (processor official: ', ' (επίσημα του επεξεργαστή: ') + M.spec + ')' : '') + ' - ' + M.cpu) + '</span></div>';
    h += '<div class="lbl">' + esc(I('Reason', 'Λόγος')) + '</div>' + ul(M.why);
    h += tbl([I('Slot', 'Υποδοχή'), I('Size', 'Μέγεθος'), I('Type', 'Τύπος'), I('Rated / running', 'Ονομαστική / τρέχουσα'), I('Maker and part', 'Κατασκευαστής και κωδικός')], M.mods.map(function (m) { return [m.slot, m.gb + ' GB', m.type || '', (m.speedMHz || '?') + ' / ' + (m.configuredMHz || '?') + ' MT/s', (m.manufacturer || '') + ' ' + (m.partNumber || '')]; }));
    return h + '<p class="sub" style="margin:8px 0 0">' + esc(I('Risk is a rule of thumb from how the memory is installed. It becomes High only when memory-related errors were also recorded. Without errors, treat it as a hint of where to look first, not as a fault.', 'Το ρίσκο είναι εμπειρικός κανόνας από το πώς είναι τοποθετημένη η μνήμη. Γίνεται Υψηλό μόνο όταν έχουν καταγραφεί και σφάλματα που σχετίζονται με μνήμη. Χωρίς σφάλματα, δες το ως ένδειξη για το πού να κοιτάξεις πρώτα, όχι ως βλάβη.')) + '</p>';
  }

  /* ---------------- driver risk ---------------- */
  function driverKind(name) {
    name = String(name || '');
    if (/management engine|\bME\b|chipset|serial io|gpio|smbus|host bridge|lpc|pci express root|platform|thermal|dynamic platform/i.test(name)) return 'platform';
    if (/sata|ahci|nvme|storage|raid|usb mass/i.test(name)) return 'storage';
    if (/nvidia|geforce|radeon|display|graphics|intel\(r\) (uhd|hd|iris)/i.test(name)) return 'gpu';
    if (/wi-?fi|wireless|ethernet|network|bluetooth|lan|nic/i.test(name)) return 'net';
    if (/audio|realtek|sound|hd audio/i.test(name)) return 'audio';
    if (/usb|xhci|hub/i.test(name)) return 'usb';
    return 'other';
  }
  var KIND = {
    platform: { en: 'platform driver', el: 'οδηγός πλατφόρμας', ee: 'Platform drivers change rarely and an old one is normal unless the maker published a security fix.', el2: 'Οι οδηγοί πλατφόρμας αλλάζουν σπάνια και ένας παλιός είναι φυσιολογικός, εκτός αν ο κατασκευαστής έβγαλε διόρθωση ασφάλειας.' },
    storage: { en: 'storage driver', el: 'οδηγός αποθήκευσης', ee: 'The drive controller driver matters for stability: old versions are linked to timeouts.', el2: 'Ο οδηγός του ελεγκτή δίσκου μετράει για τη σταθερότητα: οι παλιές εκδόσεις σχετίζονται με καθυστερήσεις.' },
    gpu: { en: 'graphics driver', el: 'οδηγός γραφικών', ee: 'New games and Windows builds need newer graphics drivers.', el2: 'Τα νέα παιχνίδια και οι εκδόσεις Windows θέλουν νεότερους οδηγούς γραφικών.' },
    net: { en: 'network driver', el: 'οδηγός δικτύου', ee: 'An old network driver is fine unless the connection drops or a security fix exists.', el2: 'Ένας παλιός οδηγός δικτύου είναι εντάξει, εκτός αν πέφτει η σύνδεση ή υπάρχει διόρθωση ασφάλειας.' },
    audio: { en: 'audio driver', el: 'οδηγός ήχου', ee: 'Rarely a source of trouble.', el2: 'Σπάνια προκαλεί προβλήματα.' },
    usb: { en: 'USB driver', el: 'οδηγός USB', ee: 'Rarely a source of trouble, unless USB devices disconnect.', el2: 'Σπάνια προκαλεί προβλήματα, εκτός αν αποσυνδέονται οι USB συσκευές.' },
    other: { en: 'device driver', el: 'οδηγός συσκευής', ee: 'An old driver is not a problem by itself.', el2: 'Ένας παλιός οδηγός δεν είναι από μόνος του πρόβλημα.' }
  };
  function drivers() {
    var list = arr(g(D(), 'drivers.oldDrivers', [])), out = [];
    list.forEach(function (d) {
      var age = V.ageDays(d.date); if (age == null) return;
      var yrs = age / 365, kind = driverKind(d.device), cls = yrs < 2 ? 'current' : (yrs < 4 ? 'old' : (yrs < 7 ? 'vold' : 'critical'));
      var errEv = (kind === 'storage' && anyAct(['stab-disk', 'sto-diskhealth', 'cor-disk'])) || (kind === 'gpu' && anyAct(['stab-gpu', 'cor-gpu'])) || (kind === 'net' && anyAct(['net-link', 'net-wifi', 'net-gw'])) || (kind === 'platform' && (cnt('system', /WHEA-Logger/) > 0));
      var risk = errEv && yrs >= 2 ? (yrs >= 4 ? 'high' : 'medium') : ((cls === 'vold' || cls === 'critical') && (kind === 'storage' || kind === 'platform' || kind === 'gpu') ? 'medium' : 'low');
      if (cls === 'critical' && !errEv && kind !== 'storage') risk = 'medium';
      out.push({ d: d, yrs: yrs, kind: kind, cls: cls, risk: risk, errEv: errEv });
    });
    out.sort(function (a, b) { return b.yrs - a.yrs; });
    return out;
  }
  function driversHtml(L) {
    if (!L.length) return '<div class="sub">' + esc(I('No old drivers were listed by this scan.', 'Η σάρωση δεν κατέγραψε παλιούς οδηγούς.')) + '</div>';
    var CLS = { current: I('Current', 'Τρέχων'), old: I('Old', 'Παλιός'), vold: I('Very old', 'Πολύ παλιός'), critical: I('Critical age', 'Κρίσιμης ηλικίας') };
    var rows = L.map(function (x) {
      var k = KIND[x.kind], rk = x.risk === 'high' ? I('High', 'Υψηλό') : (x.risk === 'medium' ? I('Medium', 'Μέτριο') : I('Low', 'Χαμηλό'));
      return [x.d.device, { html: '<span class="muted">' + esc(V.fmtNum(x.yrs, 1) + I(' years', ' χρόνια')) + '</span> ' + tag(x.cls === 'current' ? 'info' : (x.cls === 'old' ? 'low' : 'medium'), CLS[x.cls]) }, { html: tag(x.risk === 'high' ? 'high' : (x.risk === 'medium' ? 'medium' : 'info'), rk) }, I(k.en, k.el) + ': ' + (x.errEv ? I('errors of the same kind were found in this scan. ', 'βρέθηκαν σφάλματα του ίδιου είδους σε αυτή τη σάρωση. ') : '') + I(k.ee, k.el2)];
    });
    var t = tbl([I('Driver', 'Οδηγός'), I('Age', 'Ηλικία'), I('Risk', 'Ρίσκο'), I('Reason', 'Λόγος')], rows);
    if (L.length > 12) t = '<details><summary>' + esc(I('Show all ' + L.length + ' drivers', 'Δες και τους ' + L.length + ' οδηγούς')) + '</summary>' + t + '</details>';
    return '<p style="margin:0 0 8px">' + esc(I('Age bands: current under 2 years, old 2 to 4, very old 4 to 7, critical age 7 or more. Risk goes up only when the driver is old AND errors of the same kind appear, or when the driver is storage, graphics or platform and very old.', 'Κατηγορίες ηλικίας: τρέχων κάτω από 2 χρόνια, παλιός 2 έως 4, πολύ παλιός 4 έως 7, κρίσιμης ηλικίας 7 και πάνω. Το ρίσκο ανεβαίνει μόνο όταν ο οδηγός είναι παλιός ΚΑΙ εμφανίζονται σφάλματα του ίδιου είδους, ή όταν είναι οδηγός αποθήκευσης, γραφικών ή πλατφόρμας και πολύ παλιός.')) + '</p>' + t +
      '<p class="sub" style="margin:8px 0 0">' + esc(I('An old driver is not automatically bad. Update from the PC or board maker, never from a driver-updater program.', 'Ένας παλιός οδηγός δεν είναι αυτόματα κακός. Ενημέρωσε από τον κατασκευαστή του υπολογιστή ή της μητρικής, ποτέ από πρόγραμμα ενημέρωσης οδηγών.')) + '</p>';
  }

  /* ---------------- security risk ---------------- */
  function security() {
    var S = D().security || {}, rows = [];
    function row(en, el, bad, known, okEn, okEl, f) { rows.push({ en: en, el: el, st: bad ? 'bad' : (known ? 'ok' : 'na'), note: bad ? (f ? T(f) : '') : (known ? I(okEn, okEl) : I('not read by this scan', 'δεν διαβάστηκε από αυτή τη σάρωση')) }); }
    var f;
    f = act('sec-sb'); row('Secure Boot', 'Secure Boot', !!f || S.secureBoot === false, S.secureBoot != null, 'on', 'ανοιχτό', f);
    f = anyAct(['sec-tpm', 'sec-tpm2']); row('TPM', 'TPM', !!f, !!S.tpm, 'present and ready', 'υπάρχει και είναι έτοιμο', f);
    var bl = arr(D().volumes).some(function (x) { return x.bitlocker && /on|1/i.test(String(x.bitlocker.protection)); });
    row('BitLocker', 'BitLocker', false, true, bl ? 'on' : 'off (optional on most home PCs)', bl ? 'ανοιχτό' : 'κλειστό (προαιρετικό στα περισσότερα οικιακά PC)', null);
    f = act('sec-mi'); row('Memory integrity', 'Ακεραιότητα μνήμης', !!f, S.memoryIntegrity != null, 'on', 'ανοιχτή', f);
    f = anyAct(['sec-av', 'sec-av2', 'sec-avold', 'sec-def-off', 'for-def-off', 'sec-def-sigs', 'sec-def-tamper']); row('Antivirus and Defender', 'Antivirus και Defender', !!f, arr(S.antivirus).length > 0, arr(S.antivirus).filter(function (a) { return a.enabled; }).map(function (a) { return a.name; }).join(', ') + ' active', arr(S.antivirus).filter(function (a) { return a.enabled; }).map(function (a) { return a.name; }).join(', ') + ' ενεργό', f);
    f = act('sec-fw'); row('Firewall', 'Τείχος προστασίας', !!f, !!S.firewall, 'on for all networks', 'ανοιχτό για όλα τα δίκτυα', f);
    f = anyAct(['sec-smb1', 'sec-legacy']); row('SMB1 (old file sharing)', 'SMB1 (παλιά κοινή χρήση αρχείων)', !!f, !!(EXd().securityMore), 'off', 'κλειστό', f);
    f = anyAct(['sec-rdp', 'sec-rdp-nla']); row('Remote Desktop', 'Απομακρυσμένη επιφάνεια εργασίας', !!f, S.rdpEnabled != null, 'off', 'κλειστή', f);
    f = act('sec-remote'); row('Remote-access tools', 'Εργαλεία απομακρυσμένης πρόσβασης', !!f, true, 'none found', 'δεν βρέθηκαν', f);
    f = act('sec-admins'); row('Local administrators', 'Τοπικοί διαχειριστές', !!f, S.localAdmins != null, S.localAdmins + ' account(s)', S.localAdmins + ' λογαριασμός(οί)', f);
    f = anyAct(['sec-uac', 'sec-uac-level']); row('User Account Control (UAC)', 'Έλεγχος λογαριασμού χρήστη (UAC)', !!f, S.uac != null, 'on', 'ανοιχτό', f);
    f = act('for-def-excl'); row('Antivirus exclusions', 'Εξαιρέσεις antivirus', !!f, !!(EXd().forensics), 'none risky found', 'δεν βρέθηκαν επικίνδυνες', f);
    var top = V.active().filter(function (x) { return x.area === 'Security' && x.sev !== 'info'; }).slice().sort(function (a, b) { return V.SEV_ORDER[a.sev] - V.SEV_ORDER[b.sev]; }).slice(0, 5);
    var sa = V.score.areas.filter(function (a) { return a.name === 'Security'; })[0], pa = V.score.areas.filter(function (a) { return a.name === 'Privacy'; })[0];
    return { rows: rows, top: top, sec: sa ? sa.score : 100, priv: pa ? pa.score : 100 };
  }
  function securityHtml(Sx) {
    var col = Sx.sec >= 85 ? '#3ddc84' : (Sx.sec >= 60 ? '#f5b44a' : '#e82c2d');
    var h = '<div style="display:flex;gap:22px;flex-wrap:wrap;align-items:center;margin-bottom:10px"><div><span style="font-size:34px;font-weight:700;color:' + col + '">' + Sx.sec + '</span><span> / 100 </span><span class="muted">' + esc(I('Security', 'Ασφάλεια')) + '</span></div><div class="muted">' + esc(I('Privacy: ', 'Απόρρητο: ') + Sx.priv + ' / 100') + '</div></div>';
    h += tbl([I('Check', 'Έλεγχος'), I('Result', 'Αποτέλεσμα'), I('Detail', 'Λεπτομέρεια')], Sx.rows.map(function (r) { return [I(r.en, r.el), { html: r.st === 'bad' ? tag('medium', I('risk', 'ρίσκο')) : (r.st === 'ok' ? tag('info', 'OK') : tag('info', I('unknown', 'άγνωστο'))) }, r.note]; }));
    h += '<div class="lbl" style="margin-top:12px">' + esc(I('Highest risks', 'Μεγαλύτερα ρίσκα')) + '</div>';
    h += Sx.top.length ? '<ol style="margin:6px 0 0 18px;padding:0">' + Sx.top.map(function (f) { return '<li>' + esc(T(f)) + '</li>'; }).join('') + '</ol>' : '<p class="sub" style="margin:6px 0 0">' + esc(I('No open security risk of medium or high weight.', 'Κανένα ανοιχτό ρίσκο ασφάλειας μεσαίου ή υψηλού βάρους.')) + '</p>';
    return h;
  }

  /* ---------------- update health ---------------- */
  function updates() {
    var wu = g(EXd(), 'more.wu', {}) || {}, d = wu.lastSuccessDays;
    if (d == null) { var hf = arr(g(D(), 'updates.hotfixes', [])).map(function (x) { return V.ageDays(x.installedOn); }).filter(function (x) { return x != null; }); if (hf.length) d = Math.min.apply(null, hf); }
    var st = d == null ? 'na' : (d <= 35 ? 'ok' : (d <= 60 ? 'warn' : 'bad'));
    var items = [];
    if (wu.restartPending || g(D(), 'security.pendingReboot', false)) items.push(I('A restart is waiting. Some updates are not finished until you restart.', 'Περιμένει επανεκκίνηση. Μερικές ενημερώσεις δεν ολοκληρώνονται μέχρι να κάνεις επανεκκίνηση.'));
    if (arr(wu.failed30).length) items.push(I(arr(wu.failed30).length + ' update(s) failed in the last 30 days.', arr(wu.failed30).length + ' ενημέρωση(εις) απέτυχαν τις τελευταίες 30 ημέρες.'));
    if (wu.paused || wu.serviceDisabled || wu.policyOff) items.push(I('Updates are paused or switched off.', 'Οι ενημερώσεις είναι σε παύση ή κλειστές.'));
    var ap = act('upd-apps'); if (ap) items.push(T(ap));
    var bi = act('upd-bios'); if (bi) items.push(T(bi));
    var gu = act('upd-gpu'); if (gu) items.push(T(gu));
    var msg = st === 'ok' ? I('Good: the last successful update was recent.', 'Καλό: η τελευταία επιτυχής ενημέρωση ήταν πρόσφατη.') : (st === 'warn' ? I('Attention: it has been a while since the last update. The PC may be missing recent fixes.', 'Προσοχή: έχει περάσει καιρός από την τελευταία ενημέρωση. Ο υπολογιστής μπορεί να μην έχει τις πρόσφατες διορθώσεις.') : (st === 'bad' ? I('Warning: more than 60 days without a successful update. The PC may miss important security fixes.', 'Προειδοποίηση: πάνω από 60 ημέρες χωρίς επιτυχή ενημέρωση. Ο υπολογιστής μπορεί να λείπουν σημαντικές διορθώσεις ασφάλειας.') : I('The scan could not tell when the last update was.', 'Η σάρωση δεν μπόρεσε να πει πότε έγινε η τελευταία ενημέρωση.')));
    var ua = V.score.areas.filter(function (a) { return a.name === 'Updates'; })[0];
    return { d: d, st: st, msg: msg, items: items, score: ua ? ua.score : 100 };
  }
  function updatesHtml(U) {
    var col = U.st === 'ok' ? '#3ddc84' : (U.st === 'warn' ? '#f5b44a' : (U.st === 'bad' ? '#e82c2d' : '#a1a1aa'));
    var h = '<div style="display:flex;gap:22px;flex-wrap:wrap;align-items:center;margin-bottom:8px"><div><span style="font-size:34px;font-weight:700;color:' + col + '">' + (U.d != null ? U.d : '?') + '</span><span class="muted"> ' + esc(I('days since the last successful update', 'ημέρες από την τελευταία επιτυχή ενημέρωση')) + '</span></div><div class="muted">' + esc(I('Updates score: ', 'Βαθμός ενημερώσεων: ') + U.score + ' / 100') + '</div></div><p style="margin:0">' + esc(U.msg) + '</p>';
    if (U.items.length) h += '<div class="lbl" style="margin-top:10px">' + esc(I('Also', 'Επίσης')) + '</div>' + ul(U.items);
    return h + '<p class="sub" style="margin:8px 0 0">' + esc(I('Up to 35 days is good, 36 to 60 needs attention, more than 60 is a warning.', 'Μέχρι 35 ημέρες είναι καλό, 36 έως 60 θέλει προσοχή, πάνω από 60 είναι προειδοποίηση.')) + '</p>';
  }

  /* ---------------- blue screens ---------------- */
  function bugHtml() {
    var L = bugList(); if (!L.length) return '';
    var rows = L.map(function (b) {
      var c = CAT[b.cat];
      return [b.k + (b.n > 1 ? ' (x' + b.n + ')' : '') + (b.age != null ? (b.recent ? '' : ' - ' + I('old', 'παλιό')) + ' (' + I(b.age + ' days ago', 'πριν ' + b.age + ' ημέρες') + ')' : ''), bugName(b.k) || I('unknown name', 'άγνωστο όνομα'), c ? I(c.en, c.el) : I('not in the list, search the code online', 'δεν είναι στη λίστα, ψάξε τον κωδικό στο internet'), c ? I(c.ce, c.cl) : '', { html: c ? tag(c.pri === 'high' ? 'high' : 'medium', priWord(c.pri)) : tag('info', '-') }];
    });
    return tbl([I('Code', 'Κωδικός'), I('Windows name', 'Όνομα Windows'), I('Points to', 'Δείχνει'), I('Most common causes', 'Συνηθέστερες αιτίες'), I('Priority', 'Προτεραιότητα')], rows) +
      '<p class="sub" style="margin:8px 0 0">' + esc(I('The code only says what kind of failure it was. Several different codes are a typical sign of memory or hardware instability. The same code every time points to one driver.', 'Ο κωδικός λέει μόνο τι είδους αποτυχία ήταν. Πολλοί διαφορετικοί κωδικοί είναι τυπικό σημάδι αστάθειας μνήμης ή υλικού. Ο ίδιος κωδικός κάθε φορά δείχνει έναν οδηγό.')) + '</p>';
  }

  /* ---------------- top 5 ---------------- */
  var RISKW = { 'Safe': 1, 'Careful': 1.6, 'Back up first': 2.2 };
  function value(f) {
    var e = expl()[f.id], m = V.META[f.id] || [30, 'Medium', 'Safe'];
    var gain = (e ? e.points : 0.3) + (f.sev === 'high' ? 1 : 0);
    return gain / (Math.sqrt(Math.max(m[0], 2)) * (RISKW[m[2]] || 1.5));
  }
  function top5() {
    var L = V.openList().slice().sort(function (a, b) { return value(b) - value(a); });
    return L.slice(0, 5);
  }
  function needsBackup(f) { var m = V.META[f.id]; return !!(m && m[2] === 'Back up first'); }
  function backupOpen() { return V.openList().some(function (f) { return f.area === 'Backup' && f.sev !== 'info'; }); }
  function top5Html() {
    var L = top5();
    if (!L.length) return sect(I('Top 5 recommended actions', 'Οι 5 σημαντικότερες ενέργειες'), '') + '<div class="win"><div class="body">' + esc(I('Nothing needs fixing right now.', 'Τίποτα δεν χρειάζεται διόρθωση τώρα.')) + '</div></div>';
    return sect(I('Top 5 recommended actions', 'Οι 5 σημαντικότερες ενέργειες'), I('ranked by how much each one raises the score, divided by the time and risk it needs', 'ταξινομημένες κατά το πόσο ανεβάζει ο καθένας το βαθμό, διά του χρόνου και του ρίσκου που θέλει')) +
      '<div class="win"><div class="body"><ol style="margin:0 0 0 18px;padding:0">' + L.map(function (f) {
        var m = V.META[f.id], p = (expl()[f.id] || {}).points || 0;
        return '<li style="margin-bottom:10px"><b>' + esc(T(f)) + '</b> ' + tag(f.sev === 'high' ? 'high' : (f.sev === 'medium' ? 'medium' : 'low'), '+' + V.fmtNum(Math.max(0.1, p), 1) + I(' points', ' πόντοι')) +
          (m ? ' <span class="sub">' + esc('~' + m[0] + I(' min, ', ' λεπτά, ') + mw(m[1]) + ', ' + mw(m[2])) + '</span>' : '') +
          (needsBackup(f) && backupOpen() ? '<div class="sub" style="margin-top:2px"><b>' + esc(I('Do first: make a backup (see the Backup findings).', 'Κάνε πρώτα: αντίγραφο ασφαλείας (δες τα ευρήματα Backup).')) + '</b></div>' : '') + (step1(f) ? '<div class="sub" style="margin-top:2px">' + esc(step1(f)) + '</div>' : '') + '</li>';
      }).join('') + '</ol></div></div>';
  }

  /* ---------------- executive summary ---------------- */
  function summaryHtml(C, T0) {
    var sc = V.score.score, n = V.openList().length, hi = V.openList().filter(function (f) { return f.sev === 'high'; }).length, me = V.openList().filter(function (f) { return f.sev === 'medium'; }).length;
    var s1 = sc >= 85 ? I('The system is generally in good shape.', 'Το σύστημα είναι γενικά σε καλή κατάσταση.') : (sc >= 60 ? I('The system works, but some things deserve attention.', 'Το σύστημα δουλεύει, αλλά κάποια πράγματα αξίζουν προσοχή.') : I('The system needs attention: several real problems were found.', 'Το σύστημα χρειάζεται προσοχή: βρέθηκαν αρκετά πραγματικά προβλήματα.'));
    var s2 = n ? I('The scan found ' + n + ' thing(s) worth a look (' + hi + ' high, ' + me + ' medium).', 'Η σάρωση βρήκε ' + n + ' πράγμα(τα) που αξίζει να δεις (' + hi + ' υψηλής, ' + me + ' μεσαίας σημασίας).') : I('Nothing needs fixing right now.', 'Τίποτα δεν χρειάζεται διόρθωση τώρα.');
    var p = [s1 + ' ' + s2];
    var top = C[0], pri = top ? top.pri : (hi ? 'high' : (me ? 'medium' : 'low'));
    if (top) p.push(I('The most important point is: ' + top.title.toLowerCase() + ' (' + confWord(top.conf).toLowerCase() + ' confidence). ', 'Το πιο σημαντικό σημείο είναι: ' + top.title.toLowerCase() + ' (' + confWord(top.conf).toLowerCase() + ' βεβαιότητα). ') + top.why);
    if (T0.rows.length) {
      var worse = T0.rows.filter(function (r) { return r.j.st === 'worse'; }), better = T0.rows.filter(function (r) { return r.j.st === 'better'; });
      if (worse.length) p.push(I('Compared with your earlier scans, ' + worse.length + ' measure(s) are degrading: ' + worse.slice(0, 3).map(function (r) { return r.m.en; }).join(', ') + '.', 'Σε σχέση με προηγούμενες σαρώσεις, ' + worse.length + ' μέτρηση(εις) χειροτερεύουν: ' + worse.slice(0, 3).map(function (r) { return r.m.el; }).join(', ') + '.'));
      else if (better.length) p.push(I('Compared with your earlier scans, ' + better.length + ' measure(s) improved and none got worse.', 'Σε σχέση με προηγούμενες σαρώσεις, ' + better.length + ' μέτρηση(εις) βελτιώθηκαν και καμία δεν χειροτέρεψε.'));
    }
    var steps = top ? top.steps.slice(0, 3) : top5().slice(0, 3).map(step1).filter(function (x) { return x; });
    var h = '<div class="win"><header><span>' + esc(I('System summary', 'Σύνοψη συστήματος')) + '</span><span class="st">' + esc(I('priority ', 'προτεραιότητα ') + priWord(pri)) + '</span></header><div class="body">' +
      p.map(function (x) { return '<p style="margin:0 0 8px">' + esc(x) + '</p>'; }).join('') +
      (steps.length ? '<div class="lbl">' + esc(I('Suggested next steps', 'Προτεινόμενα επόμενα βήματα')) + '</div><ol style="margin:6px 0 0 18px;padding:0">' + steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>' : '') +
      '<p class="sub" style="margin:10px 0 0">' + esc(I('This summary was written on this PC from rules and the numbers of the scan. No cloud AI is used and nothing was sent anywhere. It is an estimate, not a certain diagnosis.', 'Η περίληψη γράφτηκε σε αυτόν τον υπολογιστή από κανόνες και τους αριθμούς της σάρωσης. Δεν χρησιμοποιείται cloud AI και δεν στάλθηκε τίποτα πουθενά. Είναι εκτίμηση, όχι βέβαιη διάγνωση.')) + '</p>' +
      '</div></div>';
    return h;
  }

  /* ---------------- public ---------------- */
  var cache = null;
  function compute() {
    var C = causes(), T0 = trends();
    cache = { C: C, T0: T0 };
    return cache;
  }
  function summaryBlock() {
    var k = compute();
    return sect(I('Troubleshooting assistant', 'Βοηθός αντιμετώπισης'), I('what the findings add up to, and what is the likely cause', 'τι σημαίνουν τα ευρήματα μαζί, και ποια είναι η πιθανή αιτία')) +
      summaryHtml(k.C, k.T0) + sect(I('Likely causes', 'Πιθανές αιτίες'), I('findings that point to the same thing, with the evidence and a confidence level', 'ευρήματα που δείχνουν το ίδιο πράγμα, με αποδείξεις και επίπεδο βεβαιότητας')) + causesHtml(k.C);
  }
  function insightsHtml() {
    var k = cache || compute(), bug = bugHtml();
    var h = sect(I('Assistant: the detail', 'Βοηθός: οι λεπτομέρειες'), I('the numbers behind the summary, all rule-based and read-only', 'οι αριθμοί πίσω από τη σύνοψη, όλα με κανόνες και μόνο ανάγνωση'));
    h += win(I('Why the score is ' + V.score.score, 'Γιατί ο βαθμός είναι ' + V.score.score), I('every point has a reason', 'κάθε πόντος έχει λόγο'), scoreHtml());
    if (bug) h += win(I('Blue screen codes explained', 'Κωδικοί μπλε οθόνης με εξήγηση'), I('what each code usually means', 'τι σημαίνει συνήθως ο κάθε κωδικός'), bug);
    var G = gaming(); if (G) h += win(I('Gaming readiness', 'Ετοιμότητα για παιχνίδια'), G.score + ' / 100', gamingHtml(G));
    var M = memory(); if (M) h += win(I('Memory stability', 'Σταθερότητα μνήμης'), I('risk ', 'ρίσκο ') + M.risk, memoryHtml(M));
    var L = drivers(); if (L.length) h += win(I('Driver age and risk', 'Ηλικία και ρίσκο οδηγών'), L.length + I(' drivers', ' οδηγοί'), driversHtml(L));
    h += win(I('Security risk', 'Ρίσκο ασφάλειας'), I('read-only checklist', 'λίστα μόνο ανάγνωσης'), securityHtml(security()));
    h += win(I('Update health', 'Υγεία ενημερώσεων'), '', updatesHtml(updates()));
    h += win(I('Is it getting better or worse?', 'Βελτιώνεται ή χειροτερεύει;'), k.T0.scans + I(' scans', ' σαρώσεις'), trendsHtml(k.T0));
    return h;
  }
  function render() {
    var el = document.getElementById('tab-summary'); if (!el) return;
    var old = el.querySelectorAll('[data-assist]'); for (var i = 0; i < old.length; i++) old[i].parentNode.removeChild(old[i]);
    var a = document.createElement('div'); a.setAttribute('data-assist', 'main'); a.innerHTML = summaryBlock();
    var anc = el.querySelector('.vz2') || el.querySelector('.summary');
    var covs = el.querySelectorAll('#scanCov, #stepIssues'), last = anc;
    for (var j = 0; j < covs.length; j++) last = covs[j];
    if (last && last.insertAdjacentElement) last.insertAdjacentElement('afterend', a); else el.insertBefore(a, el.firstChild);
    var t = document.createElement('div'); t.setAttribute('data-assist', 'top5'); t.innerHTML = top5Html();
    var btns = el.querySelector('.btns:last-child'); if (btns) el.insertBefore(t, btns); else el.appendChild(t);
  }
  return { use: function (v) { V = v; cache = null; }, render: render, insightsHtml: insightsHtml, causes: function () { return compute().C; }, trends: trends, gaming: gaming, memory: memory, drivers: drivers, security: security, updates: updates, top5: top5 };
})(V);
