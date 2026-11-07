/* VEAGLE PC Check 1.1.0 - Support links and "check for a newer version". Only plain links that YOU click (new tab). Nothing is sent, nothing is checked automatically. */
var SUPPORT = (function (V) {
  'use strict';
  var esc = V.esc, arr = V.arr, g = V.g, D = V.D;
  function I(en, el) { return V.I(en, el); }
  var PAGE = 'https://ferelisvag.github.io/published/veagle-pc-check/';
  var MAKERS = [
    ['Dell', /dell|alienware/i, 'https://www.dell.com/support'],
    ['HP', /\bhp\b|hewlett|compaq|omen/i, 'https://support.hp.com'],
    ['Lenovo', /lenovo|thinkpad|ideapad|legion/i, 'https://support.lenovo.com'],
    ['ASUS', /asus|republic of gamers/i, 'https://www.asus.com/support/'],
    ['MSI', /\bmsi\b|micro-star/i, 'https://www.msi.com/support'],
    ['Acer', /acer|packard|predator/i, 'https://www.acer.com/support'],
    ['Gigabyte', /gigabyte|aorus/i, 'https://www.gigabyte.com/Support'],
    ['ASRock', /asrock/i, 'https://www.asrock.com/support/'],
    ['Microsoft Surface', /microsoft corporation.*surface|^surface/i, 'https://support.microsoft.com/surface']
  ];
  var GPUS = [
    ['NVIDIA', /nvidia|geforce|quadro/i, 'https://www.nvidia.com/drivers'],
    ['AMD', /amd|radeon/i, 'https://www.amd.com/support'],
    ['Intel', /intel/i, 'https://www.intel.com/content/www/us/en/download-center/home.html']
  ];
  function maker() {
    var txt = [g(D, 'system.manufacturer', ''), g(D, 'system.model', ''), g(D, 'system.board.manufacturer', '')].join(' ');
    for (var i = 0; i < MAKERS.length; i++) if (MAKERS[i][1].test(txt)) return { name: MAKERS[i][0], url: MAKERS[i][2] };
    return null;
  }
  function gpus() {
    var out = [], seen = {};
    arr(D.gpus).forEach(function (x) {
      for (var i = 0; i < GPUS.length; i++) if (GPUS[i][1].test(x.name || '')) { if (!seen[GPUS[i][0]]) { seen[GPUS[i][0]] = 1; out.push({ name: GPUS[i][0], url: GPUS[i][2], model: x.name }); } break; }
    });
    return out;
  }
  function a(url, text) { return '<a class="btn sm" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + esc(text) + '</a>'; }
  /* findings that are about drivers, BIOS, firmware, heat or the hardware itself */
  var HW = /^(upd-gpu|upd-bios|upd-devices|upd-fail|drv-|stab-gpu|cor-gpu|perf-gpuheat|perf-heat|perf-throttle|hw-age|sto-diskhealth|pred-)/;
  var GPUF = /gpu/;
  function row(f) {
    if (!f || !HW.test(f.id)) return '';
    var m = maker(), gp = gpus(), btn = [];
    if (GPUF.test(f.id)) gp.forEach(function (x) { btn.push(a(x.url, I('Official ' + x.name + ' drivers', 'Επίσημοι οδηγοί ' + x.name))); });
    else if (m) btn.push(a(m.url, I(m.name + ' support page', 'Σελίδα υποστήριξης ' + m.name)));
    if (!btn.length && m) btn.push(a(m.url, I(m.name + ' support page', 'Σελίδα υποστήριξης ' + m.name)));
    if (!btn.length) return '';
    return '<div class="supp"><span class="lbl">' + esc(I('Official support', 'Επίσημη υποστήριξη')) + '</span> ' + btn.join(' ') + ' <span class="sub">' + esc(I('Opens the maker\'s website in a new tab. Nothing is sent.', 'Ανοίγει την ιστοσελίδα του κατασκευαστή σε νέα καρτέλα. Δεν στέλνεται τίποτα.')) + '</span></div>';
  }
  function html() {
    var m = maker(), gp = gpus(), ver = g(D, 'meta.version', '?');
    var links = [];
    if (m) links.push(a(m.url, m.name));
    gp.forEach(function (x) { links.push(a(x.url, x.name + ' (' + I('graphics', 'κάρτα γραφικών') + ')')); });
    var h = '<div class="sect"><h2>' + esc(I('Updates and official support', 'Ενημερώσεις και επίσημη υποστήριξη')) + '</h2><span>' + esc(I('links only, you click them', 'μόνο σύνδεσμοι, τους πατάς εσύ')) + '</span></div>';
    h += '<div class="two" style="margin-bottom:18px"><div class="win"><header><span>support.url</span><span class="st">' + esc(I('maker websites', 'ιστοσελίδες κατασκευαστών')) + '</span></header><div class="body">' +
      '<p class="sub" style="margin:0 0 8px">' + esc(I('Drivers and BIOS updates are best taken from the maker of your PC. Here are the official pages for what this scan found.', 'Τους οδηγούς και τις ενημερώσεις BIOS είναι καλύτερα να τους παίρνεις από τον κατασκευαστή του υπολογιστή σου. Εδώ είναι οι επίσημες σελίδες για ό,τι βρήκε η σάρωση.')) + '</p>' +
      '<div class="btns">' + (links.length ? links.join(' ') : '<span class="sub">' + esc(I('The maker of this PC was not recognised. Search the web for your PC model and the word "support".', 'Ο κατασκευαστής δεν αναγνωρίστηκε. Ψάξε στο διαδίκτυο το μοντέλο του υπολογιστή σου μαζί με τη λέξη «support».')) + '</span>') + '</div></div></div>' +
      '<div class="win"><header><span>version.txt</span><span class="st">' + esc(I('nothing automatic', 'τίποτα αυτόματο')) + '</span></header><div class="body">' +
      '<p class="sub" style="margin:0 0 8px">' + esc(I('This report was made by version ' + ver + '. The button opens the download page in a new tab, so you can compare it with the newest version. This app never checks the internet by itself.', 'Αυτό το report φτιάχτηκε από την έκδοση ' + ver + '. Το κουμπί ανοίγει τη σελίδα λήψης σε νέα καρτέλα, ώστε να τη συγκρίνεις με την πιο πρόσφατη έκδοση. Η εφαρμογή δεν ελέγχει ποτέ μόνη της το διαδίκτυο.')) + '</p>' +
      '<div class="btns">' + a(PAGE, I('Check for a newer version', 'Έλεγχος για νεότερη έκδοση')) + '</div></div></div></div>';
    return h;
  }
  return { html: html, row: row, maker: maker, gpus: gpus, PAGE: PAGE };
})(V);
