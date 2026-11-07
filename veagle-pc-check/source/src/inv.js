/* VEAGLE PC Check 0.7.0 - Equipment tab (asset view), security and privacy boxes, performance snapshot, disk treemap, programs table, Excel export */
var INV = (function (V, AI) {
  'use strict';
  var $ = V.$, $$ = V.$$, esc = V.esc, arr = V.arr, num = V.num, g = V.g, D = V.D;
  function I(en, el) { return V.I(en, el); }
  var X2 = (D && D.extras && D.extras.more2) || {}, X1 = (D && D.extras && D.extras.more) || {};
  var MAKERS = { DEL: 'Dell', SAM: 'Samsung', GSM: 'LG', ACI: 'ASUS', AUS: 'ASUS', AOC: 'AOC', BNQ: 'BenQ', HWP: 'HP', HPN: 'HP', LEN: 'Lenovo', PHL: 'Philips', ACR: 'Acer', MSI: 'MSI', GBT: 'Gigabyte', VSC: 'ViewSonic', SHP: 'Sharp', SNY: 'Sony', IVM: 'Iiyama', NEC: 'NEC', MEI: 'Panasonic', LGD: 'LG Display', BOE: 'BOE', AUO: 'AU Optronics', CMN: 'Chimei', TSB: 'Toshiba', EIZ: 'EIZO', APP: 'Apple', MS_: 'Microsoft' };
  function card(title, st, inner) { return '<div class="win"><header><span>' + esc(title) + '</span><span class="st">' + esc(st || '') + '</span></header><div class="body">' + inner + '</div></div>'; }
  function sect(t, n) { return '<div class="sect"><h2>' + esc(t) + '</h2><span>' + esc(n || '') + '</span></div>'; }
  function kv(p) { return '<dl class="kv">' + p.filter(function (x) { return x[1] !== '' && x[1] != null && x[1] !== '-'; }).map(function (x) { return '<dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd>'; }).join('') + '</dl>'; }
  function tbl(heads, rows, hot) {
    if (!rows.length) return '<div class="sub">' + esc(I('Nothing found.', 'Δεν βρέθηκε τίποτα.')) + '</div>';
    return '<div class="tbl"><table><thead><tr>' + heads.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' + rows.map(function (r, i) { return '<tr' + (hot && hot(i) ? ' class="hot"' : '') + '>' + r.map(function (c) { return '<td>' + (c && c.html ? c.html : esc(c == null ? '' : c)) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
  }
  var LOCK = function () { return '<span class="lockn">&#128274; ' + esc(I('not in the share-safe copy', 'δεν μπαίνει στο αντίγραφο για κοινοποίηση')) + '</span>'; };
  function yn(b) { return b ? I('yes', 'ναι') : I('no', 'όχι'); }
  function day(s) { s = String(s || ''); if (/^\d{8}$/.test(s)) return s.slice(0, 4) + '-' + s.slice(4, 6) + '-' + s.slice(6, 8); return s.slice(0, 10); }
  function mk(code) { return MAKERS[code] || code || ''; }

  /* ---------- Equipment tab ---------- */
  function ageTxt() { return arr(V.RT.hwAge()).filter(function (a) { return a.what !== 'bios'; }).map(function (a) { return (a.what === 'processor' ? I('Processor', 'Επεξεργαστής') : I('Graphics', 'Γραφικά')) + ': ' + a.label + ', ' + I('about ' + a.age + ' years old', 'περίπου ' + a.age + ' ετών'); }); }
  function inventoryTab() {
    var el = $('#tab-inventory'); if (!el) return;
    var s = D.system || {}, inv = X1.inventory || {}, h = '';
    h += sect(I('Equipment', 'Εξοπλισμός'), I('what is in and around this PC, like an asset list', 'τι υπάρχει μέσα και γύρω από αυτόν τον υπολογιστή, σαν λίστα εξοπλισμού'));
    h += '<div class="btns" style="margin:0 0 14px"><button class="btn primary" type="button" id="xlsBtn">' + esc(I('Export to Excel (.xlsx)', 'Εξαγωγή σε Excel (.xlsx)')) + '</button><span class="sub">' + esc(I('A workbook with one sheet per topic: asset, drives, memory, findings, programs and more.', 'Ένα βιβλίο εργασίας με ένα φύλλο ανά θέμα: εξοπλισμός, δίσκοι, μνήμη, ευρήματα, προγράμματα και άλλα.')) + '</span></div>';
    var bi = g(s, 'bios.date', null), biosAge = bi ? Math.round((new Date(g(D, 'meta.generated', Date.now())) - new Date(bi)) / (365.25 * 86400000) * 10) / 10 : null;
    h += '<div class="grid">';
    h += '<div class="s6">' + card(I('This PC', 'Αυτός ο υπολογιστής'), g(D, 'meta.computer', ''), kv([
      [I('Maker and model', 'Κατασκευαστής και μοντέλο'), (inv.maker || s.manufacturer || '') + ' ' + (inv.model || s.model || '')], [I('Type', 'Τύπος'), s.isLaptop ? I('laptop', 'laptop') : (s.chassis || I('desktop', 'desktop'))],
      [I('Serial number', 'Σειριακός αριθμός'), inv.serial || ''], [I('Asset tag in BIOS', 'Asset tag στο BIOS'), g(X2, 'board.assetTag', '')],
      [I('Processor', 'Επεξεργαστής'), g(s, 'cpu.name', '')], [I('Memory', 'Μνήμη'), V.fmtGB(g(s, 'ram.totalGB', 0)) + ' (' + arr(g(s, 'ram.modules', [])).length + (g(s, 'ram.slots', 0) ? '/' + g(s, 'ram.slots', 0) : '') + ' ' + I('slots', 'υποδοχές') + ')'],
      [I('Graphics', 'Γραφικά'), arr(D.gpus).map(function (x) { return x.name; }).join(', ')], [I('Motherboard', 'Μητρική'), (g(s, 'board.manufacturer', '') + ' ' + g(s, 'board.product', '')).trim()],
      [I('BIOS', 'BIOS'), (g(s, 'bios.version', '') + (bi ? ', ' + day(bi) : '') + (biosAge != null ? ' (' + biosAge + I(' years', ' έτη') + ')' : '')).replace(/^, /, '')],
      [I('Windows', 'Windows'), (g(s, 'os.productName', '') + ' ' + g(s, 'os.displayVersion', '') + ' (build ' + g(s, 'os.build', '') + ')').trim()], [I('Windows installed', 'Εγκατάσταση Windows'), day(inv.osInstall || g(s, 'os.installDate', ''))],
      [I('Last signed-in user', 'Τελευταίος χρήστης'), g(X2, 'lastUser.display', '') || g(X2, 'lastUser.user', '')]
    ]) + (ageTxt().length ? '<div class="lbl" style="margin-top:6px">' + esc(I('Age of the parts (estimate)', 'Ηλικία εξαρτημάτων (εκτίμηση)')) + '</div><ul class="tick" style="margin-top:4px">' + ageTxt().map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' : '') + '<div class="sub">' + LOCK() + ' ' + esc(I('(serial, asset tag, user)', '(σειριακός, asset tag, χρήστης)')) + '</div>') + '</div>';
    var M = arr(g(s, 'ram.modules', []));
    h += '<div class="s6">' + card(I('Memory modules', 'Κάρτες μνήμης'), M.length + I(' installed', ' εγκατεστημένες'), tbl([I('Slot', 'Υποδοχή'), 'GB', I('Speed', 'Ταχύτητα'), I('Maker', 'Κατασκευαστής'), I('Part number', 'Κωδικός')], M.map(function (m) { return [m.slot, m.gb, (m.configuredMHz || m.speedMHz) + ' MT/s', m.manufacturer, m.partNumber]; }))) + '</div>';
    h += '</div>';
    /* drives with health (item 1) */
    var DK = arr(D.disks);
    h += sect(I('Drives and their health', 'Δίσκοι και η υγεία τους'), I('every drive keeps notes about itself', 'κάθε δίσκος κρατά σημειώσεις για τον εαυτό του'));
    h += '<div class="win"><div class="body">' + tbl([I('Drive', 'Δίσκος'), I('Type', 'Τύπος'), I('Size', 'Μέγεθος'), I('Health', 'Υγεία'), I('Temperature', 'Θερμοκρασία'), I('Powered on', 'Σε λειτουργία'), I('Wear', 'Φθορά'), I('Errors', 'Σφάλματα'), I('Firmware', 'Firmware')], DK.map(function (d) {
      var r = d.reliability || {}; return [d.name, (d.mediaType || '') + ' ' + (d.busType || ''), V.fmtGB(d.sizeGB), d.health, r.temperatureC != null ? r.temperatureC + ' C' : '-', r.powerOnHours != null ? V.fmtNum(r.powerOnHours) + ' h (' + Math.round(r.powerOnHours / 8766 * 10) / 10 + I(' y', ' έτ.') + ')' : '-', r.wearPercent != null ? r.wearPercent + ' %' : '-', (r.readErrors != null ? num(r.readErrors) + num(r.writeErrors) : '-'), d.firmware];
    }), function (i) { var r = (DK[i] || {}).reliability || {}; return num(r.readErrors) + num(r.writeErrors) > 0 || (r.temperatureC != null && r.temperatureC >= 60) || (DK[i] && DK[i].health && !/Healthy/i.test(DK[i].health)); }) +
      '<p class="sub" style="margin:8px 0 0">' + esc(I('Windows does not give the total amount of data written (TBW). Wear and hours are the best signs of age.', 'Τα Windows δεν δίνουν τον συνολικό όγκο δεδομένων που γράφτηκε (TBW). Η φθορά και οι ώρες είναι οι καλύτερες ενδείξεις ηλικίας.')) + '</p></div></div>';
    /* GPU smi */
    var gs = arr(X2.gpuSmi);
    if (gs.length) h += sect(I('Graphics card (live values)', 'Κάρτα γραφικών (ζωντανές τιμές)'), 'nvidia-smi') + '<div class="win"><div class="body">' + tbl([I('Card', 'Κάρτα'), I('Temperature', 'Θερμοκρασία'), I('Load', 'Φορτίο'), I('Memory used', 'Μνήμη σε χρήση'), I('Power', 'Ισχύς'), I('Fan', 'Ανεμιστήρας')], gs.map(function (x) { return [x.name, x.tempC != null ? x.tempC + ' C' : '-', x.loadPct != null ? x.loadPct + ' %' : '-', x.memUsedMB != null ? V.fmtNum(x.memUsedMB) + ' / ' + V.fmtNum(x.memTotalMB) + ' MB' : '-', x.powerW != null ? x.powerW + ' W' : '-', x.fanPct != null ? x.fanPct + ' %' : '-']; })) + '</div></div>';
    /* devices */
    var mo = arr(X2.monitors), pr = arr(X2.printers), pe = arr(X2.peripherals);
    h += sect(I('Screens, printers and devices', 'Οθόνες, εκτυπωτές και συσκευές'), I('what is connected', 'τι είναι συνδεδεμένο'));
    h += '<div class="grid"><div class="s6">' + card(I('Screens', 'Οθόνες'), mo.length + '', tbl([I('Maker', 'Κατασκευαστής'), I('Model', 'Μοντέλο'), I('Size', 'Μέγεθος'), I('Year', 'Έτος'), I('Serial', 'Σειριακός')], mo.map(function (m) { return [mk(m.maker), m.model, m.inches ? m.inches + '"' : '', m.year || '', m.serial]; })) + '<div class="sub">' + LOCK() + ' (' + esc(I('serial', 'σειριακός')) + ')</div>') + '</div>';
    h += '<div class="s6">' + card(I('Printers', 'Εκτυπωτές'), pr.length + '', tbl([I('Name', 'Όνομα'), I('Driver', 'Driver'), I('Port', 'Θύρα'), I('Default', 'Προεπιλογή'), I('Network', 'Δίκτυο')], pr.map(function (p) { return [p.name, p.driver, p.port, p.isDefault ? '\u2713' : '', p.network ? I('yes', 'ναι') : I('no', 'όχι')]; }))) + '</div></div>';
    var peG = {}, peL = []; pe.forEach(function (p) { var k = p.class + '|' + p.name; if (!peG[k]) { peG[k] = { p: p, n: 0 }; peL.push(peG[k]); } peG[k].n++; });
    h += '<div class="win" style="margin-top:18px"><header><span>' + esc(I('Connected devices', 'Συνδεδεμένες συσκευές')) + '</span><span class="st">' + peL.length + '</span></header><div class="body">' + tbl([I('Kind', 'Είδος'), I('Device', 'Συσκευή'), I('Status', 'Κατάσταση')], peL.map(function (x) { return [x.p.class, x.p.name + (x.n > 1 ? ' x' + x.n : ''), x.p.status]; })) + '</div></div>';
    /* management, licences, browsers */
    var mg = X2.management || {}, wl = X2.windowsLicence || {}, of = X1.office || {};
    h += sect(I('Management, licences and browsers', 'Διαχείριση, άδειες και browsers'), '');
    h += '<div class="grid"><div class="s4">' + card(I('Who manages this PC', 'Ποιος διαχειρίζεται αυτόν τον υπολογιστή'), '', kv([[I('Domain', 'Domain'), mg.domainJoined ? mg.domain : I('not joined', 'δεν ανήκει')], [I('Workgroup', 'Workgroup'), mg.workgroup], [I('Entra ID (Azure AD)', 'Entra ID (Azure AD)'), mg.entraJoined ? I('joined', 'συνδεδεμένο') : I('no', 'όχι')], [I('Intune (MDM)', 'Intune (MDM)'), yn(mg.intune)], [I('Organisation', 'Οργανισμός'), mg.tenant]]) + '<div class="sub">' + esc(mg.domainJoined || mg.entraJoined || mg.intune ? I('This PC is managed by an organisation: its IT team may control settings.', 'Αυτός ο υπολογιστής διαχειρίζεται από οργανισμό: η ομάδα IT μπορεί να ελέγχει ρυθμίσεις.') : I('A personal or small-office PC: nobody manages it centrally.', 'Προσωπικός υπολογιστής ή μικρού γραφείου: κανείς δεν τον διαχειρίζεται κεντρικά.')) + '</div>') + '</div>';
    var chn = String(wl.channel || '').replace(/_/g, ' ');
    h += '<div class="s4">' + card(I('Licences', 'Άδειες'), '', kv([['Windows', wl.name ? (wl.name.replace(/\(R\)/g, '') + (chn ? ' - ' + chn : '')) : ''], [I('Windows key (last 5)', 'Κλειδί Windows (τελευταία 5)'), wl.partialKey ? '*****-' + wl.partialKey : ''], [I('Status', 'Κατάσταση'), wl.status === 1 ? I('licensed', 'με άδεια') : (wl.status != null ? I('not activated (code ' + wl.status + ')', 'χωρίς ενεργοποίηση (κωδ. ' + wl.status + ')') : '')], [I('Key stored in BIOS', 'Κλειδί αποθηκευμένο στο BIOS'), wl.keyInBios != null ? yn(wl.keyInBios) : ''], ['Office', of.installed ? (of.releaseIds || of.version || I('installed', 'εγκατεστημένο')) : I('not found', 'δεν βρέθηκε')], [I('Office type', 'Τύπος Office'), of.installed ? (of.subscription ? I('subscription (Microsoft 365)', 'συνδρομή (Microsoft 365)') : I('one-time purchase', 'εφάπαξ αγορά')) : '']]) + '<div class="sub">' + esc(I('Only the last 5 characters of a key are shown, never the whole key.', 'Φαίνονται μόνο οι τελευταίοι 5 χαρακτήρες ενός κλειδιού, ποτέ ολόκληρο.')) + '</div>') + '</div>';
    var BR = arr(X2.browsers);
    h += '<div class="s4">' + card(I('Browsers', 'Browsers'), '', tbl([I('Browser', 'Browser'), I('Version', 'Έκδοση'), I('Updated', 'Ενημερώθηκε')], BR.map(function (b) { return [b.name + (X2.defaultBrowser && new RegExp(b.name.slice(0, 4), 'i').test(X2.defaultBrowser) ? ' (' + I('default', 'προεπιλογή') + ')' : ''), b.version, I(b.fileDays + ' days ago', 'πριν ' + b.fileDays + ' ημέρες')]; }), function (i) { return BR[i] && BR[i].fileDays > 90; })) + '</div></div>';
    /* 1.2.0: start-up tasks, services, runtimes, group policies */
    var X3 = (D.extras && D.extras.more3) || {}, td = arr(X3.taskDetail), sv = arr(X3.svcDetail), gp = arr(X3.gpo), dn = arr(X3.dotnet);
    if (td.length || sv.length || gp.length || dn.length) {
      h += sect(I('What starts by itself, runtimes and policies', 'Τι ξεκινά μόνο του, runtimes και πολιτικές'), I('read only; nothing was changed', 'μόνο ανάγνωση, τίποτα δεν άλλαξε'));
      h += '<div class="grid"><div class="s6">' + card(I('Scheduled tasks (not from Microsoft)', 'Προγραμματισμένες εργασίες (όχι της Microsoft)'), td.length + '', tbl([I('Task', 'Εργασία'), I('Starts', 'Ξεκινά'), I('Runs', 'Τρέχει')], td.slice(0, 40).map(function (t) { return [t.name + (t.unusual ? ' (!)' : ''), t.trigger || '-', t.path || '-']; })) + '<div class="sub">' + esc(I('(!) = unusual: temporary folder, or a hidden or encoded command.', '(!) = ασυνήθιστο: προσωρινός φάκελος ή κρυφή ή κωδικοποιημένη εντολή.')) + '</div>') + '</div>';
      h += '<div class="s6">' + card(I('Background services that are not from Windows', 'Υπηρεσίες παρασκηνίου που δεν είναι των Windows'), sv.length + '', tbl([I('Service', 'Υπηρεσία'), I('Since', 'Από'), I('Runs as', 'Τρέχει ως')], sv.slice(0, 40).map(function (x) { return [(x.display || x.name) + (x.unusual ? ' (!)' : ''), x.installed ? String(x.installed).slice(0, 10) : '-', x.runAs || '-']; }))) + '</div></div>';
      h += '<div class="grid" style="margin-top:18px"><div class="s6">' + card(I('.NET runtimes installed', '.NET runtimes που είναι εγκατεστημένα'), dn.length + '', dn.length ? '<div class="sub">' + esc(dn.join(', ')) + '</div>' : '<div class="sub">-</div>') + '</div>';
      h += '<div class="s6">' + card(I('Group policies applied', 'Πολιτικές (GPO) που εφαρμόζονται'), gp.length + '', gp.length ? '<div class="sub">' + esc(gp.join(', ')) + '</div>' : '<div class="sub">' + esc(I('None. This is normal for a home PC.', 'Καμία. Είναι φυσιολογικό για οικιακό υπολογιστή.')) + '</div>') + '</div></div>';
    }
    /* network environment */
    var md = arr(X2.mappedDrives), vp = arr(X2.vpn), nb = arr(X2.neighbours), us = arr(X2.usbHistory);
    h += sect(I('Network and connections around this PC', 'Δίκτυο και συνδέσεις γύρω από τον υπολογιστή'), I('read from what the PC already remembers', 'διαβάστηκε από όσα ήδη θυμάται ο υπολογιστής'));
    h += '<div class="grid"><div class="s6">' + card(I('Network drives and VPN', 'Δίσκοι δικτύου και VPN'), '', tbl([I('Kind', 'Είδος'), I('Name', 'Όνομα'), I('Where', 'Πού')], md.map(function (m) { return [I('drive', 'δίσκος'), m.local, m.remote]; }).concat(vp.map(function (v) { return ['VPN', v.name, v.server + ' (' + v.type + ')']; }))) + '<div class="sub">' + LOCK() + '</div>') + '</div>';
    h += '<div class="s6">' + card(I('USB drives used in the past', 'USB δίσκοι που χρησιμοποιήθηκαν παλιότερα'), us.length + '', tbl([I('Name', 'Όνομα')], us.map(function (u) { return [u.name]; })) + '<div class="sub">' + LOCK() + '</div>') + '</div></div>';
    h += '<div class="win" style="margin-top:18px"><header><span>' + esc(I('Other devices this PC knows on your network', 'Άλλες συσκευές που γνωρίζει ο υπολογιστής στο δίκτυό σου')) + '</span><span class="st">' + nb.length + '</span></header><div class="body">' + tbl([I('Address', 'Διεύθυνση'), I('Hardware ID (MAC)', 'Αναγνωριστικό υλικού (MAC)'), I('State', 'Κατάσταση')], nb.map(function (n) { return [n.ip, n.mac, n.state]; })) +
      '<p class="sub" style="margin:8px 0 0">' + esc(I('This is only the list that the PC keeps in memory (the ARP cache). Nothing on the network was scanned. The first 6 characters of the MAC identify the maker of the device.', 'Είναι μόνο η λίστα που κρατά ο υπολογιστής στη μνήμη του (ARP cache). Δεν σαρώθηκε τίποτα στο δίκτυο. Οι πρώτοι 6 χαρακτήρες του MAC δείχνουν τον κατασκευαστή της συσκευής.')) + ' ' + LOCK() + '</p></div></div>';
    el.innerHTML = h;
    var xb = $('#xlsBtn'); if (xb) xb.addEventListener('click', exportXlsx);
  }

  /* ---------- Insights additions ---------- */
  function ring(sc) { var col = sc >= 80 ? '#3ddc84' : (sc >= 55 ? '#f5b44a' : '#e82c2d'); return VIZ.ring(sc, I('hardening', 'σκληροποίηση'), col); }
  function spark(vals, col, w, h) {
    vals = vals.map(Number); w = w || 220; h = h || 50; if (vals.length < 2) return '';
    var mn = 0, mx = Math.max(100, Math.max.apply(null, vals)), xy = vals.map(function (v, i) { return [3 + i * (w - 6) / (vals.length - 1), h - 4 - (v - mn) / (mx - mn) * (h - 10)]; });
    var line = xy.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="100%" preserveAspectRatio="none"><path d="' + line + ' L' + (w - 3) + ' ' + h + ' L3 ' + h + ' Z" fill="' + col + '" fill-opacity=".15"/><path d="' + line + '" fill="none" stroke="' + col + '" stroke-width="2"/></svg>';
  }
  function treemap(items, W, H) {
    items = items.filter(function (x) { return x.v > 0; }).sort(function (a, b) { return b.v - a.v; });
    var tot = items.reduce(function (a, x) { return a + x.v; }, 0), out = []; if (!tot) return '';
    items.forEach(function (x) { x.a = x.v / tot * W * H; });
    function worst(row, side) { var s = row.reduce(function (a, x) { return a + x.a; }, 0), mx = Math.max.apply(null, row.map(function (x) { return x.a; })), mn = Math.min.apply(null, row.map(function (x) { return x.a; })); return Math.max(side * side * mx / (s * s), s * s / (side * side * mn)); }
    function lay(list, x, y, w, h) {
      if (!list.length) return;
      var side = Math.min(w, h), row = [list[0]], i = 1;
      while (i < list.length && worst(row.concat([list[i]]), side) <= worst(row, side)) { row.push(list[i]); i++; }
      var s = row.reduce(function (a, r) { return a + r.a; }, 0), t = s / side, p = 0;
      row.forEach(function (r) { var l = r.a / t; if (w >= h) out.push({ x: x, y: y + p, w: t, h: l, it: r }); else out.push({ x: x + p, y: y, w: l, h: t, it: r }); p += l; });
      if (w >= h) lay(list.slice(i), x + t, y, w - t, h); else lay(list.slice(i), x, y + t, w, h - t);
    }
    lay(items, 0, 0, W, H);
    var cols = ['#7a1f20', '#8f2a2b', '#a63536', '#5b2a2b', '#6e3a3b', '#4a2f45', '#3c3c52', '#2f4a4f', '#4b4b3a'];
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="treemap" role="img" aria-label="' + esc(I('Where the disk space went', 'Πού πήγε ο χώρος του δίσκου')) + '">' + out.map(function (r, i) {
      var lbl = r.w > 70 && r.h > 34;
      return '<g><rect x="' + (r.x + 1).toFixed(1) + '" y="' + (r.y + 1).toFixed(1) + '" width="' + Math.max(0, r.w - 2).toFixed(1) + '" height="' + Math.max(0, r.h - 2).toFixed(1) + '" fill="' + (r.it.other ? '#26262c' : cols[i % cols.length]) + '"><title>' + esc(r.it.l + ': ' + V.fmtGB(r.it.v / 1024)) + '</title></rect>' + (lbl ? '<text x="' + (r.x + 8).toFixed(1) + '" y="' + (r.y + 20).toFixed(1) + '" class="tml">' + esc(r.it.l.slice(0, Math.floor(r.w / 7.5))) + '</text><text x="' + (r.x + 8).toFixed(1) + '" y="' + (r.y + 36).toFixed(1) + '" class="tms">' + esc(V.fmtGB(r.it.v / 1024)) + '</text>' : '') + '</g>';
    }).join('') + '</svg>';
  }
  function insights2() {
    var el = $('#tab-insights'); if (!el) return;
    var old = $('#ins2'); if (old) old.remove();
    var h = '<div id="ins2">', RT = V.RT, hl = RT.hardList(), hs = RT.hardScore(), bl = RT.basicList(), pv = RT.privList();
    /* basic checklist (9) */
    h += sect(I('Basic security checklist', 'Λίστα βασικής ασφάλειας'), I('the 5 things every PC should have right', 'τα 5 πράγματα που πρέπει να έχει σωστά κάθε υπολογιστής'));
    h += '<div class="basic">' + bl.map(function (b) { return '<div class="bc ' + b.st + '"><span class="bci">' + (b.st === 'ok' ? '&#10003;' : (b.st === 'warn' ? '!' : '&#10005;')) + '</span><b>' + esc(I(b.en, b.el)) + '</b><small>' + esc(I(b.hen, b.hel)) + '</small>' + (b.items.length ? '<ul>' + b.items.slice(0, 4).map(function (f) { return '<li>' + esc(V.tf(f).title).slice(0, 90) + '</li>'; }).join('') + '</ul>' : '<em>' + esc(I('nothing to fix', 'τίποτα για διόρθωση')) + '</em>') + '</div>'; }).join('') + '</div>';
    /* hardening (6) */
    if (hs) {
      h += sect(I('Extra security settings', 'Επιπλέον ρυθμίσεις ασφαλείας'), I('hardening: switches that make attacks harder', 'σκληροποίηση: διακόπτες που δυσκολεύουν τις επιθέσεις'));
      h += '<div class="win"><div class="body"><div class="hardtop">' + ring(hs.score) + '<div><b>' + esc(I(hs.passed + ' of ' + hs.total + ' settings are on', hs.passed + ' από ' + hs.total + ' ρυθμίσεις είναι ανοιχτές')) + '</b><p class="sub">' + esc(I('Each one that is off is listed with a plain explanation and how to switch it on. Some only make sense in an office. Never switch on something you do not understand.', 'Κάθε μία που είναι κλειστή εμφανίζεται με απλή εξήγηση και πώς ανάβει. Κάποιες έχουν νόημα μόνο σε γραφείο. Μην ανάβεις ποτέ κάτι που δεν καταλαβαίνεις.')) + (hs.unknown ? ' ' + esc(I(hs.unknown + ' could not be read (often needs administrator rights).', hs.unknown + ' δεν διαβάστηκαν (συχνά χρειάζονται δικαιώματα διαχειριστή).')) : '') + '</p></div></div>' +
        tbl([I('Setting', 'Ρύθμιση'), I('State', 'Κατάσταση'), I('How to switch it on', 'Πώς ανάβει')], hl.map(function (x) { return [I(x.en, x.el), { html: x.pass === null ? '<span class="st-warn">' + esc(I('unknown', 'άγνωστο')) + '</span>' : (x.pass ? '<span class="st-ok">&#10003; ' + esc(I('on', 'ανοιχτό')) + '</span>' : '<span class="st-bad">&#10005; ' + esc(I('off', 'κλειστό')) + '</span>') }, x.pass ? '' : I(x.fen, x.fel)]; }), function (i) { return hl[i].pass === false; }) + '</div></div>';
    }
    /* privacy (10) */
    if (pv.length) {
      h += sect(I('Privacy of Windows', 'Απόρρητο των Windows'), I('what Windows shares or remembers; status only, nothing was changed', 'τι μοιράζονται ή θυμούνται τα Windows· μόνο κατάσταση, δεν άλλαξε τίποτα'));
      h += '<div class="win"><div class="body">' + tbl([I('Setting', 'Ρύθμιση'), I('How to change it', 'Πώς αλλάζει')], pv.map(function (x) { return [{ html: (x.open ? '<span class="st-warn">&#9679;</span> ' : '<span class="st-ok">&#9679;</span> ') + esc(I(x.en, x.el)) }, x.open ? I(x.fen, x.fel) : '']; })) + '</div></div>';
    }
    /* persistence (5) */
    var P = X2.persistence;
    if (P && (arr(P.items).length || arr(P.unusual).length)) {
      var us = arr(P.items);
      h += sect(I('Everything that starts by itself', 'Ό,τι ξεκινά από μόνο του'), I('hidden start-up places, with digital signatures', 'κρυφά σημεία εκκίνησης, με ψηφιακές υπογραφές'));
      h += '<div class="win"><div class="body">' + (arr(P.unusual).length ? '<div class="verdict bad">' + esc(I(arr(P.unusual).length + ' unusual setting(s) found. See the finding for details.', 'Βρέθηκαν ' + arr(P.unusual).length + ' ασυνήθιστες ρυθμίσεις. Δες το εύρημα για λεπτομέρειες.')) + '</div>' : '<div class="verdict ok">' + esc(I('No unusual start-up trick found (debugger redirects, extra DLLs, hidden WMI triggers).', 'Δεν βρέθηκε ασυνήθιστο κόλπο εκκίνησης (ανακατευθύνσεις debugger, επιπλέον DLL, κρυφά WMI triggers).')) + '</div>') +
        tbl([I('Where', 'Πού'), I('Name', 'Όνομα'), I('Command', 'Εντολή'), I('Signature', 'Υπογραφή')], us.slice(0, 50).map(function (x) { return [x.where, x.name, String(x.command).slice(0, 80), x.signature ? (x.signature === 'Valid' ? I('valid', 'έγκυρη') + (x.signer ? ' - ' + x.signer : '') : x.signature) : '-']; }), function (i) { return us[i] && us[i].signature && us[i].signature !== 'Valid'; }) + '</div></div>';
    }
    /* performance snapshot (4) */
    var pf = X2.perf;
    if (pf && arr(pf.cpu).length) {
      function av(a) { a = arr(a); return a.length ? Math.round(a.reduce(function (x, y) { return x + num(y); }, 0) / a.length) : 0; }
      var lim = [['processor', av(pf.cpu)], ['drive', av(pf.disk)], ['memory', arr(pf.mem)[arr(pf.mem).length - 1] || 0]].sort(function (a, b) { return b[1] - a[1]; })[0];
      var LB = { processor: I('processor', 'επεξεργαστής'), drive: I('drive', 'δίσκος'), memory: I('memory', 'μνήμη') };
      h += sect(I('10-second performance snapshot', 'Στιγμιότυπο απόδοσης 10 δευτερολέπτων'), I('taken during the scan, so the PC was mostly idle', 'λήφθηκε κατά τη σάρωση, άρα ο υπολογιστής ήταν κυρίως αδρανής'));
      h += '<div class="grid">' + [[I('Processor', 'Επεξεργαστής'), pf.cpu, '#e82c2d', '%'], [I('Drive', 'Δίσκος'), pf.disk, '#f5b44a', '%'], [I('Memory', 'Μνήμη'), pf.mem, '#9ec0ff', '%']].map(function (c) { return '<div class="s4">' + card(c[0], av(c[1]) + ' % ' + I('average', 'μέσος όρος'), spark(c[1], c[2])) + '</div>'; }).join('') + '</div>' +
        '<p class="sub" style="margin-top:8px">' + esc(I('Busiest part: ' + LB[lim[0]] + ' (' + lim[1] + ' %). Repeat the scan while the PC feels slow to catch the real bottleneck.', 'Πιο φορτωμένο εξάρτημα: ' + LB[lim[0]] + ' (' + lim[1] + ' %). Επανέλαβε τη σάρωση όταν ο υπολογιστής αργεί για να βρεις το πραγματικό σημείο συμφόρησης.')) + '</p>';
    }
    /* treemap (11) + caches (12) */
    var st = g(D, 'extras.storage', null), items = [];
    if (st) {
      arr(st.folders).forEach(function (f) { items.push({ l: f.name, v: num(f.mb) }); });
      arr(st.systemFiles).forEach(function (f) { items.push({ l: f.name, v: num(f.mb) }); });
      arr(X2.caches).forEach(function (f) { items.push({ l: f.name, v: num(f.mb) }); });
      var cv = arr(D.volumes).filter(function (v) { return /^C:/i.test(v.letter); })[0];
      var meas = items.reduce(function (a, x) { return a + x.v; }, 0), cv = arr(D.volumes).filter(function (v) { return /^C:/i.test(v.letter); })[0], notMeas = cv ? Math.max(0, (num(cv.sizeGB) - num(cv.freeGB)) * 1024 - meas) : 0;
      h += sect(I('Where the disk space went', 'Πού πήγε ο χώρος του δίσκου'), I('each box is a folder, bigger box means more space', 'κάθε κουτί είναι φάκελος, μεγαλύτερο κουτί σημαίνει περισσότερος χώρος'));
      h += '<div class="win"><div class="body">' + treemap(items, 1000, 380) + '<p class="sub" style="margin:6px 0 0">' + esc(I('Only the folders that were measured are shown (' + V.fmtGB(meas / 1024) + '). About ' + V.fmtGB(notMeas / 1024) + ' on C: was not measured (Windows, programs, other folders). Hold the mouse over a box for the exact size.', 'Εμφανίζονται μόνο οι φάκελοι που μετρήθηκαν (' + V.fmtGB(meas / 1024) + '). Περίπου ' + V.fmtGB(notMeas / 1024) + ' στο C: δεν μετρήθηκαν (Windows, προγράμματα, άλλοι φάκελοι). Κράτα το ποντίκι πάνω από ένα κουτί για το ακριβές μέγεθος.')) + '</p></div></div>';
    }
    var cc = arr(X2.caches);
    if (cc.length) h += sect(I('Temporary files and caches', 'Προσωρινά αρχεία και caches'), I('safe to remove with the cleaner that comes with Windows', 'ασφαλές να αφαιρεθούν με τον καθαριστή των Windows')) + '<div class="win"><div class="body">' + cc.slice().sort(function (a, b) { return b.mb - a.mb; }).map(function (c) { var mx = Math.max.apply(null, cc.map(function (x) { return x.mb; })); return '<div class="hbr"><span class="hbl">' + esc(c.name) + '</span><span class="hbt"><i style="width:' + Math.max(2, c.mb / mx * 100) + '%"></i></span><b>' + esc(V.fmtGB(c.mb / 1024)) + (c.partial ? '+' : '') + '</b></div>'; }).join('') + '</div></div>';
    /* programs table (13/26) */
    var apps = arr(g(D, 'apps.list', []));
    if (apps.length) {
      var un = {}; RT.unusedApps().forEach(function (a) { un[a.name] = 1; });
      var rows = apps.slice().sort(function (a, b) { return num(b.sizeMB) - num(a.sizeMB); }).slice(0, 40);
      h += sect(I('Installed programs by size', 'Εγκατεστημένα προγράμματα ανά μέγεθος'), apps.length + I(' programs, the biggest 40', ' προγράμματα, τα 40 μεγαλύτερα'));
      h += '<div class="win"><div class="body">' + tbl([I('Program', 'Πρόγραμμα'), I('Publisher', 'Εκδότης'), I('Version', 'Έκδοση'), I('Installed', 'Εγκαταστάθηκε'), I('Size', 'Μέγεθος'), I('Hint', 'Ένδειξη')], rows.map(function (a) { return [a.name, a.publisher, a.version, day(a.installDate), num(a.sizeMB) ? V.fmtGB(a.sizeMB / 1024) : '', un[a.name] ? I('maybe unused', 'ίσως αχρησιμοποίητο') : '']; }), function (i) { return un[rows[i].name]; }) + '</div></div>';
    }
    h += '</div>';
    el.insertAdjacentHTML('beforeend', h);
  }

  /* ---------- Excel export (18) ---------- */
  function clean(s) { return String(s == null ? '' : s); }
  function exportXlsx() {
    var s = D.system || {}, inv = X1.inventory || {}, c = V.counts, RT = V.RT, hl = RT.hardList(), L = function (en, el) { return V.I(en, el); };
    var sheets = [];
    sheets.push({ name: L('Summary', 'Σύνοψη'), rows: [[L('Item', 'Στοιχείο'), L('Value', 'Τιμή')],
      [L('Computer', 'Υπολογιστής'), g(D, 'meta.computer', '')], [L('Scan date', 'Ημερομηνία σάρωσης'), g(D, 'meta.generated', '')], [L('Health score (with your ticks and accepted items)', 'Βαθμός υγείας (με τα τικ και τα αποδεκτά σου)'), V.score.score], [L('Health score of the scan itself', 'Βαθμός υγείας της ίδιας της σάρωσης'), V.scoreRaw ? V.scoreRaw.score : V.score.score], [L('Serious findings', 'Σοβαρά ευρήματα'), c.high], [L('Medium findings', 'Μέτρια ευρήματα'), c.medium], [L('Small findings', 'Μικρά ευρήματα'), c.low],
      [L('Hardening score', 'Βαθμός σκληροποίησης'), RT.hardScore() ? RT.hardScore().score : ''], ['VEAGLE PC Check', g(D, 'meta.version', '')], ['', 'Created with VEAGLE PC Check - ferelis.gr']] });
    var cv = arr(D.volumes).filter(function (v) { return /^C:/i.test(v.letter); })[0] || {};
    var disks = arr(D.disks).map(function (d) { return d.name + ' ' + V.fmtGB(d.sizeGB); }).join(' | ');
    var ag = RT.hwAge().filter(function (a) { return a.what === 'processor'; })[0];
    sheets.push({ name: L('Asset', 'Εξοπλισμός'), rows: [[L('Computer', 'Υπολογιστής'), L('Maker', 'Κατασκευαστής'), L('Model', 'Μοντέλο'), L('Serial number', 'Σειριακός'), L('Asset tag', 'Asset tag'), L('Processor', 'Επεξεργαστής'), L('Processor age (years)', 'Ηλικία επεξεργαστή (έτη)'), 'RAM GB', L('Drives', 'Δίσκοι'), L('Free on C: GB', 'Ελεύθερο C: GB'), L('Graphics', 'Γραφικά'), 'Windows', 'Build', L('Windows installed', 'Εγκατάσταση Windows'), 'BIOS', L('BIOS date', 'Ημ. BIOS'), L('Domain / Entra / Intune', 'Domain / Entra / Intune'), L('Last user', 'Τελευταίος χρήστης'), L('Windows licence', 'Άδεια Windows'), L('Health score', 'Βαθμός υγείας')],
      [g(D, 'meta.computer', ''), inv.maker || s.manufacturer, inv.model || s.model, inv.serial || '', g(X2, 'board.assetTag', ''), g(s, 'cpu.name', ''), ag ? ag.age : '', num(g(s, 'ram.totalGB', 0)), disks, num(cv.freeGB), arr(D.gpus).map(function (x) { return x.name; }).join(', '), g(s, 'os.productName', '') + ' ' + g(s, 'os.displayVersion', ''), g(s, 'os.build', ''), String(inv.osInstall || g(s, 'os.installDate', '')).slice(0, 10), g(s, 'bios.version', ''), String(g(s, 'bios.date', '')).slice(0, 10),
        [g(X2, 'management.domainJoined') ? 'Domain' : '', g(X2, 'management.entraJoined') ? 'Entra' : '', g(X2, 'management.intune') ? 'Intune' : ''].filter(Boolean).join(' / ') || '-', g(X2, 'lastUser.display', '') || g(X2, 'lastUser.user', ''), (g(X2, 'windowsLicence.channel', '') || '').replace(/_/g, ' '), V.score.score]] });
    sheets.push({ name: L('Drives', 'Δίσκοι'), rows: [[L('Drive', 'Δίσκος'), L('Type', 'Τύπος'), L('Size GB', 'Μέγεθος GB'), L('Health', 'Υγεία'), L('Temperature C', 'Θερμοκρασία C'), L('Hours on', 'Ώρες'), L('Wear %', 'Φθορά %'), L('Errors', 'Σφάλματα'), 'Firmware']].concat(arr(D.disks).map(function (d) { var r = d.reliability || {}; return [d.name, (d.mediaType || '') + ' ' + (d.busType || ''), num(d.sizeGB), d.health, r.temperatureC != null ? r.temperatureC : '', r.powerOnHours != null ? r.powerOnHours : '', r.wearPercent != null ? r.wearPercent : '', r.readErrors != null ? num(r.readErrors) + num(r.writeErrors) : '', d.firmware]; })) });
    sheets.push({ name: L('Volumes', 'Τόμοι'), rows: [[L('Letter', 'Γράμμα'), L('Label', 'Ετικέτα'), L('File system', 'Σύστημα αρχείων'), L('Size GB', 'Μέγεθος GB'), L('Free GB', 'Ελεύθερα GB'), L('Free %', 'Ελεύθερα %'), 'BitLocker']].concat(arr(D.volumes).map(function (v) { return [v.letter, v.label, v.fs, num(v.sizeGB), num(v.freeGB), num(v.sizeGB) ? Math.round(num(v.freeGB) / num(v.sizeGB) * 100) : '', g(v, 'bitlocker.protection', '')]; })) });
    sheets.push({ name: L('Memory', 'Μνήμη'), rows: [[L('Slot', 'Υποδοχή'), 'GB', L('Speed MT/s', 'Ταχύτητα MT/s'), L('Maker', 'Κατασκευαστής'), L('Part number', 'Κωδικός'), L('Type', 'Τύπος')]].concat(arr(g(s, 'ram.modules', [])).map(function (m) { return [m.slot, num(m.gb), m.configuredMHz || m.speedMHz, m.manufacturer, m.partNumber, m.type]; })) });
    sheets.push({ name: L('Findings', 'Ευρήματα'), rows: [[L('Area', 'Περιοχή'), L('Severity', 'Σοβαρότητα'), L('Finding', 'Εύρημα'), L('In plain words', 'Με απλά λόγια'), L('Minutes', 'Λεπτά'), L('Difficulty', 'Δυσκολία'), L('Risk', 'Ρίσκο'), L('Evidence', 'Τεκμήρια')]].concat(V.findings.map(function (f0) { var f = V.tf(f0), m = V.META[f0.id] || [10, 'Medium', 'Safe']; return [f.area, f.sev, f.title, f.why, m[0], m[1], m[2], clean(f.evidence).replace(/\n/g, ' | ')]; })), widths: [14, 11, 60, 70, 9, 12, 14, 70] });
    sheets.push({ name: L('Programs', 'Προγράμματα'), rows: [[L('Program', 'Πρόγραμμα'), L('Publisher', 'Εκδότης'), L('Version', 'Έκδοση'), L('Installed', 'Εγκαταστάθηκε'), L('Size MB', 'Μέγεθος MB'), L('Maybe unused', 'Ίσως αχρησιμοποίητο')]].concat((function () { var un = {}; RT.unusedApps().forEach(function (a) { un[a.name] = 1; }); return arr(g(D, 'apps.list', [])).map(function (a) { return [a.name, a.publisher, a.version, day(a.installDate), num(a.sizeMB), un[a.name] ? L('yes', 'ναι') : '']; }); })()) });
    sheets.push({ name: L('Equipment', 'Περιφερειακά'), rows: [[L('Kind', 'Είδος'), L('Name', 'Όνομα'), L('Details', 'Λεπτομέρειες')]].concat(arr(X2.monitors).map(function (m) { return [L('Screen', 'Οθόνη'), (mk(m.maker) + ' ' + m.model).trim(), (m.inches ? m.inches + '" ' : '') + (m.year || '') + (m.serial ? ' SN ' + m.serial : '')]; }), arr(X2.printers).map(function (p) { return [L('Printer', 'Εκτυπωτής'), p.name, p.driver + ' / ' + p.port + (p.isDefault ? ' (' + L('default', 'προεπιλογή') + ')' : '')]; }), arr(X2.peripherals).map(function (p) { return [p.class, p.name, p.status]; })) });
    sheets.push({ name: L('Startup', 'Εκκίνηση'), rows: [[L('Where', 'Πού'), L('Name', 'Όνομα'), L('Command', 'Εντολή'), L('Signature', 'Υπογραφή')]].concat(arr(g(X2, 'persistence.items', [])).map(function (x) { return [x.where, x.name, x.command, x.signature || '']; })) });
    sheets.push({ name: L('Security checks', 'Έλεγχοι ασφαλείας'), rows: [[L('Group', 'Ομάδα'), L('Check', 'Έλεγχος'), L('State', 'Κατάσταση'), L('How to fix', 'Πώς διορθώνεται')]].concat(RT.basicList().map(function (b) { return [L(b.en, b.el), '', b.st === 'ok' ? 'OK' : (b.st === 'warn' ? L('warning', 'προσοχή') : L('problem', 'πρόβλημα')), b.items.map(function (f) { return V.tf(f).title; }).join(' | ')]; }), hl.map(function (x) { return [L('Hardening', 'Σκληροποίηση'), L(x.en, x.el), x.pass === null ? L('unknown', 'άγνωστο') : (x.pass ? 'OK' : L('off', 'κλειστό')), x.pass ? '' : L(x.fen, x.fel)]; })), widths: [22, 60, 14, 90] });
    sheets.push({ name: L('Network', 'Δίκτυο'), rows: [[L('Kind', 'Είδος'), L('Name', 'Όνομα'), L('Details', 'Λεπτομέρειες')]].concat(arr(g(D, 'network.adapters', [])).map(function (a) { return [L('Adapter', 'Προσαρμογέας'), a.name, a.description + ' ' + a.linkSpeed + ' ' + a.status]; }), arr(X2.neighbours).map(function (n) { return [L('Neighbour', 'Γείτονας'), n.ip, n.mac]; })) });
    var bytes = XLSX.build(sheets, { title: 'VEAGLE PC Check - ' + g(D, 'meta.computer', '') });
    var nm = 'veagle-pc-check-' + String(g(D, 'meta.computer', 'pc')).replace(/[^\w-]/g, '') + '-' + String(g(D, 'meta.generated', '')).slice(0, 10) + '.xlsx';
    XLSX.download(nm, bytes);
    AI.toast(I('Saved ' + nm + ' in your Downloads folder.', 'Το ' + nm + ' αποθηκεύτηκε στα Λήψεις.'));
  }
  function render() { inventoryTab(); insights2(); }
  return { render: render, exportXlsx: exportXlsx };
})(V, AI);
