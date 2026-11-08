/* Rotating 3D particle network behind the page. Expects <canvas id="netbg"> in the body. */
(function(){
  'use strict';
  var c = document.getElementById('netbg');
  if (!c || !c.getContext) return;
  var ctx = c.getContext('2d');
  var RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MOBILE = window.matchMedia && matchMedia('(max-width: 760px)').matches;
  var N = MOBILE ? 70 : 130, nodes = [], edges = [], packets = [], proj = new Array(N);
  var W, H, mx = 0, my = 0, tmx = 0, tmy = 0;

  for (var i = 0; i < N; i++){
    var u = Math.cbrt(Math.random()), th = Math.random() * Math.PI * 2, ph = Math.acos(Math.random() * 2 - 1);
    nodes.push({ x:u * Math.sin(ph) * Math.cos(th), y:u * Math.sin(ph) * Math.sin(th) * 0.7, z:u * Math.cos(ph) });
  }
  for (var a = 0; a < N; a++) for (var b = a + 1; b < N; b++){
    var dx = nodes[a].x - nodes[b].x, dy = nodes[a].y - nodes[b].y, dz = nodes[a].z - nodes[b].z;
    if (dx*dx + dy*dy + dz*dz < 0.12) edges.push([a, b]);
  }

  function NC(){ return window.NETCOL || { edge:'255,30,56', node:'231,236,243', packet:'#ff1e38', on:true }; }
  function resize(){
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = window.innerWidth; H = window.innerHeight;
    c.width = W * dpr; c.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', function(e){ tmx = e.clientX / W - 0.5; tmy = e.clientY / H - 0.5; });

  function frame(t){
    requestAnimationFrame(frame);
    if (!NC().on){ ctx.clearRect(0, 0, W, H); return; }
    mx += (tmx - mx) * 0.04; my += (tmy - my) * 0.04;
    var ay = (RM ? 0 : t * 0.00004) + mx * 0.6 + window.scrollY * 0.0004, ax = 0.25 + my * 0.4;
    var ca = Math.cos(ay), sa = Math.sin(ay), cb = Math.cos(ax), sb = Math.sin(ax);
    var S = Math.max(W, H) * 0.62, cx = W * 0.5, cy = H * 0.5;
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < N; i++){
      var n = nodes[i];
      var x1 = n.x * ca + n.z * sa, z1 = -n.x * sa + n.z * ca;
      var y1 = n.y * cb - z1 * sb, z2 = n.y * sb + z1 * cb;
      var p = 2.4 / (2.4 + z2);
      proj[i] = { x:cx + x1 * S * p, y:cy + y1 * S * p, p:p };
    }
    ctx.lineWidth = 1;
    for (var e = 0; e < edges.length; e++){
      var A = proj[edges[e][0]], B = proj[edges[e][1]];
      var al = 0.05 + 0.16 * Math.max(0, (A.p + B.p) / 2 - 0.6);
      ctx.strokeStyle = 'rgba(' + NC().edge + ',' + al.toFixed(3) + ')';
      ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
    }
    for (var k = 0; k < N; k++){
      var q = proj[k], r = 0.6 + q.p * 1.3;
      ctx.fillStyle = 'rgba(' + NC().node + ',' + (0.15 + 0.4 * (q.p - 0.6)).toFixed(3) + ')';
      ctx.fillRect(q.x - r / 2, q.y - r / 2, r, r);
    }
    if (!RM && edges.length && packets.length < (MOBILE ? 8 : 18) && Math.random() < 0.08)
      packets.push({ e:edges[(Math.random() * edges.length) | 0], t:0, s:0.006 + Math.random() * 0.014, f:Math.random() < 0.5 });
    ctx.fillStyle = NC().packet;
    for (var j = packets.length - 1; j >= 0; j--){
      var pk = packets[j]; pk.t += pk.s;
      if (pk.t >= 1){ packets.splice(j, 1); continue; }
      var P = proj[pk.e[pk.f ? 0 : 1]], Q = proj[pk.e[pk.f ? 1 : 0]];
      var px = P.x + (Q.x - P.x) * pk.t, py = P.y + (Q.y - P.y) * pk.t;
      ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.arc(px, py, 1.8, 0, 6.283); ctx.fill();
      ctx.globalAlpha = 0.15; ctx.beginPath(); ctx.arc(px, py, 6, 0, 6.283); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  requestAnimationFrame(frame);
})();
