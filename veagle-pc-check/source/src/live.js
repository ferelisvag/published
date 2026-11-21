/* VEAGLE PC Check: καρτέλα Live. Εξηγεί το Veagle Eye (ξεχωριστό πρόγραμμα, ζωντανοί αισθητήρες)
   και ανοίγει τη σελίδα του ΜΟΝΟ όταν πατήσεις το κουμπί. Τίποτα αυτόματο, καμία κλήση στο internet από εδώ.
   Η διεύθυνση (127.0.0.1 + κωδικός) δεν αποθηκεύεται πουθενά. Ανοίγει σε νέα καρτέλα, γιατί το Veagle Eye
   δεν επιτρέπει ενσωμάτωση μέσα σε τοπικό αρχείο (δική του πολιτική ασφαλείας). */
var LIVE = (function (V) {
  'use strict';
  var $ = V.$, esc = V.esc;
  function I(en, el) { return V.I(en, el); }
  var st = { addr: '', msg: '' };
  /* δέχεται: http://127.0.0.1:8765/?t=ΚΩΔΙΚΟΣ  ή  μόνο θύρα και κωδικό */
  function parse(txt) {
    txt = String(txt || '').trim();
    var m = txt.match(/^https?:\/\/(?:127\.0\.0\.1|localhost):(\d{2,5})\/?\?t=([A-Za-z0-9_-]{8,})/);
    if (m) return { port: +m[1], token: m[2] };
    return null;
  }
  function html() {
    var h = '<div class="sect"><h2>' + esc(I('Live', 'Ζωντανά')) + '</h2><span>' + esc(I('real-time sensors with Veagle Eye', 'αισθητήρες σε πραγματικό χρόνο με το Veagle Eye')) + '</span></div>';
    h += '<div class="win"><h3>' + esc(I('What is this?', 'Τι είναι αυτό;')) + '</h3><div class="body">' +
      '<p>' + esc(I('The PC Check report is a photo of your computer at one moment. For live numbers (processor, memory, disk, network, temperatures moving in real time) there is a second, separate free program: Veagle Eye.', 'Η αναφορά του PC Check είναι μια φωτογραφία του υπολογιστή σου μια συγκεκριμένη στιγμή. Για ζωντανά νούμερα (επεξεργαστής, μνήμη, δίσκος, δίκτυο, θερμοκρασίες που αλλάζουν την ώρα που τις βλέπεις) υπάρχει ένα δεύτερο, ξεχωριστό και δωρεάν πρόγραμμα: το Veagle Eye.')) + '</p>' +
      '<p class="sub">' + esc(I('Veagle Eye listens only on your own computer (address 127.0.0.1) and asks for a secret code. Nothing goes to the internet.', 'Το Veagle Eye ακούει μόνο στον δικό σου υπολογιστή (διεύθυνση 127.0.0.1) και ζητά μυστικό κωδικό. Τίποτα δεν πάει στο internet.')) + '</p></div></div>';
    h += '<div class="win"><h3>' + esc(I('How to see live data, step by step', 'Πώς βλέπεις ζωντανά δεδομένα, βήμα-βήμα')) + '</h3><div class="body"><ol>' +
      '<li>' + esc(I('Download Veagle Eye (button below) and save it in a folder you can find.', 'Κατέβασε το Veagle Eye (κουμπί παρακάτω) και αποθήκευσέ το σε ένα φάκελο που θα βρίσκεις.')) + '</li>' +
      '<li>' + esc(I('Double-click VeagleEye.exe. A black window opens. IMPORTANT: this black window must stay open for as long as you want live data. If you close it, the live data stops.', 'Κάνε διπλό κλικ στο VeagleEye.exe. Ανοίγει ένα μαύρο παράθυρο. ΣΗΜΑΝΤΙΚΟ: αυτό το μαύρο παράθυρο πρέπει να μένει ανοιχτό όσο θέλεις να βλέπεις ζωντανά δεδομένα. Αν το κλείσεις, σταματούν.')) + '</li>' +
      '<li>' + esc(I('In the black window find the line that says "Address" and copy it (select it with the mouse, then right-click).', 'Στο μαύρο παράθυρο βρες τη γραμμή «Διεύθυνση / Address» και αντίγραψέ την (σημάδεψέ την με το ποντίκι και κάνε δεξί κλικ).')) + '</li>' +
      '<li>' + esc(I('Paste it in the box below and press "Open live view". It opens in a new browser tab.', 'Επικόλλησέ την στο κουτί παρακάτω και πάτα «Άνοιγμα ζωντανής προβολής». Ανοίγει σε νέα καρτέλα του browser.')) + '</li>' +
      '<li>' + esc(I('When you are done, close the black window. That stops it completely.', 'Όταν τελειώσεις, κλείσε το μαύρο παράθυρο. Έτσι σταματά εντελώς.')) + '</li></ol>' +
      '<p class="sub">' + esc(I('Shortcut: the file VEAGLE-PC-Check-Live.bat (next to this report\'s program) starts Veagle Eye for you if VeagleEye.exe is in the same folder. It asks first.', 'Συντόμευση: το αρχείο VEAGLE-PC-Check-Live.bat (στον ίδιο φάκελο με το πρόγραμμα) ξεκινά το Veagle Eye για σένα αν το VeagleEye.exe είναι στον ίδιο φάκελο. Ρωτά πρώτα.')) + '</p></div></div>';
    h += '<div class="win"><h3>' + esc(I('Open the live view', 'Άνοιγμα ζωντανής προβολής')) + '</h3><div class="body">' +
      '<div class="field"><label class="lbl" for="liveAddr">' + esc(I('Address from the black window', 'Διεύθυνση από το μαύρο παράθυρο')) + '</label>' +
      '<input id="liveAddr" type="text" autocomplete="off" spellcheck="false" placeholder="http://127.0.0.1:8765/?t=..." value="' + esc(st.addr) + '"></div>' +
      '<div class="btns"><button class="btn primary" type="button" id="liveGo">' + esc(I('Open live view', 'Άνοιγμα ζωντανής προβολής')) + '</button>' +
      '<a class="btn" target="_blank" rel="noopener noreferrer" href="https://ferelisvag.github.io/published/veagle-eye/">' + esc(I('Get Veagle Eye (opens a web page)', 'Κατέβασε το Veagle Eye (ανοίγει σελίδα)')) + '</a></div>' +
      '<p class="sub" id="liveMsg" role="status">' + esc(st.msg) + '</p></div></div>';
    return h;
  }
  function render() { var t = $('#tab-live'); if (t) t.innerHTML = html(); }
  function open() {
    var inp = $('#liveAddr'); st.addr = inp ? inp.value : '';
    var c = parse(st.addr);
    if (!c) { st.msg = I('I did not understand the address. It must look like http://127.0.0.1:8765/?t=... Copy the whole line from the black window.', 'Δεν κατάλαβα τη διεύθυνση. Πρέπει να μοιάζει με http://127.0.0.1:8765/?t=... Αντίγραψε ολόκληρη τη γραμμή από το μαύρο παράθυρο.'); render(); return; }
    st.msg = I('Opening in a new tab. If it stays empty, Veagle Eye is not running: start it and keep its black window open.', 'Ανοίγει σε νέα καρτέλα. Αν μείνει κενή, το Veagle Eye δεν τρέχει: ξεκίνα το και άφησε ανοιχτό το μαύρο παράθυρό του.');
    st.addr = ''; render();
    window.open('http://127.0.0.1:' + c.port + '/?t=' + c.token, '_blank', 'noopener');
  }
  function init() {
    var t = $('#tab-live'); if (!t) return;
    if (!t.getAttribute('data-live')) {
      t.setAttribute('data-live', '1');
      t.addEventListener('click', function (e) { if (e.target.closest('#liveGo')) open(); });
      t.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.id === 'liveAddr') open(); });
    }
    render();
  }
  return { init: init, render: render, parse: parse };
})(V);
