/* Ocean: βαθιά θάλασσα. Κάθε link είναι μέδουσα που φωτίζει όταν πλησιάζεις. */
(function () {
  'use strict';
  var ML = window.ML, RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cv = document.getElementById('cv'), ctx = cv.getContext('2d'), W = 0, H = 0, dpr = 1;
  var S = ML.shell({ id: 'ocean', title: 'Ocean', acc: '#3de0ff', find: 'Αναζήτηση στον βυθό' });
  var folders = ML.folders, iso = null, query = '', mx = -999, my = -999, tx = 0, ty = 0, cx = 0, cy = 0, hover = null;
  var rnd = function (a, b) { return a + Math.random() * (b - a); };
  var jelly = ML.items.map(function (it, i) {
    var fi = folders.indexOf(it.f), d = .35 + ML.hash(it.id + 'd') * .65; /* βάθος: μικρό = μακριά */
    return { it: it, x: ML.hash(it.id + 'x') * 2.2 - .1, y: ML.hash(it.id + 'y') * 1.2 - .05, d: d, s: (16 + ML.hash(it.id + 's') * 14) * (.55 + d * .7), ph: ML.hash(it.id + 'p') * 6.28, sp: .2 + ML.hash(it.id + 'v') * .35, glow: 0, sx: 0, sy: 0 };
  });
  var snow = []; for (var i = 0; i < 160; i++) snow.push({ x: Math.random(), y: Math.random(), r: rnd(.5, 2), s: rnd(.01, .04), d: Math.random() });
  var fish = []; /* σιλουέτες που περνούν */
  var dk = ML.dock(folders, function (f) { iso = iso === f ? null : f; Array.prototype.forEach.call(dk.children, function (x) { x.classList.toggle('on', iso && x.dataset.id === iso.id); }); });
  S.onQuery(function (q) { query = q; });
  function resize() { dpr = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  function bell(x, y, r, col, a, t, ph, glow) {
    var pul = 1 + Math.sin(t * 1.6 + ph) * .1, w = r * pul, h = r * .8 * (2 - pul);
    ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, r * .07);
    for (var k = -2; k <= 2; k++) { ctx.globalAlpha = a * .5; ctx.beginPath(); var bx = x + k * w * .3; ctx.moveTo(bx, y); for (var s = 1; s <= 6; s++) ctx.lineTo(bx + Math.sin(t * 1.3 + ph + s * .8 + k) * r * .18 * s * .4, y + s * r * .42); ctx.stroke(); }
    var g = ctx.createRadialGradient(x, y - h * .3, 0, x, y, w * 1.3); g.addColorStop(0, '#fff'); g.addColorStop(.25, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = a * (.7 + glow * .3); ctx.fillStyle = g; ctx.shadowColor = col; ctx.shadowBlur = 14 + glow * 30;
    ctx.beginPath(); ctx.moveTo(x - w, y); ctx.bezierCurveTo(x - w, y - h * 1.5, x + w, y - h * 1.5, x + w, y); ctx.quadraticCurveTo(x, y + h * .35, x - w, y); ctx.fill(); ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }
  var t0 = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    var t = (now - t0) / 1000;
    if (mx > 0) { tx = (mx / W - .5); ty = (my / H - .5); } cx += (tx - cx) * .04; cy += (ty - cy) * .04;
    var bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#04476a'); bg.addColorStop(.35, '#02213f'); bg.addColorStop(1, '#00060f'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    /* ακτίνες φωτός */
    ctx.globalCompositeOperation = 'lighter';
    for (var r = 0; r < 7; r++) { var x0 = W * (.1 + r * .15) + Math.sin(t * .15 + r) * 50 - cx * 60, w = 40 + r % 3 * 30; var gr = ctx.createLinearGradient(0, 0, 0, H * .85); gr.addColorStop(0, 'rgba(120,230,255,.13)'); gr.addColorStop(1, 'rgba(120,230,255,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(x0 - w * .3, 0); ctx.lineTo(x0 + w * .3, 0); ctx.lineTo(x0 + w * 1.8 + 120, H * .85); ctx.lineTo(x0 - w * 1.4 + 120, H * .85); ctx.fill(); }
    ctx.globalCompositeOperation = 'source-over';
    /* χιόνι θάλασσας */
    snow.forEach(function (s) { s.y += s.s * .004; if (s.y > 1) s.y = 0; var x = ((s.x - cx * s.d * .1) % 1 + 1) % 1; ctx.globalAlpha = .25 + s.d * .4; ctx.fillStyle = '#bfefff'; ctx.fillRect(x * W, s.y * H, s.r, s.r); }); ctx.globalAlpha = 1;
    /* φάλαινα σιλουέτα */
    if (!RM && !fish.length && Math.random() < .002) fish.push({ x: -.3, y: rnd(.25, .6), v: rnd(.0006, .0011), s: rnd(.8, 1.4) });
    fish.forEach(function (f) { f.x += f.v; var X = f.x * W, Y = f.y * H + Math.sin(f.x * 9) * 12, sz = 150 * f.s; ctx.globalAlpha = .18; ctx.fillStyle = '#021424'; ctx.beginPath(); ctx.ellipse(X, Y, sz, sz * .22, 0, 0, 6.3); ctx.fill(); ctx.beginPath(); ctx.moveTo(X - sz * .9, Y); ctx.lineTo(X - sz * 1.4, Y - sz * .3); ctx.lineTo(X - sz * 1.3, Y + sz * .18); ctx.fill(); ctx.globalAlpha = 1; });
    fish = fish.filter(function (f) { return f.x < 1.5; });
    /* μέδουσες από πίσω προς τα μπρος */
    hover = null; var best = 1e9;
    jelly.sort(function (a, b) { return a.d - b.d; }).forEach(function (j) {
      var drift = t * j.sp * .02; var px = ((j.x + Math.sin(t * .1 * j.sp + j.ph) * .03) * W - cx * 120 * j.d), py = ((j.y - (drift % 1.3) + 1.3) % 1.3 - .1) * H - cy * 80 * j.d;
      var on = (!iso || j.it.f === iso) && ML.match(j.it, query), a = on ? .35 + j.d * .65 : .08;
      px = ((px % (W * 1.25)) + W * 1.25) % (W * 1.25) - W * .12; j.sx = px; j.sy = py;
      var dx = px - mx, dy = py - my, dd = dx * dx + dy * dy, near = Math.max(0, 1 - Math.sqrt(dd) / 190);
      j.glow += ((on ? near : 0) - j.glow) * .12; if (on && dd < Math.pow(j.s * 1.3, 2) && dd < best) { best = dd; hover = j; }
      bell(px, py, j.s * (1 + j.glow * .25), j.it.fc, a, t, j.ph, j.glow);
      if (on && (j.glow > .55 || (query && ML.match(j.it, query)) )) { ctx.globalAlpha = Math.min(1, j.glow * 1.4 + (query ? 1 : 0)); ctx.fillStyle = '#fff'; ctx.font = '500 12px Space Grotesk,sans-serif'; ctx.textAlign = 'center'; ctx.fillText(j.it.name, px, py + j.s * 3.3); ctx.textAlign = 'left'; ctx.globalAlpha = 1; }
    });
    /* βυθός */
    var fl = H * .9; ctx.fillStyle = '#01060d'; ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, fl + 10); for (var x = 0; x <= W; x += 40) ctx.lineTo(x - cx * 30, fl + Math.sin(x * .012) * 18 + Math.sin(x * .031) * 8 + 20); ctx.lineTo(W, H); ctx.fill();
    /* φάρος της Καβάλας */
    var lx = W * .9 - cx * 40, ly = fl + 4; ctx.fillStyle = '#02101c'; ctx.fillRect(lx - 14, ly - 90, 28, 94); ctx.fillStyle = '#ffe9a8'; ctx.shadowColor = '#ffe9a8'; ctx.shadowBlur = 24; ctx.fillRect(lx - 6, ly - 108, 12, 14); ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = 'lighter'; var ba = t * .5; ctx.fillStyle = 'rgba(255,233,168,.12)'; ctx.beginPath(); ctx.moveTo(lx, ly - 100); ctx.lineTo(lx + Math.cos(ba) * 700 + 0, ly - 100 + Math.sin(ba) * 90 - 150); ctx.lineTo(lx + Math.cos(ba) * 700, ly - 100 + Math.sin(ba) * 90 + 120); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
    cv.classList.toggle('hot', !!hover); S.tip(hover && hover.it, mx, my);
  }
  cv.addEventListener('pointermove', function (e) { mx = e.clientX; my = e.clientY; });
  cv.addEventListener('pointerleave', function () { mx = my = -999; });
  cv.addEventListener('pointerup', function (e) { mx = e.clientX; my = e.clientY; if (hover) ML.open(hover.it); });
  addEventListener('resize', resize); resize(); requestAnimationFrame(frame);
})();
