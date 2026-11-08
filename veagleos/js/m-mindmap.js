/* Mind Map: δίκτυο με φυσική. Σέρνεις κόμβους, οι θέσεις που αφήνεις θυμούνται. */
(function () {
  'use strict';
  var ML = window.ML, RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cv = document.getElementById('cv'), ctx = cv.getContext('2d'), W = 0, H = 0, dpr = 1;
  var S = ML.shell({ id: 'mindmap', title: 'Mind Map', acc: '#7cf5ff', find: 'Αναζήτηση κόμβων' });
  var KEY = 'veagleos.mindmap.v1', saved = {}; try { saved = JSON.parse(ML.lsGet(KEY, '{}')) || {}; } catch (e) { saved = {}; }
  var nodes = [], links = [], byId = {};
  var root = { id: 'root', name: 'VEAGLE', r: 26, color: '#ffffff', x: 0, y: 0, vx: 0, vy: 0, kind: 'root', pin: true };
  nodes.push(root); byId.root = root;
  ML.folders.forEach(function (f, i) {
    var a = i / ML.folders.length * 6.28, n = { id: 'f:' + f.id, name: f.name, f: f, r: 13 + Math.min(8, Math.sqrt(f.items.length)), color: f.color, kind: 'folder', x: Math.cos(a) * 170, y: Math.sin(a) * 170, vx: 0, vy: 0 };
    nodes.push(n); byId[n.id] = n; links.push({ a: root, b: n, L: 170, k: .02 });
  });
  ML.items.forEach(function (it) {
    var p = byId['f:' + it.folder], a = ML.hash(it.id) * 6.28, n = { id: it.id, name: it.name, it: it, r: 5, color: it.fc, kind: 'item', x: p.x + Math.cos(a) * 80, y: p.y + Math.sin(a) * 80, vx: 0, vy: 0 };
    nodes.push(n); byId[n.id] = n; links.push({ a: p, b: n, L: 60 + Math.min(40, p.f.items.length), k: .03 });
  });
  nodes.forEach(function (n) { var s = saved[n.id]; if (s) { n.x = s[0]; n.y = s[1]; n.pin = true; n.saved = true; } });
  var cam = { x: 0, y: 0, z: 1 }, query = '', hover = null, drag = null, pan = null, moved = 0, mx = -99, my = -99, heat = 1;
  S.onQuery(function (q) { query = q; });
  var reset = document.createElement('button'); reset.type = 'button'; reset.textContent = 'Επαναφορά διάταξης'; reset.style.cssText = 'position:fixed;z-index:30;left:50%;bottom:16px;transform:translateX(-50%);padding:7px 16px;border-radius:999px;border:1px solid rgba(255,255,255,.2);background:rgba(0,0,0,.55);backdrop-filter:blur(8px);color:#cfe;font:500 12px Space Grotesk,sans-serif;cursor:pointer';
  reset.addEventListener('click', function () { try { localStorage.removeItem(KEY); } catch (e) {} saved = {}; nodes.forEach(function (n) { if (n.kind !== 'root') n.pin = false; n.saved = false; }); heat = 1; });
  document.body.appendChild(reset);
  var hint = document.createElement('div'); hint.textContent = 'σύρε κόμβους · ροδέλα ζουμ · σύρε φόντο'; hint.style.cssText = 'position:fixed;z-index:20;right:16px;bottom:20px;font:10px IBM Plex Mono,monospace;letter-spacing:.18em;text-transform:uppercase;color:#6d7a8c;pointer-events:none'; document.body.appendChild(hint);
  function resize() { dpr = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); cam.z = Math.min(1, Math.min(W, H) / 700); }
  function toW(x, y) { return [(x - W / 2) / cam.z + cam.x, (y - H / 2) / cam.z + cam.y]; }
  function physics() {
    var N = nodes.length;
    for (var i = 0; i < N; i++) for (var j = i + 1; j < N; j++) {
      var a = nodes[i], b = nodes[j], dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy + 30; if (d2 > 90000) continue;
      var f = (a.kind === 'item' && b.kind === 'item' ? 520 : 1400) / d2, d = Math.sqrt(d2); dx /= d; dy /= d;
      if (!a.pin) { a.vx -= dx * f; a.vy -= dy * f; } if (!b.pin) { b.vx += dx * f; b.vy += dy * f; }
    }
    links.forEach(function (l) { var dx = l.b.x - l.a.x, dy = l.b.y - l.a.y, d = Math.sqrt(dx * dx + dy * dy) || 1, f = (d - l.L) * l.k; dx /= d; dy /= d; if (!l.a.pin) { l.a.vx += dx * f; l.a.vy += dy * f; } if (!l.b.pin) { l.b.vx -= dx * f; l.b.vy -= dy * f; } });
    nodes.forEach(function (n) { if (n.pin) { n.vx = n.vy = 0; return; } n.vx -= n.x * .0006; n.vy -= n.y * .0006; n.vx *= .82; n.vy *= .82; n.x += n.vx * heat; n.y += n.vy * heat; });
    heat = Math.max(.25, heat * .995);
  }
  var t0 = performance.now();
  function frame(now) {
    requestAnimationFrame(frame); var t = (now - t0) / 1000;
    physics(); if (!RM) physics();
    var bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * .7); bg.addColorStop(0, '#0e141c'); bg.addColorStop(1, '#05070b'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    /* πλέγμα φόντου που ακολουθεί την κάμερα */
    ctx.strokeStyle = 'rgba(124,245,255,.05)'; ctx.lineWidth = 1; var gs = 60 * cam.z, ox = (W / 2 - cam.x * cam.z) % gs, oy = (H / 2 - cam.y * cam.z) % gs; ctx.beginPath(); for (var x = ox; x < W; x += gs) { ctx.moveTo(x, 0); ctx.lineTo(x, H); } for (var y = oy; y < H; y += gs) { ctx.moveTo(0, y); ctx.lineTo(W, y); } ctx.stroke();
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(cam.z, cam.z); ctx.translate(-cam.x, -cam.y);
    var hv = hover || (drag && drag.n), nb = {}; if (hv) { nb[hv.id] = 1; links.forEach(function (l) { if (l.a === hv) nb[l.b.id] = 1; if (l.b === hv) nb[l.a.id] = 1; }); }
    var q = query;
    links.forEach(function (l) { var on = !hv || (nb[l.a.id] && nb[l.b.id]); ctx.globalAlpha = on ? (l.a.kind === 'root' ? .5 : .32) : .05; ctx.strokeStyle = l.b.color; ctx.lineWidth = l.a.kind === 'root' ? 2 : 1; ctx.beginPath(); ctx.moveTo(l.a.x, l.a.y); ctx.lineTo(l.b.x, l.b.y); ctx.stroke(); });
    var best = null, bd = 1e9, w = toW(mx, my);
    nodes.forEach(function (n) {
      var m = n.kind !== 'item' || ML.match(n.it, q), on = (!hv || nb[n.id]) && m; ctx.globalAlpha = on ? 1 : .12;
      var r = n.r * (n === hv ? 1.35 : 1) * (n.kind === 'root' ? 1 + Math.sin(t * 2) * .05 : 1);
      var g = ctx.createRadialGradient(n.x - r * .3, n.y - r * .3, 1, n.x, n.y, r * 2.2); g.addColorStop(0, '#fff'); g.addColorStop(.3, n.color); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.shadowColor = n.color; ctx.shadowBlur = on ? 16 : 0; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(n.x, n.y, r * (n.kind === 'item' ? 1.3 : 1.15), 0, 6.3); ctx.fill(); ctx.shadowBlur = 0;
      if (n.pin && n.kind !== 'root') { ctx.strokeStyle = '#fff'; ctx.globalAlpha = on ? .7 : .1; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(n.x, n.y, r + 3, 0, 6.3); ctx.stroke(); }
      var d = (n.x - w[0]) * (n.x - w[0]) + (n.y - w[1]) * (n.y - w[1]); if (m && d < Math.pow(Math.max(n.r + 6, 10 / cam.z), 2) && d < bd) { bd = d; best = n; }
      if (n.kind !== 'item' || n === hv || (q && m)) { ctx.globalAlpha = on ? 1 : .15; ctx.fillStyle = '#fff'; ctx.font = (n.kind === 'item' ? '500 11px' : '600 ' + (n.kind === 'root' ? 14 : 12) + 'px') + ' Space Grotesk,sans-serif'; ctx.textAlign = 'center'; ctx.fillText(n.name, n.x, n.y + r + 15); ctx.textAlign = 'left'; }
    });
    ctx.restore(); ctx.globalAlpha = 1;
    if (!drag) hover = best;
    cv.classList.toggle('hot', !!hover && !drag); S.tip(hover && hover.kind === 'item' && !drag ? hover.it : (hover && hover.kind === 'folder' && !drag ? { id: hover.id, name: hover.name, desc: hover.f.desc, fc: hover.color } : null), mx, my, hover && hover.kind === 'folder' ? hover.f.items.length + ' στοιχεία' : undefined);
  }
  cv.addEventListener('pointerdown', function (e) { moved = 0; mx = e.clientX; my = e.clientY; cv.setPointerCapture(e.pointerId); if (hover && hover.kind !== 'root') { drag = { n: hover }; hover.pin = true; } else pan = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y }; cv.classList.add('drag'); });
  cv.addEventListener('pointermove', function (e) { mx = e.clientX; my = e.clientY; if (drag) { moved += 1; var w = toW(e.clientX, e.clientY); drag.n.x = w[0]; drag.n.y = w[1]; heat = Math.max(heat, .6); } else if (pan) { moved += Math.abs(e.clientX - pan.x) > 2 || Math.abs(e.clientY - pan.y) > 2 ? 1 : 0; cam.x = pan.cx - (e.clientX - pan.x) / cam.z; cam.y = pan.cy - (e.clientY - pan.y) / cam.z; } });
  function end(e) {
    if (drag) { var n = drag.n; if (moved < 4) { n.pin = n.saved || false; if (n.kind === 'item') ML.open(n.it); else if (n.kind === 'folder') ML.openFolder(n.f); } else { saved[n.id] = [Math.round(n.x), Math.round(n.y)]; n.saved = true; try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (er) {} } }
    drag = null; pan = null; cv.classList.remove('drag');
  }
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  cv.addEventListener('pointerleave', function () { if (!drag) mx = my = -99; });
  cv.addEventListener('dblclick', function () { cam.x = 0; cam.y = 0; });
  cv.addEventListener('wheel', function (e) { e.preventDefault(); cam.z = Math.max(.25, Math.min(3, cam.z * (e.deltaY < 0 ? 1.1 : .9))); }, { passive: false });
  addEventListener('resize', resize); resize(); requestAnimationFrame(frame);
})();
