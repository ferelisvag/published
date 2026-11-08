/* Orbit: πιλοτήριο. Κάθε φάκελος είναι αστερισμός, κάθε link αστέρι. Σύρε για να κοιτάξεις γύρω. */
(function () {
  'use strict';
  var ML = window.ML, RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cv = document.getElementById('cv'), ctx = cv.getContext('2d'), W = 0, H = 0, dpr = 1;
  var S = ML.shell({ id: 'orbit', title: 'Orbit', acc: '#9ad1ff', find: 'Αναζήτηση αστεριών' });
  var rnd = function (a, b) { return a + Math.random() * (b - a); };
  function norm3(v) { var l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
  var folders = ML.folders.filter(function (f) { return f.items.length; }), GA = Math.PI * (3 - Math.sqrt(5)), NF = folders.length;
  folders.forEach(function (f, i) { var y = .55 - 1.1 * (i + .5) / NF * 1.0, r = Math.sqrt(1 - y * y), ph = i * GA; f.dir = [Math.sin(ph) * r, y * .6, Math.cos(ph) * r]; f.dir = norm3(f.dir); f.yaw = Math.atan2(f.dir[0], f.dir[2]); f.pitch = Math.asin(f.dir[1]); });
  /* αστέρια = links */
  var stars = []; ML.items.forEach(function (it) {
    var f = it.f, n = f.items.length, spread = .07 + Math.sqrt(n) * .028, a = ML.hash(it.id + 'a') * 6.28, rr = Math.sqrt(ML.hash(it.id + 'r')) * spread;
    var d = f.dir, up = Math.abs(d[1]) > .9 ? [1, 0, 0] : [0, 1, 0], u = norm3([up[1] * d[2] - up[2] * d[1], up[2] * d[0] - up[0] * d[2], up[0] * d[1] - up[1] * d[0]]), v = [d[1] * u[2] - d[2] * u[1], d[2] * u[0] - d[0] * u[2], d[0] * u[1] - d[1] * u[0]];
    var p = norm3([d[0] + (u[0] * Math.cos(a) + v[0] * Math.sin(a)) * rr, d[1] + (u[1] * Math.cos(a) + v[1] * Math.sin(a)) * rr, d[2] + (u[2] * Math.cos(a) + v[2] * Math.sin(a)) * rr]);
    stars.push({ it: it, p: p, m: 1 + ML.hash(it.id + 'm') * 1.4, ph: ML.hash(it.id + 't') * 6.28, sx: 0, sy: 0, z: 0 });
  });
  /* γραμμές αστερισμού: κάθε αστέρι με τους 2 κοντινότερους του φακέλου */
  var lines = []; folders.forEach(function (f) { var ss = stars.filter(function (s) { return s.it.f === f; }); ss.forEach(function (a) { var d = ss.filter(function (b) { return b !== a; }).map(function (b) { return [b, (a.p[0] - b.p[0]) * (a.p[0] - b.p[0]) + (a.p[1] - b.p[1]) * (a.p[1] - b.p[1]) + (a.p[2] - b.p[2]) * (a.p[2] - b.p[2])]; }).sort(function (x, y) { return x[1] - y[1]; }).slice(0, 2); d.forEach(function (x) { if (a.it.id < x[0].it.id) lines.push([a, x[0], f.color]); else if (!lines.some(function (l) { return l[0] === x[0] && l[1] === a; })) lines.push([x[0], a, f.color]); }); }); });
  var bg = []; for (var i = 0; i < 900; i++) { var th = rnd(0, 6.28), yy = rnd(-1, 1), rr = Math.sqrt(1 - yy * yy); bg.push({ p: [Math.cos(th) * rr, yy, Math.sin(th) * rr], r: rnd(.3, 1.3), ph: rnd(0, 6.3), c: Math.random() < .15 ? '#ffd6a8' : (Math.random() < .3 ? '#a8c8ff' : '#fff') }); }
  var neb = []; for (var k = 0; k < 9; k++) { var t2 = rnd(0, 6.28), y2 = rnd(-.7, .7), r2 = Math.sqrt(1 - y2 * y2); neb.push({ p: [Math.cos(t2) * r2, y2, Math.sin(t2) * r2], r: rnd(.25, .6), c: ['120,60,220', '30,110,230', '220,60,120', '30,180,200'][k % 4] }); }
  var cam = { yaw: 0, pitch: 0, zoom: 1 }, tgt = { yaw: 0, pitch: 0 }, warp = 0, query = '', hover = null, mx = -999, my = -999, drag = false, moved = 0, lx = 0, ly = 0, vel = { x: 0, y: 0 }, auto = true, lastIn = 0, focusF = null;
  S.onQuery(function (q) { query = q; });
  var dk = ML.dock(folders, function (f) { focusF = focusF === f ? null : f; Array.prototype.forEach.call(dk.children, function (x) { x.classList.toggle('on', focusF && x.dataset.id === focusF.id); }); if (focusF) { tgt.yaw = focusF.yaw; tgt.pitch = focusF.pitch; auto = false; warp = 1; lastIn = performance.now(); } });
  function resize() { dpr = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  function P(p) { var cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch); var x1 = p[0] * cy - p[2] * sy, z1 = p[0] * sy + p[2] * cy, y2 = p[1] * cp - z1 * sp, z2 = p[1] * sp + z1 * cp; var f = H * .95 * cam.zoom; return [W / 2 + x1 / Math.max(z2, .001) * f, H * .46 - y2 / Math.max(z2, .001) * f, z2]; }
  var t0 = performance.now();
  function frame(now) {
    requestAnimationFrame(frame); var t = (now - t0) / 1000;
    if (!drag) { if (auto && !RM) { cam.yaw += .0007; tgt.yaw = cam.yaw; tgt.pitch = cam.pitch; } else { var dy = tgt.yaw - cam.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); cam.yaw += dy * .06; cam.pitch += (tgt.pitch - cam.pitch) * .06; } cam.yaw += vel.x; cam.pitch += vel.y; vel.x *= .92; vel.y *= .92; if (!auto && !focusF && !query && now - lastIn > 9000) auto = true; }
    cam.pitch = Math.max(-1.2, Math.min(1.2, cam.pitch)); warp *= .96;
    ctx.fillStyle = '#010208'; ctx.fillRect(0, 0, W, H);
    neb.forEach(function (n) { var s = P(n.p); if (s[2] <= 0) return; var r = n.r * H * .95 * cam.zoom / s[2] * .6; var g = ctx.createRadialGradient(s[0], s[1], 0, s[0], s[1], r); g.addColorStop(0, 'rgba(' + n.c + ',.2)'); g.addColorStop(1, 'rgba(' + n.c + ',0)'); ctx.fillStyle = g; ctx.fillRect(s[0] - r, s[1] - r, r * 2, r * 2); });
    bg.forEach(function (b) { var s = P(b.p); if (s[2] <= 0 || s[0] < -20 || s[0] > W + 20 || s[1] < -20 || s[1] > H + 20) return; ctx.globalAlpha = .4 + .45 * Math.sin(t * 1.4 + b.ph); ctx.fillStyle = b.c; if (warp > .15) { var c = P([b.p[0] * 1, b.p[1], b.p[2]]); var dx = (s[0] - W / 2) * warp * .25, dy2 = (s[1] - H * .46) * warp * .25; ctx.strokeStyle = b.c; ctx.lineWidth = b.r; ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(s[0] - dx, s[1] - dy2); ctx.stroke(); } else ctx.fillRect(s[0], s[1], b.r, b.r); }); ctx.globalAlpha = 1;
    /* αστέρια links */
    stars.forEach(function (s) { var q = P(s.p); s.sx = q[0]; s.sy = q[1]; s.z = q[2]; });
    lines.forEach(function (l) { var a = l[0], b = l[1]; if (a.z <= 0 || b.z <= 0) return; var on = (!focusF || a.it.f === focusF) && ML.match(a.it, query) && ML.match(b.it, query); ctx.globalAlpha = on ? .3 : .05; ctx.strokeStyle = l[2]; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.stroke(); }); ctx.globalAlpha = 1;
    hover = null; var best = 18 * 18, gz = null, gzd = 1e9;
    stars.forEach(function (s) {
      if (s.z <= 0 || s.sx < -30 || s.sx > W + 30 || s.sy < -30 || s.sy > H + 30) return;
      var on = (!focusF || s.it.f === focusF) && ML.match(s.it, query), col = s.it.fc, r = (on ? 3.6 : 2) * s.m * (.7 + .3 * Math.sin(t * 2 + s.ph) * .5 + .3);
      var d = (s.sx - mx) * (s.sx - mx) + (s.sy - my) * (s.sy - my); if (on && d < best) { best = d; hover = s; }
      var gd = (s.sx - W / 2) * (s.sx - W / 2) + (s.sy - H * .46) * (s.sy - H * .46); if (on && gd < gzd) { gzd = gd; gz = s; }
      ctx.globalAlpha = on ? 1 : .2; var g = ctx.createRadialGradient(s.sx, s.sy, 0, s.sx, s.sy, r * 4); g.addColorStop(0, '#fff'); g.addColorStop(.2, col); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.sx, s.sy, r * 4, 0, 6.3); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.globalAlpha = on ? .6 : .1; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(s.sx - r * 3.2, s.sy); ctx.lineTo(s.sx + r * 3.2, s.sy); ctx.moveTo(s.sx, s.sy - r * 3.2); ctx.lineTo(s.sx, s.sy + r * 3.2); ctx.stroke();
      if (on && (s === hover || (query && ML.match(s.it, query)))) { ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.font = '500 12px Space Grotesk,sans-serif'; ctx.fillText(s.it.name, s.sx + 10, s.sy - 8); }
    }); ctx.globalAlpha = 1;
    /* ονόματα αστερισμών */
    folders.forEach(function (f) { var s = P(f.dir); if (s[2] <= 0) return; ctx.globalAlpha = focusF && focusF !== f ? .15 : .75; ctx.fillStyle = f.color; ctx.font = '600 13px Space Grotesk,sans-serif'; ctx.textAlign = 'center'; ctx.letterSpacing = '4px'; ctx.fillText(f.name.toUpperCase(), s[0], s[1] - Math.max(40, H * .13)); ctx.letterSpacing = '0px'; ctx.textAlign = 'left'; }); ctx.globalAlpha = 1;
    /* στόχαστρο: το κοντινότερο αστέρι στο κέντρο */
    var cx = W / 2, cy = H * .46; ctx.strokeStyle = 'rgba(154,209,255,.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, 26, 0, 6.3); ctx.moveTo(cx - 40, cy); ctx.lineTo(cx - 16, cy); ctx.moveTo(cx + 16, cy); ctx.lineTo(cx + 40, cy); ctx.moveTo(cx, cy - 40); ctx.lineTo(cx, cy - 16); ctx.moveTo(cx, cy + 16); ctx.lineTo(cx, cy + 40); ctx.stroke();
    if (gz && gzd < 140 * 140 && !hover) { ctx.strokeStyle = gz.it.fc; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(gz.sx, gz.sy); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.font = '600 13px Space Grotesk,sans-serif'; ctx.fillText(gz.it.name, gz.sx + 12, gz.sy - 10); }
    /* ταινία πυξίδας με τα ονόματα φακέλων */
    var tw = Math.min(W - 40, 720), tx = W / 2 - tw / 2, ty = 70; ctx.fillStyle = 'rgba(8,14,26,.55)'; ctx.fillRect(tx, ty, tw, 26); ctx.strokeStyle = 'rgba(154,209,255,.4)'; ctx.strokeRect(tx + .5, ty + .5, tw, 26);
    var per = tw / 1.6; /* πλάτος ταινίας σε rad */
    for (var deg = -180; deg < 180; deg += 10) { var rel = ((deg * Math.PI / 180) - cam.yaw + 9.4248) % 6.2832 - 3.1416; var x = W / 2 + rel / 1.6 * tw; if (x < tx || x > tx + tw) continue; ctx.strokeStyle = 'rgba(154,209,255,.55)'; ctx.beginPath(); ctx.moveTo(x, ty + 26); ctx.lineTo(x, ty + (deg % 30 ? 20 : 14)); ctx.stroke(); }
    folders.forEach(function (f) { var rel = ((f.yaw - cam.yaw) + 9.4248) % 6.2832 - 3.1416, x = W / 2 + rel / 1.6 * tw; if (x < tx + 8 || x > tx + tw - 8) return; ctx.fillStyle = f.color; ctx.beginPath(); ctx.arc(x, ty + 8, 3.4, 0, 6.3); ctx.fill(); ctx.font = '500 10px IBM Plex Mono,monospace'; ctx.textAlign = 'center'; ctx.fillText(f.name, x, ty + 40); ctx.textAlign = 'left'; });
    ctx.fillStyle = '#9ad1ff'; ctx.beginPath(); ctx.moveTo(W / 2 - 5, ty - 5); ctx.lineTo(W / 2 + 5, ty - 5); ctx.lineTo(W / 2, ty + 1); ctx.fill();
    /* πιλοτήριο: κάτω πλαίσιο */
    var by = H - 120; ctx.fillStyle = 'rgba(4,8,16,.88)'; ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, by + 60); ctx.quadraticCurveTo(W * .25, by + 10, W * .5 - 130, by + 6); ctx.lineTo(W * .5 + 130, by + 6); ctx.quadraticCurveTo(W * .75, by + 10, W, by + 60); ctx.lineTo(W, H); ctx.fill();
    ctx.strokeStyle = 'rgba(154,209,255,.45)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, by + 60); ctx.quadraticCurveTo(W * .25, by + 10, W * .5 - 130, by + 6); ctx.lineTo(W * .5 + 130, by + 6); ctx.quadraticCurveTo(W * .75, by + 10, W, by + 60); ctx.stroke();
    ctx.strokeStyle = 'rgba(154,209,255,.25)'; ctx.beginPath(); ctx.moveTo(W * .08, H); ctx.lineTo(W * .2, by + 30); ctx.moveTo(W * .92, H); ctx.lineTo(W * .8, by + 30); ctx.stroke();
    /* ενδείξεις */
    ctx.font = '10px IBM Plex Mono,monospace'; ctx.fillStyle = '#6fa6d6'; ctx.fillText('YAW ' + (((cam.yaw * 57.3) % 360 + 360) % 360).toFixed(0).padStart(3, '0') + '°', 20, by + 70); ctx.fillText('PITCH ' + (cam.pitch * 57.3).toFixed(0) + '°', 20, by + 86); ctx.textAlign = 'right'; ctx.fillText('STARS ' + stars.length, W - 20, by + 70); ctx.fillText('ZOOM ' + cam.zoom.toFixed(2) + '×', W - 20, by + 86); ctx.textAlign = 'left';
    cv.classList.toggle('hot', !!hover); S.tip(hover && !drag ? hover.it : null, mx, my);
  }
  cv.addEventListener('pointerdown', function (e) { drag = true; moved = 0; lx = e.clientX; ly = e.clientY; vel.x = vel.y = 0; auto = false; cv.setPointerCapture(e.pointerId); cv.classList.add('drag'); });
  cv.addEventListener('pointermove', function (e) { mx = e.clientX; my = e.clientY; if (!drag) return; var dx = e.clientX - lx, dy = e.clientY - ly; moved += Math.abs(dx) + Math.abs(dy); lx = e.clientX; ly = e.clientY; var k = .0035 / cam.zoom; cam.yaw -= dx * k; cam.pitch += dy * k; vel.x = -dx * k * .25; vel.y = dy * k * .25; tgt.yaw = cam.yaw; tgt.pitch = cam.pitch; });
  function up() { drag = false; cv.classList.remove('drag'); lastIn = performance.now(); }
  cv.addEventListener('pointerup', function (e) { var click = moved < 6; up(); if (click) { mx = e.clientX; my = e.clientY; if (hover) ML.open(hover.it); } });
  cv.addEventListener('pointercancel', up); cv.addEventListener('pointerleave', function () { mx = my = -999; });
  cv.addEventListener('wheel', function (e) { e.preventDefault(); cam.zoom = Math.max(.6, Math.min(3, cam.zoom * (e.deltaY < 0 ? 1.08 : .93))); }, { passive: false });
  addEventListener('resize', resize); resize(); requestAnimationFrame(frame);
})();
