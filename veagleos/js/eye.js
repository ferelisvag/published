/* Veagle Eye μέσα στο Veagle OS: παράθυρο που δείχνει τον πίνακα του Veagle Eye.
   Το Veagle Eye τρέχει στον δικό σου υπολογιστή (127.0.0.1). Εδώ δεν στέλνεται τίποτα στο internet:
   το παράθυρο απλώς δείχνει τη σελίδα που σερβίρει το πρόγραμμα στον ίδιο σου τον υπολογιστή.
   Ανοίγει ΜΟΝΟ όταν το ζητήσεις εσύ και βάλεις τη διεύθυνση από το μαύρο παράθυρο του Veagle Eye. */
(function () {
  'use strict';
  var OS = window.OS, h = OS.h;
  var KEY = 'veagleos.eye.v1'; /* sessionStorage: ο κωδικός αλλάζει σε κάθε εκκίνηση, δεν μένει μόνιμα */
  function T(el, en) { return window.OSLANG === 'en' ? en : el; }
  function get() { try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function put(v) { try { if (v) sessionStorage.setItem(KEY, JSON.stringify(v)); else sessionStorage.removeItem(KEY); } catch (e) {} }
  /* δέχεται ολόκληρη τη διεύθυνση: http://127.0.0.1:8765/?t=ΚΩΔΙΚΟΣ */
  function parse(txt) {
    txt = (txt || '').trim(); var m = txt.match(/^https?:\/\/(?:127\.0\.0\.1|localhost):(\d{2,5})\/(?:\?t=|)([A-Za-z0-9_-]{8,})?/);
    if (m && m[2]) return { port: +m[1], token: m[2] };
    var tm = txt.match(/t=([A-Za-z0-9_-]{8,})/), pm = txt.match(/:(\d{2,5})/);
    if (tm && pm) return { port: +pm[1], token: tm[1] };
    return null;
  }
  function src(c) { return 'http://127.0.0.1:' + c.port + '/' + c.token + '/'; }
  function build(body, w) {
    body.textContent = '';
    var c = get();
    if (c) {
      body.style.padding = '0';
      var bar = h('div', 'eyebar');
      var info = h('span', '', 'Veagle Eye · 127.0.0.1:' + c.port + ' · ' + T('τοπικά στον υπολογιστή σου', 'local on your computer'));
      var nw = h('a', 'btn', T('Νέα καρτέλα', 'New tab')); nw.href = src(c); nw.target = '_blank'; nw.rel = 'noopener';
      var cl = h('button', 'btn', T('Αποσύνδεση', 'Disconnect')); cl.type = 'button';
      bar.appendChild(info); bar.appendChild(nw); bar.appendChild(cl); body.appendChild(bar);
      var f = document.createElement('iframe'); f.className = 'eyeframe'; f.src = src(c); f.title = 'Veagle Eye';
      f.setAttribute('allow', 'local-network-access; local-network; loopback-network'); f.setAttribute('referrerpolicy', 'no-referrer');
      var note = h('div', 'eyenote', T('Αν βλέπεις κενό, ο browser μπορεί να μπλοκάρει την ενσωμάτωση (π.χ. Safari) ή το Veagle Eye δεν τρέχει. Δοκίμασε «Νέα καρτέλα».', 'If it stays blank, your browser may block embedding (e.g. Safari) or Veagle Eye is not running. Try “New tab”.'));
      body.appendChild(f); body.appendChild(note);
      cl.addEventListener('click', function () { put(null); build(body, w); });
      return;
    }
    body.style.padding = '';
    var a = h('div', 'app'); body.appendChild(a);
    a.appendChild(h('h4', '', T('Veagle Eye μέσα στο Veagle OS', 'Veagle Eye inside Veagle OS')));
    var p = h('p', '', T('Το Veagle Eye είναι ένα δωρεάν πρόγραμμα για Windows που δείχνει τι κάνει ο υπολογιστής σου και με ποιους συνδέεται. Τρέχει μόνο στον δικό σου υπολογιστή και δεν στέλνει τίποτα πουθενά.', 'Veagle Eye is a free Windows program that shows what your computer is doing and who it connects to. It runs only on your own computer and sends nothing anywhere.'));
    p.style.cssText = 'color:var(--dim);font-size:13px;line-height:1.55'; a.appendChild(p);
    var ol = h('ol'); ol.style.cssText = 'color:var(--dim);font-size:13px;line-height:1.7;padding-left:20px;margin:10px 0';
    [T('Άνοιξε το Veagle Eye (διπλό κλικ στο VeagleEye.exe).', 'Start Veagle Eye (double-click VeagleEye.exe).'),
     T('Στο μαύρο παράθυρο που ανοίγει, δες τη γραμμή «Διεύθυνση / Address» και αντίγραψέ την.', 'In the black window, find the “Διεύθυνση / Address” line and copy it.'),
     T('Επικόλλησέ την εδώ και πάτα «Άνοιγμα».', 'Paste it here and press “Open”.')].forEach(function (t) { ol.appendChild(h('li', '', t)); });
    a.appendChild(ol);
    var r = h('div', 'r'), inp = h('input'); inp.type = 'text'; inp.placeholder = 'http://127.0.0.1:8765/?t=…'; inp.style.flex = '1'; inp.autocomplete = 'off'; inp.spellcheck = false;
    var go = h('button', 'btn pri', T('Άνοιγμα', 'Open')); go.type = 'button'; r.appendChild(inp); r.appendChild(go); a.appendChild(r);
    var msg = h('p', '', ''); msg.style.cssText = 'color:var(--accent);font-size:12px;min-height:16px'; a.appendChild(msg);
    function open() { var c2 = parse(inp.value); if (!c2) { msg.textContent = T('Δεν κατάλαβα τη διεύθυνση. Πρέπει να μοιάζει με http://127.0.0.1:8765/?t=…', 'That does not look right. It should look like http://127.0.0.1:8765/?t=…'); return; } put(c2); build(body, w); }
    go.addEventListener('click', open); inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') open(); });
    var l = h('p', ''); l.style.cssText = 'color:var(--dim);font-size:12px';
    var lk = h('a', '', T('Δεν το έχεις ακόμα; Πάρε το Veagle Eye', 'Do not have it yet? Get Veagle Eye')); lk.href = 'https://ferelisvag.github.io/published/veagle-eye/'; lk.target = '_blank'; lk.rel = 'noopener noreferrer'; lk.style.color = 'var(--accent)';
    l.appendChild(lk); a.appendChild(l);
  }
  var css = document.createElement('style');
  css.textContent = '.eyebar{display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--line);font:12px var(--mono);color:var(--dim)}.eyebar span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.eyeframe{display:block;width:100%;height:min(560px,calc(100vh - 260px));min-height:320px;border:0;background:#050708}.eyenote{padding:8px 12px;font-size:11px;color:var(--dim)}';
  document.head.appendChild(css);
  OS.registerApp('eye', { title: 'Veagle Eye', path: '/usr/eye', icon: 'radar', width: 940, build: build });
  /* προαιρετικά: #eye=ΠΟΡΤΑ.ΚΩΔΙΚΟΣ στη διεύθυνση (το βάζει το Veagle Eye όταν το ζητήσει ο χρήστης) */
  OS.on('start', function () {
    var m = (location.hash || '').match(/eye=(\d{2,5})\.([A-Za-z0-9_-]{8,})/);
    if (m) { put({ port: +m[1], token: m[2] }); try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {} setTimeout(function () { OS.openApp('eye'); }, 400); }
  });
})();
