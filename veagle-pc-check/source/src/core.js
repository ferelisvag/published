/* VEAGLE PC Check - core: helpers, data access, rules engine */

/* The pristine page (taken before anything is rendered) is kept so a "share-safe copy" can be rebuilt from it. */
var PAGE = (function () {
  var cs = document.currentScript;
  var out = { code: cs ? cs.textContent : '', head: document.head.innerHTML, body: '' };
  try {
    var sk = document.body.cloneNode(true);
    Array.prototype.slice.call(sk.querySelectorAll('script')).forEach(function (n) { n.parentNode.removeChild(n); });
    out.body = sk.innerHTML;
  } catch (e) { }
  return out;
})();

function Engine(RAW) {
  'use strict';
  var D = RAW || {};

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function arr(x) { return Array.isArray(x) ? x : (x == null ? [] : [x]); }
  function num(x, d) { var n = Number(x); return isFinite(n) ? n : (d == null ? 0 : d); }
  function g(o, path, d) {
    var cur = o;
    var parts = path.split('.');
    for (var i = 0; i < parts.length; i++) {
      if (cur == null) return d;
      cur = cur[parts[i]];
    }
    return cur == null ? d : cur;
  }
  function sum(a, f) { var s = 0; arr(a).forEach(function (x) { s += num(f ? f(x) : x); }); return s; }
  function fmtNum(n, dec) { return num(n).toLocaleString('en-US', { maximumFractionDigits: dec == null ? 0 : dec }); }
  function fmtGB(gb) {
    var n = num(gb, NaN);
    if (!isFinite(n)) return '-';
    if (n >= 1000) return fmtNum(n / 1024, 2) + ' TB';
    return fmtNum(n, n < 10 ? 1 : 0) + ' GB';
  }
  function fmtDate(iso) {
    if (!iso) return '-';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function fmtDT(iso) {
    if (!iso) return '-';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }
  function fmtUptime(h) {
    var n = num(h, NaN);
    if (!isFinite(n)) return '-';
    if (n < 1) return Math.round(n * 60) + ' min';
    if (n < 48) return fmtNum(n, 1) + ' h';
    return fmtNum(n / 24, 1) + ' days';
  }
  function ageDays(iso) {
    if (!iso) return null;
    var d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return Math.floor((Date.now() - d.getTime()) / 86400000);
  }
  function uniq(a) { var seen = {}; return arr(a).filter(function (x) { var k = String(x).toLowerCase(); if (seen[k]) return false; seen[k] = 1; return true; }); }
  function words(a, max) { a = arr(a); var s = a.slice(0, max || 6).join(', '); return a.length > (max || 6) ? s + ' and ' + (a.length - (max || 6)) + ' more' : s; }

  /* ---------------- event helpers ---------------- */
  function evGroups(log) { return arr(g(D, 'events.' + log + '.groups', [])); }
  function evCount(log, provRe, ids, level) {
    var n = 0;
    evGroups(log).forEach(function (x) {
      if (provRe && !provRe.test(x.provider || '')) return;
      if (ids && ids.indexOf(Number(x.id)) < 0) return;
      if (level && x.level !== level) return;
      n += num(x.count);
    });
    return n;
  }
  function lastAge(log, provRe, ids) {
    var best = null;
    evGroups(log).forEach(function (x) {
      if (provRe && !provRe.test(x.provider || '')) return;
      if (ids && ids.indexOf(Number(x.id)) < 0) return;
      var a = ageDays(x.lastSeen);
      if (a != null && (best == null || a < best)) best = a;
    });
    return best;
  }
  function down(sev) { return sev === 'high' ? 'medium' : 'low'; }
  function evSample(log, provRe, ids) {
    var best = null;
    evGroups(log).forEach(function (x) {
      if (provRe && !provRe.test(x.provider || '')) return;
      if (ids && ids.indexOf(Number(x.id)) < 0) return;
      if (!best || x.count > best.count) best = x;
    });
    return best ? (best.provider + ' ' + best.id + ': ' + (best.sample || '(no message text)')) : '';
  }

  /* ---------------- regex tables ---------------- */
  var RE = {
    emulator: /memu|bluestacks|nox\s?player|ldplayer|genymotion|msi app player/i,
    remote: /anydesk|teamviewer|rustdesk|ultraviewer|splashtop|logmein|realvnc|tightvnc|ultravnc|chrome remote|supremo|ammyy|radmin|dwservice|parsec|agent dvr/i,
    remoteTools: /anydesk|teamviewer|rustdesk|ultraviewer|splashtop|logmein|vnc|chrome remote|supremo|ammyy|radmin|dwservice/i,
    vpn: /nordvpn|openvpn|wireguard|expressvpn|surfshark|protonvpn|cyberghost|mullvad|windscribe|private internet access|bitdefender vpn|smart vpn|anyconnect|forticlient|globalprotect|pulse secure|hotspot shield|hide\.me|tunnelbear/i,
    optimizer: /ccleaner|driver booster|iobit|advanced systemcare|pc optimizer|driver easy|driverpack|reimage|mackeeper|avast cleanup|registry cleaner|slimcleaner|wise care|pc cleaner|speedupmypc|driver updater|toolbar/i,
    secApp: /anydesk|teamviewer|rustdesk|winrar|7-zip|7zip|chrome|firefox|edge|zoom|openvpn|java|adobe|acrobat|vlc|notepad\+\+|putty|filezilla|git\b|python|node\.?js|docker|vmware|virtualbox|openssh|wireshark|office|teams|outlook|nordvpn|windows terminal|powershell|webview|brave|opera|thunderbird|ledger|steam|discord|winscp|handbrake/i,
    launcher: /discord|steam|epic|ea app|ea desktop|origin|gog|ubisoft|battle\.net|wargaming|rockstar|spotify|teams|onedrive|dropbox|google drive|adobe|creative cloud|acrobat|skype|ccleaner|itunes|filmora|wondershare|insta360|acdsee|brave|edge|nvidia broadcast|razer|logitech|corsair|steelseries|msi|asus|armoury|gigabyte|anydesk|viber|telegram|whatsapp|zoom/i
  };

  /* ---------------- finding builder ---------------- */
  var SEV_ORDER = { high: 0, medium: 1, low: 2, info: 3 };
  var PEN = { high: 8, medium: 3, low: 0.8, info: 0 };
  var AREAS = ['Stability', 'Storage', 'Security', 'Performance', 'Updates', 'Software'];
  function F(id, area, sev, title, why, steps, evidence) {
    return { id: id, area: area, sev: sev, title: title, why: why, steps: arr(steps), evidence: evidence || '' };
  }
  function S(t, cmd) { return { t: t, cmd: cmd || '' }; }

  /* ---------------- rules ---------------- */
  function runRules() {
    var out = [];
    var days = num(g(D, 'events.days', 30), 30);
    function add(f) { if (f) out.push(f); }
    function R(fn) { try { add(fn()); } catch (e) { out.push(F('rule-error', 'Software', 'info', 'A check could not run', String(e && e.message || e), [], '')); } }

    var apps = arr(g(D, 'apps.list', []));
    var appNames = apps.map(function (a) { return a.name || ''; });
    function appsMatching(re) { return uniq(appNames.filter(function (n) { return re.test(n); })); }
    var outdated = arr(g(D, 'apps.outdated', []));
    var disks = arr(D.disks);
    var vols = arr(D.volumes).filter(function (v) { return !v.driveType || /fixed/i.test(v.driveType); });
    var crashApps = arr(g(D, 'events.appCrashes', []));
    var crashEmitted = false;

    /* --- stability --- */
    R(function () {
      var kp = evCount('system', /Kernel-Power/, [41]);
      var sd = evCount('system', /^EventLog$/, [6008]);
      var n = Math.max(kp, sd);
      if (n < 1) return null;
      var age = lastAge('system', /Kernel-Power|^EventLog$/, [41, 6008]);
      var sev = n >= 3 ? 'high' : 'medium';
      if (age != null && age > 14) sev = down(sev);
      return F('stab-shutdown', 'Stability', sev,
        'Unexpected shutdowns or restarts (' + n + ' in ' + days + ' days' + (age != null && age > 14 ? ', last ' + age + ' days ago' : '') + ')',
        'Windows recorded that it was not shut down cleanly. Common causes are power cuts, holding the power button, overheating, a weak power supply, unstable RAM or an overclock, and driver crashes.',
        [S('Think about whether these were intentional (power cut, forced power-off). If yes, you can ignore this.'),
         S('Check CPU and GPU temperatures under load with HWiNFO or Task Manager.'),
         S('Run the Windows memory test. The PC restarts and checks RAM.', 'mdsched.exe'),
         S('If it keeps happening, use the AI help tab and tell the assistant when it happens (idle, gaming, at startup).')],
        evSample('system', /Kernel-Power|EventLog/, [41, 6008]));
    });
    R(function () {
      var bs = evCount('system', /WER-SystemErrorReporting/, [1001]);
      var dumps = num(g(D, 'crashDumps.dumps', 0));
      var n = Math.max(bs, dumps);
      if (n < 1) return null;
      return F('stab-bsod', 'Stability', 'high', 'Blue screen crashes (' + n + ')',
        'Windows stopped with a blue screen. Almost always a driver, faulty RAM, or failing hardware.',
        [S('Update the graphics driver and the chipset driver from the manufacturer.'),
         S('Repair system files.', 'sfc /scannow'),
         S('Test the memory.', 'mdsched.exe'),
         S('Dump files are in C:\\Windows\\Minidump. Share the scan with an AI assistant (AI help tab) and mention the blue screen text.')],
        evSample('system', /WER-SystemErrorReporting/, [1001]) + (dumps ? ' | dump files found: ' + dumps : ''));
    });
    R(function () {
      var n = evCount('system', /WHEA-Logger/);
      if (n < 1) return null;
      return F('stab-whea', 'Stability', 'high', 'Hardware error reports (WHEA): ' + n,
        'The CPU, RAM, a PCIe device or a drive reported an error at hardware level. Often caused by an overclock, unstable XMP/EXPO memory, or a failing component.',
        [S('Remove any CPU/GPU overclock and test with default BIOS settings.'),
         S('Turn XMP/EXPO off temporarily and see if the errors stop.'),
         S('Update the BIOS if a newer stable version exists.'),
         S('Run the memory test.', 'mdsched.exe')],
        evSample('system', /WHEA-Logger/));
    });
    R(function () {
      var n = evCount('system', /^(nvlddmkm|amdkmdag|amdwddmg|atikmpag|igfx.*|Display)$/i, [13, 14, 141, 153, 4101]);
      if (n < 5) return null;
      var age = lastAge('system', /^(nvlddmkm|amdkmdag|amdwddmg|atikmpag|igfx.*|Display)$/i, [13, 14, 141, 153, 4101]);
      var sev = n >= 20 ? 'medium' : 'low';
      if (age != null && age > 14) sev = 'low';
      return F('stab-gpu', 'Stability', sev, 'Graphics driver errors or resets (' + n + (age != null && age > 14 ? ', last ' + age + ' days ago' : '') + ')',
        'The display driver reported errors or recovered from a freeze. They sometimes come in one short burst (for example during a game) and are harmless afterwards.',
        [S('Check whether you saw black screens, freezes or flicker. If not, this was probably a one-time burst.'),
         S('If it repeats, do a clean driver install (DDU in Safe Mode) of the latest stable driver.'),
         S('Check GPU temperature and power cables.')],
        evSample('system', /^(nvlddmkm|amdkmdag|amdwddmg|atikmpag|igfx.*|Display)$/i));
    });
    R(function () {
      var n = evCount('system', /^(disk|Ntfs|stornvme|storahci|volmgr|iaStor.*|nvme)$/i, [7, 11, 15, 51, 55, 98, 129, 153, 157]);
      if (n < 1) return null;
      var age = lastAge('system', /^(disk|Ntfs|stornvme|storahci|volmgr|iaStor.*|nvme)$/i, [7, 11, 15, 51, 55, 98, 129, 153, 157]);
      var sev = n >= 10 ? 'high' : (n >= 3 ? 'medium' : 'low');
      if (age != null && age > 14) sev = down(sev);
      return F('stab-disk', 'Stability', sev, 'Drive or file system errors (' + n + (age != null && age > 14 ? ', last ' + age + ' days ago' : '') + ')',
        'Windows logged read/write retries or file system problems. A few can come from a USB or virtual disk; many point to a failing drive or cable.',
        [S('Back up important data first.'),
         S('Run an online scan of the system drive (read-only).', 'chkdsk C: /scan'),
         S('Check the SMART data in the Hardware tab (wear, temperature, errors).'),
         S('For SATA drives, reseat the data cable.')],
        evSample('system', /^(disk|Ntfs|stornvme|storahci|volmgr|iaStor.*|nvme)$/i, [7, 11, 15, 51, 55, 98, 129, 153, 157]));
    });
    R(function () {
      var st = g(D, 'dism.state', '');
      if (st !== 'repairable' && st !== 'corrupt') return null;
      return F('stab-dism', 'Stability', 'high', 'Windows component store ' + (st === 'corrupt' ? 'is damaged' : 'needs repair'),
        'DISM reports damage in the Windows component store. Updates and system repair can fail until it is fixed.',
        [S('Open PowerShell or Command Prompt as Administrator and run the repair (10 to 20 minutes, needs internet).', 'DISM /Online /Cleanup-Image /RestoreHealth'),
         S('Then check system files.', 'sfc /scannow'),
         S('Restart, then run Windows Update again.')],
        g(D, 'dism.text', ''));
    });
    R(function () {
      var top = crashApps[0];
      if (!top || num(top.count) < 5) return null;
      var isEmu = RE.emulator.test(top.app);
      crashEmitted = isEmu;
      var total = sum(crashApps, function (c) { return c.count; });
      var steps = [S('Update the program to the latest version, or reinstall it.')];
      if (isEmu) steps.push(S('Android emulators often conflict with Hyper-V and Memory Integrity. Use the emulator\'s Hyper-V compatible mode, or uninstall it if you no longer use it.'));
      steps.push(S('If it is a game or app you use, check its overlays (Discord, GeForce, Steam) and disable them for a test.'));
      return F('stab-crashes', 'Stability', top.count >= 20 ? 'medium' : 'low', top.app + ' crashed ' + top.count + ' times in ' + days + ' days',
        'Repeated crashes of the same program usually mean a broken installation, a driver or overlay conflict, or an incompatibility with this Windows setup.',
        steps, crashApps.slice(0, 6).map(function (c) { return c.app + ' x' + c.count; }).join(', ') + ' (total ' + total + ' crashes)');
    });
    R(function () {
      var f = arr(g(D, 'startup.failedAutoServices', []));
      if (f.length < 2) return null;
      return F('stab-services', 'Stability', 'low', f.length + ' automatic services are not running',
        'These services are set to start automatically but are stopped with an error code. Some are normal (Xbox, vendor updaters). The others may point to broken software.',
        [S('Open the services list (Win+R, services.msc) and check the ones you recognise.', 'services.msc'),
         S('Uninstall software you no longer use; its leftover services are the usual cause.')],
        f.slice(0, 10).map(function (s) { return s.name + ' (code ' + s.exitCode + ')'; }).join(', '));
    });
    R(function () {
      var n = evCount('system', /Tcpip/, [4266, 4231]);
      if (n < 1) return null;
      var age = lastAge('system', /Tcpip/, [4266, 4231]);
      var sev = n >= 10 ? 'medium' : 'low';
      if (age != null && age > 14) sev = 'low';
      return F('stab-ports', 'Stability', sev, 'Network ports ran out (' + n + ' events' + (age != null && age > 14 ? ', last ' + age + ' days ago' : '') + ')',
        'Windows reported that every free dynamic port was in use. A program or VM is leaking connections. It can cause random connection failures.',
        [S('See which process holds the most connections (run in PowerShell).', 'Get-NetTCPConnection | Group-Object OwningProcess | Sort-Object Count -Descending | Select-Object -First 5 Count, @{n=\'Process\';e={(Get-Process -Id $_.Name -ErrorAction SilentlyContinue).ProcessName}}'),
         S('Update or restart that program. Check VPN clients and virtual machines first.')],
        evSample('system', /Tcpip/, [4266, 4231]));
    });
    R(function () {
      var n = num(g(D, 'events.appHangs', 0));
      if (n < 10) return null;
      return F('stab-hangs', 'Stability', 'low', 'Programs stopped responding ' + n + ' times',
        'Windows closed unresponsive programs. Often caused by slow storage, add-ins or an overloaded system.',
        [S('Note which programs hang (Events tab) and update them.')], '');
    });
    R(function () {
      var n = evCount('application', /Microsoft-Windows-Search/, [10024]);
      if (n < 10) return null;
      return F('stab-search', 'Stability', 'low', 'Windows Search indexer is repeatedly killed (' + n + ')',
        'The search filter host stops responding and is terminated. The indexer then burns CPU and search results get slow.',
        [S('Open Indexing Options, click Advanced, then Rebuild.', 'control.exe srchadmin.dll'),
         S('Remove big folders you do not search (game libraries, VM disks) from the index.')],
        evSample('application', /Microsoft-Windows-Search/, [10024]));
    });
    R(function () {
      var n = evCount('system', /Volsnap/, [36]);
      if (n < 1) return null;
      return F('stab-vss', 'Stability', 'low', 'System Restore storage limit is too small',
        'Shadow copies were aborted because the storage reserved for restore points hit its limit.',
        [S('Check the current limit.', 'vssadmin list shadowstorage'),
         S('Raise it (example: 10 percent of C:), as Administrator.', 'vssadmin resize shadowstorage /for=C: /on=C: /maxsize=10%')],
        evSample('system', /Volsnap/, [36]));
    });
    R(function () {
      var n = evCount('system', /WindowsUpdateClient/, null, 'Error');
      if (n < 1) return null;
      return F('stab-wu', 'Updates', 'low', 'Windows Update reported failed installs (' + n + ')',
        'One or more updates (often drivers or vendor extensions) failed to install.',
        [S('Open Settings, Windows Update, Update history and look at the failed items.'),
         S('Failed vendor extensions are usually harmless. Failed cumulative updates are not: repair the image (see DISM above) and retry.')],
        evSample('system', /WindowsUpdateClient/));
    });
    R(function () {
      if (g(D, 'security.pendingReboot', false) !== true) return null;
      return F('stab-pending', 'Updates', 'low', 'A restart is pending',
        'Windows has installed something that needs a restart to finish.', [S('Restart Windows (Start, Power, Restart).')], '');
    });
    R(function () {
      var h = num(g(D, 'system.os.uptimeHours', 0));
      if (h < 24 * 14) return null;
      return F('stab-uptime', 'Updates', 'low', 'No full restart for ' + Math.round(h / 24) + ' days',
        'With Fast Startup, "Shut down" does not restart Windows, so the counter keeps running and updates or drivers can stay half-applied.',
        [S('Use Start, Power, Restart (not Shut down) once to start fresh.')], '');
    });

    /* --- storage --- */
    R(function () {
      var bad = disks.filter(function (d) { return d.health && !/healthy/i.test(d.health); });
      if (!bad.length) return null;
      return F('sto-health', 'Storage', 'high', 'A drive reports a health problem',
        'Windows reports that a drive is not healthy. This is the most serious storage warning.',
        [S('Back up your data now, before anything else.'), S('Run the manufacturer\'s drive tool (Samsung Magician, Kingston SSD Manager, WD Dashboard) and check the drive.')],
        bad.map(function (d) { return d.name + ': ' + d.health + ' / ' + d.status; }).join('; '));
    });
    R(function () {
      var bits = []; var sev = 'low';
      disks.forEach(function (d) {
        var r = d.reliability; if (!r) return;
        if (num(r.wearPercent) >= 80) { bits.push(d.name + ': wear ' + r.wearPercent + '%'); sev = 'high'; }
        else if (num(r.wearPercent) >= 60) { bits.push(d.name + ': wear ' + r.wearPercent + '%'); if (sev !== 'high') sev = 'medium'; }
        if (num(r.temperatureC) >= 70) { bits.push(d.name + ': ' + r.temperatureC + ' C'); if (sev === 'low') sev = 'medium'; }
        if (num(r.readErrors) > 0 || num(r.writeErrors) > 0) { bits.push(d.name + ': ' + num(r.readErrors) + ' read / ' + num(r.writeErrors) + ' write errors'); if (sev === 'low') sev = 'medium'; }
      });
      if (!bits.length) return null;
      return F('sto-smart', 'Storage', sev, 'SSD/HDD wear, heat or error counters need a look',
        'The drives report high wear, high temperature or error counts in their SMART data.',
        [S('Back up important data.'), S('Improve airflow around M.2/SATA drives if temperatures are high.'), S('Plan a replacement if wear is above 80 percent.')], bits.join('; '));
    });
    R(function () {
      var bits = []; var sev = null;
      vols.forEach(function (v) {
        var size = num(v.sizeGB), free = num(v.freeGB);
        if (!size) return;
        var pct = free / size;
        var isC = /^C:/i.test(v.letter);
        var s = null;
        if (free < 15 || (pct < 0.10 && free < 100)) s = isC ? 'high' : 'medium';
        else if (pct < 0.2 && free < 60 && isC) s = 'medium';
        else if (pct < 0.05) s = 'low';
        if (s) {
          bits.push(v.letter + ' ' + fmtGB(free) + ' free of ' + fmtGB(size) + ' (' + Math.round(pct * 100) + '%)');
          if (!sev || SEV_ORDER[s] < SEV_ORDER[sev]) sev = s;
        }
      });
      if (!bits.length) return null;
      return F('sto-space', 'Storage', sev, 'Low free disk space', 'Windows and SSDs need free space to run well. Below about 10 to 15 percent, updates fail and performance drops.',
        [S('Find what takes the space with WinDirStat or TreeSize.'), S('Open Settings, System, Storage and run the cleanup recommendations.'), S('Move games, videos and photos to another drive.')], bits.join('; '));
    });
    R(function () {
      var hasSSD = disks.some(function (d) { return /ssd|nvme/i.test(d.mediaType + ' ' + d.busType); });
      if (g(D, 'settings.trim', null) !== false || !hasSSD) return null;
      return F('sto-trim', 'Storage', 'medium', 'TRIM is turned off for SSDs',
        'Without TRIM an SSD slows down over time.', [S('Enable TRIM (as Administrator).', 'fsutil behavior set DisableDeleteNotify 0')], '');
    });
    R(function () {
      if (!disks.length) return null;
      var anyFast = disks.some(function (d) { return /ssd|nvme|scm/i.test(d.mediaType + ' ' + d.busType); });
      var anyHdd = disks.some(function (d) { return /hdd/i.test(d.mediaType); });
      if (anyFast || !anyHdd) return null;
      return F('sto-hdd', 'Storage', 'high', 'Only hard drives were found',
        'Windows 11 on a spinning hard drive is very slow. An SSD is the biggest single speed upgrade for such a PC.',
        [S('Replace or add an SSD (SATA SSDs are cheap) and move Windows to it.')], disks.map(function (d) { return d.name + ' (' + d.mediaType + ')'; }).join('; '));
    });
    R(function () {
      var u = num(g(D, 'settings.tempMB.user', 0)) + num(g(D, 'settings.tempMB.windows', 0));
      if (u < 3000) return null;
      return F('sto-temp', 'Storage', 'low', 'Temporary files use ' + fmtGB(u / 1024),
        'Old temporary files pile up and are safe to delete.', [S('Open Settings, System, Storage, Temporary files and remove them.')], '');
    });

    /* --- security --- */
    R(function () {
      var av = arr(g(D, 'security.antivirus', []));
      var def = g(D, 'security.defender', null);
      var third = av.filter(function (a) { return !/windows defender|microsoft defender/i.test(a.name || ''); });
      var active = av.filter(function (a) { return a.enabled; });
      var defOn = def && def.realTime;
      if (!active.length && !defOn && (av.length || def)) {
        return F('sec-av', 'Security', 'high', 'No active antivirus protection',
          'No antivirus product reports real-time protection as on.',
          [S('Open Windows Security, Virus and threat protection, and turn real-time protection on.'), S('If you use another antivirus, open it and check why it is off or expired.')],
          av.map(function (a) { return a.name + (a.enabled ? ' (on)' : ' (off)'); }).join(', '));
      }
      var activeThird = third.filter(function (a) { return a.enabled; });
      if (activeThird.length >= 2) {
        return F('sec-av2', 'Security', 'medium', 'Two antivirus products are active',
          'Running two real-time antivirus products slows the PC and they can fight each other.',
          [S('Keep one and uninstall the other with its vendor removal tool.')], activeThird.map(function (a) { return a.name; }).join(', '));
      }
      var old = active.filter(function (a) { return a.upToDate === false; });
      if (old.length) {
        return F('sec-avold', 'Security', 'medium', 'Antivirus definitions are out of date', 'The active antivirus reports old definitions.',
          [S('Open the antivirus and run its update.')], old.map(function (a) { return a.name; }).join(', '));
      }
      return null;
    });
    R(function () {
      var fw = g(D, 'security.firewall', null); if (!fw) return null;
      var off = ['domain', 'private', 'public'].filter(function (k) { return fw[k] === false; });
      if (!off.length) return null;
      return F('sec-fw', 'Security', 'high', 'Windows Firewall is off (' + off.join(', ') + ')', 'The firewall blocks unwanted connections.',
        [S('Turn it back on (as Administrator).', 'netsh advfirewall set allprofiles state on')], '');
    });
    R(function () {
      if (g(D, 'security.uac', null) !== false) return null;
      return F('sec-uac', 'Security', 'high', 'User Account Control (UAC) is off', 'UAC asks before programs change the system.',
        [S('Turn it on in Control Panel, User Accounts, Change User Account Control settings.')], '');
    });
    R(function () {
      if (g(D, 'security.secureBoot', null) !== false) return null;
      return F('sec-sb', 'Security', 'medium', 'Secure Boot is off', 'Secure Boot protects the start of Windows from boot-level malware, and Windows 11 expects it.',
        [S('Enable it in the BIOS/UEFI (Boot or Security section). The disk must use GPT.')], '');
    });
    R(function () {
      var t = g(D, 'security.tpm', null); if (!t) return null;
      if (!t.present) return F('sec-tpm', 'Security', 'medium', 'No TPM found', 'Windows 11, BitLocker and Windows Hello use the TPM.', [S('Enable fTPM / PTT in the BIOS.')], '');
      if (!t.ready) return F('sec-tpm2', 'Security', 'low', 'TPM is present but not ready', 'The TPM is not initialised.', [S('Open tpm.msc and check the status.', 'tpm.msc')], '');
      return null;
    });
    R(function () {
      var f = arr(g(D, 'security.optionalFeatures', [])).filter(function (x) { return /SMB1|Telnet|TFTP/i.test(x); });
      if (!f.length) return null;
      return F('sec-legacy', 'Security', 'high', 'Obsolete Windows features are enabled: ' + f.join(', '), 'SMB1 and Telnet are old, insecure protocols.',
        [S('Disable SMB1 (as Administrator).', 'Disable-WindowsOptionalFeature -Online -FeatureName SMB1Protocol -NoRestart')], f.join(', '));
    });
    R(function () {
      if (g(D, 'security.rdpEnabled', null) !== true) return null;
      return F('sec-rdp', 'Security', 'medium', 'Remote Desktop is enabled', 'If this PC is reachable from the internet, Remote Desktop is a common attack target.',
        [S('If you do not use it, turn it off in Settings, System, Remote Desktop.'), S('If you need it, keep Network Level Authentication on and use a strong password.')], '');
    });
    R(function () {
      var r = appsMatching(RE.remoteTools);
      if (!r.length) return null;
      return F('sec-remote', 'Security', r.length >= 3 ? 'medium' : 'low', r.length + ' remote-access tool' + (r.length > 1 ? 's' : '') + ' installed',
        'Remote-access tools are convenient and also popular with attackers and scammers. Each one that runs as a service gives a way into this PC.',
        [S('Uninstall the ones you do not use.'), S('For the ones you keep, set a strong unattended-access password and keep them updated.')], r.join(', '));
    });
    R(function () {
      var v = appsMatching(RE.vpn);
      if (v.length < 3) return null;
      return F('soft-vpn', 'Software', 'low', v.length + ' VPN clients are installed',
        'Each VPN adds virtual network adapters, drivers and background services. They can conflict.', [S('Keep one or two and uninstall the rest.')], v.join(', '));
    });
    R(function () {
      var n = g(D, 'security.localAdmins', null);
      if (n == null || n <= 2) return null;
      return F('sec-admins', 'Security', 'low', n + ' accounts are local administrators', 'Fewer admin accounts mean less risk.',
        [S('Review them.', 'Get-LocalGroupMember -SID S-1-5-32-544'), S('Use a standard account for daily work.')], '');
    });
    R(function () {
      if (g(D, 'security.memoryIntegrity', null) !== false) return null;
      return F('sec-mi', 'Security', 'info', 'Memory integrity (core isolation) is off', 'It blocks vulnerable drivers. It stays off if an installed driver is not compatible.',
        [S('Open Windows Security, Device security, Core isolation and try to turn it on.')], '');
    });
    R(function () {
      var v = arr(D.volumes).filter(function (x) { return x.bitlocker && /on|1/i.test(String(x.bitlocker.protection)); });
      if (!v.length) return null;
      return F('sec-bl', 'Security', 'info', 'BitLocker is on (' + v.map(function (x) { return x.letter; }).join(', ') + '): keep your recovery key safe',
        'If the TPM or BIOS changes, Windows asks for the recovery key. Without it, the data is gone.',
        [S('Check where your key is saved: account.microsoft.com/devices/recoverykey, a printout, or a USB stick.'), S('List the key protectors of C: (as Administrator).', 'manage-bde -protectors -get C:')], '');
    });

    /* --- updates --- */
    R(function () {
      var d = g(D, 'updates.lastPatchDaysAgo', null);
      if (d == null || d < 60) return null;
      return F('upd-patch', 'Updates', d > 120 ? 'high' : 'medium', 'Windows has not installed an update for ' + d + ' days',
        'Security updates come out monthly. Long gaps usually mean updating is blocked or paused.',
        [S('Open Settings, Windows Update and check for updates.'), S('If it fails, repair the image: DISM /Online /Cleanup-Image /RestoreHealth')], '');
    });
    R(function () {
      if (!outdated.length) return null;
      var sec = outdated.filter(function (o) { return RE.secApp.test(o.name); });
      var remote = outdated.filter(function (o) { return RE.remoteTools.test(o.name); });
      var sev = remote.length ? 'high' : ((outdated.length >= 25 || sec.length >= 4) ? 'medium' : 'low');
      var steps = [];
      (remote.concat(sec.filter(function (x) { return remote.indexOf(x) < 0; }))).slice(0, 5).forEach(function (o) {
        steps.push(S('Update ' + o.name + ' (' + o.version + ' to ' + o.available + ').', 'winget upgrade --id ' + o.id + (o.source === 'msstore' ? ' --source msstore' : '')));
      });
      steps.push(S('To update everything (read the list first, some updates change behaviour).', 'winget upgrade --all'));
      return F('upd-apps', 'Updates', sev, outdated.length + ' installed apps have updates (' + sec.length + ' security-relevant)',
        'Old versions of browsers, remote tools, archivers and runtimes are where most real-world attacks start.',
        steps, outdated.slice(0, 12).map(function (o) { return o.name + ' ' + o.version + ' -> ' + o.available; }).join('; '));
    });
    R(function () {
      var b = outdated.filter(function (o) { return /bios/i.test(o.name + ' ' + o.id); })[0];
      var age = ageDays(g(D, 'system.bios.date', null));
      if (b) return F('upd-bios', 'Updates', 'low', 'A newer BIOS is available for this motherboard (' + b.version + ' to ' + b.available + ')',
        'BIOS updates add CPU microcode fixes, stability and security patches. They are also the one update that can brick a board if the power fails.',
        [S('Read the release notes on the board maker\'s website first.'), S('Flash only on stable power (laptop: plugged in) and with nothing else running. If everything works fine, waiting is okay.')], 'Installed BIOS date: ' + fmtDate(g(D, 'system.bios.date', null)));
      if (age != null && age > 730) return F('upd-bios', 'Updates', 'info', 'The BIOS is ' + Math.round(age / 365) + ' years old',
        'Check whether the maker released fixes.', [S('Look up your board model on the manufacturer\'s support page and read the release notes.')], 'Version ' + g(D, 'system.bios.version', '?') + ', ' + fmtDate(g(D, 'system.bios.date', null)));
      return null;
    });
    R(function () {
      var gp = arr(D.gpus)[0]; if (!gp) return null;
      var age = ageDays(gp.driverDate);
      if (age == null || age < 365) return null;
      return F('upd-gpu', 'Updates', 'low', 'Graphics driver is ' + Math.round(age / 30) + ' months old', 'New games and Windows builds often need a newer driver.',
        [S('Update from the NVIDIA App, AMD Software or Intel Driver and Support Assistant.')], gp.name + ' driver ' + (gp.driverFriendly || gp.driverVersion) + ' (' + fmtDate(gp.driverDate) + ')');
    });
    R(function () {
      var p = arr(g(D, 'drivers.problemDevices', []));
      var errs = p.filter(function (x) { return !x.disabled && /error|unknown/i.test(x.status); });
      var deg = p.filter(function (x) { return !x.disabled && /degraded/i.test(x.status); });
      if (!errs.length && !deg.length) return null;
      var pool = errs.length ? errs : deg;
      var count = {}; pool.forEach(function (x) { count[x.name] = (count[x.name] || 0) + 1; });
      var ev = Object.keys(count).map(function (k) { return k + (count[k] > 1 ? ' x' + count[k] : '') + ' (' + pool.filter(function (x) { return x.name === k; })[0].status + ')'; }).join('; ');
      return F('upd-devices', 'Updates', errs.length ? 'medium' : 'low', pool.length + ' device entr' + (pool.length > 1 ? 'ies report' : 'y reports') + ' a problem',
        'Device Manager shows devices with errors or a degraded state. Often a missing or incompatible driver, or leftover entries from removed software.',
        [S('Open Device Manager and look for yellow marks.', 'devmgmt.msc'), S('Update the driver from the manufacturer, or uninstall the entry if the hardware is gone.')], ev);
    });

    /* --- performance --- */
    R(function () {
      var h = arr(g(D, 'boot.history', [])).slice(0, 5);
      if (!h.length) return null;
      var avg = sum(h, function (x) { return x.seconds; }) / h.length;
      if (avg < 60) return null;
      var slow = arr(g(D, 'boot.slowStarters', [])).slice(0, 8).map(function (s) { return s.name + ' x' + s.times; });
      return F('perf-boot', 'Performance', avg >= 90 ? 'medium' : 'low', 'Windows takes about ' + Math.round(avg) + ' seconds to start',
        'Windows measures every boot. On an SSD PC under 40 seconds is typical. Slow boots are mostly caused by programs that start with Windows.',
        [S('Disable startup programs you do not need (see the next finding and the Software tab).'), S('Programs that slowed recent boots are listed below as evidence.')],
        (slow.length ? 'Slowed boots: ' + slow.join(', ') : 'Last boots (s): ' + h.map(function (x) { return x.seconds; }).join(', ')));
    });
    R(function () {
      var items = uniq(arr(g(D, 'startup.items', [])).map(function (s) { return s.name; }));
      var n = items.length;
      if (n < 15) return null;
      var heavy = items.filter(function (x) { return RE.launcher.test(x); });
      return F('perf-startup', 'Performance', n >= 25 ? 'medium' : 'low', n + ' programs start with Windows',
        'Each one uses memory, CPU and disk during startup, and most keep running in the background.',
        [S('Open Task Manager, Startup apps (Ctrl+Shift+Esc) and disable what you do not need at login: game launchers, updaters and chat apps are the usual suspects.', 'taskmgr.exe /0 /startup'),
         S('Programs still work. They simply do not start before you open them.')],
        'Candidates: ' + words(heavy.length ? heavy : items, 14));
    });
    R(function () {
      var t = num(g(D, 'system.ram.totalGB', 0)); if (!t) return null;
      if (t < 6) return F('perf-ram', 'Performance', 'high', 'Very little memory (' + fmtGB(t) + ')', 'Windows 11 and modern browsers need much more.', [S('Add RAM. Aim for 16 GB.')], '');
      if (t < 12) return F('perf-ram', 'Performance', 'medium', 'Limited memory (' + fmtGB(t) + ')', 'With 8 GB, browser tabs and apps push Windows to the disk.', [S('Consider 16 GB if the PC feels slow.')], '');
      var free = num(g(D, 'system.ram.freeGB', 0));
      if (free / t < 0.08) return F('perf-ramfull', 'Performance', 'low', 'Memory was almost full during the scan', 'Only ' + fmtGB(free) + ' of ' + fmtGB(t) + ' were free.', [S('Check the biggest memory users in the Software tab.')], '');
      return null;
    });
    R(function () {
      var mods = arr(g(D, 'system.ram.modules', []));
      var slow = mods.filter(function (m) { return num(m.speedMHz) - num(m.configuredMHz) >= 200 && num(m.configuredMHz) > 0; });
      if (slow.length) return F('perf-xmp', 'Performance', 'low', 'RAM runs slower than its rating (' + slow[0].configuredMHz + ' of ' + slow[0].speedMHz + ' MT/s)',
        'The modules support a higher speed, but XMP/EXPO/DOCP is not turned on in the BIOS.', [S('Enter the BIOS and enable the XMP (Intel) or EXPO/DOCP (AMD) profile.')], '');
      var slots = num(g(D, 'system.ram.slots', 0));
      if (mods.length === 1 && slots >= 2) return F('perf-dual', 'Performance', 'low', 'Memory runs in single channel',
        'Only one RAM module is installed. A second matching module doubles memory bandwidth, which helps games and integrated graphics.',
        [S('Add a matching second module in the correct slots (see the board manual).')], '');
      return null;
    });
    R(function () {
      if (g(D, 'settings.fastStartup', null) !== true) return null;
      var bl = arr(D.volumes).some(function (x) { return x.bitlocker && /on|1/i.test(String(x.bitlocker.protection)); });
      return F('perf-fast', 'Performance', 'low', 'Fast Startup is on', 'Shutting down does not fully restart Windows, so drivers and updates can stay half-applied, shutdowns can lag' + (bl ? ', and it can trigger BitLocker key errors at boot' : '') + '.',
        [S('Control Panel, Power Options, Choose what the power buttons do, untick Turn on fast startup. Or use this command (as Administrator).', 'reg add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power" /v HiberbootEnabled /t REG_DWORD /d 0 /f')],
        bl ? 'BitLocker volumes found, and event 24641 may appear in your System log.' : '');
    });
    R(function () {
      if (!/saver/i.test(g(D, 'settings.powerPlan', '')) || g(D, 'settings.hasBattery', false)) return null;
      return F('perf-power', 'Performance', 'low', 'Power plan is Power saver on a desktop PC', 'Power saver limits CPU speed.', [S('Switch to Balanced or High performance.', 'powercfg /setactive SCHEME_BALANCED')], '');
    });
    R(function () {
      var n = arr(g(D, 'startup.thirdPartyServices', [])).length;
      if (n < 25) return null;
      return F('perf-services', 'Performance', 'low', n + ' third-party services start automatically', 'Services from vendor tools and updaters run all the time.',
        [S('Uninstall tools you no longer use. Do not disable Windows services.')], words(arr(D.startup.thirdPartyServices).map(function (s) { return s.display || s.name; }), 10));
    });
    R(function () {
      if (g(D, 'security.hypervisorPresent', false) !== true || crashEmitted) return null;
      var e = appsMatching(RE.emulator);
      if (!e.length) return null;
      return F('soft-emu', 'Software', 'low', 'An Android emulator is installed next to Hyper-V', 'Emulators often misbehave while Hyper-V or Memory integrity is active.',
        [S('Use the emulator\'s Hyper-V compatible mode, or uninstall it if unused.')], e.join(', '));
    });
    R(function () {
      if (!appsMatching(/extreme tuning utility/i).length || num(g(D, 'security.vbsStatus', 0)) !== 2) return null;
      return F('soft-xtu', 'Software', 'low', 'Intel XTU cannot work while virtualization security is on', 'XTU needs virtualization-based security off, so its components show as degraded.',
        [S('Uninstall Intel XTU if you do not overclock. (Settings, Apps, Installed apps)')], '');
    });
    R(function () {
      var o = appsMatching(RE.optimizer);
      if (!o.length) return null;
      return F('soft-opt', 'Software', 'low', 'PC optimizer or cleaner tools installed', 'Registry cleaners and driver updaters rarely help and sometimes break things.',
        [S('Uninstall them unless you know why you need them.')], o.join(', '));
    });

    R(function () {
      var build = num(g(D, 'system.os.build', 0));
      if (!build || build >= 22000) return null;
      var r = readiness();
      var can = r.level === 'pass' || r.level === 'warn';
      var steps = [S('Open the Software tab or the Hardware tab and look at "Windows 11 readiness".')];
      if (can) steps.push(S('This PC looks able to run Windows 11. Open Settings, Update, and look for the upgrade offer, or use Microsoft\'s PC Health Check and the Windows 11 Installation Assistant. Back up first.'));
      else steps.push(S('This PC does not meet every Windows 11 requirement (see the readiness list). Options: fix the settings that can be fixed (TPM, Secure Boot), enrol in Microsoft\'s Extended Security Updates programme if you are eligible, or plan a replacement.'));
      steps.push(S('Until then: keep the browser and antivirus updated and avoid risky downloads.'));
      return F('win-eol', 'Updates', 'high', 'Windows 10 is no longer supported by Microsoft',
        'Regular support for Windows 10 ended on 14 October 2025. Without security updates, new vulnerabilities stay open. Extended Security Updates exist for eligible PCs, with their own terms.',
        steps, 'Windows build ' + build + '. Windows 11 readiness: ' + r.verdict + '.');
    });
    R(function () {
      var b = g(D, 'battery', null);
      if (!b || b.wearPercent == null) return null;
      var w = num(b.wearPercent);
      if (w < 25) return null;
      return F('bat-wear', 'Performance', w >= 40 ? 'medium' : 'low', 'The battery has lost ' + w + '% of its capacity',
        'Batteries wear out with charge cycles and heat. At this level you get noticeably less time away from the charger.',
        [S('Avoid keeping the laptop at 100 percent plugged in for months. If your maker has a battery-care mode (80 percent limit), turn it on.'), S('If the run time is too short for you, a replacement battery from the maker is the real fix.')],
        'Design capacity ' + fmtNum(num(b.designMWh) / 1000, 1) + ' Wh, full-charge capacity ' + fmtNum(num(b.fullChargeMWh) / 1000, 1) + ' Wh' + (b.cycleCount ? ', ' + b.cycleCount + ' cycles' : '') + '.');
    });
    R(function () {
      if (g(D, 'meta.mode', 'full') !== 'quick') return null;
      return F('scan-quick', 'Software', 'info', 'This was a quick scan: some checks were skipped',
        'The quick scan leaves out the slow checks: the Windows image check (DISM), app update list (winget), full msinfo32 export, optional features, old drivers and temp-folder sizes.',
        [S('Run VEAGLE-PC-Check.bat (the full scan) when you have 3 to 5 minutes.')], '');
    });

    out.sort(function (a, b) { return SEV_ORDER[a.sev] - SEV_ORDER[b.sev]; });
    return out;
  }

  /* ---------------- "looking good" checks ---------------- */
  function goodChecks(findings) {
    var ids = {}; findings.forEach(function (f) { ids[f.id] = 1; });
    var list = [];
    function ok(label, detail) { list.push({ label: label, detail: detail || '' }); }
    var disks = arr(D.disks);
    if (disks.length && disks.every(function (d) { return /healthy/i.test(d.health || ''); }) && !ids['sto-health']) ok('Drives report Healthy', disks.length + ' physical drive' + (disks.length > 1 ? 's' : ''));
    if (!ids['sto-space'] && arr(D.volumes).length) ok('Enough free disk space', '');
    if (g(D, 'settings.trim', null) === true) ok('TRIM is enabled for SSDs');
    if (g(D, 'security.secureBoot', null) === true) ok('Secure Boot is on');
    if (g(D, 'security.tpm.ready', false)) ok('TPM is ready', g(D, 'security.tpm.specVersion', ''));
    if (arr(D.volumes).some(function (x) { return x.bitlocker && /on|1/i.test(String(x.bitlocker.protection)); })) ok('BitLocker encryption is on');
    var av = arr(g(D, 'security.antivirus', [])).filter(function (a) { return a.enabled; });
    if (av.length && !ids['sec-av']) ok('Antivirus is active', av.map(function (a) { return a.name; }).join(', '));
    var fw = g(D, 'security.firewall', null);
    if (fw && fw.domain !== false && fw.private !== false && fw.public !== false) ok('Firewall is on for all profiles');
    if (g(D, 'security.uac', null) === true) ok('User Account Control is on');
    if (g(D, 'security.pendingReboot', null) === false) ok('No restart is pending');
    if (g(D, 'dism.state', '') === 'healthy') ok('Windows component store is healthy');
    var pd = g(D, 'updates.lastPatchDaysAgo', null);
    if (pd != null && pd <= 45) ok('Windows updates are recent', 'last update ' + pd + ' days ago');
    if (!ids['stab-shutdown'] && !ids['stab-bsod'] && !ids['stab-whea']) ok('No unexpected shutdowns, blue screens or hardware errors', 'last ' + g(D, 'events.days', 30) + ' days');
    var ram = num(g(D, 'system.ram.totalGB', 0));
    if (ram >= 16) ok('Plenty of memory', fmtGB(ram));
    if (arr(g(D, 'system.ram.modules', [])).length >= 2 && !ids['perf-xmp']) ok('Memory runs in dual channel');
    return list;
  }

  /* ---------------- scoring ---------------- */
  function score(findings) {
    var pen = 0; findings.forEach(function (f) { pen += PEN[f.sev] || 0; });
    var s = Math.max(0, Math.round(100 - pen));
    var areas = AREAS.map(function (a) {
      var p = 0; findings.forEach(function (f) { if (f.area === a) p += (f.sev === 'high' ? 20 : f.sev === 'medium' ? 8 : f.sev === 'low' ? 3 : 0); });
      return { name: a, score: Math.max(0, Math.round(100 - p)) };
    });
    var label = s >= 85 ? 'In good shape' : (s >= 60 ? 'Needs attention' : 'Needs work');
    return { score: s, label: label, areas: areas };
  }

  /* ---------------- Windows 11 readiness ---------------- */
  function ord(n) { var t = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (t[(v - 20) % 10] || t[v] || t[0]); }
  function cpuSupport(name) {
    name = String(name || '');
    var m;
    if (/Core\(TM\)\s*Ultra|Core\s*Ultra/i.test(name)) return { st: 'pass', d: 'Intel Core Ultra is supported.' };
    if ((m = name.match(/Core\(TM\)\s*(?:i[3579]|m[3579])-(\d{4,5})/i)) || (m = name.match(/\bi[3579]-(\d{4,5})/i))) {
      var digits = m[1], gen;
      gen = digits.length === 5 ? parseInt(digits.slice(0, 2), 10) : (digits.charAt(0) === '1' ? parseInt(digits.slice(0, 2), 10) : parseInt(digits.charAt(0), 10));
      if (gen >= 8) return { st: 'pass', d: 'Intel ' + ord(gen) + ' generation (8th or newer is needed).' };
      return { st: 'fail', d: 'Intel ' + ord(gen) + ' generation is too old. Windows 11 needs the 8th generation or newer.' };
    }
    if ((m = name.match(/Ryzen\s*(?:Threadripper\s*)?(?:PRO\s*)?\d?\s*(?:PRO\s*)?(\d)(\d{3})/i))) {
      var first = parseInt(m[1], 10);
      if (first >= 3) return { st: 'pass', d: 'AMD Ryzen ' + first + '000 series or newer is supported.' };
      if (first === 2) return { st: 'warn', d: 'AMD Ryzen 2000 series: desktop chips are supported, some mobile ones are not. Check Microsoft\'s list.' };
      return { st: 'fail', d: 'AMD Ryzen 1000 series is not supported by Windows 11.' };
    }
    if (/Snapdragon|Qualcomm/i.test(name)) return { st: 'warn', d: 'Qualcomm processors: only some are on Microsoft\'s list.' };
    if (/Pentium|Celeron|Atom|Xeon|Athlon|FX-|A\d-|EPYC/i.test(name)) return { st: 'unknown', d: 'This processor family needs a manual check against Microsoft\'s supported-processor list.' };
    return { st: 'unknown', d: 'Could not recognise the processor name.' };
  }
  function readiness() {
    var rows = [], s = D.system || {}, os = s.os || {}, cpu = s.cpu || {};
    function row(label, st, detail) { rows.push({ label: label, status: st, detail: detail }); }
    if (!RAW) return { rows: rows, verdict: '', level: 'unknown', alreadyWin11: false };
    var build = num(os.build);
    row('64-bit system', /64/.test(os.arch || '') ? 'pass' : (os.arch ? 'fail' : 'unknown'), os.arch || 'unknown');
    var cs = cpuSupport(cpu.name); row('Supported processor', cs.st, (cpu.name ? cpu.name + '. ' : '') + cs.d);
    var ramGB = num(g(s, 'ram.totalGB', 0));
    row('At least 4 GB of memory', ramGB >= 3.8 ? 'pass' : (ramGB ? 'fail' : 'unknown'), ramGB ? fmtGB(ramGB) : 'unknown');
    var biggest = 0; arr(D.volumes).forEach(function (v) { biggest = Math.max(biggest, num(v.sizeGB)); });
    var cVol = arr(D.volumes).filter(function (v) { return /^C:/i.test(v.letter); })[0];
    var sysSize = cVol ? num(cVol.sizeGB) : biggest;
    row('At least 64 GB of storage', sysSize >= 64 ? 'pass' : (sysSize ? 'fail' : 'unknown'), sysSize ? fmtGB(sysSize) + ' on the system drive' : 'unknown');
    var fw = s.firmware || '';
    row('UEFI firmware (not legacy BIOS)', fw === 'UEFI' ? 'pass' : (fw === 'BIOS' ? 'fail' : 'unknown'), fw ? fw : 'unknown');
    var sb = g(D, 'security.secureBoot', null);
    row('Secure Boot', sb === true ? 'pass' : (sb === false ? (fw === 'BIOS' ? 'fail' : 'warn') : (fw === 'BIOS' ? 'fail' : 'unknown')), sb === true ? 'on' : (sb === false ? 'off or not available. Often it can simply be switched on in the BIOS.' : 'could not be read'));
    var tpm = g(D, 'security.tpm', null);
    if (!tpm) row('TPM 2.0', 'warn', 'No TPM found. Many boards have it switched off in the BIOS (fTPM on AMD, PTT on Intel).');
    else if (/^2/.test(tpm.specVersion || '')) row('TPM 2.0', tpm.ready ? 'pass' : 'warn', 'version ' + tpm.specVersion + (tpm.ready ? '' : ', not ready'));
    else row('TPM 2.0', tpm.present ? 'fail' : 'warn', tpm.present ? 'TPM version ' + (tpm.specVersion || 'unknown') + ' is too old' : 'TPM not present');
    var fails = rows.filter(function (r) { return r.status === 'fail'; }).length;
    var warns = rows.filter(function (r) { return r.status === 'warn'; }).length;
    var unk = rows.filter(function (r) { return r.status === 'unknown'; }).length;
    var level = fails ? 'fail' : (warns ? 'warn' : (unk ? 'unknown' : 'pass'));
    var verdict = fails ? 'Not ready for Windows 11' : (warns ? 'Almost ready: only settings need changing' : (unk ? 'Probably ready, a few checks are unknown' : 'Ready for Windows 11'));
    return { rows: rows, verdict: verdict, level: level, alreadyWin11: build >= 22000, build: build };
  }

  var findings = RAW ? runRules() : [];
  var good = RAW ? goodChecks(findings) : [];
  var sc = score(findings);
  var counts = { high: 0, medium: 0, low: 0, info: 0 };
  findings.forEach(function (f) { counts[f.sev]++; });

  return {
    RAW: RAW, D: D, $: $, $$: $$, esc: esc, arr: arr, num: num, g: g, sum: sum, uniq: uniq, words: words,
    fmtNum: fmtNum, fmtGB: fmtGB, fmtDate: fmtDate, fmtDT: fmtDT, fmtUptime: fmtUptime, ageDays: ageDays,
    evGroups: evGroups, evCount: evCount, RE: RE, findings: findings, good: good, score: sc, counts: counts,
    SEV_ORDER: SEV_ORDER, AREAS: AREAS, readiness: readiness(), battery: g(D, 'battery', null)
  };
}
var V = Engine(window.__PCDATA__ || null);
V.Engine = Engine;
