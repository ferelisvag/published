/* Κοινά για τις λειτουργίες Cyber και Galaxy: δεδομένα από τον κατάλογο, εναλλαγή λειτουργίας. */
window.ML = (function () {
  'use strict';
  var C = window.VEAGLE;
  var PAL = ['#ff3b5c', '#29e3ff', '#a8ff60', '#ffd36b', '#b794f6', '#ff8a3d', '#2ee6a6', '#5b8def', '#ff5fd2', '#7cf5ff', '#ffe66d', '#c4ff3d'];
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  var custom = []; try { custom = JSON.parse(lsGet('veagleos.custom.v1', '[]')) || []; } catch (e) { custom = []; }
  var folders = C.folders.map(function (f, i) { return { id: f.id, name: f.name, desc: f.desc, color: PAL[i % PAL.length], items: [], also: [] }; });
  var byF = {}; folders.forEach(function (f) { byF[f.id] = f; });
  var rep = {}; custom.forEach(function (c) { if (c.replaces) rep[c.replaces] = 1; });
  var hub = (window.VEAGLE_HUB || []).map(function (b, i) { return { id: 'hub' + i, folder: 'linkhub', section: b.section, name: b.name, url: b.url, desc: b.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') }; });
  var all = C.items.concat(hub).filter(function (i) { return !rep[i.id]; }).concat(custom);
  var items = [];
  all.forEach(function (it) {
    if (it.soon || !byF[it.folder]) return;
    var o = { id: it.id, name: it.name, desc: it.desc || '', folder: it.folder, section: it.section || '', color: it.color, private: !!it.private, app: it.app || null };
    o.href = it.app ? 'index.html?open=' + encodeURIComponent(it.app) : it.url;
    o.ext = !it.app && /^https?:/.test(o.href);
    o.fc = byF[it.folder].color; o.f = byF[it.folder];
    byF[it.folder].items.push(o); items.push(o);
    (it.also || []).forEach(function (a) { if (byF[a]) byF[a].also.push(o); });
  });
  var shown = folders.filter(function (f) { return f.items.length || f.also.length; });
  function open(it) { if (it.ext) window.open(it.href, '_blank', 'noopener'); else location.href = it.href; }
  function openFolder(f) { location.href = 'index.html?open=' + encodeURIComponent(f.id); }
  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

  /* εναλλαγή λειτουργίας: η επιλογή θυμάται ποια σελίδα ανοίγει ως startpage */
  var MODES = [
    ['desktop', 'Desktop', 'index.html?stay=1', 'Παράθυρα, dock, εργαλεία'],
    ['cyber', 'Cyber', 'cyber.html', 'Σφαίρα δεδομένων και ραντάρ'],
    ['galaxy', 'Galaxy', 'galaxy.html', 'Πλανήτες και φεγγάρια'],
    ['city', 'City', 'city.html', 'Νυχτερινή πόλη σε isometric'],
    ['orbit', 'Orbit', 'orbit.html', 'Πιλοτήριο και αστερισμοί'],
    ['reactor', 'Reactor', 'reactor.html', 'Πυρήνας και δακτύλιοι'],
    ['ocean', 'Ocean', 'ocean.html', 'Βαθιά θάλασσα, μέδουσες'],
    ['wall', 'Wall', 'wall.html', 'Control room με οθόνες'],
    ['mindmap', 'Mind Map', 'mindmap.html', 'Δίκτυο με φυσική']
  ];
  function modeBar(cur) {
    var d = document.createElement('nav'); d.className = 'modebar'; d.setAttribute('aria-label', 'Λειτουργία');
    var name = (MODES.filter(function (m) { return m[0] === cur; })[0] || MODES[0])[1];
    var b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-haspopup', 'true'); b.setAttribute('aria-expanded', 'false'); b.innerHTML = '<span>Λειτουργία</span><b></b><i>▾</i>'; b.querySelector('b').textContent = name;
    var l = document.createElement('div'); l.className = 'mbl'; l.hidden = true;
    MODES.forEach(function (m) {
      var a = document.createElement('a'); a.href = m[2]; if (m[0] === cur) a.setAttribute('aria-current', 'page');
      a.innerHTML = '<b></b><small></small>'; a.firstChild.textContent = m[1]; a.lastChild.textContent = m[3];
      a.addEventListener('click', function () { try { localStorage.setItem('veagleos.mode', m[0]); } catch (e) {} });
      l.appendChild(a);
    });
    b.addEventListener('click', function (e) { e.stopPropagation(); l.hidden = !l.hidden; b.setAttribute('aria-expanded', String(!l.hidden)); });
    document.addEventListener('click', function () { l.hidden = true; b.setAttribute('aria-expanded', 'false'); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') l.hidden = true; });
    d.appendChild(b); d.appendChild(l); return d;
  }
  var css = '.modebar{position:relative;font:500 12px "Space Grotesk",system-ui,sans-serif}' +
    '.modebar>button{display:flex;align-items:center;gap:8px;padding:6px 13px;border:1px solid rgba(255,255,255,.2);border-radius:999px;background:rgba(0,0,0,.45);backdrop-filter:blur(8px);color:#cfd8e6;cursor:pointer;white-space:nowrap}' +
    '.modebar>button span{color:#8794a8;font-size:10px;letter-spacing:.12em;text-transform:uppercase}.modebar>button b{color:var(--acc,#29e3ff);font-weight:600}.modebar>button:hover{border-color:var(--acc,#29e3ff)}' +
    '.mbl{position:absolute;right:0;top:calc(100% + 8px);z-index:200;min-width:250px;padding:6px;border:1px solid rgba(255,255,255,.18);border-radius:14px;background:rgba(8,10,16,.96);backdrop-filter:blur(14px);box-shadow:0 20px 60px rgba(0,0,0,.7);max-height:70vh;overflow:auto}' +
    '.mbl a{display:flex;flex-direction:column;padding:7px 12px;border-radius:9px;color:#dfe7f3;text-decoration:none}.mbl a:hover{background:rgba(255,255,255,.08)}.mbl a b{font-weight:600}.mbl a small{color:#8794a8;font-size:11px}' +
    '.mbl a[aria-current]{background:color-mix(in srgb,var(--acc,#29e3ff) 22%,transparent)}';
  /* κοινό κέλυφος για τις νέες λειτουργίες: τίτλος, αναζήτηση, μενού, ρολόι, tooltip */
  css += '.vtop{position:fixed;z-index:30;left:0;right:0;top:0;display:flex;align-items:center;gap:16px;padding:12px max(16px,env(safe-area-inset-left));background:linear-gradient(180deg,rgba(0,0,0,.7),transparent);pointer-events:none;font-family:"Space Grotesk",system-ui,sans-serif;color:#eef2f8}' +
    '@media(max-width:640px){.vtop{gap:8px;padding:10px 10px}.vttl{font-size:14px;letter-spacing:.16em}.vsub{display:none}.vtop input{min-width:0;width:100%}.vtop>*{min-width:0}}'+'.vtop>*{pointer-events:auto}.vttl{font:700 18px "Space Grotesk",sans-serif;letter-spacing:.26em;white-space:nowrap;text-transform:uppercase}.vsub{font:10px "IBM Plex Mono",monospace;letter-spacing:.26em;color:#8d99ab;text-transform:uppercase;margin-top:2px}' +
    '.vfind{flex:1;max-width:380px;margin:0 auto;display:flex;align-items:center;gap:10px;padding:7px 15px;border:1px solid rgba(255,255,255,.18);border-radius:999px;background:rgba(0,0,0,.45);backdrop-filter:blur(8px)}.vfind svg{width:15px;height:15px;color:var(--acc);flex:none}' +
    '.vfind input{flex:1;min-width:0;background:none;border:0;outline:0;color:#fff;font:14px "Space Grotesk",sans-serif}.vfind input::placeholder{color:#7d899c}' +
    '.vclk{font:600 17px "Space Grotesk",sans-serif;letter-spacing:.08em;font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap}.vclk small{display:block;font:10px "IBM Plex Mono",monospace;letter-spacing:.18em;color:#8d99ab;text-transform:uppercase}' +
    '#vtip{position:fixed;z-index:60;pointer-events:none;display:none;min-width:180px;max-width:280px;padding:9px 13px;border-radius:10px;background:rgba(6,8,14,.94);border:1px solid var(--tc,#fff);box-shadow:0 0 24px color-mix(in srgb,var(--tc,#fff) 38%,transparent);font-family:"Space Grotesk",sans-serif;color:#fff}' +
    '#vtip small{display:block;font:10px "IBM Plex Mono",monospace;letter-spacing:.2em;text-transform:uppercase;color:var(--tc)}#vtip b{display:block;font-weight:600;font-size:14px;margin:1px 0}#vtip span{font-size:12px;color:#aab4c6;word-break:break-all}' +
    '.vboot{position:fixed;inset:0;z-index:80;background:#000;display:grid;place-items:center;transition:opacity .8s}.vboot.off{opacity:0;pointer-events:none}.vboot b{font:700 14px "Space Grotesk",sans-serif;letter-spacing:.5em;color:var(--acc);animation:vpl 1.2s infinite}@keyframes vpl{50%{opacity:.3}}' +
    '.vdock{position:fixed;z-index:30;left:50%;transform:translateX(-50%);bottom:max(14px,env(safe-area-inset-bottom));display:flex;gap:6px;padding:6px;max-width:calc(100% - 20px);overflow-x:auto;border:1px solid rgba(255,255,255,.15);border-radius:999px;background:rgba(0,0,0,.55);backdrop-filter:blur(10px);font-family:"Space Grotesk",sans-serif}' +
    '.vdock button{flex:none;display:flex;align-items:center;gap:7px;padding:6px 13px;border-radius:999px;font:500 12px "Space Grotesk",sans-serif;white-space:nowrap;color:#d4dbe8;background:none;border:0;cursor:pointer}.vdock button i{width:9px;height:9px;border-radius:50%;background:var(--pc);box-shadow:0 0 10px var(--pc)}.vdock button:hover,.vdock button.on{background:rgba(255,255,255,.12);color:#fff}' +
    '@media (max-width:760px){.vsub,.vclk small{display:none}.vttl{font-size:14px;letter-spacing:.16em}.modebar>button span{display:none}.vfind{padding:6px 11px}}' +
    '@media (prefers-reduced-motion:reduce){*{animation:none!important}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function match(it, q) { return !q || norm(it.name + ' ' + it.desc + ' ' + it.f.name + ' ' + it.section).indexOf(q) >= 0; }
  function shell(o) {
    var acc = o.acc || '#29e3ff'; document.documentElement.style.setProperty('--acc', acc);
    var h = document.createElement('header'); h.className = 'vtop';
    h.innerHTML = '<div><div class="vttl"></div><div class="vsub"></div></div><label class="vfind"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg><input type="text" autocomplete="off" spellcheck="false" aria-label="Αναζήτηση"></label><div class="slot"></div><div class="vclk"><span class="t"></span><small class="d"></small></div>';
    var ft = document.createElement('div'); ft.className = 'app-foot'; ft.style.cssText = 'position:fixed;left:14px;bottom:8px;font:11px monospace;color:#7c8697;z-index:3;pointer-events:none'; ft.textContent = 'Veagle OS · ferelis.gr · Έκδοση 8.11 · 14:51'; document.body.appendChild(ft);
    h.querySelector('.vttl').textContent = o.title; h.querySelector('.vsub').textContent = o.sub || 'Show me the problem.';
    var inp = h.querySelector('input'); inp.placeholder = (o.find || 'Αναζήτηση') + '…  ( / )';
    h.querySelector('.slot').appendChild(modeBar(o.id));
    document.body.appendChild(h);
    var tip = document.createElement('div'); tip.id = 'vtip'; document.body.appendChild(tip);
    var boot = document.createElement('div'); boot.className = 'vboot'; boot.innerHTML = '<b></b>'; boot.firstChild.textContent = (o.title || '').toUpperCase(); document.body.appendChild(boot);
    setTimeout(function () { boot.classList.add('off'); setTimeout(function () { boot.remove(); }, 900); }, 900);
    var q = '', cbs = [];
    inp.addEventListener('input', function () { q = norm(inp.value.trim()); cbs.forEach(function (f) { f(q); }); });
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter' && q) { var m = items.filter(function (i) { return match(i, q); })[0]; if (m) open(m); } if (e.key === 'Escape') { inp.value = ''; q = ''; cbs.forEach(function (f) { f(q); }); inp.blur(); } });
    document.addEventListener('keydown', function (e) { if (e.key === '/' && document.activeElement.tagName !== 'INPUT') { e.preventDefault(); inp.focus(); } });
    function tick() { var d = new Date(); function two(n) { return (n < 10 ? '0' : '') + n; } h.querySelector('.t').textContent = two(d.getHours()) + ':' + two(d.getMinutes()); h.querySelector('.d').textContent = d.toLocaleDateString((window.OSLOC||'el-GR'), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }); }
    tick(); setInterval(tick, 10000);
    var lastKey = null;
    return {
      query: function () { return q; }, onQuery: function (f) { cbs.push(f); },
      tip: function (it, x, y, kind) {
        if (!it) { tip.style.display = 'none'; lastKey = null; return; }
        var key = it.id || it.name; if (key !== lastKey) { lastKey = key; var c = it.fc || it.color || acc; tip.style.setProperty('--tc', c); tip.innerHTML = '<small>' + esc(kind || (it.f ? it.f.name + (it.section ? ' · ' + it.section : '') : '')) + '</small><b>' + esc(it.name) + '</b><span>' + esc(it.desc || it.href || '') + '</span>'; }
        tip.style.display = 'block'; tip.style.left = Math.min(innerWidth - tip.offsetWidth - 10, x + 16) + 'px'; tip.style.top = Math.max(60, Math.min(innerHeight - tip.offsetHeight - 10, y + 14)) + 'px';
      }
    };
  }
  function dock(list, onPick) {
    var d = document.createElement('nav'); d.className = 'vdock'; d.setAttribute('aria-label', 'Φάκελοι');
    list.forEach(function (f) { var b = document.createElement('button'); b.type = 'button'; b.style.setProperty('--pc', f.color); b.dataset.id = f.id; b.innerHTML = '<i></i><span></span>'; b.lastChild.textContent = f.name; b.addEventListener('click', function () { onPick(f, b); }); d.appendChild(b); });
    document.body.appendChild(d); return d;
  }
  function hash(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 16; h = Math.imul(h, 2246822507); h ^= h >>> 13; h = Math.imul(h, 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
  return { C: C, folders: shown, items: items, byF: byF, open: open, openFolder: openFolder, norm: norm, modeBar: modeBar, lsGet: lsGet, MODES: MODES, shell: shell, dock: dock, match: match, hash: hash, esc: esc };
})();
