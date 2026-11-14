/* Συντομεύσεις Chrome και Google. Οι διευθύνσεις https ανοίγουν κανονικά.
   Οι διευθύνσεις chrome:// ΔΕΝ μπορούν να ανοιχτούν από ιστοσελίδα (το Chrome τις μπλοκάρει για ασφάλεια),
   γι' αυτό εδώ αντιγράφονται και τις επικολλάς στη γραμμή διευθύνσεων. Τίποτα δεν αλλάζει μόνο του. */
(function () {
  'use strict';
  var OS = window.OS; if (!OS) return;
  var h = OS.h;
  var GOOGLE = [
    ['Διαχείριση κωδικών Google', 'Δες και διαχειρίσου τους αποθηκευμένους κωδικούς σου', 'https://passwords.google.com/'],
    ['Ο λογαριασμός μου Google', 'Στοιχεία, ασφάλεια, συσκευές', 'https://myaccount.google.com/'],
    ['Έλεγχος ασφαλείας', 'Δες αν ο λογαριασμός σου είναι ασφαλής', 'https://myaccount.google.com/security-checkup'],
    ['Συσκευές που έχουν συνδεθεί', 'Ποιες συσκευές είναι συνδεδεμένες στον λογαριασμό', 'https://myaccount.google.com/device-activity'],
    ['Google Takeout', 'Κατέβασε αντίγραφο των δεδομένων σου', 'https://takeout.google.com/']
  ];
  var CHROME = [
    ['Επιτάχυνση υλικού (hardware acceleration)', 'chrome://settings/system', 'Εκεί υπάρχει ο διακόπτης «Χρήση επιτάχυνσης υλικού όταν είναι διαθέσιμη». Αφού τον αλλάξεις, το Chrome ζητά επανεκκίνηση.'],
    ['Κωδικοί και κλειδιά πρόσβασης (Chrome)', 'chrome://password-manager/passwords', 'Ο διαχειριστής κωδικών μέσα στο Chrome.'],
    ['Ρυθμίσεις διαχείρισης κωδικών', 'chrome://password-manager/settings', 'Αυτόματη συμπλήρωση, έλεγχος κωδικών.'],
    ['Εκκαθάριση δεδομένων περιήγησης', 'chrome://settings/clearBrowserData', 'Ιστορικό, cookies, cache.'],
    ['Επεκτάσεις', 'chrome://extensions', 'Δες και απενεργοποίησε επεκτάσεις.'],
    ['Πληροφορίες GPU', 'chrome://gpu', 'Δείχνει αν δουλεύει η επιτάχυνση υλικού.'],
    ['Πειραματικές ρυθμίσεις (flags)', 'chrome://flags', 'Για προχωρημένους. Άλλαξε με προσοχή.'],
    ['Έκδοση του Chrome', 'chrome://version', 'Έκδοση και φάκελος προφίλ.'],
    ['Λήψεις', 'chrome://downloads', 'Τα αρχεία που κατέβασες.'],
    ['Ιστορικό', 'chrome://history', 'Οι σελίδες που άνοιξες.']
  ];
  OS.registerApp('chromekeys', { title: 'Συντομεύσεις Chrome', path: '/usr/chrome', icon: 'key', width: 600, build: function (body) {
    var a = h('div', 'app'); body.appendChild(a);
    a.appendChild(h('p', 'n', 'Γρήγορη πρόσβαση σε σελίδες ρυθμίσεων του Chrome και του λογαριασμού σου Google. Τίποτα δεν αλλάζει από εδώ: απλώς σε πηγαίνει εκεί, και την αλλαγή την κάνεις εσύ.'));
    a.appendChild(h('h4', '', 'Google (ανοίγουν κατευθείαν)'));
    GOOGLE.forEach(function (g) {
      var r = h('div', 'r'), l = h('label', '', g[0]); l.style.flex = '1'; l.appendChild(h('small', '', ' · ' + g[1]));
      var b = h('button', 'btn pri', 'Άνοιγμα'); b.type = 'button'; b.addEventListener('click', function () { window.open(g[2], '_blank', 'noopener'); });
      r.appendChild(l); r.appendChild(b); a.appendChild(r);
    });
    a.appendChild(h('h4', '', 'Chrome (αντιγράφεις και επικολλάς)'));
    a.appendChild(h('p', 'n', 'Το Chrome δεν αφήνει καμία ιστοσελίδα να ανοίξει τις δικές του σελίδες (chrome://). Γι’ αυτό πάτα «Αντιγραφή», μετά Ctrl+L στο Chrome (γραμμή διευθύνσεων), Ctrl+V και Enter.'));
    CHROME.forEach(function (c) {
      var r = h('div', 'r'), l = h('label', '', c[0]); l.style.flex = '1'; l.appendChild(h('small', '', ' · ' + c[2]));
      var b = h('button', 'btn', 'Αντιγραφή'); b.type = 'button'; b.title = c[1]; b.addEventListener('click', function () { OS.copy(c[1]); OS.toast('Αντιγράφηκε: ' + c[1] + '. Κάνε επικόλληση στη γραμμή διευθύνσεων.'); });
      r.appendChild(l); r.appendChild(b); a.appendChild(r);
    });
    a.appendChild(h('p', 'n', 'Σημείωση: ούτε μια ιστοσελίδα ούτε το Veagle OS μπορεί να αλλάξει μόνο του τη ρύθμιση επιτάχυνσης υλικού. Αλλάζει μόνο από τις ρυθμίσεις του Chrome.'));
  } });
})();
