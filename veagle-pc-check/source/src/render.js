/* VEAGLE PC Check - renderers */
var UI = (function (V) {
  'use strict';
  var $ = V.$, $$ = V.$$, esc = V.esc, arr = V.arr, num = V.num, g = V.g, D = V.D;
  var fmtGB = V.fmtGB, fmtNum = V.fmtNum, fmtDate = V.fmtDate, fmtDT = V.fmtDT;

  function win(id, name, status, body, cls) {
    var el = $('#' + id); if (!el) return;
    if (cls) el.classList.add(cls);
    el.innerHTML = '<header><span>' + esc(name) + '</span><span class="st">' + esc(status || '') + '</span></header><div class="body">' + body + '</div>';
  }
  function kv(pairs) {
    return '<dl class="kv">' + pairs.filter(function (p) { return p[1] !== '' && p[1] != null; }).map(function (p) { return '<dt>' + esc(p[0]) + '</dt><dd>' + (p[2] ? p[1] : esc(p[1])) + '</dd>'; }).join('') + '</dl>';
  }
  function tag(sev) { return '<span class="tag ' + sev + '">' + sev.toUpperCase() + '</span>'; }
  function table(cols, rows, emptyMsg) {
    if (!rows.length) return '<div class="tablewrap"><div class="empty">' + esc(emptyMsg || 'Nothing to show.') + '</div></div>';
    var h = '<div class="tablewrap"><table><thead><tr>' + cols.map(function (c) { return '<th class="' + (c.cls || '') + '">' + esc(c.h) + '</th>'; }).join('') + '</tr></thead><tbody>';
    rows.forEach(function (r) {
      h += '<tr>' + cols.map(function (c) {
        var v = c.f ? c.f(r) : r[c.k];
        var out = (v && v.html != null) ? v.html : esc(v == null ? '' : v);
        return '<td class="' + (c.cls || '') + '">' + out + '</td>';
      }).join('') + '</tr>';
    });
    return h + '</tbody></table></div>';
  }
  function sect(title, note) { return '<div class="sect"><h2>' + esc(title) + '</h2><span>' + esc(note || '') + '</span></div>'; }
  function wrapWin(name, status, inner) { return '<div class="win" style="margin-bottom:18px"><header><span>' + esc(name) + '</span><span class="st">' + esc(status || '') + '</span></header><div class="body">' + inner + '</div></div>'; }
  function mark(state, text) { return '<div><span class="mark ' + state + '">' + (state === 'ok' ? '&#10003;' : state === 'bad' ? '!' : '-') + '</span><span>' + text + '</span></div>'; }
  function cmdBox(cmd) { return '<div class="cmd"><code>' + esc(cmd) + '</code><button class="btn sm" type="button" data-copy="' + esc(cmd) + '">Copy</button></div>'; }
  function tf(v) { return v === true ? 'yes' : v === false ? 'no' : 'unknown'; }
  var GL = [
    ['BIOS', 'The first program that runs when the PC starts, before Windows.'], ['UEFI', 'The modern BIOS.'], ['SMART', 'A health report that every drive keeps about itself.'],
    ['SSD', 'A fast drive with no moving parts.'], ['HDD', 'An older spinning hard disk. Slower than an SSD.'], ['NVMe', 'A very fast type of SSD.'], ['TPM', 'A small security chip on the motherboard.'],
    ['BitLocker', 'Windows disk encryption.'], ['DISM', 'A Windows tool that repairs the system files.'], ['drivers', 'Small programs that let Windows talk to the hardware.'], ['driver', 'A small program that lets Windows talk to a part of the PC.'],
    ['firmware', 'The built-in software of a device.'], ['RAM', 'The short-term memory of the PC.'], ['XMP', 'A BIOS setting that makes memory run at its labelled speed.'], ['EXPO', 'The AMD version of XMP.'],
    ['Secure Boot', 'Stops harmful programs from starting before Windows.'], ['firewall', 'A guard that decides which network traffic may reach your PC.'], ['DNS', 'The phone book of the internet: turns names into addresses.'],
    ['proxy', 'A middleman server for your web traffic.'], ['WHEA', 'A message where the hardware reports its own error.'], ['restore point', 'A snapshot of Windows you can go back to.'], ['VPN', 'A private tunnel for your internet traffic.'],
    ['GPU', 'The graphics card.'], ['CPU', 'The processor, the brain of the PC.'], ['PowerShell', 'A text window where you type commands.'], ['port', 'A numbered network door of the PC.'], ['Remote Desktop', 'Lets someone control this PC over the network.'], ['UAC', 'The box that asks before programs change the system.']
  ];
  function gloss(escaped) {
    var used = {};
    return String(escaped).split(/(<[^>]*>)/).map(function (seg) {
      if (seg.charAt(0) === '<') return seg;
      GL.forEach(function (t) {
        if (used[t[0]]) return;
        var re = new RegExp('(^|[^A-Za-z0-9-])(' + t[0].replace(/ /g, '\\s') + ')(?![A-Za-z0-9-])');
        if (re.test(seg)) { used[t[0]] = 1; seg = seg.replace(re, '$1<abbr class="gl" title="' + t[1].replace(/"/g, '&quot;') + '">$2</abbr>'); }
      });
      return seg;
    }).join('');
  }
  function metaChips(f) {
    var m = V.META[f.id] || [10, 'Medium', 'Safe'];
    var rk = m[2] === 'Safe' ? 'ok' : (m[2] === 'Careful' ? 'bad' : 'warn');
    return '<div class="metachips"><span class="chip">About ' + m[0] + ' min</span><span class="chip">' + esc(m[1]) + '</span><span class="chip ' + rk + '">' + esc(m[2]) + '</span>' + (f.raised ? '<span class="chip">raised for your PC type</span>' : '') + '</div>';
  }
  function reduceMotion() { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }

  /* ---------------- dashboard ---------------- */
  function rHealth() {
    var s = V.score, c = V.counts;
    var on = Math.round(s.score / 5);
    var seg = ''; for (var i = 0; i < 20; i++) seg += '<i class="' + (i < on ? 'on' : '') + '"></i>';
    var weak = s.areas.slice().sort(function (a, b) { return a.score - b.score; });
    var summary;
    if (!V.findings.length) summary = 'No problems found in this scan.';
    else {
      summary = (c.high + c.medium + c.low) + ' findings: ' + c.high + ' high, ' + c.medium + ' medium, ' + c.low + ' low. ';
      if (weak[0].score < 100) summary += 'Weakest area: ' + weak[0].name + ' (' + weak[0].score + '). ';
      var hw = s.areas.filter(function (a) { return a.name === 'Stability' || a.name === 'Storage'; });
      if (hw.every(function (a) { return a.score >= 90; })) summary += 'No hardware-level trouble detected.';
    }
    win('wHealth', 'health.sys', (V.findings.length + V.good.length) + ' checks',
      '<div class="row" style="justify-content:space-between;align-items:baseline"><span class="lbl">Health score</span><span><span class="huge" id="scoreNum">' + s.score + '</span><span class="sub"> / 100</span></span></div>' +
      '<div class="seg" role="img" aria-label="Health bar, ' + on + ' of 20 segments filled">' + seg + '</div>' +
      '<div class="big">' + esc(s.label) + '</div><div class="sub">' + esc(summary) + '</div>' +
      '<div class="counts"><div class="h"><b>' + c.high + '</b><small>HIGH</small></div><div><b>' + c.medium + '</b><small>MEDIUM</small></div><div><b>' + c.low + '</b><small>LOW</small></div><div><b>' + V.good.length + '</b><small>ALL CLEAR</small></div></div>');
  }
  function rRadar() {
    var A = V.score.areas, cx = 190, cy = 140, R = 88, n = A.length;
    function pt(i, r) { var a = (-90 + i * 360 / n) * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
    var svg = '<svg viewBox="0 0 380 290" width="100%" role="img" aria-label="Score per area: ' + A.map(function (a) { return a.name + ' ' + a.score; }).join(', ') + '">';
    [0.25, 0.5, 0.75, 1].forEach(function (k) { svg += '<polygon points="' + A.map(function (_, i) { return pt(i, R * k).join(','); }).join(' ') + '" fill="none" stroke="#2a2a30" stroke-width="1"/>'; });
    A.forEach(function (_, i) { var p = pt(i, R); svg += '<line x1="' + cx + '" y1="' + cy + '" x2="' + p[0] + '" y2="' + p[1] + '" stroke="#2a2a30"/>'; });
    svg += '<polygon points="' + A.map(function (a, i) { return pt(i, R * Math.max(0.04, a.score / 100)).join(','); }).join(' ') + '" fill="rgba(232,44,45,.28)" stroke="#E82C2D" stroke-width="2"/>';
    A.forEach(function (a, i) {
      var p = pt(i, R * Math.max(0.04, a.score / 100)); svg += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="3.5" fill="#fff"/>';
      var l = pt(i, R + 22); var anchor = l[0] < cx - 8 ? 'end' : (l[0] > cx + 8 ? 'start' : 'middle');
      svg += '<text x="' + l[0] + '" y="' + (l[1] + 4) + '" text-anchor="' + anchor + '" font-size="11" fill="#d4d4d8">' + esc(a.name) + '</text>';
      svg += '<text x="' + l[0] + '" y="' + (l[1] + 17) + '" text-anchor="' + anchor + '" font-size="11" fill="' + (a.score < 80 ? '#ff6b6c' : '#a1a1aa') + '">' + a.score + '</text>';
    });
    svg += '</svg>';
    win('wRadar', 'areas.map', 'score per area', svg);
  }
  function rActions() {
    var top = V.findings.filter(function (f) { return f.sev !== 'info'; }).slice(0, 3);
    var h;
    if (!top.length) h = '<div class="sub">Nothing needs doing. Re-run the scan after big changes.</div>';
    else h = top.map(function (f, i) {
      return '<div class="action"><div class="num">' + (i + 1) + '</div><div style="min-width:0"><div class="row" style="gap:8px">' + tag(f.sev) + '<span class="area">' + esc(f.area) + '</span></div>' +
        '<div style="font-family:var(--head);font-weight:700;font-size:16px;margin:4px 0">' + esc(f.title) + '</div>' +
        metaChips(f) + '<button class="btn sm" type="button" data-open="' + esc(f.id) + '">Show me how, step by step</button></div></div>';
    }).join('');
    win('wActions', 'do_first.log', 'top ' + top.length, h);
  }
  function rStart() {
    var el = $('#startBox'); if (!el) return;
    var n = V.counts.high + V.counts.medium + V.counts.low;
    var msg = n ? 'Your PC has <b>' + n + ' thing' + (n > 1 ? 's' : '') + '</b> worth looking at. You do not need to fix them all. Start with the "Do this first" box: it has the 3 that matter most.' : 'Nothing needs fixing right now. You can close this page.';
    el.innerHTML = '<div class="startbox"><b>New to this?</b> ' + msg + ' Every problem is explained in plain words, with exact clicks. <button class="btn sm" type="button" data-tab-go="tools">Beginner guide</button></div>';
  }
  function rCpu() {
    var c = g(D, 'system.cpu', null);
    if (!c) return win('wCpu', 'cpu.sys', '', '<div class="sub">No data.</div>');
    var per = c.cores > 0 ? Math.max(1, Math.round(c.threads / c.cores)) : 1;
    var cores = ''; for (var i = 0; i < c.cores; i++) { cores += '<span class="core">'; for (var j = 0; j < per; j++) cores += '<i class="' + (j ? '' : 'a') + '"></i>'; cores += '</span>'; }
    win('wCpu', 'cpu.sys', c.cores + ' cores / ' + c.threads + ' threads',
      '<div class="big" style="font-size:20px">' + esc(c.name) + '</div>' +
      '<div class="cores" role="img" aria-label="' + c.cores + ' cores, ' + c.threads + ' threads">' + cores + '</div>' +
      kv([['Base clock', (c.baseMHz / 1000).toFixed(2) + ' GHz'], ['Cache', 'L2 ' + fmtNum(c.l2KB / 1024, 1) + ' MB, L3 ' + fmtNum(c.l3KB / 1024, 0) + ' MB'], ['Socket', c.socket], ['Virtualization', c.virtualizationEnabled ? 'enabled in BIOS' : (g(D, 'security.hypervisorPresent', false) ? 'in use by Windows (Hyper-V)' : 'off or not reported')]]));
  }
  function rMem() {
    var r = g(D, 'system.ram', null);
    if (!r) return win('wMem', 'memory.sys', '', '<div class="sub">No data.</div>');
    var used = Math.max(0, r.totalGB - r.freeGB), pct = r.totalGB ? Math.round(used / r.totalGB * 100) : 0;
    var mods = arr(r.modules);
    var blocks = mods.length ? '<div class="blocks">' + mods.map(function (m) { return '<div style="flex:' + Math.max(1, num(m.gb)) + ' 1 0"><b>' + fmtNum(m.gb, 0) + ' GB</b>' + esc((m.type || '') + ' ' + (m.configuredMHz || m.speedMHz || '')) + (m.manufacturer ? '<br>' + esc(m.manufacturer) : '') + '</div>'; }).join('') + '</div>' : '';
    win('wMem', 'memory.sys', mods.length + (r.slots ? ' of ' + r.slots : '') + ' slots used',
      '<div class="row" style="justify-content:space-between;align-items:baseline"><span class="big">' + fmtGB(r.totalGB) + '</span><span class="sub">' + fmtGB(used) + ' used (' + pct + '%)</span></div>' +
      '<div class="bar ' + (pct > 90 ? 'warn' : '') + '" role="img" aria-label="' + pct + ' percent used"><i style="width:' + pct + '%"></i></div>' + blocks +
      kv([['Speed', mods.length ? (mods[0].configuredMHz || mods[0].speedMHz) + ' MT/s' + (mods[0].speedMHz && mods[0].configuredMHz && mods[0].speedMHz !== mods[0].configuredMHz ? ' (rated ' + mods[0].speedMHz + ')' : '') : ''], ['Max supported', r.maxGB ? r.maxGB + ' GB' : '']]));
  }
  function rGpu() {
    var gs = arr(D.gpus);
    if (!gs.length) return win('wGpu', 'graphics.sys', '', '<div class="sub">No graphics adapter reported.</div>');
    win('wGpu', 'graphics.sys', gs.length + ' adapter' + (gs.length > 1 ? 's' : ''), gs.map(function (x) {
      return '<div class="big" style="font-size:20px">' + esc(x.name) + '</div>' + kv([['Memory', x.vramGB ? fmtGB(x.vramGB) : ''], ['Driver', (x.driverFriendly || x.driverVersion) + (x.driverDate ? ' (' + fmtDate(x.driverDate) + ')' : '')], ['Output', x.width ? x.width + ' x ' + x.height + ' @ ' + x.refreshHz + ' Hz' : '']]);
    }).join('<hr class="hr">'));
  }
  function rBoard() {
    var s = D.system || {};
    win('wBoard', 'board.sys', s.chassis || '', kv([
      ['Motherboard', ((g(s, 'board.manufacturer', '') + ' ' + g(s, 'board.product', '')).trim())],
      ['System', ((s.manufacturer || '') + ' ' + (s.model || '')).trim()],
      ['BIOS', ((g(s, 'bios.vendor', '') + ' ' + g(s, 'bios.version', '')).trim())],
      ['BIOS date', fmtDate(g(s, 'bios.date', null))],
      ['Chassis', s.chassis]]));
  }
  function rOs() {
    var o = g(D, 'system.os', {}) || {};
    win('wOs', 'os.sys', o.arch || '', '<div class="big" style="font-size:20px">' + esc(o.productName || o.caption || 'Windows') + '</div>' + kv([
      ['Version', ((o.displayVersion ? o.displayVersion + ', ' : '') + 'build ' + (o.build || '?') + (o.ubr ? '.' + o.ubr : ''))],
      ['Installed', fmtDate(o.installDate)], ['Last full boot', fmtDT(o.lastBoot)], ['Uptime', V.fmtUptime(o.uptimeHours)],
      ['Language', o.language], ['Time zone', o.timeZone]]));
  }
  function rNet() {
    var ad = arr(g(D, 'network.adapters', []));
    var up = ad.filter(function (a) { return /^up$/i.test(a.status) || a.status === '2'; });
    var real = up.filter(function (a) { return !a.virtual && !/vethernet|virtual|vmware|tap-|wintun|nordlynx/i.test(a.description + a.name); });
    var show = (real.length ? real : up).slice(0, 3);
    win('wNet', 'network.sys', up.length + ' of ' + ad.length + ' adapters up',
      (show.length ? show.map(function (a) { return '<div><div style="font-family:var(--head);font-weight:700;font-size:16px">' + esc(a.name) + '</div><div class="sub">' + esc(a.description) + ' - ' + esc(a.linkSpeed) + '</div></div>'; }).join('') : '<div class="sub">No active adapter.</div>') +
      kv([['Virtual adapters', String(ad.filter(function (a) { return a.virtual || /vethernet|vmware|tap-|wintun|nordlynx|openvpn/i.test(a.description); }).length)], ['DNS servers', String(arr(g(D, 'network.dns', [])).length)]]));
  }
  function barRow(label, sub, free, size, bl) {
    var pct = size ? Math.round((size - free) / size * 100) : 0, low = size && (free / size < 0.1 || free < 15);
    return '<div><div class="row" style="justify-content:space-between"><span><b style="font-family:var(--head)">' + esc(label) + '</b> <span class="sub">' + esc(sub) + '</span></span><span class="sub">' + fmtGB(free) + ' free of ' + fmtGB(size) + (bl ? ' &middot; BitLocker' : '') + '</span></div><div class="bar ' + (low ? 'warn' : '') + '" role="img" aria-label="' + pct + ' percent used"><i style="width:' + pct + '%"></i></div></div>';
  }
  function markFor(st) { return st === 'pass' ? '<span class="mark ok">&#10003;</span>' : st === 'fail' ? '<span class="mark bad">!</span>' : st === 'warn' ? '<span class="mark warn">!</span>' : '<span class="mark na">?</span>'; }
  function readyRows(rows) { return rows.map(function (r) { return markFor(r.status) + '<span><b>' + esc(r.label) + '</b><br><span class="sub">' + esc(r.detail) + '</span></span>'; }).join(''); }
  function rExtras() {
    var shown = [];
    var b = V.battery, elB = $('#wBattery'), elR = $('#wReady'), r = V.readiness;
    elB.innerHTML = ''; elR.innerHTML = '';
    if (b) {
      var health = b.wearPercent == null ? null : Math.max(0, 100 - num(b.wearPercent));
      win('wBattery', 'battery.sys', b.chemistry || '', (health == null ? '<div class="sub">Capacity could not be read.</div>' :
        '<div class="row" style="justify-content:space-between;align-items:baseline"><span class="big">' + health + '%</span><span class="sub">of original capacity</span></div><div class="bar ' + (health < 60 ? 'warn' : '') + '" role="img" aria-label="Battery health ' + health + ' percent"><i style="width:' + health + '%"></i></div>') +
        kv([['Design capacity', fmtNum(num(b.designMWh) / 1000, 1) + ' Wh'], ['Now holds', fmtNum(num(b.fullChargeMWh) / 1000, 1) + ' Wh'], ['Charge cycles', b.cycleCount == null ? 'not reported' : String(b.cycleCount)]]));
      shown.push(elB);
    }
    if (r.rows.length && !r.alreadyWin11) { rReadyInto(elR, r, shown.length === 0); shown.push(elR); }
    ['s4', 's6', 's8', 's12'].forEach(function (c) { elB.classList.remove(c); elR.classList.remove(c); });
    if (b) elB.classList.add('s4');
    if (r.rows.length && !r.alreadyWin11) { elR.classList.add(b ? 's8' : 's12'); elR.querySelector('.rd').classList.add('cols'); }
  }
  function rReadyInto(el, r, wide) {
    var level = r.level;
    el.className = 'win' + (level === 'fail' ? ' alert' : '');
    el.innerHTML = '<header><span>windows11.check</span><span class="st">this PC runs Windows 10</span></header><div class="body"><div class="verdict ' + level + '">' + esc(r.verdict) + '</div><div class="rd">' + readyRows(r.rows) + '</div><div class="sub">The processor check is based on the name. Microsoft\'s own PC Health Check has the final word.</div></div>';
  }
  function rStorage() {
    var ds = arr(D.disks), vs = arr(D.volumes);
    var h = vs.map(function (v) { return barRow(v.letter, ((v.label || '') + ' ' + (v.fs || '')).trim(), num(v.freeGB), num(v.sizeGB), v.bitlocker && /on|1/i.test(String(v.bitlocker.protection))); }).join('');
    h += table([{ h: 'Drive', f: function (d) { return d.name; } }, { h: 'Type', f: function (d) { return (d.mediaType || '') + ' ' + (d.busType || ''); } }, { h: 'Size', cls: 'num', f: function (d) { return fmtGB(d.sizeGB); } },
      { h: 'Health', f: function (d) { return { html: /healthy/i.test(d.health) ? '<span class="mark ok">&#10003;</span> ' + esc(d.health) : '<span class="mark bad">!</span> ' + esc(d.health) }; } },
      { h: 'Temp / hours', cls: 'num', f: function (d) { var r = d.reliability || {}; return (r.temperatureC ? r.temperatureC + ' C' : '-') + (r.powerOnHours ? ' / ' + fmtNum(r.powerOnHours) + ' h' : ''); } }], ds.filter(function (d) { return num(d.sizeGB) > 0; }));
    win('wStorage', 'storage.sys', ds.length + ' drive' + (ds.length === 1 ? '' : 's') + ', ' + vs.length + ' volume' + (vs.length === 1 ? '' : 's'), h);
  }
  function rSecurity() {
    var s = D.security || {}, h = '';
    h += s.secureBoot === true ? mark('ok', 'Secure Boot on') : s.secureBoot === false ? mark('bad', 'Secure Boot off') : mark('na', 'Secure Boot unknown');
    h += s.tpm ? (s.tpm.ready ? mark('ok', 'TPM ' + esc(s.tpm.specVersion || 'ready')) : mark('bad', 'TPM not ready')) : mark('na', 'No TPM data');
    var av = arr(s.antivirus).filter(function (a) { return a.enabled; });
    h += av.length ? mark('ok', 'Antivirus: ' + esc(av.map(function (a) { return a.name; }).join(', '))) : mark('bad', 'No active antivirus');
    var fw = s.firewall || {}; h += (fw.domain !== false && fw.private !== false && fw.public !== false) ? mark('ok', 'Firewall on') : mark('bad', 'Firewall off on a profile');
    var bl = arr(D.volumes).filter(function (v) { return v.bitlocker && /on|1/i.test(String(v.bitlocker.protection)); });
    h += bl.length ? mark('ok', 'BitLocker: ' + esc(bl.map(function (v) { return v.letter; }).join(', '))) : mark('na', 'BitLocker not active');
    h += s.uac === false ? mark('bad', 'UAC off') : mark('ok', 'UAC on');
    var pd = g(D, 'updates.lastPatchDaysAgo', null);
    h += pd == null ? mark('na', 'Last update unknown') : pd > 60 ? mark('bad', 'Last update ' + pd + ' days ago') : mark('ok', 'Last update ' + pd + ' days ago');
    h += s.pendingReboot ? mark('bad', 'Restart pending') : mark('ok', 'No restart pending');
    var dm = g(D, 'dism.state', 'skipped');
    h += dm === 'healthy' ? mark('ok', 'Windows image healthy') : (dm === 'repairable' || dm === 'corrupt') ? mark('bad', 'Windows image needs repair') : mark('na', 'Image check ' + esc(dm));
    win('wSecurity', 'security.sys', '', '<div class="list">' + h + '</div>');
  }
  function rBoot() {
    var hist = arr(g(D, 'boot.history', [])).slice(0, 12).reverse();
    var body;
    if (!hist.length) body = '<div class="sub">No boot history in the event log.</div>';
    else {
      var vals = hist.map(function (x) { return num(x.seconds); }), mx = Math.max.apply(null, vals), mn = Math.min.apply(null, vals), avg = vals.reduce(function (a, b) { return a + b; }, 0) / vals.length;
      var W = 300, H = 90, pad = 6, span = Math.max(1, mx - mn);
      var pts = vals.map(function (v, i) { return [pad + i * (W - 2 * pad) / Math.max(1, vals.length - 1), H - pad - (v - mn) / span * (H - 2 * pad - 6)]; });
      body = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="Boot times in seconds, latest ' + vals[vals.length - 1] + '"><polyline points="' + pts.map(function (p) { return p.join(','); }).join(' ') + '" fill="none" stroke="#E82C2D" stroke-width="2"/>' +
        pts.map(function (p, i) { return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + (i === pts.length - 1 ? 4 : 2.5) + '" fill="' + (i === pts.length - 1 ? '#fff' : '#E82C2D') + '"/>'; }).join('') + '</svg>' +
        kv([['Last boot', vals[vals.length - 1] + ' s'], ['Average', avg.toFixed(0) + ' s'], ['Best / worst', mn.toFixed(0) + ' / ' + mx.toFixed(0) + ' s']]);
    }
    body += kv([['Uptime', V.fmtUptime(g(D, 'system.os.uptimeHours', null))]]);
    win('wBoot', 'boot.log', hist.length + ' boots', body);
  }
  function combinedDays() {
    var a = arr(g(D, 'events.system.perDay', [])), b = arr(g(D, 'events.application.perDay', []));
    var map = {};
    a.concat(b).forEach(function (x) { var m = map[x.date] || (map[x.date] = { date: x.date, errors: 0, warnings: 0 }); m.errors += num(x.errors); m.warnings += num(x.warnings); });
    return Object.keys(map).sort().map(function (k) { return map[k]; });
  }
  function rHeat() {
    var days = combinedDays();
    if (!days.length) return win('wHeat', 'events.map', '', '<div class="sub">No event data.</div>');
    var worst = days.slice().sort(function (a, b) { return b.errors - a.errors; })[0];
    var cells = days.map(function (d) {
      var l = d.errors === 0 ? '' : d.errors <= 5 ? 'l1' : d.errors <= 25 ? 'l2' : 'l3';
      return '<i class="' + l + '" title="' + esc(d.date) + ': ' + d.errors + ' errors, ' + d.warnings + ' warnings"></i>';
    }).join('');
    var tot = num(g(D, 'events.system.errors', 0)) + num(g(D, 'events.application.errors', 0));
    win('wHeat', 'events.map', 'last ' + days.length + ' days',
      '<div class="row" style="justify-content:space-between;align-items:baseline"><span class="big">' + fmtNum(tot) + ' <span class="sub" style="font-size:14px">errors</span></span><span class="sub">worst day ' + esc(worst.date) + ' (' + worst.errors + ')</span></div>' +
      '<div class="heat" role="img" aria-label="Errors per day for the last ' + days.length + ' days">' + cells + '</div>' +
      '<div class="row" style="justify-content:space-between"><span class="legend"><span>' + esc(days[0].date) + '</span></span><span class="legend"><i></i>0 <i class="l1" style="background:#4a1b1c"></i>1-5 <i style="background:#8f2425"></i>6-25 <i style="background:#E82C2D"></i>25+</span><span class="legend">' + esc(days[days.length - 1].date) + '</span></div>' +
      '<div class="sub">Many errors in the Windows logs are harmless noise. The Findings tab separates the ones that matter.</div>');
  }
  function rUplink() {
    win('wUplink', 'uplink', 'optional', '<div class="row" style="justify-content:space-between;gap:24px"><div style="flex:1 1 380px"><div class="big" style="font-size:22px">Need more than this report?</div><div class="sub" style="margin-top:6px">Hand the scan to an AI assistant. Your name, PC name and network addresses are removed first, and you see exactly what is copied before anything leaves this page.</div></div>' +
      '<div class="btns" style="flex:0 1 460px"><button class="btn primary" type="button" id="dashClaude" style="flex:1 1 220px">Copy and open Claude</button><button class="btn" type="button" data-tab-go="ai" style="flex:1 1 160px">Review the package</button></div></div>', 'alert');
  }

  /* ---------------- findings ---------------- */
  var state = { sev: 'all', q: '' };
  function rFindings() {
    var c = V.counts;
    $('#findSummary').textContent = (c.high + c.medium + c.low) + ' findings, ' + c.info + (c.info === 1 ? ' tip' : ' tips');
    var f = [['all', 'All ' + V.findings.length], ['high', 'High ' + c.high], ['medium', 'Medium ' + c.medium], ['low', 'Low ' + c.low], ['info', 'Tips ' + c.info]];
    $('#filters').innerHTML = f.map(function (x) { return '<button type="button" data-sev="' + x[0] + '" aria-pressed="' + (state.sev === x[0]) + '">' + x[1] + '</button>'; }).join('');
    drawFindings();
    $('#goodList').innerHTML = V.good.length ? V.good.map(function (x) { return mark('ok', esc(x.label) + (x.detail ? ' <span class="sub">- ' + esc(x.detail) + '</span>' : '')); }).join('') : '<div class="sub">No checks passed or nothing was collected.</div>';
  }
  function drawFindings(openId) {
    var q = state.q.toLowerCase();
    var list = V.findings.filter(function (f) { return (state.sev === 'all' || f.sev === state.sev) && (!q || (f.title + ' ' + f.why + ' ' + f.area + ' ' + f.evidence).toLowerCase().indexOf(q) >= 0); });
    $('#findList').innerHTML = list.length ? list.map(function (f, i) {
      var steps = f.steps.length ? '<ol class="steps">' + f.steps.map(function (s) { return '<li><span>' + gloss(esc(s.t)) + '</span>' + (s.cmd ? cmdBox(s.cmd) : '') + '</li>'; }).join('') + '</ol>' : '';
      return '<div class="finding' + (f.id === openId ? ' open' : '') + '" data-id="' + esc(f.id) + '"><button class="fh" type="button" aria-expanded="' + (f.id === openId) + '"><span class="fid">#' + String(V.findings.indexOf(f) + 1).padStart(2, '0') + '</span>' + tag(f.sev) + '<span class="t">' + esc(f.title) + '</span><span class="area">' + esc(f.area) + '</span></button>' +
        '<div class="fb">' + metaChips(f) + '<div class="lbl">In plain words</div><p class="why">' + gloss(esc(f.why)) + '</p>' + (f.evidence ? '<div class="ev"><span class="lbl">What we found</span><br>' + esc(f.evidence).replace(/\n/g, '<br>') + '</div>' : '') + steps +
        '<div class="btns" style="margin-top:14px"><button class="btn sm" type="button" data-ask="' + esc(f.id) + '">Ask an AI about this</button></div></div></div>';
    }).join('') : '<div class="win"><div class="body sub">No findings match.</div></div>';
    if (openId) { var el = $('.finding[data-id="' + openId + '"]'); if (el) el.scrollIntoView({ block: 'center' }); }
  }

  /* ---------------- hardware ---------------- */
  function rHardware() {
    var s = D.system || {}, c = s.cpu || {}, o = s.os || {}, h = '';
    h += sect('System', 'what this PC is');
    h += '<div class="grid"><div class="win s6"><header><span>machine</span></header><div class="body">' + kv([['Manufacturer', s.manufacturer], ['Model', s.model], ['Chassis', s.chassis], ['Motherboard', g(s, 'board.manufacturer', '') + ' ' + g(s, 'board.product', '')], ['BIOS', g(s, 'bios.vendor', '') + ' ' + g(s, 'bios.version', '')], ['BIOS date', fmtDate(g(s, 'bios.date', null))], ['SMBIOS', g(s, 'bios.smbios', '')]]) + '</div></div>' +
      '<div class="win s6"><header><span>operating system</span></header><div class="body">' + kv([['Windows', o.caption], ['Product name', o.productName], ['Edition', o.edition], ['Version', o.displayVersion], ['Build', (o.build || '') + (o.ubr ? '.' + o.ubr : '')], ['Architecture', o.arch], ['Installed', fmtDate(o.installDate)], ['Language', o.language], ['Time zone', o.timeZone]]) + '</div></div></div>';
    h += sect('Processor');
    h += wrapWin('cpu', '', kv([['Name', c.name], ['Manufacturer', c.manufacturer], ['Sockets', c.sockets], ['Cores / threads', c.cores + ' / ' + c.threads], ['Base clock', c.baseMHz ? (c.baseMHz / 1000).toFixed(2) + ' GHz' : ''], ['L2 / L3 cache', fmtNum(num(c.l2KB) / 1024, 1) + ' MB / ' + fmtNum(num(c.l3KB) / 1024, 0) + ' MB'], ['Socket type', c.socket], ['Virtualization (BIOS)', c.virtualizationEnabled ? 'enabled' : 'off or hidden by Hyper-V']]));
    h += sect('Memory', fmtGB(g(s, 'ram.totalGB', 0)) + ' total, ' + g(s, 'ram.slots', '?') + ' slots');
    h += table([{ h: 'Slot', k: 'slot' }, { h: 'Size', cls: 'num', f: function (m) { return fmtGB(m.gb); } }, { h: 'Type', k: 'type' }, { h: 'Rated MT/s', cls: 'num', k: 'speedMHz' }, { h: 'Running MT/s', cls: 'num', k: 'configuredMHz' }, { h: 'Maker', k: 'manufacturer' }, { h: 'Part', k: 'partNumber' }], arr(g(s, 'ram.modules', [])));
    h += sect('Graphics');
    h += table([{ h: 'Adapter', k: 'name' }, { h: 'Memory', cls: 'num', f: function (x) { return x.vramGB ? fmtGB(x.vramGB) : '-'; } }, { h: 'Driver', f: function (x) { return (x.driverFriendly || '') + ' (' + x.driverVersion + ')'; } }, { h: 'Driver date', f: function (x) { return fmtDate(x.driverDate); } }, { h: 'Output', f: function (x) { return x.width ? x.width + 'x' + x.height + ' @ ' + x.refreshHz + ' Hz' : '-'; } }], arr(D.gpus));
    h += sect('Storage');
    h += table([{ h: 'Drive', k: 'name' }, { h: 'Type', f: function (d) { return d.mediaType + ' / ' + d.busType; } }, { h: 'Size', cls: 'num', f: function (d) { return fmtGB(d.sizeGB); } }, { h: 'Health', f: function (d) { return d.health + ' / ' + d.status; } }, { h: 'Firmware', k: 'firmware' },
      { h: 'Temp', cls: 'num', f: function (d) { return g(d, 'reliability.temperatureC', '-'); } }, { h: 'Wear %', cls: 'num', f: function (d) { return g(d, 'reliability.wearPercent', '-'); } }, { h: 'Power-on h', cls: 'num', f: function (d) { return g(d, 'reliability.powerOnHours', '-'); } }, { h: 'Errors R/W', cls: 'num', f: function (d) { return g(d, 'reliability.readErrors', '-') + ' / ' + g(d, 'reliability.writeErrors', '-'); } }], arr(D.disks));
    h += '<div style="height:14px"></div>' + table([{ h: 'Volume', k: 'letter' }, { h: 'Label', k: 'label' }, { h: 'File system', k: 'fs' }, { h: 'Size', cls: 'num', f: function (v) { return fmtGB(v.sizeGB); } }, { h: 'Free', cls: 'num', f: function (v) { return fmtGB(v.freeGB); } }, { h: 'Health', k: 'health' }, { h: 'BitLocker', f: function (v) { return v.bitlocker ? v.bitlocker.protection + ' (' + v.bitlocker.percent + '%)' : '-'; } }], arr(D.volumes));
    var rd = V.readiness;
    if (rd.rows.length) {
      h += sect('Windows 11 readiness', rd.alreadyWin11 ? 'this PC already runs Windows 11 (build ' + rd.build + ')' : rd.verdict);
      h += wrapWin('windows11.check', '', '<div class="rd cols">' + readyRows(rd.rows) + '</div>');
    }
    if (V.battery) {
      var bt = V.battery;
      h += sect('Battery');
      h += wrapWin('battery', '', kv([['Chemistry', bt.chemistry], ['Design capacity', fmtNum(num(bt.designMWh) / 1000, 1) + ' Wh'], ['Full-charge capacity', fmtNum(num(bt.fullChargeMWh) / 1000, 1) + ' Wh'], ['Wear', bt.wearPercent == null ? '' : bt.wearPercent + '%'], ['Charge cycles', bt.cycleCount == null ? 'not reported' : String(bt.cycleCount)]]));
    }
    h += sect('Network adapters');
    h += table([{ h: 'Name', k: 'name' }, { h: 'Description', k: 'description' }, { h: 'Status', k: 'status' }, { h: 'Speed', k: 'linkSpeed' }], arr(g(D, 'network.adapters', [])));
    h += sect('Security and settings');
    var sec = D.security || {}, st = D.settings || {};
    h += '<div class="grid"><div class="win s6"><header><span>security</span></header><div class="body">' + kv([['Secure Boot', tf(sec.secureBoot)], ['TPM', sec.tpm ? 'present ' + sec.tpm.present + ', ready ' + sec.tpm.ready + ' ' + (sec.tpm.specVersion || '') : 'unknown'], ['Antivirus', arr(sec.antivirus).map(function (a) { return a.name + (a.enabled ? ' (on)' : ' (off)'); }).join(', ')], ['Defender real-time', sec.defender ? tf(sec.defender.realTime) : 'unknown'], ['Firewall', 'domain ' + g(sec, 'firewall.domain', '?') + ', private ' + g(sec, 'firewall.private', '?') + ', public ' + g(sec, 'firewall.public', '?')], ['UAC', tf(sec.uac)], ['Memory integrity', tf(sec.memoryIntegrity)], ['VBS status', sec.vbsStatus == null ? 'unknown' : (sec.vbsStatus === 2 ? 'running' : String(sec.vbsStatus))], ['Hypervisor present', tf(sec.hypervisorPresent)], ['Remote Desktop', tf(sec.rdpEnabled)], ['Local admins', sec.localAdmins == null ? 'unknown' : String(sec.localAdmins)], ['Optional features', arr(sec.optionalFeatures).join(', ')]]) + '</div></div>' +
      '<div class="win s6"><header><span>settings</span></header><div class="body">' + kv([['Power plan', st.powerPlan], ['Fast Startup', tf(st.fastStartup)], ['Hibernation', tf(st.hibernation)], ['Page file', (st.pagefileAuto ? 'system managed ' : '') + arr(st.pagefiles).map(function (p) { return p.name + ' ' + p.allocatedMB + ' MB (' + p.usedMB + ' used)'; }).join(', ')], ['TRIM', tf(st.trim)], ['GPU scheduling', tf(st.gpuScheduling)], ['Game Mode', tf(st.gameMode)], ['Storage Sense', tf(st.storageSense)], ['Temp files', g(st, 'tempMB.user', '?') + ' MB user, ' + g(st, 'tempMB.windows', '?') + ' MB Windows'], ['Battery', tf(st.hasBattery)], ['Crash dumps', g(D, 'crashDumps.dumps', 0) + ' (+' + g(D, 'crashDumps.liveKernelReports', 0) + ' live kernel reports)']]) + '</div></div></div>';
    h += sect('Drivers and devices');
    var pdv = [], pidx = {};
    arr(g(D, 'drivers.problemDevices', [])).forEach(function (x) { var k = x['class'] + '|' + x.name + '|' + x.status + '|' + x.problem; if (pidx[k] == null) { pidx[k] = pdv.length; pdv.push({ cls: x['class'], name: x.name, status: x.status, problem: x.problem, n: 0 }); } pdv[pidx[k]].n++; });
    h += table([{ h: 'Class', k: 'cls' }, { h: 'Device', k: 'name' }, { h: 'Count', cls: 'num', k: 'n' }, { h: 'Status', k: 'status' }, { h: 'Problem', k: 'problem' }], pdv, 'No devices report a problem.');
    h += '<div style="height:14px"></div>' + table([{ h: 'Older non-Microsoft drivers', k: 'device' }, { h: 'Provider', k: 'provider' }, { h: 'Version', k: 'version' }, { h: 'Date', f: function (d) { return fmtDate(d.date); } }], arr(g(D, 'drivers.oldDrivers', [])), 'No old drivers found.');
    $('#tab-hardware').innerHTML = h;
  }

  /* ---------------- software ---------------- */
  var appQ = '';
  function appRows() {
    var q = appQ.toLowerCase();
    var list = arr(g(D, 'apps.list', [])).filter(function (a) { return !q || (a.name + ' ' + a.publisher).toLowerCase().indexOf(q) >= 0; });
    return { total: list.length, rows: list.slice(0, 300) };
  }
  function rSoftware() {
    var h = '', out = arr(g(D, 'apps.outdated', []));
    h += sect('Apps with updates', g(D, 'apps.wingetSkipped', false) ? 'skipped in the quick scan' : (g(D, 'apps.wingetAvailable', false) ? out.length + ' found by winget' : 'winget is not available on this PC'));
    h += table([{ h: 'App', k: 'name' }, { h: 'Installed', k: 'version' }, { h: 'Available', k: 'available' }, { h: 'Source', k: 'source' }, { h: 'Update', f: function (o) { var cmd = 'winget upgrade --id ' + o.id + (o.source === 'msstore' ? ' --source msstore' : ''); return { html: '<button class="btn sm" type="button" data-copy="' + esc(cmd) + '">Copy command</button>' }; } }], out, 'Everything winget knows about is up to date.');
    var si = arr(g(D, 'startup.items', []));
    h += sect('Starts with Windows', si.length + ' entries');
    h += table([{ h: 'Name', k: 'name' }, { h: 'Command', k: 'command' }, { h: 'Location', k: 'location' }], si, 'No startup entries found.');
    var sv = arr(g(D, 'startup.thirdPartyServices', []));
    h += sect('Third-party services that start automatically', sv.length + ' services');
    h += table([{ h: 'Service', k: 'name' }, { h: 'Display name', k: 'display' }, { h: 'State', k: 'state' }], sv, 'None.');
    var pr = arr(g(D, 'startup.topRam', []));
    var mx = Math.max.apply(null, pr.map(function (p) { return num(p.ramMB); }).concat([1]));
    h += sect('Biggest memory users right now');
    h += wrapWin('processes', '', pr.length ? '<div class="list">' + pr.map(function (p) { return '<div style="display:block;width:100%"><div class="row" style="justify-content:space-between"><span>' + esc(p.name) + (p.instances > 1 ? ' <span class="sub">x' + p.instances + '</span>' : '') + '</span><span class="sub">' + fmtNum(p.ramMB) + ' MB</span></div><div class="bar thin"><i style="width:' + Math.round(num(p.ramMB) / mx * 100) + '%"></i></div></div>'; }).join('') + '</div>' : '<div class="sub">No data.</div>');
    var ts = arr(g(D, 'startup.scheduledTasks', []));
    if (ts.length) h += sect('Non-Microsoft scheduled tasks', ts.length + (ts.length >= 80 ? '+' : '')) + wrapWin('tasks', '', '<div class="sub">' + esc(ts.map(function (t) { return t.name; }).join(' / ')) + '</div>');
    h += sect('Installed applications', V.fmtNum(g(D, 'apps.count', 0)) + ' programs, ' + g(D, 'apps.storeCount', 0) + ' Store apps');
    h += '<div class="toolbar"><label class="sr" for="appQ">Filter installed apps</label><input type="text" id="appQ" placeholder="/ filter apps" autocomplete="off" value="' + esc(appQ) + '"></div><div id="appTable"></div>';
    $('#tab-software').innerHTML = h;
    drawApps();
  }
  function drawApps() {
    var r = appRows();
    $('#appTable').innerHTML = table([{ h: 'Name', k: 'name' }, { h: 'Version', k: 'version' }, { h: 'Publisher', k: 'publisher' }, { h: 'Size', cls: 'num', f: function (a) { return a.sizeMB ? fmtNum(a.sizeMB) + ' MB' : '-'; } }], r.rows, 'No app matches.') + (r.total > r.rows.length ? '<div class="sub" style="padding:10px 2px">Showing the first 300 of ' + r.total + '. Type to filter.</div>' : '');
  }

  /* ---------------- events ---------------- */
  function evTable(list) {
    return table([{ h: 'Count', cls: 'num', k: 'count' }, { h: 'Level', k: 'level' }, { h: 'Source', k: 'provider' }, { h: 'ID', cls: 'num', k: 'id' }, { h: 'Last seen', f: function (x) { return fmtDT(x.lastSeen); } }, { h: 'Example message', k: 'sample' }], list, 'No events.');
  }
  function rEvents() {
    var e = D.events || {}, h = '';
    h += sect('Event Viewer, last ' + (e.days || 30) + ' days', 'errors and warnings only');
    h += '<div class="grid"><div class="win s6"><header><span>System log</span></header><div class="body">' + kv([['Total', fmtNum(g(e, 'system.total', 0))], ['Errors / critical', fmtNum(g(e, 'system.errors', 0))], ['Warnings', fmtNum(g(e, 'system.warnings', 0))]]) + '</div></div>' +
      '<div class="win s6"><header><span>Application log</span></header><div class="body">' + kv([['Total', fmtNum(g(e, 'application.total', 0))], ['Errors / critical', fmtNum(g(e, 'application.errors', 0))], ['Warnings', fmtNum(g(e, 'application.warnings', 0))]]) + '</div></div></div>';
    h += sect('Programs that crashed', arr(e.appCrashes).length + ' programs, ' + (e.appHangs || 0) + ' hangs');
    h += table([{ h: 'Program', k: 'app' }, { h: 'Crashes', cls: 'num', k: 'count' }], arr(e.appCrashes), 'No application crashes were logged.');
    h += sect('System log, most frequent', 'top ' + arr(g(e, 'system.groups', [])).length + ' groups') + evTable(arr(g(e, 'system.groups', [])));
    h += sect('Application log, most frequent', 'top ' + arr(g(e, 'application.groups', [])).length + ' groups') + evTable(arr(g(e, 'application.groups', [])));
    var w = arr(g(D, 'meta.warnings', []));
    h += sect('Scan notes', w.length ? w.length + ' non-critical' : 'none');
    h += wrapWin('collector', 'v' + g(D, 'meta.version', '?') + ', ' + g(D, 'meta.durationSec', '?') + ' s', w.length ? '<div class="list">' + w.map(function (x) { return mark('na', esc(x)); }).join('') + '</div>' : '<div class="sub">Everything was collected without problems.' + (g(D, 'meta.isAdmin', true) ? '' : ' Not run as Administrator: some checks were skipped.') + '</div>');
    $('#tab-events').innerHTML = h;
  }

  function countUp() {
    var el = $('#scoreNum'); if (!el || reduceMotion()) return;
    var target = V.score.score, t0 = null;
    el.textContent = '0';
    function step(ts) { if (t0 == null) t0 = ts; var p = Math.min(1, (ts - t0) / 900); el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); }
    requestAnimationFrame(step);
  }

  function renderAll() {
    $('#chipOs').textContent = (g(D, 'system.os.productName', '') || 'Windows') + ' ' + (g(D, 'system.os.displayVersion', ''));
    $('#chipDate').textContent = 'Scanned ' + fmtDT(g(D, 'meta.generated', null));
    var n = V.counts.high + V.counts.medium + V.counts.low;
    $('#navcount').textContent = n ? n : '';
    rStart(); rHealth(); rRadar(); rActions(); rCpu(); rMem(); rGpu(); rBoard(); rOs(); rNet(); rExtras(); rStorage(); rSecurity(); rBoot(); rHeat(); rUplink();
    rFindings(); rHardware(); rSoftware(); rEvents();
    countUp();
  }

  return { renderAll: renderAll, countUp: countUp, drawFindings: drawFindings, state: state, drawApps: drawApps, setAppQ: function (q) { appQ = q; } };
})(V);
