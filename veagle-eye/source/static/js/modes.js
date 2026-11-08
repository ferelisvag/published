"use strict";
/* Οι όψεις του Veagle Eye: τα ίδια ζωντανά δεδομένα σε διαφορετική μορφή.
   Κάθε όψη έχει frame(P) που ζωγραφίζει ένα καρέ σε canvas.
   P = { c, w, h, t, dt, u, S, d, G, C, st, seq }                                   */
(function () {
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const SANS = '"IBM Plex Sans","Space Grotesk",system-ui,sans-serif';
  const DISP = '"Space Grotesk","IBM Plex Sans",system-ui,sans-serif';
  const MONO = '"IBM Plex Mono","IBM Plex Sans",ui-monospace,Consolas,monospace';

  const eagle = new Image();
  eagle.src = "eagle-white.png";

  function rgba(hex, a) {
    hex = (hex || "#ffffff").trim();
    if (hex[0] !== "#") return hex;
    if (hex.length === 4) hex = "#" + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
    const n = parseInt(hex.slice(1), 16);
    return "rgba(" + (n >> 16 & 255) + "," + (n >> 8 & 255) + "," + (n & 255) + "," + a + ")";
  }
  function glow(c, x, y, r, col, a) {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(col, a)); g.addColorStop(1, rgba(col, 0));
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  }
  function text(c, s, x, y, px, col, al, font, w) {
    c.font = (w || 500) + " " + px + "px " + (font || SANS);
    c.fillStyle = col; c.textAlign = al || "center"; c.textBaseline = "middle"; c.fillText(s, x, y);
  }
  function drawEagle(c, cx, cy, s, alpha) {
    if (!(eagle.complete && eagle.naturalWidth)) return;
    const hh = s * eagle.naturalHeight / eagle.naturalWidth;
    c.globalAlpha = alpha == null ? 1 : alpha;
    c.drawImage(eagle, cx - s / 2, cy - hh / 2, s, hh);
    c.globalAlpha = 1;
  }
  function pulseTxt(P, v) { return Math.round(v) + "%"; }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; }
  const inetCount = (d, name) => d.conns.filter((x) => x.scope === "internet" && x.name === name).reduce((a, x) => a + (x.count || 1), 0);

  const M = {};

  /* =============================== CYBER =============================== */
  M.cyber = {
    init(st) {
      const N = 150; st.pts = [];
      for (let i = 0; i < N; i++) { const y = 1 - 2 * (i + 0.5) / N, r = Math.sqrt(1 - y * y), th = i * 2.399963; st.pts.push([Math.cos(th) * r, y, Math.sin(th) * r]); }
      st.pairs = [];
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
        const a = st.pts[i], b = st.pts[j], dd = (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
        if (dd < 0.17) st.pairs.push([i, j]);
      }
      st.yaw = 0; st.pitch = 0.35; st.drag = false;
    },
    pointer(type, x, y, dx, dy, P) { const st = P.st; if (type === "down") st.drag = true; else if (type === "up") st.drag = false; else if (type === "move" && st.drag) { st.yaw += dx * 0.008; st.pitch = clamp(st.pitch + dy * 0.006, -1.2, 1.2); } },
    frame(P) {
      const { c, w, h, t, dt, S, d, C, st, u } = P;
      if (!st.drag) st.yaw += dt * 0.22;
      const R = Math.min(w, h) * 0.34, cx = w * 0.5, cy = h * 0.5;
      const cyw = Math.cos(st.yaw), syw = Math.sin(st.yaw), cp = Math.cos(st.pitch), sp = Math.sin(st.pitch);
      const pr = st.pts.map((p) => {
        const x1 = p[0] * cyw + p[2] * syw, z1 = -p[0] * syw + p[2] * cyw;
        const y1 = p[1] * cp - z1 * sp, z2 = p[1] * sp + z1 * cp, s = R * (1 + z2 * 0.16);
        return [cx + x1 * s, cy + y1 * s, z2];
      });
      glow(c, cx, cy, R * 1.25, C.acc, 0.07);
      c.lineWidth = 1;
      for (const [i, j] of st.pairs) {
        const a = pr[i], b = pr[j], z = (a[2] + b[2]) / 2;
        c.strokeStyle = rgba(C.acc, 0.05 + 0.22 * (z + 1) / 2);
        c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
      }
      for (let i = 0; i < pr.length; i++) { const p = pr[i]; c.fillStyle = rgba(C.text, 0.15 + 0.4 * (p[2] + 1) / 2); c.beginPath(); c.arc(p[0], p[1], 1 + (p[2] + 1) * u * 0.12, 0, TAU); c.fill(); }
      const rank = { internet: 0, lan: 1, local: 2 }, list = d.conns.slice().sort((a, b) => (rank[a.scope] - rank[b.scope]) || (a.name === "—") - (b.name === "—")).slice(0, 26), N = st.pts.length;
      const scopeCol = { internet: C.acc, lan: C.warn, local: C.dim };
      list.forEach((cn, k) => {
        const p = pr[(k * 5 + 3) % N], col = scopeCol[cn.scope] || C.dim;
        glow(c, p[0], p[1], u * (1.3 + (p[2] + 1)), col, 0.9);
        c.fillStyle = col; c.beginPath(); c.arc(p[0], p[1], u * 0.45, 0, TAU); c.fill();
        if (p[2] > -0.15) text(c, cn.name.replace(/\.exe$/i, "") + "  " + cn.raddr, p[0] + u * 1.2, p[1], Math.max(10, u * 1.25), rgba(C.text, 0.5 + 0.5 * p[2]), "left", MONO, 400);
      });
      // ραντάρ
      const rr = Math.min(w, h) * 0.11, rx = w - rr - u * 4, ry = h - rr - u * 9;
      c.strokeStyle = rgba(C.line2, 1); c.lineWidth = 1;
      for (let k = 1; k <= 3; k++) { c.beginPath(); c.arc(rx, ry, rr * k / 3, 0, TAU); c.stroke(); }
      c.beginPath(); c.moveTo(rx - rr, ry); c.lineTo(rx + rr, ry); c.moveTo(rx, ry - rr); c.lineTo(rx, ry + rr); c.stroke();
      const sw = (t * 1.3) % TAU;
      const g = c.createConicGradient ? c.createConicGradient(sw - 1.1, rx, ry) : null;
      if (g) { g.addColorStop(0, rgba(C.acc, 0)); g.addColorStop(0.17, rgba(C.acc, 0.35)); g.addColorStop(0.1750, rgba(C.acc, 0)); c.fillStyle = g; c.beginPath(); c.arc(rx, ry, rr, 0, TAU); c.fill(); }
      c.strokeStyle = rgba(C.acc, 0.9); c.beginPath(); c.moveTo(rx, ry); c.lineTo(rx + Math.cos(sw) * rr, ry + Math.sin(sw) * rr); c.stroke();
      list.forEach((cn, k) => {
        const a = k * 0.97, rad = rr * (0.25 + 0.7 * hash(cn.raddr)), diff = ((sw - a) % TAU + TAU) % TAU;
        glow(c, rx + Math.cos(a) * rad, ry + Math.sin(a) * rad, u * 1.1, scopeCol[cn.scope] || C.dim, clamp(1 - diff / 4, 0.15, 0.95));
      });
      text(c, "CPU " + Math.round(S.cpu) + "%  ·  RAM " + Math.round(S.mem) + "%", cx, h - u * 8, u * 1.8, C.dim, "center", MONO, 500);
    }
  };

  /* =============================== ORBIT =============================== */
  M.orbit = {
    init(st) { st.stars = Array.from({ length: 360 }, () => ({ x: Math.random() - 0.5, y: Math.random() - 0.5, z: Math.random() })); st.ang = 0; },
    frame(P) {
      const { c, w, h, t, dt, S, G, C, st, u } = P;
      const cx = w / 2, cy = h / 2, speed = 0.12 + S.nrate * 2.6, R = Math.min(w, h) * 0.34;
      c.lineCap = "round";
      for (const s of st.stars) {
        const pz = s.z; s.z -= dt * speed * 0.35;
        if (s.z <= 0.02) { s.x = Math.random() - 0.5; s.y = Math.random() - 0.5; s.z = 1; continue; }
        const k = Math.max(w, h) * 0.55, x = cx + s.x / s.z * k * 0.5, y = cy + s.y / s.z * k * 0.5, px = cx + s.x / pz * k * 0.5, py = cy + s.y / pz * k * 0.5;
        c.strokeStyle = rgba(C.text, clamp((1 - s.z) * 0.9, 0.05, 0.9)); c.lineWidth = 0.6 + (1 - s.z) * 1.8;
        c.beginPath(); c.moveTo(px, py); c.lineTo(x, y); c.stroke();
      }
      st.ang += dt * 0.12;
      c.lineWidth = 1; c.strokeStyle = rgba(C.line2, 1);
      c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.stroke();
      for (let i = 0; i < 72; i++) { const a = st.ang + i / 72 * TAU, l = i % 6 === 0 ? 0.06 : 0.025; c.beginPath(); c.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); c.lineTo(cx + Math.cos(a) * R * (1 + l), cy + Math.sin(a) * R * (1 + l)); c.stroke(); }
      c.lineWidth = u * 0.9;
      c.strokeStyle = rgba(C.acc, 0.95); c.beginPath(); c.arc(cx, cy, R * 0.86, Math.PI * 0.62, Math.PI * (0.62 + 0.76 * S.cpu / 100)); c.stroke();
      c.strokeStyle = rgba(C.acc2, 0.95); c.beginPath(); c.arc(cx, cy, R * 0.86, Math.PI * 0.38, Math.PI * (0.38 - 0.76 * S.mem / 100), true); c.stroke();
      c.strokeStyle = rgba(C.text, 0.8); c.lineWidth = 1.2; c.beginPath(); c.arc(cx, cy, u * 1.2, 0, TAU); c.moveTo(cx - u * 4, cy); c.lineTo(cx - u * 2, cy); c.moveTo(cx + u * 2, cy); c.lineTo(cx + u * 4, cy); c.stroke();
      text(c, "WARP", cx, cy - R * 0.18, u * 1.5, C.dim, "center", MONO, 500);
      text(c, window.Modes.fmtRate(Math.max(S.nd, S.nu)), cx, cy + R * 0.0 + u * 5.5, u * 3.4, C.text, "center", DISP, 700);
      text(c, "CPU " + Math.round(S.cpu) + "%", cx - R * 1.12, cy, u * 1.9, C.acc, "right", MONO, 500);
      text(c, "RAM " + Math.round(S.mem) + "%", cx + R * 1.12, cy, u * 1.9, C.acc2, "left", MONO, 500);
      G.slice(0, 7).forEach((g, i) => {
        const a = st.ang * 0.5 + i / 7 * TAU, rx = R * 1.38, x = cx + Math.cos(a) * rx * 1.15, y = cy + Math.sin(a) * rx * 0.62;
        glow(c, x, y, u * (1.2 + Math.min(2.5, g.cpu / 8)), C.acc, 0.8);
        c.fillStyle = C.text; c.beginPath(); c.arc(x, y, u * 0.38, 0, TAU); c.fill();
        text(c, g.name.replace(/\.exe$/i, ""), x, y + u * 2.1, Math.max(10, u * 1.3), rgba(C.text, 0.7), "center", MONO, 400);
      });
    }
  };

  /* ============================== MIND MAP ============================== */
  M.mindmap = {
    init(st) { st.nodes = new Map(); st.seq = -1; st.drag = null; },
    pointer(type, x, y, dx, dy, P) {
      const st = P.st;
      if (type === "down") { let best = null, bd = 1e9; st.nodes.forEach((n) => { const dd = Math.hypot(n.x - x, n.y - y); if (dd < n.r + 12 && dd < bd) { best = n; bd = dd; } }); st.drag = best; }
      else if (type === "move" && st.drag) { st.drag.x = x; st.drag.y = y; st.drag.vx = st.drag.vy = 0; }
      else if (type === "up") st.drag = null;
    },
    frame(P) {
      const { c, w, h, S, d, G, C, st, u, seq } = P;
      const cx = w / 2, cy = h / 2;
      if (st.seq !== seq) {
        st.seq = seq;
        const want = [];
        const add = (id, label, sub, r, parent, col) => want.push({ id, label, sub, r, parent, col });
        add("pc", d.info.hostname, "", u * 3.6, null, C.text);
        add("cpu", "CPU", Math.round(S.cpu) + "%", u * (1.8 + S.cpu / 40), "pc", C.acc);
        add("mem", "RAM", Math.round(S.mem) + "%", u * (1.8 + S.mem / 40), "pc", C.acc2);
        add("disk", "Disks", "", u * 2.2, "pc", C.ok);
        add("net", "Network", window.Modes.fmtRate(Math.max(S.nd, S.nu)), u * 2.4, "pc", C.warn);
        add("prog", "Programs", String(d.proc_count), u * 2.4, "pc", C.acc);
        add("conn", "Internet", String(d.conns.filter((x) => x.scope === "internet").length), u * 2.2, "pc", C.acc2);
        d.disks.slice(0, 4).forEach((dk) => add("dk:" + dk.mount, dk.mount, Math.round(dk.percent) + "%", u * 1.3, "disk", C.ok));
        add("dn", "↓", window.Modes.fmtRate(S.nd), u * 1.3, "net", C.warn); add("up", "↑", window.Modes.fmtRate(S.nu), u * 1.3, "net", C.warn);
        G.slice(0, 6).forEach((g) => add("p:" + g.name, g.name.replace(/\.exe$/i, ""), g.cpu.toFixed(1) + "%", u * (1 + Math.min(2, Math.sqrt(g.mem / 1048576) / 25)), "prog", C.acc));
        const seen = new Set();
        d.conns.filter((x) => x.scope === "internet").forEach((x) => { if (seen.size < 6 && !seen.has(x.name)) { seen.add(x.name); add("c:" + x.name, x.name.replace(/\.exe$/i, ""), String(inetCount(d, x.name)), u * 1.2, "conn", C.acc2); } });
        const ids = new Set(want.map((x) => x.id));
        st.nodes.forEach((n, id) => { if (!ids.has(id)) st.nodes.delete(id); });
        want.forEach((x) => {
          let n = st.nodes.get(x.id);
          if (!n) { const p = st.nodes.get(x.parent); n = { x: (p ? p.x : cx) + (Math.random() - 0.5) * 30, y: (p ? p.y : cy) + (Math.random() - 0.5) * 30, vx: 0, vy: 0 }; st.nodes.set(x.id, n); }
          Object.assign(n, x);
        });
      }
      const arr = [...st.nodes.values()], pc = st.nodes.get("pc");
      if (pc && st.drag !== pc) { pc.x += (cx - pc.x) * 0.1; pc.y += (cy - pc.y) * 0.1; }
      for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) {
        const a = arr[i], b = arr[j]; let dx = a.x - b.x, dy = a.y - b.y, dd = Math.hypot(dx, dy) || 1;
        const f = u * u * 18 / (dd * dd); dx /= dd; dy /= dd; a.vx += dx * f; a.vy += dy * f; b.vx -= dx * f; b.vy -= dy * f;
      }
      arr.forEach((n) => {
        if (n.parent) { const p = st.nodes.get(n.parent); if (p) { const dx = p.x - n.x, dy = p.y - n.y, dd = Math.hypot(dx, dy) || 1, L = u * (n.parent === "pc" ? 17 : 9.5), f = (dd - L) * 0.012; n.vx += dx / dd * f * dd * 0.05; n.vy += dy / dd * f * dd * 0.05; } }
        n.vx += (cx - n.x) * 0.0006; n.vy += (cy - n.y) * 0.0006;
        if (n !== st.drag && n.id !== "pc") { n.x += n.vx * 0.3; n.y += n.vy * 0.3; } n.vx *= 0.7; n.vy *= 0.7;
        n.x = clamp(n.x, n.r + 4, w - n.r - 4); n.y = clamp(n.y, n.r + 4, h - n.r - 4);
      });
      c.lineWidth = 1.2;
      arr.forEach((n) => { if (!n.parent) return; const p = st.nodes.get(n.parent); if (!p) return; c.strokeStyle = rgba(n.col, 0.45); c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(n.x, n.y); c.stroke(); });
      arr.forEach((n) => {
        glow(c, n.x, n.y, n.r * 2.4, n.col, 0.22);
        c.fillStyle = "#0a0d10"; c.strokeStyle = n.col; c.lineWidth = 1.8; c.beginPath(); c.arc(n.x, n.y, n.r, 0, TAU); c.fill(); c.stroke();
        if (n.id === "pc") drawEagle(c, n.x, n.y, n.r * 1.5, 1);
        else text(c, n.sub || "", n.x, n.y, Math.max(8, Math.min(n.r * 0.62, n.r * 2.2 / Math.max(3, (n.sub || "").length))), C.text, "center", MONO, 500);
        text(c, n.id === "pc" ? n.label : n.label, n.x, n.y + n.r + u * 1.4, Math.max(10, u * 1.45), rgba(C.text, 0.8), "center", SANS, 500);
      });
    }
  };

  /* =============================== WORLD =============================== */
  M.world = {
    init(st) { st.seq = -1; st.groups = []; },
    frame(P) {
      const { c, w, h, t, d, C, st, u, seq } = P;
      const W = window.WORLD, panelW = clamp(w * 0.27, 250, 430), mw = w - panelW, mh = h - u * 7;
      if (!W) { text(c, "…", w / 2, h / 2, u * 2, C.dim, "center", MONO); return; }
      if (st.seq !== seq) {
        st.seq = seq; const g = new Map(); let unk = 0;
        d.conns.forEach((x) => {
          if (x.scope !== "internet") return;
          const cc = x.cc && W.c[x.cc] ? x.cc : ""; if (!cc) { unk += x.count || 1; return; }
          let e = g.get(cc); if (!e) { e = { cc, n: 0, apps: new Map() }; g.set(cc, e); }
          e.n += x.count || 1; let a = e.apps.get(x.name); if (!a) { a = { n: 0, ip: x.raddr }; e.apps.set(x.name, a); } a.n += x.count || 1;
        });
        st.groups = [...g.values()].sort((a, b) => b.n - a.n); st.unk = unk;
      }
      const sc = Math.min(mw * 0.97 / 360, mh / 142), ox = (mw - 360 * sc) / 2, oy = u * 5 + (mh - 142 * sc) / 2;
      const px = (lon, lat) => [ox + (lon + 180) * sc, oy + (84 - lat) * sc];
      c.lineWidth = 1; c.strokeStyle = rgba(C.line2, 0.55);
      for (let lon = -150; lon <= 180; lon += 30) { const a = px(lon, 84), b = px(lon, -58); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }
      for (let lat = -30; lat <= 60; lat += 30) { const a = px(-180, lat), b = px(180, lat); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }
      c.fillStyle = rgba(C.text, 0.07); c.strokeStyle = rgba(C.acc, 0.32); c.lineWidth = 1;
      c.save(); c.beginPath(); c.rect(ox, 0, 360 * sc, h); c.clip();
      if (!st.rings) st.rings = W.land.filter((r) => !r.every((p) => p[1] < -58)).map((r) => { let off = 0; return r.map((p, i) => { if (i) { const dl = p[0] + off - (r[i - 1][0] + (off)); if (dl > 180) off -= 360; else if (dl < -180) off += 360; } return [p[0] + off, p[1]]; }); });
      for (const ring of st.rings) for (const sh of [-360, 0, 360]) { const xs = ring.map((p) => p[0] + sh); if (Math.max(...xs) < -180 || Math.min(...xs) > 180) continue; c.beginPath(); ring.forEach((p, i) => { const q = px(p[0] + sh, p[1]); i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); }); c.closePath(); c.fill(); c.stroke(); } c.restore();
      const hc = ((d.info && d.info.home) || "").toUpperCase(), home = W.c[hc] ? hc : "", hp = home ? px(W.c[home][1], W.c[home][0]) : px(0, -48);
      st.groups.forEach((g, i) => {
        const info = W.c[g.cc], q = px(info[1], info[0]), r = u * (0.7 + Math.min(2.2, Math.sqrt(g.n) * 0.5)), pulse = (t * 0.7 + i * 0.37) % 1;
        if (hp && g.cc !== home) {
          const mx = (hp[0] + q[0]) / 2, my = Math.min(hp[1], q[1]) - Math.hypot(q[0] - hp[0], q[1] - hp[1]) * 0.28;
          c.strokeStyle = rgba(C.acc, 0.38); c.lineWidth = 1.2; c.beginPath(); c.moveTo(hp[0], hp[1]); c.quadraticCurveTo(mx, my, q[0], q[1]); c.stroke();
          const k = (t * 0.4 + i * 0.21) % 1, bx = (1 - k) * (1 - k) * hp[0] + 2 * (1 - k) * k * mx + k * k * q[0], by = (1 - k) * (1 - k) * hp[1] + 2 * (1 - k) * k * my + k * k * q[1];
          glow(c, bx, by, u * 1.1, C.acc2, 0.95);
        }
        glow(c, q[0], q[1], r * 3.2, C.acc, 0.38);
        c.strokeStyle = rgba(C.acc2, 1 - pulse); c.lineWidth = 1.5; c.beginPath(); c.arc(q[0], q[1], r + pulse * u * 3.5, 0, TAU); c.stroke();
        c.fillStyle = C.acc; c.beginPath(); c.arc(q[0], q[1], r, 0, TAU); c.fill();
        if (i < 12) { const nm = window.countryName(g.cc); text(c, nm, q[0], q[1] - r - u * 1.2, Math.max(10, u * 1.3), rgba(C.text, 0.9), "center", SANS, 500); }
      });
      if (hp) { glow(c, hp[0], hp[1], u * 3, C.ok, 0.6); c.fillStyle = C.ok; c.beginPath(); c.arc(hp[0], hp[1], u * 0.7, 0, TAU); c.fill(); text(c, "PC", hp[0], hp[1] + u * 2, Math.max(10, u * 1.2), C.ok, "center", MONO, 600); }
      // πίνακας δεξιά
      const x0 = mw + u * 1.2; let y = u * 6.5;
      c.fillStyle = rgba("#0a0d10", 0.7); c.fillRect(mw, u * 4, panelW, h - u * 4);
      c.strokeStyle = rgba(C.line2, 1); c.beginPath(); c.moveTo(mw + .5, u * 4); c.lineTo(mw + .5, h); c.stroke();
      const tot = st.groups.reduce((a, g) => a + g.n, 0);
      text(c, tot + "  ·  " + st.groups.length, x0, y, u * 1.6, C.acc2, "left", MONO, 600); y += u * 2.6;
      for (const g of st.groups) {
        if (y > h - u * 11) { text(c, "…", x0, y, u * 1.4, C.dim, "left", MONO); break; }
        const nm = window.countryName(g.cc);
        text(c, nm + "  (" + g.n + ")", x0, y, u * 1.5, C.text, "left", SANS, 600); y += u * 1.9;
        [...g.apps.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 3).forEach(([n, a]) => { text(c, n.replace(/\.exe$/i, "") + "  " + a.ip, x0 + u, y, u * 1.2, C.dim, "left", MONO, 400); y += u * 1.6; });
        y += u * 0.5;
      }
      if (!st.groups.length) text(c, "—", x0, y, u * 1.5, C.dim, "left", MONO);
      text(c, "IP geolocation: DB-IP.com (CC BY 4.0)", w - u * 1.2, h - u * 7.5, Math.max(9, u * 1.0), rgba(C.dim, 0.7), "right", MONO, 400);
    }
  };

  window.Modes = Object.assign(M, { fmtRate: (n) => String(n), _helpers: { rgba, glow, text } });
})();
