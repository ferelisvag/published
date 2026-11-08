/* City: νυχτερινή πόλη σε isometric. Κάθε φάκελος είναι συνοικία και κάθε link κτίριο. */
(function () {
  'use strict';
  var ML = window.ML, RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cv = document.getElementById('cv'), ctx = cv.getContext('2d'), W = 0, H = 0, dpr = 1;
  var S = ML.shell({ id: 'city', title: 'City', acc: '#ffcf5a', find: 'Αναζήτηση κτιρίων' });
  var folders = ML.folders.filter(function (f) { return f.items.length; });
  var query = '', iso = null, hover = null, mx = -999, my = -999, mode = 'auto';
  /* διάταξη συνοικιών σε ράφια */
  var MAXW = 26, shelfY = 0, x = 0, rowH = 0, districts = [], blds = [], streetsH = [], streetsV = [], shelves = [];
  folders.forEach(function (f) {
    var n = f.items.length, cols = Math.max(2, Math.ceil(Math.sqrt(n * 1.15))), rows = Math.ceil(n / cols);
    if (x > 0 && x + cols > MAXW) { shelves.push({ y: shelfY, h: rowH }); shelfY += rowH + 2; x = 0; rowH = 0; }
    var d = { f: f, gx: x, gy: shelfY, cols: cols, rows: rows }; districts.push(d);
    f.items.forEach(function (it, k) { var cx = k % cols, cy = Math.floor(k / cols); blds.push({ it: it, d: d, gx: d.gx + cx + .1, gy: d.gy + cy + .1, h: 16 + ML.hash(it.id + 'h') * (n > 20 ? 62 : 44) + (k === 0 ? 14 : 0), win: ML.hash(it.id + 'w'), hov: 0 }); });
    x += cols + 2; rowH = Math.max(rowH, rows);
  });
  shelves.push({ y: shelfY, h: rowH });
  var totalH = shelfY + rowH, totalW = MAXW;
  shelves.forEach(function (s) { streetsH.push({ y: s.y - 1, x0: -2, x1: totalW + 2 }); });
  streetsH.push({ y: totalH + 1, x0: -2, x1: totalW + 2 });
  districts.forEach(function (d) { streetsV.push({ x: d.gx + d.cols + 1 - 2, y0: d.gy - 2, y1: d.gy + d.rows + 2 }); });
  streetsV.push({ x: -1, y0: -2, y1: totalH + 2 });
  var cars = []; var segs = streetsH.map(function (s) { return { ax: s.x0, ay: s.y, bx: s.x1, by: s.y }; }).concat(streetsV.map(function (s) { return { ax: s.x, ay: s.y0, bx: s.x, by: s.y1 }; }));
  for (var i = 0; i < 46; i++) { var sg = segs[i % segs.length]; cars.push({ s: sg, u: Math.random(), v: (.04 + Math.random() * .08) * (Math.random() < .5 ? 1 : -1) / (1 + Math.hypot(sg.bx - sg.ax, sg.by - sg.ay) * .02), c: ['#ffe9a8', '#ff5a5a', '#9ad1ff', '#ffffff'][i % 4], off: Math.random() < .5 ? .12 : -.12 }); }
  var drones = []; for (var j = 0; j < 7; j++) drones.push({ x: Math.random() * totalW, y: Math.random() * totalH, tx: Math.random() * totalW, ty: Math.random() * totalH, z: 80 + Math.random() * 80, ph: Math.random() * 6 });
  var cam = { x: totalW / 2, y: totalH / 2, z: 1 }, tg = { x: cam.x, y: cam.y, z: 1 }, TW = 64, TH = 32, focusAnim = false;
  S.onQuery(function (q) { query = q; });
  var dk = ML.dock(folders, function (f) { iso = iso === f ? null : f; Array.prototype.forEach.call(dk.children, function (b) { b.classList.toggle('on', iso && b.dataset.id === iso.id); }); var d = districts.filter(function (d) { return d.f === f; })[0]; if (iso && d) { tg.x = d.gx + d.cols / 2; tg.y = d.gy + d.rows / 2; tg.z = Math.min(2.4, Math.min(W, H) / ((d.cols + d.rows) * TW * .62)); } else { tg.x = totalW / 2; tg.y = totalH / 2; tg.z = fit(); } });
  var tb = document.createElement('button'); tb.type = 'button'; tb.style.cssText = 'position:fixed;z-index:30;right:16px;bottom:18px;padding:7px 14px;border-radius:999px;border:1px solid rgba(255,255,255,.22);background:rgba(0,0,0,.55);backdrop-filter:blur(8px);color:#fff;font:500 12px Space Grotesk,sans-serif;cursor:pointer'; document.body.appendChild(tb);
  function lab() { tb.textContent = mode === 'auto' ? 'Ώρα: πραγματική' : mode === 'day' ? 'Ώρα: μέρα' : 'Ώρα: νύχτα'; } lab();
  tb.addEventListener('click', function () { mode = mode === 'auto' ? 'night' : mode === 'night' ? 'day' : 'auto'; lab(); });
  function fit() { return Math.min(W / ((totalW + totalH) * TW * .56), H / ((totalW + totalH) * TH * .56 + 160)); }
  function resize() { dpr = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); if (!iso) { tg.z = fit(); cam.z = tg.z; } }
  function nightF() { if (mode === 'night') return 1; if (mode === 'day') return 0; var d = new Date(), h = d.getHours() + d.getMinutes() / 60; if (h >= 7.5 && h <= 17.5) return 0; if (h >= 20 || h <= 5) return 1; return h > 17.5 ? (h - 17.5) / 2.5 : 1 - (h - 5) / 2.5; }
  function P(gx, gy, z) { var s = cam.z; return [W / 2 + ((gx - cam.x) - (gy - cam.y)) * TW / 2 * s, H * .5 + ((gx - cam.x) + (gy - cam.y)) * TH / 2 * s - z * s]; }
  function mix(a, b, t) { return a.map(function (v, i) { return Math.round(v + (b[i] - v) * t); }); }
  function rgb(c) { return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')'; }
  function hexRgb(h) { var n = parseInt(h.slice(1), 16); return [n >> 16, n >> 8 & 255, n & 255]; }
  var t0 = performance.now();
  function frame(now) {
    requestAnimationFrame(frame); var t = (now - t0) / 1000, n = nightF();
    cam.x += (tg.x - cam.x) * .07; cam.y += (tg.y - cam.y) * .07; cam.z += (tg.z - cam.z) * .07;
    /* ουρανός */
    var top = mix([120, 190, 255], [6, 8, 24], n), mid = mix([200, 225, 255], [28, 18, 60], n), bot = mix([255, 220, 170], [70, 28, 80], n);
    var sk = ctx.createLinearGradient(0, 0, 0, H); sk.addColorStop(0, rgb(top)); sk.addColorStop(.55, rgb(mid)); sk.addColorStop(1, rgb(bot)); ctx.fillStyle = sk; ctx.fillRect(0, 0, W, H);
    var ang = (new Date().getHours() + new Date().getMinutes() / 60) / 24 * 6.2832; var ox = W * .12 + (n > .5 ? W * .06 : 0);
    if (n < .6) { ctx.globalAlpha = 1 - n; ctx.fillStyle = '#fff2b0'; ctx.shadowColor = '#ffd36b'; ctx.shadowBlur = 40; ctx.beginPath(); ctx.arc(W * .85, H * .16, 28, 0, 6.3); ctx.fill(); ctx.shadowBlur = 0; ctx.globalAlpha = 1; }
    if (n > .3) { ctx.globalAlpha = n; ctx.fillStyle = '#eef3ff'; ctx.beginPath(); ctx.arc(W * .85, H * .16, 20, 0, 6.3); ctx.fill(); ctx.fillStyle = mix([6, 8, 24], [28, 18, 60], .5).length ? 'rgb(14,12,40)' : '#000'; ctx.beginPath(); ctx.arc(W * .85 + 8, H * .16 - 4, 18, 0, 6.3); ctx.fill(); for (var s = 0; s < 70; s++) { var sx = (s * 137.5 % 1) * W, sy = (s * 61.8 % 1) * H * .45; ctx.globalAlpha = n * (.4 + .4 * Math.sin(t * 1.2 + s)); ctx.fillStyle = '#fff'; ctx.fillRect(sx, sy, 1.4, 1.4); } ctx.globalAlpha = 1; }
    /* έδαφος και δρόμοι */
    var gl = [P(-4, -4, 0), P(totalW + 4, -4, 0), P(totalW + 4, totalH + 4, 0), P(-4, totalH + 4, 0)];
    ctx.fillStyle = rgb(mix([78, 84, 96], [14, 16, 28], n)); ctx.beginPath(); gl.forEach(function (p, i) { i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,' + (.06 + n * .04) + ')'; ctx.lineWidth = 1; ctx.setLineDash([6, 8]); segs.forEach(function (s) { var a = P(s.ax, s.ay, 0), b = P(s.bx, s.by, 0); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }); ctx.setLineDash([]);
    districts.forEach(function (d) {
      var c = hexRgb(d.f.color), on = !iso || iso === d.f; var p = [P(d.gx - .4, d.gy - .4, 0), P(d.gx + d.cols + .3, d.gy - .4, 0), P(d.gx + d.cols + .3, d.gy + d.rows + .3, 0), P(d.gx - .4, d.gy + d.rows + .3, 0)];
      ctx.globalAlpha = on ? 1 : .35; ctx.fillStyle = rgb(mix(mix([120, 126, 138], [24, 27, 42], n), c, .12)); ctx.beginPath(); p.forEach(function (q, i) { i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = d.f.color; ctx.globalAlpha = (on ? .7 : .2) * (.5 + n * .5); ctx.lineWidth = 1.5; ctx.shadowColor = d.f.color; ctx.shadowBlur = n * 10; ctx.stroke(); ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    });
    /* αυτοκίνητα (πίσω από κτίρια για απλότητα: ζωγραφίζονται πριν) */
    cars.forEach(function (c) { if (!RM) { c.u += c.v * .01; if (c.u > 1) c.u = 0; if (c.u < 0) c.u = 1; } var sg = c.s, gx = sg.ax + (sg.bx - sg.ax) * c.u, gy = sg.ay + (sg.by - sg.ay) * c.u; if (sg.ax === sg.bx) gx += c.off; else gy += c.off; var p = P(gx, gy, 2); ctx.fillStyle = c.c; ctx.shadowColor = c.c; ctx.shadowBlur = 6 + n * 8; ctx.beginPath(); ctx.ellipse(p[0], p[1], 3.4 * cam.z + 1, 1.8 * cam.z + .6, 0, 0, 6.3); ctx.fill(); ctx.shadowBlur = 0; });
    /* κτίρια */
    hover = null; var order = blds.slice().sort(function (a, b) { return (a.gx + a.gy) - (b.gx + b.gy) || a.gx - b.gx; });
    order.forEach(function (b) {
      var m = ML.match(b.it, query), on = (!iso || b.d.f === iso) && m, s = .8, h = b.h * (1 + b.hov * .12), c = hexRgb(b.it.fc);
      var A = P(b.gx, b.gy, h), B = P(b.gx + s, b.gy, h), C = P(b.gx + s, b.gy + s, h), D = P(b.gx, b.gy + s, h), Bb = P(b.gx + s, b.gy, 0), Cb = P(b.gx + s, b.gy + s, 0), Db = P(b.gx, b.gy + s, 0);
      var al = on ? 1 : .22; ctx.globalAlpha = al;
      var baseL = mix(mix([120, 128, 146], [20, 24, 40], n), c, .18), baseR = mix(mix([92, 98, 116], [13, 16, 30], n), c, .14), topC = mix(mix([170, 178, 196], [42, 48, 76], n), c, .3 + b.hov * .3);
      ctx.fillStyle = rgb(baseL); ctx.beginPath(); ctx.moveTo(D[0], D[1]); ctx.lineTo(C[0], C[1]); ctx.lineTo(Cb[0], Cb[1]); ctx.lineTo(Db[0], Db[1]); ctx.closePath(); ctx.fill();
      var hit = ctx.isPointInPath(mx * dpr, my * dpr);
      ctx.fillStyle = rgb(baseR); ctx.beginPath(); ctx.moveTo(C[0], C[1]); ctx.lineTo(B[0], B[1]); ctx.lineTo(Bb[0], Bb[1]); ctx.lineTo(Cb[0], Cb[1]); ctx.closePath(); ctx.fill();
      hit = hit || ctx.isPointInPath(mx * dpr, my * dpr);
      ctx.fillStyle = rgb(topC); ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.lineTo(C[0], C[1]); ctx.lineTo(D[0], D[1]); ctx.closePath(); ctx.fill();
      hit = hit || ctx.isPointInPath(mx * dpr, my * dpr); if (hit && on) hover = b;
      /* παράθυρα */
      var rows = Math.max(1, Math.floor(b.h / 9)), lit = n > .35 ? n : 0;
      for (var r = 0; r < rows; r++) for (var q = 0; q < 3; q++) {
        var seed = ML.hash(b.it.id + r + '_' + q), isLit = seed < .35 + b.win * .4 + (n < .35 ? -.2 : 0); var zz = 4 + r * 9, u0 = (q + .2) / 3, u1 = (q + .8) / 3;
        if (zz + 6 > b.h) continue;
        var wc = isLit ? (lit > 0 ? 'rgba(255,224,150,' + (.4 + lit * .55) + ')' : 'rgba(255,255,255,.35)') : 'rgba(0,0,0,.25)';
        ctx.fillStyle = wc; var p1 = P(b.gx + s * u0, b.gy + s, zz + 5), p2 = P(b.gx + s * u1, b.gy + s, zz + 5), p3 = P(b.gx + s * u1, b.gy + s, zz), p4 = P(b.gx + s * u0, b.gy + s, zz);
        ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.lineTo(p3[0], p3[1]); ctx.lineTo(p4[0], p4[1]); ctx.fill();
        if (q < 2) { var o = ML.hash(b.it.id + r + 'R' + q); if (o < .6) { ctx.fillStyle = isLit && lit > 0 ? 'rgba(255,200,120,' + (.3 + lit * .5) + ')' : 'rgba(0,0,0,.2)'; var v0 = (q + .2) / 3, v1 = (q + .8) / 3, r1 = P(b.gx + s, b.gy + s * v0, zz + 5), r2 = P(b.gx + s, b.gy + s * v1, zz + 5), r3 = P(b.gx + s, b.gy + s * v1, zz), r4 = P(b.gx + s, b.gy + s * v0, zz); ctx.beginPath(); ctx.moveTo(r1[0], r1[1]); ctx.lineTo(r2[0], r2[1]); ctx.lineTo(r3[0], r3[1]); ctx.lineTo(r4[0], r4[1]); ctx.fill(); } }
      }
      /* ακμή νέον στην κορυφή */
      ctx.strokeStyle = b.it.fc; ctx.lineWidth = 1.4; ctx.globalAlpha = al * (.45 + n * .55); ctx.shadowColor = b.it.fc; ctx.shadowBlur = n * 10; ctx.beginPath(); ctx.moveTo(D[0], D[1]); ctx.lineTo(C[0], C[1]); ctx.lineTo(B[0], B[1]); ctx.stroke(); ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      if (query && on) { ctx.fillStyle = '#fff'; ctx.font = '600 11px Space Grotesk,sans-serif'; ctx.textAlign = 'center'; ctx.fillText(b.it.name, (A[0] + C[0]) / 2, A[1] - 8); ctx.textAlign = 'left'; }
    });
    blds.forEach(function (b) { b.hov += ((b === hover ? 1 : 0) - b.hov) * .2; });
    /* ονόματα συνοικιών */
    districts.forEach(function (d) { var p = P(d.gx + d.cols / 2, d.gy + d.rows + .75, 0); ctx.globalAlpha = !iso || iso === d.f ? 1 : .3; ctx.fillStyle = d.f.color; ctx.shadowColor = d.f.color; ctx.shadowBlur = 8 * n; ctx.font = '700 ' + Math.max(10, Math.min(17, 12 * cam.z + 4)) + 'px Space Grotesk,sans-serif'; ctx.textAlign = 'center'; ctx.fillText(d.f.name.toUpperCase(), p[0], p[1] + 10); ctx.textAlign = 'left'; ctx.shadowBlur = 0; ctx.globalAlpha = 1; });
    /* drones */
    drones.forEach(function (d) { if (!RM) { var dx = d.tx - d.x, dy = d.ty - d.y, l = Math.hypot(dx, dy); if (l < .3) { d.tx = Math.random() * totalW; d.ty = Math.random() * totalH; } else { d.x += dx / l * .02; d.y += dy / l * .02; } } var p = P(d.x, d.y, d.z + Math.sin(t * 2 + d.ph) * 4), sh = P(d.x, d.y, 0); ctx.globalAlpha = .18; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(sh[0], sh[1], 5, 2.5, 0, 0, 6.3); ctx.fill(); ctx.globalAlpha = 1; ctx.fillStyle = '#222'; ctx.fillRect(p[0] - 5, p[1] - 1, 10, 2); ctx.fillStyle = Math.sin(t * 6 + d.ph) > 0 ? '#ff4d4d' : '#4dff88'; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(p[0], p[1] - 2, 1.8, 0, 6.3); ctx.fill(); ctx.shadowBlur = 0; });
    cv.classList.toggle('hot', !!hover); S.tip(hover && !drag ? hover.it : null, mx, my);
  }
  var drag = false, moved = 0, lx = 0, ly = 0;
  cv.addEventListener('pointerdown', function (e) { drag = true; moved = 0; lx = e.clientX; ly = e.clientY; cv.setPointerCapture(e.pointerId); cv.classList.add('drag'); });
  cv.addEventListener('pointermove', function (e) { mx = e.clientX; my = e.clientY; if (!drag) return; var dx = e.clientX - lx, dy = e.clientY - ly; moved += Math.abs(dx) + Math.abs(dy); lx = e.clientX; ly = e.clientY; var k = 1 / (TW * .5 * cam.z); var gx = (dx / (TW / 2 * cam.z) + dy / (TH / 2 * cam.z)) / 2, gy = (dy / (TH / 2 * cam.z) - dx / (TW / 2 * cam.z)) / 2; tg.x -= gx; tg.y -= gy; cam.x = tg.x; cam.y = tg.y; });
  cv.addEventListener('pointerup', function (e) { var click = moved < 6; drag = false; cv.classList.remove('drag'); if (click) { mx = e.clientX; my = e.clientY; if (hover) ML.open(hover.it); } });
  cv.addEventListener('pointercancel', function () { drag = false; cv.classList.remove('drag'); }); cv.addEventListener('pointerleave', function () { mx = my = -999; });
  cv.addEventListener('wheel', function (e) { e.preventDefault(); tg.z = Math.max(.3, Math.min(3.5, tg.z * (e.deltaY < 0 ? 1.1 : .91))); }, { passive: false });
  addEventListener('resize', resize); resize(); requestAnimationFrame(frame);
})();
