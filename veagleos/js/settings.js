/* Ρυθμίσεις: θέματα, εμφάνιση, internet, καιρός, αντίγραφο ασφαλείας. */
(function () {
  'use strict';
  var OS = window.OS, h = OS.h, C = window.VEAGLE;
  function sec(a, t) { a.appendChild(h('h4', '', t)); }
  function toggle(a, key, title, sub) {
    var r = h('div', 'sw2'), l = h('span', '', title); l.appendChild(h('small', '', sub));
    var b = h('button', 'tg'); b.type = 'button'; b.setAttribute('role', 'switch'); b.setAttribute('aria-label', title);
    function set() { b.setAttribute('aria-pressed', String(!!OS.settings.get(key))); b.setAttribute('aria-checked', String(!!OS.settings.get(key))); }
    set(); b.addEventListener('click', function () { OS.settings.set(key, !OS.settings.get(key)); set(); if (key === 'status' || key === 'net') OS.refresh(); if (key === 'net' && OS.settings.get('net') && OS.loadWeather) OS.loadWeather(true); });
    r.appendChild(l); r.appendChild(b); a.appendChild(r);
  }
  OS.registerApp('settings', { title: 'Ρυθμίσεις', path: '/etc/settings', icon: 'sliders', width: 560, build: function (body) {
    var a = h('div', 'app'); body.appendChild(a);

    sec(a, 'Θέμα');
    var grid = h('div', 'tprev'); a.appendChild(grid);
    function paint() { Array.prototype.forEach.call(grid.children, function (b) { b.setAttribute('aria-pressed', String(b.dataset.id === OS.settings.get('theme'))); }); }
    OS.themes.list.forEach(function (t) {
      var b = h('button', 'tp'); b.type = 'button'; b.dataset.id = t.id;
      var sw = h('div', 'sw'); sw.style.background = t.sw[0];
      sw.appendChild(Object.assign(h('i'), { })); sw.lastChild.style.background = t.sw[1];
      var i2 = h('i'); i2.style.background = t.sw[2]; i2.style.opacity = '.55'; sw.appendChild(i2);
      var i3 = h('i'); i3.style.background = t.sw[1]; i3.style.opacity = '.35'; sw.appendChild(i3);
      b.appendChild(sw); b.appendChild(h('b', '', t.name)); b.appendChild(h('span', '', t.desc));
      b.addEventListener('click', function () { OS.themes.apply(t.id); paint(); });
      grid.appendChild(b);
    });
    paint();

    sec(a, 'Γλώσσα / Language');
    var lr = h('div', 'r');
    [['el', 'Ελληνικά'], ['en', 'English']].forEach(function (l) {
      var b = h('button', 'btn' + (window.OSLANG === l[0] ? ' pri' : ''), l[1]); b.type = 'button';
      b.addEventListener('click', function () { if (window.OSLANG !== l[0]) window.OSI18N.set(l[0]); }); lr.appendChild(b);
    });
    a.appendChild(lr);

    sec(a, 'Το όνομά σου');
    var nr = h('div', 'r'), nm = h('input'); nm.type = 'text'; nm.placeholder = 'Για τον χαιρετισμό (προαιρετικό)'; nm.style.flex = '1'; nm.value = OS.settings.get('name') || '';
    var nb = h('button', 'btn', 'Αποθήκευση'); nb.type = 'button'; nr.appendChild(nm); nr.appendChild(nb); a.appendChild(nr);
    nb.addEventListener('click', function () { OS.settings.set('name', nm.value.trim()); OS.toast('Αποθηκεύτηκε'); });
    nm.addEventListener('keydown', function (e) { if (e.key === 'Enter') nb.click(); });

    sec(a, 'Εμφάνιση');
    toggle(a, 'particles', 'Δίκτυο σωματιδίων στο φόντο', 'Κλείσ’ το αν θέλεις πιο ήσυχο φόντο ή λιγότερη κατανάλωση');
    toggle(a, 'boot', 'Οθόνη εκκίνησης', 'Μία φορά ανά άνοιγμα του browser');
    sec(a, 'Internet (προαιρετικά)');
    var nn = h('p', '', 'Το Veagle OS δουλεύει εντελώς τοπικά, στον browser σου, και δεν στέλνει τίποτα πουθενά. Αν ανοίξεις τον διακόπτη, μπορεί να κάνει μικρά αιτήματα: τον καιρό (open-meteo.com), μέτρηση ping (google.com) και έλεγχο αν απαντούν τα sites των φακέλων. Δεν στέλνεται κανένα προσωπικό στοιχείο, αλλά τα sites βλέπουν τη διεύθυνση IP σου όπως σε κάθε επίσκεψη.'); nn.style.cssText = 'color:var(--dim);font-size:12px'; a.appendChild(nn);
    toggle(a, 'net', 'Να επιτρέπεται η σύνδεση στο internet', 'Κλειστό: καιρός, ping και τελείες κατάστασης δεν λειτουργούν');
    toggle(a, 'status', 'Τελείες κατάστασης', 'Πράσινο ή κόκκινο στα links των φακέλων (θέλει τον διακόπτη πιο πάνω)');
    var wr = h('div', 'r'); wr.appendChild(h('label', '', 'Επιφάνεια εργασίας'));
    var ws = h('select'); C.workspaces.forEach(function (w) { var o = h('option', '', w.name); o.value = w.id; ws.appendChild(o); }); ws.value = OS.settings.get('ws');
    ws.addEventListener('change', function () { OS.setWorkspace(ws.value); }); wr.appendChild(ws); a.appendChild(wr);

    sec(a, 'Λειτουργία (η σελίδα που ανοίγει ως startpage)');
    var mr = h('div', 'r');
    [['desktop', 'Desktop', 'index.html?stay=1'], ['cyber', 'Cyber', 'cyber.html'], ['galaxy', 'Galaxy', 'galaxy.html'],['city', 'City', 'city.html'],['orbit', 'Orbit', 'orbit.html'],['reactor', 'Reactor', 'reactor.html'],['ocean', 'Ocean', 'ocean.html'],['wall', 'Wall', 'wall.html'],['mindmap', 'Mind Map', 'mindmap.html']].forEach(function (m) {
      var l = h('a', 'btn' + (m[0] === 'desktop' ? ' pri' : ''), m[1]); l.href = m[2];
      l.addEventListener('click', function () { OS.lsSet('veagleos.mode', m[0]); }); mr.appendChild(l);
    });
    a.appendChild(mr);

    sec(a, 'Καιρός');
    var cr = h('div', 'r'), city = h('input'); city.type = 'text'; city.placeholder = 'Πόλη'; city.value = (OS.settings.get('wx') || {}).name || ''; city.style.flex = '1';
    var cb = h('button', 'btn', 'Αλλαγή'); cb.type = 'button'; cr.appendChild(city); cr.appendChild(cb); a.appendChild(cr);
    function setCity() {
      var q = city.value.trim(); if (!q) return;
      if (!OS.settings.get('net')) { OS.toast('Άνοιξε πρώτα τον διακόπτη Internet'); return; }
      fetch('https://geocoding-api.open-meteo.com/v1/search?count=1&language=el&name=' + encodeURIComponent(q)).then(function (r) { return r.json(); }).then(function (d) {
        if (!d.results || !d.results[0]) { OS.toast('Δεν βρέθηκε η πόλη'); return; }
        var p = d.results[0]; OS.settings.set('wx', { name: p.name, lat: p.latitude, lon: p.longitude }); city.value = p.name; OS.toast('Καιρός για: ' + p.name);
      }).catch(function () { OS.toast('Χρειάζεται σύνδεση'); });
    }
    cb.addEventListener('click', setCity); city.addEventListener('keydown', function (e) { if (e.key === 'Enter') setCity(); });


    sec(a, 'Αντίγραφο ασφαλείας');
    var br = h('div', 'r'), ex = h('button', 'btn', 'Εξαγωγή αρχείου'), im = h('button', 'btn', 'Εισαγωγή'), fl = h('input'); fl.type = 'file'; fl.accept = '.json,application/json'; fl.hidden = true;
    ex.type = 'button'; im.type = 'button'; br.appendChild(ex); br.appendChild(im); br.appendChild(fl); a.appendChild(br);
    var bn = h('p', '', 'Οι ρυθμίσεις, οι σημειώσεις, οι εκκρεμότητες και οι δικές σου εφαρμογές αποθηκεύονται ανά browser. Με την εξαγωγή τα μεταφέρεις σε άλλον υπολογιστή ή κινητό.'); bn.style.cssText = 'color:var(--dim);font-size:12px'; a.appendChild(bn);
    ex.addEventListener('click', function () {
      var o = { app: 'veagle-os', version: C.version, at: new Date().toISOString(), data: {} };
      try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k.indexOf('veagleos.') === 0 && k.indexOf('wxcache') < 0) o.data[k] = localStorage.getItem(k); } } catch (e) {}
      var url = URL.createObjectURL(new Blob([JSON.stringify(o, null, 2)], { type: 'application/json' }));
      var l = h('a'); l.href = url; l.download = 'veagle-os-backup.json'; document.body.appendChild(l); l.click(); l.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    });
    im.addEventListener('click', function () { fl.click(); });
    fl.addEventListener('change', function () {
      var f = fl.files[0]; if (!f) return;
      var rd = new FileReader(); rd.onload = function () {
        try {
          var o = JSON.parse(rd.result); if (o.app !== 'veagle-os' || !o.data) throw 0;
          Object.keys(o.data).forEach(function (k) { if (k.indexOf('veagleos.') === 0) OS.lsSet(k, o.data[k]); });
          OS.toast('Εισήχθη. Γίνεται επαναφόρτωση…'); setTimeout(function () { location.reload(); }, 900);
        } catch (e) { OS.toast('Το αρχείο δεν είναι αντίγραφο του Veagle OS'); }
      }; rd.readAsText(f);
    });
  } });
})();
