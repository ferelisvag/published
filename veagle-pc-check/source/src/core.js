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
  var AREAS = ['Stability', 'Storage', 'Security', 'Network', 'Backup', 'Performance', 'Updates', 'Software'];
  function sing(s) { return typeof s === 'string' ? s.replace(/\b1 days\b/g, '1 day') : s; }
  function F(id, area, sev, title, why, steps, evidence) {
    return { id: id, area: area, sev: sev, title: sing(title), why: sing(why), steps: arr(steps), evidence: sing(evidence) || '' };
  }
  function S(t, cmd) { return { t: t, cmd: cmd || '' }; }

  /* ---------------- plain-language helpers (v0.3) ---------------- */
  function bugKey(c) { var n = parseInt(String(c).replace(/^0x/i, ''), 16); return isFinite(n) ? '0x' + n.toString(16) : String(c).toLowerCase(); }
  var BUGCODES = {
    '0x1a': ['MEMORY_MANAGEMENT', 'Windows found a problem with memory (RAM). Often bad RAM or a driver.'],
    '0x19': ['BAD_POOL_HEADER', 'A driver or bad RAM damaged Windows memory.'],
    '0xa': ['IRQL_NOT_LESS_OR_EQUAL', 'A driver touched memory it should not. Usually a faulty driver, sometimes RAM.'],
    '0xd1': ['DRIVER_IRQL_NOT_LESS_OR_EQUAL', 'A driver misbehaved, often network or Wi-Fi.'],
    '0x1e': ['KMODE_EXCEPTION_NOT_HANDLED', 'A program running deep inside Windows (usually a driver) crashed.'],
    '0x24': ['NTFS_FILE_SYSTEM', 'A problem reading the drive. Check the drive health.'],
    '0x3b': ['SYSTEM_SERVICE_EXCEPTION', 'A driver or security program clashed with Windows.'],
    '0x4e': ['PFN_LIST_CORRUPT', 'Bad RAM or a driver.'],
    '0x50': ['PAGE_FAULT_IN_NONPAGED_AREA', 'Windows asked for memory that was not there. Bad RAM or driver.'],
    '0x7a': ['KERNEL_DATA_INPAGE_ERROR', 'Windows could not read something from the drive. Failing drive, loose cable or bad RAM.'],
    '0x7e': ['SYSTEM_THREAD_EXCEPTION_NOT_HANDLED', 'A driver crashed.'],
    '0x7f': ['UNEXPECTED_KERNEL_MODE_TRAP', 'Hardware trouble: RAM, an overclock or overheating.'],
    '0x9f': ['DRIVER_POWER_STATE_FAILURE', 'A device did not wake up or go to sleep correctly. Often a laptop sleep or USB driver problem.'],
    '0xbe': ['ATTEMPTED_WRITE_TO_READONLY_MEMORY', 'A driver tried to write where it must not.'],
    '0xc2': ['BAD_POOL_CALLER', 'A driver asked for memory in a wrong way.'],
    '0xc5': ['DRIVER_CORRUPTED_EXPOOL', 'A driver damaged memory.'],
    '0xea': ['THREAD_STUCK_IN_DEVICE_DRIVER', 'The graphics driver got stuck.'],
    '0xef': ['CRITICAL_PROCESS_DIED', 'An essential part of Windows stopped. Damaged system files, a bad update or a failing drive.'],
    '0xf4': ['CRITICAL_OBJECT_TERMINATION', 'An essential process died, often because the drive stopped answering.'],
    '0x101': ['CLOCK_WATCHDOG_TIMEOUT', 'A CPU core stopped responding. Overclock, BIOS settings or a hot CPU.'],
    '0x109': ['CRITICAL_STRUCTURE_CORRUPTION', 'Memory was changed where it must not be. Driver or bad RAM.'],
    '0x116': ['VIDEO_TDR_FAILURE', 'The graphics card or its driver stopped answering.'],
    '0x117': ['VIDEO_TDR_TIMEOUT_DETECTED', 'The graphics card took too long to answer.'],
    '0x119': ['VIDEO_SCHEDULER_INTERNAL_ERROR', 'The graphics driver or card has an internal problem.'],
    '0x124': ['WHEA_UNCORRECTABLE_ERROR', 'The hardware itself reported a fatal error: CPU, RAM, or a device on the motherboard. Often an overclock or unstable memory settings.'],
    '0x133': ['DPC_WATCHDOG_VIOLATION', 'A driver or an SSD got stuck and froze Windows. Update the SSD firmware and drivers.'],
    '0x139': ['KERNEL_SECURITY_CHECK_FAILURE', 'Windows found damaged data. A driver or bad RAM.'],
    '0x154': ['UNEXPECTED_STORE_EXCEPTION', 'The drive (often an SSD) stopped answering.']
  };
  var NOISE = {
    'Microsoft-Windows-Kernel-Processor-Power|37': 'The processor ran slower than normal (heat or a power limit). A few are normal on laptops, many mean heat or a weak charger.',
    'Microsoft-Windows-Kernel-Power|37': 'The processor ran slower than normal (heat or a power limit).',
    'EventLog|6008': 'The previous shutdown was unexpected (power cut, crash or holding the power button).',
    'User32|1074': 'The PC was shut down or restarted by you or by a program. Normal.',
    'Microsoft-Windows-WER-SystemErrorReporting|1001': 'A blue screen was recorded. See the stability findings.',
    'BugCheck|1001': 'A blue screen was recorded. See the stability findings.',
    'Microsoft-Windows-DNS-Client|1016': 'A website name could not be looked up. A few are normal.',
    'Microsoft-Windows-WindowsUpdateClient|31': 'An update failed to download or install. Try again later and see the update findings.',
    'Microsoft-Windows-TPM-WMI|1801': 'Windows says the Secure Boot certificates need to be updated (the old ones expire in 2026). Install the Windows updates and, if offered, a BIOS update.',
    'Service Control Manager|7026': 'A driver could not start at boot. Usually an old or unused device.',
    'Service Control Manager|7022': 'A service hung while starting. Harmless if rare.',
    'Service Control Manager|7011': 'A service did not answer in time. Harmless if rare.',
    'storahci|129': 'A drive did not answer in time and was reset. Check the drive health and the cable.',
    'Microsoft-Windows-Windows Defender|1116': 'Windows Security found something suspicious. See the antivirus findings.',
    '.NET Runtime|1026': 'A .NET program crashed. See the crash list for which one.',
    'Windows Error Reporting|1001': 'A crash report was created. See the crash list.',
    'MsiInstaller|11707': 'A program was installed. Information only.',
    'Microsoft-Windows-DistributedCOM|10016': 'A harmless permission message. Windows prints it very often. Safe to ignore.',
    'Microsoft-Windows-DistributedCOM|10010': 'A background program was slow to start. Usually harmless, ignore unless something really does not work.',
    'Microsoft-Windows-DistributedCOM|10005': 'A Windows service could not start. Harmless if the related app (for example Xbox or Gaming Services) is not needed.',
    'Service Control Manager|7000': 'A service could not start. Matters only if the named service is something you use.',
    'Service Control Manager|7001': 'A service did not start because another one it needs did not start.',
    'Service Control Manager|7009': 'A service was too slow to start. Often seen after a slow boot. Usually harmless.',
    'Service Control Manager|7023': 'A service stopped with an error. Check the name: if it is a program you no longer use, ignore it.',
    'Service Control Manager|7031': 'A service crashed and Windows restarted it. A few are normal, many from the same name mean a broken program.',
    'Service Control Manager|7034': 'A service crashed by itself. Many times from the same name means a broken or incompatible program.',
    'Microsoft-Windows-Kernel-PnP|219': 'A driver could not load. Usually an old or unused device. Harmless unless a device really does not work.',
    'Microsoft-Windows-Kernel-Power|41': 'The PC restarted without a clean shutdown (power cut, crash or holding the power button). Not harmless if it repeats.',
    'Microsoft-Windows-WHEA-Logger|17': 'The hardware reported a small error it could fix. A few are normal. Many in a row can mean overclock or a failing part.',
    'Microsoft-Windows-WHEA-Logger|18': 'The hardware reported a serious error. Not harmless, see the stability findings.',
    'Microsoft-Windows-WHEA-Logger|19': 'The hardware reported a corrected error. A few are normal.',
    'Schannel|36887': 'A secure connection was refused by the other side. Harmless noise from browsers and programs.',
    'Schannel|36874': 'A program tried an old secure connection type that is no longer accepted. Harmless noise.',
    'Microsoft-Windows-GroupPolicy|1129': 'The PC could not reach a company network to read its rules. Normal at home.',
    'Microsoft-Windows-DNS-Client|1014': 'A website name took too long to be looked up. A few are normal on slow or busy networks.',
    'Microsoft-Windows-Time-Service|134': 'The clock could not sync with the internet time server for a moment. Harmless if rare.',
    'Microsoft-Windows-Time-Service|36': 'The clock has not synced for a while. Check the time sync finding.',
    'Microsoft-Windows-CAPI2|4176': 'A certificate file could not be read. Usually harmless background noise.',
    'Microsoft-Windows-CAPI2|513': 'The certificate service could not make a backup copy of a system file. Usually harmless.',
    'Microsoft-Windows-Diagnostics-Performance|100': 'Windows noted a slow start. See the boot time finding.',
    'Microsoft-Windows-Diagnostics-Performance|101': 'A program slowed down the start of Windows.',
    'Microsoft-Windows-WindowsUpdateClient|20': 'An update failed to install. Vendor driver extensions failing is usually harmless.',
    'Microsoft-Windows-WindowsUpdateClient|25': 'Windows could not check for updates this time. Try again later.',
    'Microsoft-Windows-FilterManager|3': 'Windows could not attach a file filter to a drive. Usually a USB drive. Harmless.',
    'Ntfs|55': 'Windows found a problem in the file system of a drive. Back up and run a drive check.',
    'Volsnap|36': 'The space reserved for restore points is full. See the System Restore finding.',
    'disk|7': 'Windows found a bad block on a drive. Not harmless: back up and check the drive health.',
    'disk|11': 'A drive did not answer correctly. Check the cable and the drive health.',
    'disk|51': 'A drive had a read or write error. Check the drive health.',
    'disk|153': 'Windows had to retry a read or write on a drive. A few are normal, many point to a failing drive or cable.',
    'nvlddmkm|153': 'The NVIDIA graphics driver restarted. A burst in a game is common. Many over time means a driver or heat problem.',
    'Display|4101': 'The graphics driver stopped responding and recovered. A few are normal, many mean a driver or heat problem.',
    'Application Error|1000': 'A program crashed. See which one in the crash list.',
    'Application Hang|1002': 'A program stopped responding and was closed.',
    'Microsoft-Windows-Search|10024': 'The Windows search indexer was closed. See the Windows Search finding.',
    'Tcpip|4266': 'Windows ran out of free network ports for a moment. See the network ports finding.',
    'Microsoft-Windows-BitLocker-Driver|24641': 'A BitLocker message during restart. Usually harmless if BitLocker works.'
  };
  function noiseFor(provider, id) { return NOISE[provider + '|' + id] || ''; }

  var META = {
    'stab-shutdown': [10, 'Easy', 'Safe'], 'stab-bsod': [20, 'Medium', 'Safe'], 'stab-bsod-codes': [5, 'Easy', 'Safe'], 'stab-whea': [30, 'Ask a pro', 'Careful'], 'stab-gpu': [10, 'Easy', 'Safe'],
    'stab-disk': [20, 'Medium', 'Back up first'], 'stab-dism': [60, 'Medium', 'Safe'], 'stab-crashes': [10, 'Easy', 'Safe'], 'stab-crashes-gone': [2, 'Easy', 'Safe'], 'stab-bsod-old': [2, 'Easy', 'Safe'], 'stab-services': [10, 'Easy', 'Safe'], 'stab-ports': [15, 'Ask a pro', 'Safe'],
    'stab-hangs': [5, 'Easy', 'Safe'], 'stab-search': [10, 'Easy', 'Safe'], 'stab-vss': [5, 'Medium', 'Safe'], 'stab-wu': [10, 'Easy', 'Safe'], 'stab-pending': [2, 'Easy', 'Safe'], 'stab-uptime': [2, 'Easy', 'Safe'], 'stab-index': [10, 'Easy', 'Safe'],
    'sto-health': [5, 'Ask a pro', 'Back up first'], 'sto-smart': [5, 'Ask a pro', 'Back up first'], 'sto-space': [15, 'Easy', 'Safe'], 'sto-trim': [5, 'Medium', 'Safe'], 'sto-hdd': [60, 'Medium', 'Back up first'], 'sto-temp': [10, 'Easy', 'Safe'],
    'sec-av': [10, 'Easy', 'Safe'], 'sec-av2': [15, 'Medium', 'Safe'], 'sec-avold': [5, 'Easy', 'Safe'], 'sec-fw': [2, 'Easy', 'Safe'], 'sec-uac': [2, 'Easy', 'Safe'], 'sec-sb': [15, 'Ask a pro', 'Careful'], 'sec-tpm': [15, 'Ask a pro', 'Careful'], 'sec-tpm2': [5, 'Medium', 'Safe'],
    'sec-legacy': [5, 'Medium', 'Safe'], 'sec-rdp': [3, 'Easy', 'Safe'], 'sec-remote': [10, 'Easy', 'Safe'], 'soft-vpn': [5, 'Easy', 'Safe'], 'sec-admins': [10, 'Medium', 'Safe'], 'sec-mi': [10, 'Medium', 'Safe'], 'sec-bl': [5, 'Easy', 'Safe'],
    'sec-def-sigs': [5, 'Easy', 'Safe'], 'sec-def-threats': [30, 'Medium', 'Safe'], 'sec-def-tamper': [2, 'Easy', 'Safe'], 'sec-def-scan': [5, 'Easy', 'Safe'], 'sec-rdp-nla': [3, 'Easy', 'Safe'], 'sec-autologon': [3, 'Easy', 'Safe'], 'sec-uac-level': [3, 'Easy', 'Safe'],
    'sec-smb1': [5, 'Medium', 'Safe'], 'sec-shares': [10, 'Medium', 'Safe'], 'sec-ports': [15, 'Ask a pro', 'Safe'], 'sec-activation': [10, 'Medium', 'Safe'], 'sec-unsigned': [20, 'Medium', 'Safe'],
    'net-link': [5, 'Easy', 'Safe'], 'net-gw': [10, 'Easy', 'Safe'], 'net-dns': [5, 'Easy', 'Safe'], 'net-time': [2, 'Easy', 'Safe'], 'net-wifi': [10, 'Easy', 'Safe'], 'net-proxy': [3, 'Easy', 'Safe'], 'net-hosts': [10, 'Medium', 'Safe'],
    'bak-none': [20, 'Easy', 'Safe'], 'bak-restore': [5, 'Easy', 'Safe'], 'bak-winre': [3, 'Medium', 'Safe'],
    'upd-patch': [15, 'Easy', 'Safe'], 'upd-apps': [15, 'Easy', 'Safe'], 'upd-bios': [30, 'Ask a pro', 'Careful'], 'upd-gpu': [10, 'Easy', 'Safe'], 'upd-devices': [10, 'Medium', 'Safe'], 'drv-bios-age': [10, 'Medium', 'Safe'],
    'perf-boot': [15, 'Easy', 'Safe'], 'perf-startup': [10, 'Easy', 'Safe'], 'perf-ram': [5, 'Easy', 'Safe'], 'perf-ramfull': [15, 'Medium', 'Safe'], 'perf-xmp': [15, 'Ask a pro', 'Careful'], 'perf-dual': [20, 'Medium', 'Safe'],
    'perf-fast': [60, 'Medium', 'Back up first'], 'perf-power': [2, 'Easy', 'Safe'], 'perf-services': [10, 'Medium', 'Safe'], 'soft-emu': [10, 'Easy', 'Safe'], 'soft-xtu': [10, 'Easy', 'Safe'], 'soft-opt': [10, 'Medium', 'Safe'],
    'sto-where': [5, 'Easy', 'Safe'], 'sto-installers': [10, 'Easy', 'Safe'], 'sto-winold': [10, 'Easy', 'Safe'], 'sto-wucache': [5, 'Easy', 'Safe'], 'sto-recycle': [3, 'Easy', 'Safe'], 'sto-bigfiles': [10, 'Easy', 'Safe'],
    'soft-pup': [15, 'Medium', 'Safe'], 'soft-avmany': [10, 'Medium', 'Safe'], 'gam-mode': [2, 'Easy', 'Safe'], 'gam-hags': [5, 'Easy', 'Safe'], 'gam-dvr': [2, 'Easy', 'Safe'],
    'cor-start': [20, 'Medium', 'Back up first'], 'cor-wake': [20, 'Medium', 'Safe'], 'cor-disk': [30, 'Ask a pro', 'Back up first'], 'cor-gpu': [15, 'Medium', 'Safe'], 'cor-hours': [10, 'Easy', 'Safe'], 'cor-boot': [10, 'Easy', 'Safe'], 'cor-power': [5, 'Easy', 'Safe'], 'cor-burst': [3, 'Easy', 'Safe'],
    'sec-guest': [2, 'Easy', 'Safe'], 'sec-nopass': [5, 'Easy', 'Safe'], 'sec-builtinadmin': [3, 'Easy', 'Safe'], 'sec-pwexp': [2, 'Easy', 'Safe'], 'sec-signed': [15, 'Medium', 'Safe'], 'sec-wifi-open': [5, 'Easy', 'Safe'], 'sec-ext': [10, 'Easy', 'Safe'], 'sec-lock': [3, 'Easy', 'Safe'], 'sec-blkey': [10, 'Easy', 'Safe'], 'sec-certs': [10, 'Ask a pro', 'Safe'],
    'perf-heat': [20, 'Medium', 'Safe'], 'perf-throttle': [15, 'Medium', 'Safe'], 'perf-slowstart': [10, 'Easy', 'Safe'], 'soft-office-eol': [30, 'Medium', 'Safe'], 'soft-office-act': [5, 'Easy', 'Safe'], 'win-eol-11': [45, 'Medium', 'Back up first'], 'upd-fail': [15, 'Medium', 'Safe'], 'upd-off': [3, 'Easy', 'Safe'],
    'bak-size': [2, 'Easy', 'Safe'], 'bak-onedrive': [5, 'Easy', 'Safe'], 'net-dnsfast': [10, 'Medium', 'Safe'], 'net-conn': [5, 'Easy', 'Safe'], 'pred-disk': [15, 'Easy', 'Safe'], 'pred-ssd': [10, 'Ask a pro', 'Back up first'], 'pred-bat': [5, 'Easy', 'Safe'],
    'sto-diskhealth': [20, 'Ask a pro', 'Back up first'], 'perf-gpuheat': [20, 'Medium', 'Safe'], 'hw-age': [2, 'Easy', 'Safe'], 'perf-bottleneck': [10, 'Easy', 'Safe'], 'sec-persist': [20, 'Ask a pro', 'Safe'], 'sec-hardening': [30, 'Medium', 'Safe'], 'sec-privacy': [15, 'Easy', 'Safe'], 'sto-caches': [5, 'Easy', 'Safe'], 'soft-unused': [15, 'Easy', 'Back up first'], 'sec-browser-old': [3, 'Easy', 'Safe'],
    'win-eol': [60, 'Medium', 'Back up first'], 'bat-wear': [10, 'Easy', 'Safe'], 'scan-quick': [5, 'Easy', 'Safe']
  };
  var PROFILES = {
    home: { label: 'Home PC', note: 'Balanced advice for a normal home computer.' },
    work: { label: 'Work or clinic PC', note: 'Security, backups and time sync count one level more.', areas: ['Security', 'Backup'], ids: ['net-time', 'sec-def-sigs'] },
    gaming: { label: 'Gaming PC', note: 'Graphics, memory speed and storage speed count one level more.', ids: ['gam-mode', 'gam-hags', 'gam-dvr', 'perf-xmp', 'stab-gpu', 'perf-power', 'upd-gpu', 'perf-dual', 'perf-fast', 'perf-boot', 'sto-hdd', 'sto-temp'] }
  };
  function bump(sev) { return sev === 'info' ? 'low' : (sev === 'low' ? 'medium' : 'high'); }
  function withProfile(base, key) {
    var p = PROFILES[key] || PROFILES.home;
    var out = base.map(function (f) {
      var hit = (p.areas && p.areas.indexOf(f.area) >= 0) || (p.ids && p.ids.indexOf(f.id) >= 0);
      if (!hit || f.sev === 'high') return f;
      var c = {}; Object.keys(f).forEach(function (k) { c[k] = f[k]; }); c.sev = bump(f.sev); c.raised = true; return c;
    });
    out.sort(function (a, b) { return SEV_ORDER[a.sev] - SEV_ORDER[b.sev]; });
    return out;
  }

  /* ---------------- rules ---------------- */
  var RT = {};
  function runRules() {
    var out = [];
    var days = num(g(D, 'events.days', 30), 30);
    var EX = g(D, 'extras', null) || {};
    function add(f) { if (Array.isArray(f)) { f.forEach(add); } else if (f) out.push(f); }
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
      var dl = arr(EX.dumps), dumps = dl.length ? dl.filter(function (x) { return (new Date(g(D, 'meta.generated', Date.now())).getTime() - new Date(x.time).getTime()) <= 30 * 86400000; }).length : num(g(D, 'crashDumps.dumps', 0));
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
        [S('Open PowerShell as administrator (press the Windows key, type PowerShell, right-click it, choose Run as administrator). Paste this and press Enter. It needs internet and takes 20 to 60 minutes on some PCs. The percentage often looks frozen at 20, 40 or 62 percent: that is normal, wait at least an hour before you worry. Do not switch the PC off.', 'DISM /Online /Cleanup-Image /RestoreHealth'),
         S('Then check system files.', 'sfc /scannow'),
         S('Restart, then run Windows Update again.')],
        g(D, 'dism.text', ''));
    });
    R(function () {
      var top = crashApps[0];
      if (!top || num(top.count) < 5) return null;
      var stem = String(top.app).replace(/\.exe$/i, '').replace(/(service|svc|helper|updater|launcher)$/i, '').toLowerCase();
      var stillThere = stem.length >= 4 ? appsMatching(new RegExp(stem.replace(/[^a-z0-9]/g, '.?').slice(0, 14), 'i')).length > 0 : true;
      var gone = top.exists === false || (top.exists == null && !stillThere && arr(D.apps && D.apps.list).length > 20);
      if (gone) {
        return F('stab-crashes-gone', 'Stability', 'info', top.app + ' crashed ' + top.count + ' times in ' + days + ' days, but it is no longer installed',
          'Windows remembers errors for 30 days. This program is not on your PC any more (you probably removed it), so there is nothing to fix. The old entries disappear by themselves.',
          [S('Nothing to do. If you removed it on purpose, you are done.'), S('If something odd still happens, look at the finding about services that are not running: leftovers of removed programs are the usual cause.')],
          crashApps.slice(0, 6).map(function (c) { return c.app + ' x' + c.count + (c.exists === false ? ' (file not found)' : ''); }).join(', '));
      }
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
        [S('Review them.', 'Get-LocalGroupMember -SID S-1-5-32-544'), S('Use a standard account for daily work.')], arr(g(D, 'extras.securityMore.adminNames', [])).join(', '));
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
      var pk = g(D, 'settings.powerPlanKind', ''); if (!(pk === 'saver' || (!pk && /saver/i.test(g(D, 'settings.powerPlan', '')))) || g(D, 'settings.hasBattery', false)) return null;
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
        [S('Run VEAGLE-PC-Check.bat (the full scan) when you have 3 to 8 minutes.')], '');
    });

    /* ================= v0.3: reliability, security details, network, backups ================= */
    function ids2(id) { return out.some(function (f) { return f.id === id; }); }
    var EX = g(D, 'extras', null) || {};
    var ADMINHOW = 'Press the Windows key, type PowerShell, right-click "Windows PowerShell" and choose "Run as administrator". Click Yes.';
    var SEC = EX.securityMore || {}, NT = EX.networkTest || {}, BK = EX.backup || {}, REL = EX.reliability || {};

    R(function () {
      var dl = arr(EX.dumps); if (!dl.length) return null;
      var gen = new Date(g(D, 'meta.generated', Date.now())).getTime();
      var recent = dl.filter(function (x) { return gen - new Date(x.time).getTime() <= 30 * 86400000; }).length;
      if (recent > 0 || evCount('system', /WER-SystemErrorReporting/, [1001]) > 0) return null;
      var newest = dl.map(function (x) { return new Date(x.time).getTime(); }).sort(function (a, b) { return b - a; })[0];
      var days = Math.round((gen - newest) / 86400000);
      return F('stab-bsod-old', 'Stability', 'info', 'Old blue screen files from ' + days + ' days ago (none in the last 30 days)',
        'Windows keeps a small file for each blue screen. Yours are from ' + days + ' days ago and no new ones appeared since, so this is history, not a current problem.',
        [S('Nothing to do while no new blue screens appear.'), S('Optional: delete the old files to free a little space. Open File Explorer, go to C:\\Windows\\Minidump and delete the files inside.')],
        dl.slice(0, 4).map(function (x) { return fmtDT(x.time) + (x.code ? ' ' + x.code : ''); }).join('\n'));
    });
    R(function () {
      var codes = arr(REL.bugchecks).filter(function (b) { return b.code; });
      if (!codes.length) codes = arr(EX.dumps).filter(function (b) { return b.code; });
      if (!codes.length) return null;
      var seen = {}, lines = [];
      codes.forEach(function (b) {
        var k = bugKey(b.code); if (seen[k]) { seen[k].n++; return; }
        seen[k] = { n: 1 }; lines.push({ k: k, code: b.code, time: b.time });
      });
      var plain = lines.map(function (l) { var d = BUGCODES[l.k]; return l.code + (seen[l.k].n > 1 ? ' (x' + seen[l.k].n + ')' : '') + (l.time ? ' (' + fmtDate(l.time) + ')' : '') + ': ' + (d ? d[0] + '. ' + d[1] : 'Windows did not record a name for this code, search the code on the internet.'); });
      return F('stab-bsod-codes', 'Stability', 'info', 'What your blue screens meant',
        'Every blue screen has a code. The code is a clue to what went wrong. Here is what yours say in plain words.',
        [S('Read the list under "Evidence" below. The part after the code is the likely cause.'),
         S('Start with the first fix of the matching finding above (drivers first, then memory test).'),
         S('If the same code keeps coming back, copy it into the AI help tab and ask.')],
        plain.join('\n'));
    });
    R(function () {
      var idx = REL.stabilityIndex; if (idx == null) return null;
      if (idx >= 5) return null;
      return F('stab-index', 'Stability', idx < 3 ? 'medium' : 'low', 'Windows gives its own reliability a low mark (' + idx + ' out of 10)',
        'Windows keeps a score of how stable it has been over the last week. 10 means no problems, 1 means a lot of crashes and errors. Yours is low.',
        [S('Open Reliability Monitor. It shows a calendar with a red X on each day something failed.', 'perfmon /rel'),
         S('Click a red day and read what failed. Often it is one program or one driver.'),
         S('Fix the matching finding from this report, then check again in a week.')],
        'Average this week ' + idx + ', latest ' + (REL.stabilityLatest != null ? REL.stabilityLatest : '?') + ' (10 is best).');
    });

    R(function () {
      var d = SEC.defender; if (!d || !d.realTimeOn && g(D, 'security.defender.realTime', false) !== true) return null;
      if (d.signatureAgeDays == null || d.signatureAgeDays >= 9999 || d.signatureAgeDays < 7) return null;
      var onlyWD = arr(g(D, 'security.antivirus', [])).filter(function (a) { return a.enabled && !/windows defender|microsoft defender/i.test(a.name || ''); }).length === 0;
      if (!onlyWD) return null;
      return F('sec-def-sigs', 'Security', d.signatureAgeDays >= 14 ? 'high' : 'medium', 'Your antivirus does not know the newest viruses (' + d.signatureAgeDays + ' days old)',
        'An antivirus compares files against a list of known viruses. The list is updated almost every day. Yours is ' + d.signatureAgeDays + ' days old, so new viruses can slip through.',
        [S('Open Start, type "Windows Security" and open it.'), S('Click "Virus & threat protection". Under "Protection updates" click "Check for updates", then "Check for updates" again.'),
         S('If it fails, run Windows Update (Settings, Windows Update, Check for updates) and restart.')],
        'Definitions are ' + d.signatureAgeDays + ' days old.');
    });
    R(function () {
      var d = SEC.defender; if (!d || d.threats30d == null || d.threats30d < 1) return null;
      return F('sec-def-threats', 'Security', 'high', 'Windows Security found ' + d.threats30d + ' threat' + (d.threats30d > 1 ? 's' : '') + ' in the last 30 days',
        'The built-in antivirus caught something dangerous. Most of the time it already removed or blocked it. Still, you should look at what it was and make sure it is really gone.',
        [S('Open Start, type "Windows Security" and open it. Click "Virus & threat protection", then "Protection history".'),
         S('Read each entry. If it says "Removed" or "Quarantined", it is handled. If it says "Action needed", click it and choose Remove.'),
         S('Run a full scan: in "Virus & threat protection" click "Scan options", choose "Full scan", click "Scan now". It can take an hour. You can keep working.'),
         S('If threats keep coming back, change your important passwords from a different, clean device.')],
        'Last detection: ' + (d.lastThreat ? fmtDT(d.lastThreat) : 'unknown'));
    });
    R(function () {
      var d = SEC.defender; if (!d || d.tamperProtected !== false || g(D, 'security.defender.realTime', false) !== true) return null;
      return F('sec-def-tamper', 'Security', 'low', 'Tamper protection is off',
        'Tamper protection stops viruses from switching your antivirus off. It should be on.',
        [S('Open Windows Security, "Virus & threat protection", then "Manage settings".'), S('Scroll down and turn "Tamper Protection" on.')], '');
    });
    R(function () {
      var d = SEC.defender; if (!d || g(D, 'security.defender.realTime', false) !== true) return null;
      var q = d.quickScanAgeDays, f = d.fullScanAgeDays;
      if (q == null && f == null) return null;
      var age = Math.min(q == null ? 9999 : q, f == null ? 9999 : f);
      if (age < 30) return null;
      return F('sec-def-scan', 'Security', 'low', 'No antivirus scan for ' + (age === 9999 ? 'a long time' : age + ' days'),
        'Windows Security normally scans by itself when the PC is idle. Long gaps usually mean the PC is always busy or switched off at night.',
        [S('Open Windows Security, "Virus & threat protection", click "Quick scan".'), S('Leave the PC switched on and plugged in some night so it can scan.')], '');
    });
    R(function () {
      if (g(D, 'security.rdpEnabled', null) !== true || SEC.nlaRequired !== false) return null;
      return F('sec-rdp-nla', 'Security', 'high', 'Remote Desktop is on and does not ask for a login first',
        'Remote Desktop lets other people use this PC over the network. "Network Level Authentication" makes them prove who they are before they even see the login screen. It is off here, which is the setting attackers hope for.',
        [S('Best: switch Remote Desktop off if you do not use it. Settings, System, Remote Desktop, switch it off.'),
         S('If you need it: in the same page click "Remote Desktop" arrow, and turn on "Require devices to use Network Level Authentication".')], '');
    });
    R(function () {
      if (SEC.autoLogon !== true) return null;
      return F('sec-autologon', 'Security', 'medium', 'Windows logs in by itself without a password',
        'Anyone who switches this PC on gets straight into your files and saved passwords. On a laptop that is stolen, that is very bad.',
        [S('Press Windows key + R, type netplwiz and press Enter.', 'netplwiz'),
         S('Tick "Users must enter a user name and password to use this computer", click OK and type your password if asked.')], '');
    });
    R(function () {
      if (SEC.uacPromptLevel !== 0 || g(D, 'security.uac', null) === false) return null;
      return F('sec-uac-level', 'Security', 'high', 'Windows never asks before programs change the system',
        'User Account Control is the box that asks "Do you want to allow this app to make changes?". It is set to "never ask", so a virus can change the system silently.',
        [S('Press the Windows key, type "Change User Account Control settings" and open it.'), S('Move the slider up to the second position from the top (the default) and click OK.')], '');
    });
    R(function () {
      if (SEC.smb1Enabled !== true || ids2('sec-legacy')) return null;
      return F('sec-smb1', 'Security', 'high', 'An old and unsafe file-sharing protocol (SMBv1) is on',
        'SMBv1 is about 30 years old and was used by famous viruses like WannaCry. Nothing modern needs it.',
        [S('Open PowerShell as administrator. ' + ADMINHOW), S('Paste this and press Enter.', 'Set-SmbServerConfiguration -EnableSMB1Protocol $false -Force'), S('Restart the PC.')], '');
    });
    R(function () {
      var s = arr(SEC.shares); if (!s.length) return null;
      return F('sec-shares', 'Security', 'low', s.length + ' folder' + (s.length > 1 ? 's are' : ' is') + ' shared on your network',
        'These folders can be opened by other computers on your network. That is fine at home if you did it on purpose. At work or on public Wi-Fi it can leak files.',
        [S('See the list under "Evidence". Do you recognise every folder and do you need it?'),
         S('To stop sharing, open File Explorer, right-click the folder, choose Properties, then the Sharing tab, then "Advanced Sharing" and untick "Share this folder".')],
        s.map(function (x) { return x.name + ' -> ' + x.path; }).join('\n'));
    });
    R(function () {
      var risky = { 21: 'FTP (old file transfer)', 23: 'Telnet (old remote login, no encryption)', 3389: 'Remote Desktop', 5900: 'VNC remote screen', 5985: 'Windows remote management', 1433: 'SQL Server database', 3306: 'MySQL database', 5432: 'PostgreSQL database', 27017: 'MongoDB database', 6379: 'Redis database' };
      var hits = arr(SEC.listening).filter(function (p) { return p.allInterfaces && risky[p.port]; });
      if (!hits.length) return null;
      return F('sec-ports', 'Security', 'medium', hits.length + ' risky network door' + (hits.length > 1 ? 's are' : ' is') + ' open',
        'A program on this PC is waiting for connections from the network on a "port" (think of a door). These doors are common targets for attackers. If you set them up on purpose, fine. If not, close them.',
        [S('Look at the list under "Evidence". For each line decide: do I use this?'),
         S('If not, uninstall the program named in the line (Settings, Apps, Installed apps).'),
         S('Make sure the Windows Firewall is on (see the Firewall check) so the internet cannot reach these doors.')],
        hits.map(function (p) { return 'port ' + p.port + ' - ' + risky[p.port] + ' - program: ' + (p.process || 'unknown'); }).join('\n'));
    });
    R(function () {
      var a = SEC.activation; if (a == null || a === 1) return null;
      return F('sec-activation', 'Security', 'medium', 'Windows is not properly activated',
        'An activated Windows gets all updates and has no watermark. Yours says it is not fully activated (status ' + a + ').',
        [S('Open Settings, System, Activation and read what it says.'), S('If you have a licence key, click "Change product key". If the PC came with Windows, sign in with the Microsoft account you used before and click "Troubleshoot".')], 'Licence status code ' + a + ' (1 means activated).');
    });
    R(function () {
      var u = arr(SEC.unsignedDrivers); if (!u.length) return null;
      return F('sec-unsigned', 'Security', 'medium', u.length + ' driver' + (u.length > 1 ? 's' : '') + ' without a digital signature',
        'A driver is a small program that runs with full power over the hardware. A signature proves it came from a real company and was not changed. Unsigned drivers are a risk and can cause blue screens.',
        [S('See the names under "Evidence".'), S('Go to the website of the maker, download the newest driver from there and install it over the old one.'), S('If you do not recognise the device, ask an AI in the AI help tab before you remove anything.')],
        u.map(function (x) { return x.device + (x.provider ? ' (' + x.provider + ')' : ''); }).join('\n'));
    });

    R(function () {
      var bad = [];
      arr(D.network && D.network.adapters).forEach(function (a) {
        if (a.virtual || !/^up$/i.test(a.status)) return;
        if (/wi-?fi|wireless|wlan|802\.11|bluetooth/i.test(a.name + ' ' + a.description)) return;
        var m = /([\d.]+)\s*(m|g)bps/i.exec(a.linkSpeed || ''); if (!m) return;
        var mb = parseFloat(m[1]) * (/g/i.test(m[2]) ? 1000 : 1);
        if (mb <= 100) bad.push(a.name + ' runs at ' + a.linkSpeed);
      });
      if (!bad.length) return null;
      return F('net-link', 'Network', 'low', 'Your network cable only runs at 100 Mbps',
        'Modern cables and routers run at 1000 Mbps (1 Gbps), ten times faster. A bad cable, a worn plug or an old switch drops the speed to 100.',
        [S('Unplug the cable at both ends and plug it back in firmly.'), S('Try a different network cable. A flat or thin old cable is often the cause (look for "Cat5e" or "Cat6" printed on it).'), S('Try another port on the router or switch.')],
        bad.join('; '));
    });
    R(function () {
      var p = NT.ping; if (!NT.gateway || !p) return null;
      if (p.lost >= p.sent) return F('net-gw', 'Network', 'high', 'This PC cannot reach your router',
        'Your PC sent 5 test messages to your router (the box that gives you internet) and got no answer. Either the network is down or something blocks it.',
        [S('Check the cable or the Wi-Fi connection.'), S('Restart the router: unplug it for 30 seconds, plug it back in, wait 2 minutes.'), S('Restart this PC.')], '5 of 5 test messages lost.');
      if (p.lost >= 2 || (p.avgMs != null && p.avgMs > 30)) return F('net-gw', 'Network', 'low', 'The connection to your router is slow or drops messages',
        'The test messages to your router took ' + (p.avgMs != null ? p.avgMs + ' ms' : 'long') + ' and ' + p.lost + ' of ' + p.sent + ' got lost. Good is under 5 ms on cable and under 20 ms on Wi-Fi.',
        [S('If you use Wi-Fi, move closer to the router or use a cable to test.'), S('Restart the router (unplug 30 seconds).'), S('Close downloads, streaming and cloud backups, then scan again.')],
        'Router reply time ' + p.avgMs + ' ms, lost ' + p.lost + ' of ' + p.sent + '.');
      return null;
    });
    R(function () {
      var d = NT.dns; if (!d) return null;
      if (d.ok === false) return F('net-dns', 'Network', 'medium', 'This PC could not look up a website name',
        'Before opening a site, the PC asks a "DNS server" for its address. That did not work now. It can mean you were offline during the scan, or the DNS setting is broken.',
        [S('Open a website in your browser. If it opens, ignore this (you were probably offline during the scan).'), S('If not: restart the router, then restart the PC.'),
         S('Still broken? Open PowerShell and run this, then try again.', 'ipconfig /flushdns')], '');
      if (d.ms != null && d.ms > 800) return F('net-dns', 'Network', 'low', 'Looking up website names is slow (' + d.ms + ' ms)',
        'Websites feel slow to start when the DNS server is slow. A fast one answers in under 100 ms.',
        [S('Open Settings, Network and internet, your connection, "DNS server assignment", Edit, choose Manual, turn on IPv4 and type 1.1.1.1 and 8.8.8.8.')], 'Lookup took ' + d.ms + ' ms.');
      return null;
    });
    R(function () {
      var t = NT.timeSync; if (!t || !t.local) return null;
      return F('net-time', 'Network', 'low', 'The PC clock is not synced with internet time',
        'Windows should check the time online. When it does not, the clock drifts, and then websites, email sign-in and security certificates start to fail.',
        [S('Open Settings, Time and language, Date and time, and click "Sync now".'), S('Make sure "Set time automatically" is turned on.')], 'Time source: ' + t.source);
    });
    R(function () {
      var w = NT.wifi; if (!w) return null;
      if (w.signalPct < 50) return F('net-wifi', 'Network', 'low', 'The Wi-Fi signal is weak (' + w.signalPct + '%)',
        'A weak signal means slow internet and dropped video calls.',
        [S('Move the PC or the router closer, with fewer walls in between.'), S('If your router has a 5 GHz network, connect to that one when you are close to it. It is faster.'), S('Switching the router to a higher location (a shelf) often helps more than anything else.')], 'Signal ' + w.signalPct + '%, ' + (w.band || 'band unknown') + ' ' + (w.radio || ''));
      if (/2\.4/.test(w.band || '')) return F('net-wifi', 'Network', 'info', 'You are on the slow 2.4 GHz Wi-Fi band',
        '2.4 GHz reaches far but is slow and crowded. 5 GHz is much faster at short distance.',
        [S('Open the Wi-Fi list (click the Wi-Fi icon near the clock) and connect to the network whose name ends with 5G, if you have one.')], 'Signal ' + w.signalPct + '%, ' + w.band);
      return null;
    });
    R(function () {
      if (NT.proxyEnabled !== true && NT.pacUrl !== true) return null;
      return F('net-proxy', 'Network', 'low', 'Your internet goes through a proxy',
        'A proxy is a middleman for all your web traffic. Companies use it on purpose. At home you normally have none, and some malware sets one up to watch or redirect your browsing.',
        [S('At work: ignore this, it is normal.'), S('At home: open Settings, Network and internet, Proxy. Turn off "Use a proxy server" and "Use setup script" unless you set them yourself.')], '');
    });
    R(function () {
      var h = arr(NT.hostsEntries); if (!h.length) return null;
      return F('net-hosts', 'Network', 'low', 'The "hosts" file has custom entries (' + h.length + ')',
        'The hosts file overrides website addresses on this PC. Developers and ad blockers use it on purpose. Malware also uses it to send you to fake websites.',
        [S('Read the lines under "Evidence". Do you recognise them?'), S('If a famous website (bank, Google, Microsoft) is in the list, that is suspicious: run a full antivirus scan and ask an AI in the AI help tab.')], h.join('\n'));
    });

    R(function () {
      var rp = BK.restorePoints || {}, apps = appNames.join(' | ');
      var cloud = BK.oneDriveFolders && (BK.oneDriveFolders.documents || BK.oneDriveFolders.desktop || BK.oneDriveFolders.pictures);
      var tool = /acronis|veeam|macrium|backblaze|idrive|duplicati|carbonite|cobian|freefilesync|easeus todo|syncthing|crashplan|aomei backupper|nas sync|synology drive|google drive|dropbox/i.test(apps);
      if (cloud || tool || BK.fileHistory === true) return null;
      if (BK.fileHistory == null && !BK.restorePoints) return null;
      return F('bak-none', 'Backup', 'medium', 'We could not find any backup of your files',
        'If this drive died today, could you get your photos and documents back? We found no File History, no OneDrive folder backup and no backup program. A backup on an external disk that we cannot see does not count here, so ignore this if you have one.',
        [S('Easiest: sign in to OneDrive and let it protect Desktop, Documents and Pictures. Click the OneDrive cloud icon near the clock, Settings, Sync and backup, "Manage backup".'),
         S('Or plug in an external disk: Settings, System, Storage, "Advanced storage settings", "Backup options", and follow the steps.'),
         S('Test it once: open a backed-up file from the backup, not from the PC.')], '');
    });
    R(function () {
      var rp = BK.restorePoints; if (!rp || !rp.readable) return null;
      if (rp.count > 0 && (rp.lastDaysAgo == null || rp.lastDaysAgo <= 90)) return null;
      return F('bak-restore', 'Backup', 'low', rp.count === 0 ? 'System Restore has no restore points' : 'The last restore point is ' + rp.lastDaysAgo + ' days old',
        'A restore point lets you go back to a time when Windows worked, after a bad update or driver. It is not a backup of your files, but it is a cheap safety net.',
        [S('Press the Windows key, type "Create a restore point" and open it.'), S('Select drive C:, click "Configure", choose "Turn on system protection", set about 5% and click OK.'), S('Click "Create", name it "Today" and click Create.')], '');
    });
    R(function () {
      if (BK.winRE !== false) return null;
      return F('bak-winre', 'Backup', 'medium', 'The Windows recovery environment is switched off',
        'This is the blue "Troubleshoot" menu that appears when Windows cannot start, and it is where Reset this PC and Startup Repair live. It is off, so when Windows breaks you might have no easy repair.',
        [S('Open PowerShell as administrator. ' + ADMINHOW), S('Paste this and press Enter.', 'reagentc /enable'), S('Check it with the next command. It should say Enabled.', 'reagentc /info')], '');
    });

    R(function () {
      var d = g(D, 'system.bios.date', null); if (!d) return null;
      var yrs = (Date.now() - new Date(d).getTime()) / 31557600000;
      if (!isFinite(yrs) || yrs < 4) return null;
      return F('drv-bios-age', 'Updates', yrs >= 6 ? 'low' : 'info', 'The BIOS is ' + Math.floor(yrs) + ' years old',
        'The BIOS is the first program that runs when the PC starts. Makers release new versions to fix bugs, security holes and support for new parts. Old ones are not always a problem, but it is worth a look.',
        [S('Find your exact model: press Windows key + R, type msinfo32 and read "System Model" and "BIOS Version".', 'msinfo32'),
         S('Go to the support page of the maker (Dell, HP, Lenovo, ASUS, MSI, Gigabyte) and search your model.'),
         S('Only update if the notes mention a fix that matters to you. Never switch the PC off during a BIOS update, and plug in a laptop first.')],
        'BIOS ' + g(D, 'system.bios.version', '') + ' dated ' + fmtDate(d));
    });

    /* ================= v0.4: disk space, unwanted software, gaming ================= */
    var STO = EX.storage || null, GAM = EX.gaming || {};
    function mbFmt(mb) { return mb >= 1024 ? fmtNum(mb / 1024, 1) + ' GB' : fmtNum(mb) + ' MB'; }
    function folderMB(name) { var f = arr(STO && STO.folders).filter(function (x) { return x.name === name; })[0]; return f ? num(f.mb) : 0; }
    R(function () {
      if (!STO || !arr(STO.folders).length) return null;
      var top = arr(STO.folders).filter(function (x) { return x.name !== 'Program Files' && x.name !== 'ProgramData'; }).slice(0, 6);
      var sys = arr(STO.systemFiles).map(function (x) { return x.name + ' ' + mbFmt(x.mb); });
      return F('sto-where', 'Storage', 'info', 'Where your disk space went',
        'This is a list of the biggest places on your drive, so you can see what is using space. Nothing here is wrong by itself. It helps you decide what to move or delete.',
        [S('Look at the list under "What we found". Folders such as Downloads, Videos and Desktop are yours: you decide what to keep.'),
         S('Do NOT delete anything from Windows or Program Files by hand. Use "Settings, System, Storage, Temporary files" for system leftovers.'),
         S('Move big things you rarely use (videos, old projects, installers) to an external disk or to OneDrive, then delete the copy on this PC.')],
        top.map(function (x) { return x.name + ': ' + mbFmt(x.mb) + (x.partial ? ' (at least)' : ''); }).join('\n') + (sys.length ? '\nSystem files: ' + sys.join(', ') : ''));
    });
    R(function () {
      var o = STO && STO.oldInstallers; if (!o || num(o.mb) < 500) return null;
      return F('sto-installers', 'Storage', 'low', 'Old installers in Downloads take ' + mbFmt(o.mb) + ' (' + o.count + ' files)',
        'Setup files (.exe, .msi), disk images (.iso) and archives (.zip, .rar) that you downloaded more than 2 months ago are usually not needed any more. The program they installed is already on your PC.',
        [S('Open File Explorer, then the Downloads folder. Click "Date modified" to sort the oldest first.'), S('Look at each old .exe, .msi, .iso, .zip, .rar file. If you do not need it, right-click it and choose Delete. It goes to the Recycle Bin first, so you can still get it back.'), S('Empty the Recycle Bin only when you are sure.')], '');
    });
    R(function () {
      var w = folderMB('Windows.old'); if (w < 1000) return null;
      return F('sto-winold', 'Storage', 'low', 'An old Windows copy (Windows.old) takes ' + mbFmt(w),
        'After a big Windows upgrade, Windows keeps the previous version for a while in case you want to go back. After about 10 days you usually do not need it, and it frees a lot of space. Windows removes it by itself after a month.',
        [S('Open Start, type "Disk Cleanup" and open it. Choose drive C:.'), S('Click "Clean up system files", wait, then tick "Previous Windows installation(s)" and click OK. You cannot go back to the older Windows afterwards.')], 'Windows.old: ' + mbFmt(w));
    });
    R(function () {
      var u = folderMB('Windows Update downloads'); if (u < 2000) return null;
      return F('sto-wucache', 'Storage', 'low', 'Windows Update leftovers take ' + mbFmt(u),
        'Windows keeps the files of past updates in a cache folder. It normally cleans it by itself. When it grows large, it can be cleaned safely.',
        [S('Open Settings, System, Storage, "Temporary files". Tick "Windows Update Cleanup" and "Delivery Optimization Files" and click Remove files.')], 'Cache: ' + mbFmt(u));
    });
    R(function () {
      var r = STO && STO.recycleBinMB; if (r == null || r < 1000) return null;
      return F('sto-recycle', 'Storage', 'low', 'The Recycle Bin holds ' + mbFmt(r),
        'Deleted files are not gone until the Recycle Bin is emptied. They still use space.',
        [S('Right-click the Recycle Bin on the Desktop and look inside first. Restore what you still need.'), S('Right-click the Recycle Bin again and choose "Empty Recycle Bin".')], '');
    });
    R(function () {
      var b = arr(STO && STO.bigFiles); if (!b.length) return null;
      var tot = sum(b, function (x) { return x.mb; });
      if (tot < 3000) return null;
      return F('sto-bigfiles', 'Storage', 'info', 'The ' + b.length + ' biggest files in your folders add up to ' + mbFmt(tot),
        'These are single files over 300 MB in Downloads, Documents, Desktop and Videos. Big files are the quickest way to free space.',
        [S('Read the list under "What we found". Do you still need each one?'), S('Move the ones you want to keep to an external disk. Delete the others (they go to the Recycle Bin first).')],
        b.map(function (x) { return mbFmt(x.mb) + '  ' + x.path + '  (' + fmtDate(x.modified) + ')'; }).join('\n'));
    });

    R(function () {
      var PUP = /driver\s*(booster|updater|easy|talent|genius)|driverpack|advanced\s*systemcare|iobit|pc\s*(cleaner|optimi[sz]er|speed|tune|accelerat)|reimage|mypc\s*backup|web\s*companion|ask\s*toolbar|conduit|babylon|wajam|opencandy|segurazo|slimware|registry\s*(cleaner|booster|fix)|system\s*mechanic|total\s*av|mackeeper|pc\s*app\s*store|coupon|search\s*protect|yac\b|delta\s*search/i;
      var hits = appsMatching(PUP).filter(function (n) { return !/^windows driver package/i.test(n); }); if (!hits.length) return null;
      return F('soft-pup', 'Software', hits.length >= 3 ? 'medium' : 'low', hits.length + ' program' + (hits.length > 1 ? 's' : '') + ' of the kind that often come bundled or do little good',
        'Some programs promise to "speed up" or "clean" your PC, update your drivers or protect you, and mostly show ads or scare you into paying. Others come hidden inside free downloads. Not every name on the list is bad, so check each one.',
        [S('Read the names under "What we found". Do you remember installing each one on purpose?'), S('If not, open Settings, Apps, Installed apps, click the three dots next to the name and choose Uninstall.'), S('Never install "driver updater" or "PC cleaner" programs. Windows Update and your PC maker already update drivers safely.'), S('After removing, restart and run a Quick scan in Windows Security.')],
        hits.join(', '));
    });
    R(function () {
      var all = appsMatching(/mcafee|norton|trend micro|kaspersky|avast|avg\b|bitdefender|eset|f-secure|webroot|sophos|panda|comodo|360 total/i);
      var fam = {}, famNames = {};
      all.forEach(function (n) { var k = (/mcafee/i.test(n) ? 'mcafee' : /norton/i.test(n) ? 'norton' : /trend micro/i.test(n) ? 'trend' : /kaspersky/i.test(n) ? 'kaspersky' : /avast|avg\b/i.test(n) ? 'avast' : /bitdefender/i.test(n) ? 'bitdefender' : /eset/i.test(n) ? 'eset' : /f-secure/i.test(n) ? 'fsecure' : /webroot/i.test(n) ? 'webroot' : /sophos/i.test(n) ? 'sophos' : /panda/i.test(n) ? 'panda' : /comodo/i.test(n) ? 'comodo' : 'other'); fam[k] = 1; (famNames[k] = famNames[k] || []).push(n); });
      var t = Object.keys(fam).map(function (k) { return famNames[k][0]; });
      var av = arr(g(D, 'security.antivirus', [])).filter(function (a) { return a.enabled; });
      var thirdActive = av.filter(function (a) { return !/windows defender|microsoft defender/i.test(a.name || ''); });
      if (t.length < 2 || ids2('sec-av2')) return null;
      return F('soft-avmany', 'Software', 'low', t.length + ' antivirus-type programs are installed',
        'Having several antivirus programs slows the PC and they can fight each other. One good antivirus is enough. Windows Security (Defender) is already included.',
        [S('Open Settings, Apps, Installed apps. Keep one security program (or none, and use Windows Security), and uninstall the rest.'), S('Some makers offer a removal tool on their website. Use it if a normal uninstall fails.')], t.join(', ') + (thirdActive.length ? ' (active: ' + thirdActive.map(function (a) { return a.name; }).join(', ') + ')' : ''));
    });

    R(function () {
      if (GAM.gameMode !== false) return null;
      return F('gam-mode', 'Performance', 'info', 'Game Mode is switched off',
        'Game Mode tells Windows to give your game priority and to hold back updates and background work while you play. It is on by default and helps a little, mostly on weaker PCs.',
        [S('Open Settings, Gaming, Game Mode, and switch it on.')], '');
    });
    R(function () {
      if (GAM.hags !== false) return null;
      var gp = arr(D.gpus).filter(function (x) { return /nvidia|amd|radeon/i.test(x.name || ''); })[0];
      if (!gp) return null;
      return F('gam-hags', 'Performance', 'info', 'Hardware-accelerated GPU scheduling is off',
        'This setting lets the graphics card manage its own memory. On recent graphics cards and drivers it can make games a little smoother. On some PCs it makes no difference or causes problems, so test it and keep what works.',
        [S('Open Settings, System, Display, Graphics, "Change default graphics settings".'), S('Switch "Hardware-accelerated GPU scheduling" on and restart. Play your usual game. If it stutters or crashes, switch it back off.')], gp.name);
    });
    R(function () {
      if (GAM.gameDvr !== true) return null;
      return F('gam-dvr', 'Performance', 'info', 'Xbox game recording is switched on in the background',
        'Windows can quietly record gameplay clips in the background. This costs a little speed in games. If you never use it, you can switch it off.',
        [S('Open Settings, Gaming, Captures, and switch "Record what happened" off.')], '');
    });

    /* ================= v0.5: connecting the dots between events and problems ================= */
    var TL = arr(EX.timeline).map(function (e) { return { t: new Date(e.t).getTime(), k: e.k, x: String(e.x || '') }; }).filter(function (e) { return isFinite(e.t); }).sort(function (a, b) { return a.t - b.t; });
    var H = 3600000, MIN = 60000;
    var end30 = new Date(g(D, 'meta.generated', Date.now())).getTime() - days * 86400000;
    var BAD = { crash: 1, unclean: 1, bsod: 1, hang: 1, gpu: 1, disk: 1, svc: 1, whea: 1 };
    function ofKind() { var ks = Array.prototype.slice.call(arguments); return TL.filter(function (e) { return ks.indexOf(e.k) >= 0; }); }
    function when(ms) { return fmtDT(new Date(ms).toISOString()); }
    function within(ms, list, before, after) { return list.filter(function (e) { return e.t >= ms - before && e.t <= ms + after; }); }
    function trigName(e) { return (e.k === 'update' ? 'a Windows update' : e.k === 'install' ? 'the installation of ' : e.k === 'svcinst' ? 'a new background service' : 'the removal of ') + (e.k === 'update' ? ' (' + e.x + ')' : e.x ? e.x : ''); }
    var NICE = { crash: 'program crashes', unclean: 'unexpected shutdowns', bsod: 'blue screens', hang: 'programs that froze', gpu: 'graphics driver errors', disk: 'drive errors', svc: 'service crashes', whea: 'hardware errors' };

    R(function () {
      if (TL.length < 10) return null;
      var best = null;
      Object.keys(BAD).forEach(function (kind) {
        var evs = ofKind(kind); if (evs.length < 4) return;
        var first = evs[0].t;
        if (first - end30 < 5 * 86400000) return;
        var trig = TL.filter(function (e) { return (e.k === 'update' || e.k === 'install' || e.k === 'svcinst') && e.t <= first && first - e.t <= 72 * H; }).pop();
        if (!trig) return;
        var before = evs.filter(function (e) { return e.t < trig.t; }).length;
        var after = evs.length - before;
        if (after < 4 || before > after * 0.2) return;
        if (!best || after > best.after) best = { kind: kind, trig: trig, first: first, after: after, before: before };
      });
      if (!best) return null;
      var isWU = best.trig.k === 'update';
      return F('cor-start', 'Stability', best.after >= 12 ? 'medium' : 'low', 'The ' + NICE[best.kind] + ' started right after ' + trigName(best.trig),
        'Looking at the time of each event, ' + NICE[best.kind] + ' first appeared ' + Math.round((best.first - best.trig.t) / H) + ' hour(s) after ' + trigName(best.trig) + ' and happened ' + best.after + ' times since. Before that, it was almost never there. That is a strong clue about the cause.',
        isWU ? [S('Do not panic. This does not prove the update is to blame, but it is the first thing to check.'), S('Create a restore point first: press the Windows key, type "Create a restore point", click Create.'),
               S('Open Settings, Windows Update, Update history, scroll down and click "Uninstall updates". Find the update from that day and click Uninstall. Restart and see if the problem is gone.'), S('If it is gone, pause updates for a week (Settings, Windows Update, Pause) and ask someone before you update again.')]
             : [S('This does not prove the program is to blame, but it is the first thing to check.'), S('Open Settings, Apps, Installed apps. Find the program installed around that time, click the three dots and choose Uninstall. Restart and see if the problem is gone.'),
               S('If you need the program, install the newest version from the maker\'s website, or tell the AI help tab what you see.')],
        'First ' + NICE[best.kind] + ': ' + when(best.first) + '\nThe change: ' + trigName(best.trig) + ' on ' + when(best.trig.t) + '\nBefore the change: ' + best.before + ' events. After: ' + best.after + ' events.');
    });

    R(function () {
      var crashes = ofKind('bsod', 'unclean'); if (crashes.length < 2) return null;
      var wakes = ofKind('wake', 'sleep'); if (!wakes.length) return null;
      var hit = crashes.filter(function (c) { return within(c.t, wakes, 15 * MIN, 0).length > 0; });
      if (hit.length < 2 || hit.length < crashes.length * 0.4) return null;
      return F('cor-wake', 'Stability', 'medium', hit.length + ' of ' + crashes.length + ' crashes happened right after the PC woke from sleep',
        'The PC crashed within minutes of waking up from sleep, again and again. The usual cause is a driver (graphics, network, USB or chipset) that does not wake up properly, or a power setting.',
        [S('Do not use Sleep for now: Settings, System, Power, set "Screen and sleep" to Never for the sleep options. See if the crashes stop.'),
         S('Update the graphics, network and chipset drivers from the website of the PC or motherboard maker (not from a "driver updater" program).'),
         S('Turn off Fast Startup: Control Panel, Power Options, "Choose what the power buttons do", untick "Turn on fast startup".'),
         S('If it still happens, copy the dates shown below into the AI help tab and ask.')],
        hit.slice(-6).map(function (c) { return when(c.t) + ' ' + (c.k === 'bsod' ? 'blue screen' : 'unexpected shutdown'); }).join('\n'));
    });

    R(function () {
      var crashes = ofKind('bsod', 'unclean'); if (crashes.length < 2) return null;
      var disk = ofKind('disk'); if (!disk.length) return null;
      var hit = crashes.filter(function (c) { return within(c.t, disk, 15 * MIN, 0).length > 0; });
      if (hit.length < 2) return null;
      return F('cor-disk', 'Storage', 'high', 'Drive errors came right before ' + hit.length + ' crashes',
        'Just before the PC crashed or switched off by itself, Windows wrote an error about a drive. A drive or its cable that is failing can freeze the whole PC. This is serious because it can also lose your files.',
        [S('Copy your important files to another drive or to the cloud, today.'), S('Open the Hardware tab and look at the drive health and temperature.'),
         S('If the drive is an old SATA one, shut down, unplug the power, and reseat the thin data cable at both ends (or ask someone to do it).'), S('Run the check from the matching "Drive or file system errors" finding. If errors keep coming, plan to replace the drive.')],
        hit.slice(-6).map(function (c) { return when(c.t); }).join('\n'));
    });

    R(function () {
      var bad = ofKind('crash', 'hang', 'bsod'); if (bad.length < 3) return null;
      var gpu = ofKind('gpu'); if (!gpu.length) return null;
      var hit = bad.filter(function (c) { return within(c.t, gpu, 5 * MIN, 0).length > 0; });
      if (hit.length < 3 || hit.length < bad.length * 0.3) return null;
      return F('cor-gpu', 'Stability', 'medium', hit.length + ' crashes came right after a graphics driver error',
        'Right before a program crashed or froze, the graphics driver had a problem. That points to the graphics driver (or heat or power for the graphics card) as the real cause, not the program that crashed.',
        [S('Install the newest stable driver from nvidia.com, amd.com or intel.com (the website of the maker of your graphics card).'), S('If it keeps happening, do a clean install: in the driver installer choose "Custom" and tick "Perform a clean installation".'),
         S('Check that the graphics card is not too hot: clean the dust, make sure its fans spin.')],
        hit.slice(-6).map(function (c) { return when(c.t) + ' ' + (c.k === 'bsod' ? 'blue screen' : c.k === 'hang' ? 'froze: ' + c.x : 'crash: ' + c.x); }).join('\n'));
    });

    R(function () {
      var bad = ofKind('crash', 'unclean', 'bsod', 'hang'); if (bad.length < 6) return null;
      var hours = []; for (var i = 0; i < 24; i++) hours.push(0);
      bad.forEach(function (e) { hours[new Date(e.t).getHours()]++; });
      var best = 0, bh = 0;
      for (var h = 0; h < 24; h++) { var s = hours[h] + hours[(h + 1) % 24] + hours[(h + 2) % 24]; if (s > best) { best = s; bh = h; } }
      if (best < bad.length * 0.6) return null;
      var pad = function (n) { return (n < 10 ? '0' : '') + n; };
      return F('cor-hours', 'Stability', 'low', 'Most crashes (' + best + ' of ' + bad.length + ') happen between ' + pad(bh) + ':00 and ' + pad((bh + 3) % 24) + ':00',
        'Problems that always happen at the same time of day usually come from something that starts at that time: a scheduled task, a backup, a Windows update, a game or program you open every day, or the PC going to sleep.',
        [S('Think: what do you do, or what runs by itself, at that time? Backup? Antivirus scan? A game?'), S('Open Task Scheduler (press the Windows key, type "Task Scheduler") and look at the tasks that run around that time.'),
         S('Try moving that activity to another time of day and see if the problems follow it.')], '');
    });

    R(function () {
      var boots = ofKind('boot'); var ups = ofKind('update'); if (boots.length < 6 || !ups.length) return null;
      var up = ups[ups.length - 1];
      var b4 = boots.filter(function (b) { return b.t < up.t; }), af = boots.filter(function (b) { return b.t >= up.t; });
      if (b4.length < 3 || af.length < 3) return null;
      var avg = function (a) { return a.reduce(function (s, b) { return s + parseFloat(b.x); }, 0) / a.length; };
      var x = avg(b4), y = avg(af);
      if (!(y > x * 1.4 && y - x > 10)) return null;
      return F('cor-boot', 'Performance', 'low', 'Windows starts slower since the update on ' + when(up.t).split(',')[0],
        'Before that update the PC started in about ' + Math.round(x) + ' seconds. Since then it takes about ' + Math.round(y) + ' seconds. A new background program or driver that came with the update, or a program that now starts with Windows, is the usual cause.',
        [S('Open Task Manager (Ctrl + Shift + Esc), click "Startup apps", and switch off what you do not need.'), S('Restart twice. The first start after an update is slower.'), S('If it is still slow, see the "Windows takes about N seconds to start" finding for the list of slow programs.')],
        'Average start before the update: ' + Math.round(x) + ' s (' + b4.length + ' starts). After: ' + Math.round(y) + ' s (' + af.length + ' starts).');
    });

    R(function () {
      var un = ofKind('unclean'); if (un.length < 2) return null;
      var sd = ofKind('shutdown', 'wake');
      var forced = un.filter(function (u) { return within(u.t, sd, 6 * MIN, 0).length === 0 && within(u.t, ofKind('bsod'), 0, 6 * MIN).length === 0; });
      if (forced.length < 2) return null;
      return F('cor-power', 'Stability', 'low', forced.length + ' times the PC lost power or was switched off with the button',
        'These ' + forced.length + ' restarts were not preceded by a normal shutdown, a wake from sleep or a blue screen. That means the power was cut, the power button was held, or the PC shut itself off because of heat.',
        [S('Was it a power cut or did you hold the button? If yes, ignore this.'), S('If not, check the PC for dust and heat (is it very hot to touch?), and the power cable or the laptop charger.'), S('Consider a small UPS (battery backup) if power cuts are common where you live.')],
        forced.slice(-6).map(function (u) { return when(u.t); }).join('\n'));
    });

    R(function () {
      var bad = ofKind('crash', 'unclean', 'bsod', 'hang', 'gpu', 'disk', 'svc'); if (bad.length < 10) return null;
      var perDay = {}; bad.forEach(function (e) { var d = new Date(e.t).toDateString(); perDay[d] = (perDay[d] || 0) + 1; });
      var top = Object.keys(perDay).sort(function (a, b) { return perDay[b] - perDay[a]; })[0];
      if (perDay[top] < bad.length * 0.5) return null;
      var dayStart = new Date(top).getTime();
      var that = TL.filter(function (e) { return e.t >= dayStart - 12 * H && e.t < dayStart + 36 * H && (e.k === 'update' || e.k === 'install' || e.k === 'svcinst' || e.k === 'uninstall'); });
      return F('cor-burst', 'Stability', 'info', 'Most problems (' + perDay[top] + ' of ' + bad.length + ') happened on one day: ' + new Date(top).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        'When almost everything went wrong on a single day, something happened that day. A one-day burst is often harmless and does not come back. It is more worrying if it repeats.',
        [S('Do you remember what you did that day (new program, update, travel, power cut)?'), S('If the problems have stopped since, there is nothing to do. If they come back, run the scan again in a few days.')],
        that.length ? (function () { var seen = {}, out2 = []; that.forEach(function (e) { var k = e.k + '|' + e.x + '|' + Math.floor(e.t / H); if (!seen[k]) { seen[k] = 1; out2.push(when(e.t) + ' ' + trigName(e)); } }); return out2.slice(0, 6).join('\n') + (out2.length > 6 ? '\n...' : ''); })() : 'No install or update events were found around that day.');
    });


    /* ===== 0.6.0: accounts, signatures, add-ons, lock, licences, certificates, updates, predictions, network ===== */
    var X6 = EX.more || {};
    var NOW6 = new Date(g(D, 'meta.generated', Date.now())).getTime();
    function nameList(a, f, max) { var l = a.map(f); return l.slice(0, max || 12).join('\n') + (l.length > (max || 12) ? '\n... +' + (l.length - (max || 12)) + ' more' : ''); }

    R(function () {
      var a = arr(X6.accounts).filter(function (u) { return u.isGuest && u.enabled; });
      if (!a.length) return null;
      return F('sec-guest', 'Security', 'medium', 'The "Guest" account is switched on',
        'The Guest account lets anyone use this PC without a real account. Nobody needs it today and it is a favourite door for attackers.',
        [S('Open PowerShell as administrator. ' + ADMINHOW), S('Paste this and press Enter. It only switches the Guest account off.', 'net user guest /active:no')], 'Account: ' + a[0].name);
    });
    R(function () {
      var a = arr(X6.accounts).filter(function (u) { return u.enabled && u.noPassword && !u.isGuest; });
      if (!a.length) return null;
      var adm = a.some(function (u) { return u.isAdmin; });
      return F('sec-nopass', 'Security', 'low', a.length + ' account' + (a.length > 1 ? 's are' : ' is') + ' allowed to have no password',
        'Windows says ' + (a.length > 1 ? 'these accounts do not have to have' : 'this account does not have to have') + ' a password. That does not mean it is empty: accounts that sign in with a PIN or a Microsoft account often show like this. But if it really is empty, anybody who can sit at the PC could use it. ' + (adm ? 'At least one of them is an administrator, so it is worth checking.' : ''),
        [S('Press the Windows key, type "Sign-in options" and open it. If you see "Password" with a Change button, a password exists and you are fine.'), S('If it says "Add" instead, add a strong password (12 characters or more; a short sentence you will remember works well).')],
        nameList(a, function (u) { return u.name + (u.isAdmin ? ' (administrator)' : ''); }));
    });
    R(function () {
      var a = arr(X6.accounts).filter(function (u) { return u.isBuiltinAdmin && u.enabled; });
      if (!a.length) return null;
      return F('sec-builtinadmin', 'Security', 'medium', 'The hidden built-in "Administrator" account is switched on',
        'Windows has a special all-powerful account that is normally off. When it is on, attackers know its name and only need to guess the password.',
        [S('Open PowerShell as administrator. ' + ADMINHOW), S('Paste this and press Enter. Make sure you can sign in with another administrator account first.', 'net user administrator /active:no')], 'Account: ' + a[0].name);
    });
    R(function () {
      var a = arr(X6.accounts).filter(function (u) { return u.enabled && u.neverExpires && !u.isGuest && !u.noPassword && u.isAdmin; });
      if (!a.length) return null;
      return F('sec-pwexp', 'Security', 'info', 'The password of an administrator account never expires',
        'This is normal at home. At work, a password that never changes means a leaked password stays useful forever.',
        [S('At home: nothing to do. Just make sure the password is long and not used anywhere else.'), S('At work: ask your IT team if a password policy is needed.')],
        nameList(a, function (u) { return u.name; }));
    });
    R(function () {
      var s = X6.signatures; if (!s || !arr(s.flagged).length) return null;
      var f = arr(s.flagged), odd = f.filter(function (x) { return x.oddFolder; });
      return F('sec-signed', 'Security', odd.length ? 'medium' : 'low', f.length + ' of ' + s.checked + ' start-up programs have no valid digital signature',
        'A digital signature proves a program comes from a real company and was not changed. Many harmless small tools are unsigned, but malware almost always is. The ones that run from a "Temp" or "Downloads" folder deserve a closer look.',
        [S('See the list under "Evidence". Do you recognise each program?'), S('If you do not, search its file name on the internet or ask an AI in the AI help tab before you do anything.'), S('To stop one starting with Windows: press Ctrl+Shift+Esc, open the Startup apps tab, right-click it and choose Disable.')],
        nameList(f, function (x) { return x.name + ' (' + x.file + ') - ' + (x.status === 'NotSigned' ? 'not signed' : x.status) + (x.signer ? ' by ' + x.signer : '') + (x.oddFolder ? ' - runs from: ' + x.folder : ''); }));
    });
    R(function () {
      var w = arr(X6.wifiSaved);
      var open = w.filter(function (x) { return /^open$/i.test(x.auth) && /^none$/i.test(x.enc); });
      var weak = w.filter(function (x) { return /^(shared)$/i.test(x.auth) || /^wep$/i.test(x.enc) || /^WPAPSK$/i.test(x.auth) || /^WPA$/i.test(x.auth); });
      var bad = open.concat(weak); if (!bad.length) return null;
      return F('sec-wifi-open', 'Security', 'low', bad.length + ' saved Wi-Fi network' + (bad.length > 1 ? 's are' : ' is') + ' open or old and unsafe',
        'Your PC remembers these networks and joins them by itself. Anyone can copy the name of an open network (for example a cafe) and trick your PC into connecting to a fake one.',
        [S('Press the Windows key, type "Manage known networks" and open it.'), S('Click each network from the list under "Evidence" and choose Forget.')],
        nameList(bad, function (x) { return x.name + ' - ' + (/^open$/i.test(x.auth) ? 'no password' : 'old security (' + (x.auth || x.enc) + ')'); }));
    });
    R(function () {
      var ex = arr(X6.browserExt); if (!ex.length) return null;
      var strong = ex.filter(function (e) { return (e.allUrls && arr(e.risky).length >= 2) || arr(e.risky).some(function (p) { return /^(proxy|debugger|nativeMessaging)$/.test(p); }); });
      if (!strong.length) return null;
      return F('sec-ext', 'Security', 'low', strong.length + ' browser add-on' + (strong.length > 1 ? 's have' : ' has') + ' wide powers: they can see or change what you do on websites',
        'Browser add-ons (extensions) are tiny programs inside your browser. Some need wide powers to do their job: ad blockers, VPNs, password managers and crypto wallets are normal examples. The risk is a forgotten or unknown add-on with the same powers, a common way to steal data. So: keep the ones you know and use, remove the rest.',
        [S('Open your browser and type chrome://extensions (Chrome) or edge://extensions (Edge) in the address bar.'), S('Compare with the list under "Evidence". For every add-on you do not use or do not know, click Remove.'), S('Keep only what you really need.')],
        nameList(strong, function (e) { return e.browser + ': ' + e.name + ' - ' + (e.allUrls ? 'all websites, ' : '') + arr(e.risky).slice(0, 4).join(', '); }, 15));
    });
    R(function () {
      var L = X6.lock; if (!L) return null;
      var laptop = !!g(D, 'system.isLaptop', false);
      var wakeOff = L.lockOnWake && (L.lockOnWake.ac === false || L.lockOnWake.dc === false);
      var idleLock = L.screensaverSecure || (L.inactivityLimitSec && L.inactivityLimitSec > 0);
      if (!wakeOff && idleLock) return null;
      if (!wakeOff && !laptop) return null;
      return F('sec-lock', 'Security', 'low', wakeOff ? 'The PC does not ask for your password after sleep' : 'The screen does not lock by itself when you walk away',
        wakeOff ? 'When the PC wakes up from sleep it opens straight on your desktop. Anybody who picks it up sees everything.' : 'If you leave the PC for a few minutes, anybody can sit down and use it. On a laptop this also covers theft.',
        [S('Press the Windows key, type "Sign-in options" and open it.'), S('Under "If you have been away, when should Windows require you to sign in again?" choose "Every time".'), S('Tip: press Windows key + L to lock the PC yourself whenever you stand up.')], '');
    });
    R(function () {
      var k = arr(X6.bitlockerKeys); if (!k.length) return null;
      var nokey = k.filter(function (x) { return !x.hasRecoveryKey; });
      if (nokey.length) return F('sec-blkey', 'Security', 'medium', 'BitLocker is on but has no recovery key',
        'If Windows ever asks for the recovery key (after a BIOS change or a hardware repair) and you do not have it, the files on the drive are lost for good.',
        [S('Open PowerShell as administrator. ' + ADMINHOW), S('Paste this and press Enter, then save the long number it prints: manage-bde -protectors -add C: -RecoveryPassword', 'manage-bde -protectors -add C: -RecoveryPassword'), S('Keep the number on paper or in your password manager, never only on this PC.')],
        nokey.map(function (x) { return x.letter; }).join(', '));
      return F('sec-blkey', 'Security', 'info', 'Reminder: keep your BitLocker recovery key outside this PC',
        'Your drive is encrypted. If Windows ever asks for the recovery key, you need it. It is not stored by this app, we never read it.',
        [S('Go to https://aka.ms/myrecoverykey and sign in with your Microsoft account. If your key is listed there, you are fine.'), S('If not, press the Windows key, type "Manage BitLocker", choose "Back up your recovery key" and save it to a USB stick or print it. Keep it away from this PC.')],
        k.map(function (x) { return x.letter + ' has a recovery key'; }).join('\n'));
    });
    R(function () {
      var T = X6.thermal; if (!T) return null;
      var r = [];
      if (T.tempC != null && T.tempC >= 75) r.push(F('perf-heat', 'Performance', T.tempC >= 90 ? 'high' : (T.tempC >= 82 ? 'medium' : 'low'), 'The PC was hot during the scan (' + T.tempC + ' degrees C)',
        'The scan itself is light work, so a hot PC at this moment means the cooling is struggling. Heat makes the PC slower, noisy and shortens the life of parts.',
        [S('Check that the vents are free: nothing under a laptop, nothing in front of the fans.'), S('Blow out dust from the vents with a can of compressed air (PC switched off).'), S('If it stays hot, ask a technician about new thermal paste or a better cooler.')], 'Highest temperature sensor: ' + T.tempC + ' C'));
      if (num(T.throttleEvents30d) >= 1) r.push(F('perf-throttle', 'Performance', T.throttleEvents30d >= 20 ? 'medium' : 'low', 'The processor was slowed down ' + T.throttleEvents30d + ' time' + (T.throttleEvents30d > 1 ? 's' : '') + ' in the last 30 days',
        'Windows recorded that the processor had to run slower than normal. The usual reasons are heat, dust or a power limit (battery saver, weak charger).',
        [S('Plug in the original charger and set the power mode to Balanced or Best performance (Settings, System, Power).'), S('Clean the vents and make sure air can flow.')], T.clockMHz && T.maxClockMHz ? 'Speed during scan: ' + T.clockMHz + ' MHz of ' + T.maxClockMHz + ' MHz' : ''));
      return r.length > 1 ? r : r[0] || null;
    });
    R(function () {
      var o = X6.office; if (!o || !o.installed) return null;
      var ids = String(o.releaseIds || ''), ver = String(o.version || '');
      var yr = null, endDate = null;
      if (o.subscription) return null;
      if (/2024/.test(ids)) { yr = 'Office 2024'; endDate = new Date(2029, 9, 9); }
      else if (/2021/.test(ids)) { yr = 'Office 2021'; endDate = new Date(2026, 9, 13); }
      else if (/2019/.test(ids)) { yr = 'Office 2019'; endDate = new Date(2025, 9, 14); }
      else if (/2016/.test(ids) || (!ids && /^16/.test(ver))) { yr = 'Office 2016'; endDate = new Date(2025, 9, 14); }
      else if (/^15/.test(ver) && !ids) { yr = 'Office 2013'; endDate = new Date(2023, 3, 11); }
      else if (/^14/.test(ver) && !ids) { yr = 'Office 2010'; endDate = new Date(2020, 9, 13); }
      if (!endDate) return null;
      var left = Math.round((endDate.getTime() - NOW6) / 86400000);
      if (left > 365) return null;
      var dstr = endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      if (left <= 0) return F('soft-office-eol', 'Software', 'low', yr + ' no longer gets security updates (ended ' + dstr + ')',
        'Microsoft stopped fixing security holes in ' + yr + '. It keeps working, and many people keep using the version they bought. The risk is Office files from e-mail or downloads, a common way to deliver viruses. If you keep it, open attachments only from people you trust and keep Windows and your antivirus up to date. You can press "I accept this" so it stops counting against your score.',
        [S('Option 1: switch to Microsoft 365 (subscription, always updated) or to Office 2024 (one-time purchase).'), S('Option 2: use the free web versions at office.com in the meantime and open attachments only from people you trust.')], 'Found: ' + ids.replace(/,/g, ', '));
      return F('soft-office-eol', 'Software', 'low', yr + ' stops getting security updates in ' + left + ' days (' + dstr + ')',
        'After that date Microsoft will not fix security holes in this Office. Plan the change now.',
        [S('Choose Microsoft 365 (subscription) or Office 2024 (one-time purchase) before the date.')], 'Found: ' + ids.replace(/,/g, ', '));
    });
    R(function () {
      var o = X6.office; if (!o || !o.installed || o.subscription) return null;
      var l = arr(o.licences); if (!l.length) return null;
      if (l.some(function (x) { return x.status === 1; })) return null;
      return F('soft-office-act', 'Software', 'low', 'Microsoft Office does not show as activated',
        'An Office that is not activated switches to read-only mode after a while and nags you. (If you sign in to Office with a Microsoft 365 account, ignore this: that kind of licence is not visible to this app.)',
        [S('Open Word, click File, Account, and read what it says under "Product Information".'), S('If it asks for activation, sign in with the Microsoft account that owns it or enter your product key.')],
        nameList(l, function (x) { return x.name + ' - status code ' + x.status; }));
    });
    R(function () {
      var b = num(g(D, 'system.os.build', 0)); if (b < 22000) return null;
      var T = { 22000: ['21H2', '2023-10-10', '2024-10-08'], 22621: ['22H2', '2024-10-08', '2025-10-14'], 22631: ['23H2', '2025-11-11', '2026-11-10'], 26100: ['24H2', '2026-10-13', '2027-10-12'], 26200: ['25H2', '2027-10-12', '2028-10-10'], 28000: ['26H1', '2028-03-14', '2029-03-13'] };
      var t = T[b]; if (!t) return null;
      var ent = /Enterprise|Education/i.test(String(g(D, 'system.os.edition', '')));
      var end = new Date((ent ? t[2] : t[1]) + 'T00:00:00'), left = Math.round((end.getTime() - NOW6) / 86400000);
      if (left > 365) return null;
      var dstr = end.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      if (left <= 0) return F('win-eol-11', 'Updates', 'high', 'This version of Windows 11 (' + t[0] + ') no longer gets security updates (ended ' + dstr + ')',
        'Every Windows 11 version is supported for a limited time (24 months for Home and Pro). Yours has passed its end date, so new security holes stay open. The fix is free: move to the newest Windows 11 version.',
        [S('Press the Windows key, type "Windows Update" and open it. Click "Check for updates".'), S('If a "Feature update to Windows 11, version 25H2 (or newer)" is offered, click "Download and install". It keeps your files and programs.'), S('Make a backup of your important files first, just in case.')], 'Windows 11 ' + t[0] + ' (build ' + b + '), edition ' + (g(D, 'system.os.edition', '?')) + ', end of updates ' + dstr);
      return F('win-eol-11', 'Updates', left <= 60 ? 'medium' : 'low', 'This version of Windows 11 (' + t[0] + ') stops getting security updates in ' + left + ' days (' + dstr + ')',
        'Windows 11 versions are supported for a limited time. A newer version is free and keeps your files and programs.',
        [S('Press the Windows key, type "Windows Update" and open it. Click "Check for updates".'), S('When the newest Windows 11 version is offered, click "Download and install".')], 'Windows 11 ' + t[0] + ' (build ' + b + '), end of updates ' + dstr);
    });
    R(function () {
      var c = arr(X6.certs).filter(function (x) { return x.hasKey && x.days <= 30; });
      if (!c.length) return null;
      var exp = c.filter(function (x) { return x.days < 0; });
      return F('sec-certs', 'Security', exp.length ? 'medium' : 'low', c.length + ' certificate' + (c.length > 1 ? 's' : '') + (exp.length ? ' expired or expire' : ' expire') + ' within 30 days',
        'A certificate is a digital ID card used for e-mail signing, VPN, Wi-Fi at work or websites. When it expires, the thing that uses it stops working, often with a confusing error.',
        [S('See the list under "Evidence" with the days left.'), S('At work, give the list to your IT team. At home, if you do not know what it is for, you can ignore it.')],
        nameList(c, function (x) { return x.name + ' (' + (x.store === 'computer' ? 'computer' : 'your user') + ') - ' + (x.days < 0 ? 'expired ' + (-x.days) + ' days ago' : x.days + ' days left'); }));
    });
    R(function () {
      var w = X6.wu; if (!w) return null;
      var r = [];
      if (arr(w.failed30).length) r.push(F('upd-fail', 'Updates', 'medium', arr(w.failed30).length + ' Windows update' + (arr(w.failed30).length > 1 ? 's' : '') + ' failed in the last 30 days',
        'A failed update means the PC is still missing fixes. It often retries and fails again until you help it.',
        [S('Press the Windows key, type "Troubleshoot settings", open it, then "Other troubleshooters" and run the one called "Windows Update".'), S('Restart the PC and run Windows Update again.'), S('If it fails again, copy the update name from "Evidence" and search it on the internet or ask an AI in the AI help tab.')], arr(w.failed30).join('\n')));
      if (w.serviceDisabled || w.policyOff || w.paused) r.push(F('upd-off', 'Updates', w.serviceDisabled || w.policyOff ? 'medium' : 'low', w.paused ? 'Windows updates are paused' : 'Windows updates are switched off',
        w.paused ? 'Somebody pressed "Pause updates". Until the pause ends, the PC gets no fixes.' : 'A setting or policy stops Windows from updating itself. That leaves the PC without security fixes.',
        [S('Press the Windows key, type "Windows Update" and open it.'), S('Click "Resume updates" (or "Check for updates"). If the button is missing because of a work policy, ask your IT team.')],
        (w.paused ? 'Paused. ' : '') + (w.serviceDisabled ? 'The Windows Update service is disabled. ' : '') + (w.policyOff ? 'A policy turns automatic updates off.' : '')));
      return r.length > 1 ? r : r[0] || null;
    });
    R(function () {
      var vv = vols.filter(function (v) { return num(v.sizeGB) > 0; });
      if (!vv.length) return null;
      var used = 0; vv.forEach(function (v) { used += Math.max(0, num(v.sizeGB) - num(v.freeGB)); });
      var need = used * 1.5, sizes = [250, 500, 1000, 2000, 4000, 8000], pick = sizes.filter(function (s) { return s * 0.93 >= need; })[0] || 8000;
      return F('bak-size', 'Backup', 'info', 'A full backup of this PC needs about ' + fmtGB(used),
        'This is how much space your files, programs and Windows use right now. To keep a few versions you need more than that.',
        [S('Buy an external drive of at least ' + (pick >= 1000 ? (pick / 1000) + ' TB' : pick + ' GB') + ' (about 1.5 times what you use).'), S('Or back up only your documents and photos to OneDrive or another cloud. That usually needs far less space.')],
        vv.map(function (v) { return v.letter + ' used ' + fmtGB(num(v.sizeGB) - num(v.freeGB)) + ' of ' + fmtGB(v.sizeGB); }).join('\n'));
    });
    R(function () {
      var o = X6.oneDrive; if (!o || !o.installed) return null;
      if (o.signedIn && o.running) return null;
      return F('bak-onedrive', 'Backup', 'low', o.signedIn ? 'OneDrive is installed but is not running' : 'OneDrive is installed but you are not signed in',
        'OneDrive can keep your Desktop, Documents and Pictures safe in the cloud, but only while it is signed in and running.',
        [S('Press the Windows key, type OneDrive and open it.'), S('Sign in with your Microsoft account. Then right-click the OneDrive cloud icon near the clock, choose Settings, Sync and backup, and switch on the folders you want protected.')], '');
    });
    R(function () {
      var s = arr(X6.slowStart).filter(function (x) { return x.avgSec >= 3; });
      if (!s.length) return null;
      return F('perf-slowstart', 'Performance', 'low', s.length + ' program' + (s.length > 1 ? 's' : '') + ' or driver' + (s.length > 1 ? 's' : '') + ' slow down the start-up of Windows',
        'Windows measures what delays every start-up and writes it down. These items were named by Windows itself, most often and slowest first. Fewer slow items means the PC is ready sooner.',
        [S('Look at the list under "Evidence". For a program: press Ctrl+Shift+Esc, open the Startup apps tab, right-click it and choose Disable.'), S('For a driver or service, do not turn it off. Instead update it or ask an AI in the AI help tab.')],
        nameList(s, function (x) { return x.name + ' (' + x.kind + ') - about ' + x.avgSec + ' s, seen ' + x.n + ' time' + (x.n > 1 ? 's' : ''); }));
    });
    R(function () {
      var d = arr(X6.dnsSpeed); if (d.length < 2) return null;
      var cur = d[0], best = d.slice(1).sort(function (a, b) { return a.ms - b.ms; })[0];
      if (cur.label !== 'This PC' || cur.ms - best.ms < 25 || best.ms > cur.ms * 0.6) return null;
      return F('net-dnsfast', 'Network', 'info', 'A faster DNS is available (' + best.label + ' is about ' + (cur.ms - best.ms) + ' ms quicker)',
        'DNS is the phone book of the internet: it turns a website name into an address. Yours answers in about ' + cur.ms + ' ms. ' + best.label + ' answered in about ' + best.ms + ' ms from here. The change is small and can be undone any time.',
        [S('Nothing is changed by this app. If you want to try: press the Windows key, type "Network status", open it, click Properties on your connection, then Edit next to "DNS server assignment", choose Manual, switch IPv4 on and type ' + best.ip + ' as the preferred DNS.'), S('To undo it, choose Automatic (DHCP) in the same place.')],
        d.map(function (x) { return x.label + ' (' + x.ip + '): ' + x.ms + ' ms'; }).join('\n'));
    });
    R(function () {
      var c = arr(X6.connections); if (!c.length) return null;
      var tot = 0; c.forEach(function (x) { tot += x.n; });
      return F('net-conn', 'Network', 'info', c.length + ' programs are talking to the internet right now',
        'This is a snapshot of which programs have an open connection to the internet at the moment of the scan (addresses of your own home network are left out). It is normal for a browser, Windows and your cloud apps to be here. Look for names you do not know.',
        [S('Read the list under "Evidence". Browsers, svchost, OneDrive, Teams and similar are normal.'), S('If you see a name you do not know, search it on the internet or ask an AI in the AI help tab before you decide anything.')],
        nameList(c, function (x) { return x.process + ' (' + x.n + ' connection' + (x.n > 1 ? 's' : '') + ') ' + arr(x.remotes).join(', '); }, 15));
    });

    /* ---- predictions from the history of scans ---- */
    function series(key) {
      return arr(D.trend).filter(function (x) { return x && x.t && x[key] != null && isFinite(x[key]); }).map(function (x) { return [new Date(x.t).getTime() / 86400000, Number(x[key])]; }).filter(function (p) { return isFinite(p[0]); }).sort(function (a, b) { return a[0] - b[0]; });
    }
    function slope(p) {
      var n = p.length, sx = 0, sy = 0, sxx = 0, sxy = 0; p.forEach(function (q) { sx += q[0]; sy += q[1]; sxx += q[0] * q[0]; sxy += q[0] * q[1]; });
      var den = n * sxx - sx * sx; return den ? (n * sxy - sx * sy) / den : 0;
    }
    R(function () {
      var p = series('freeC'); if (p.length < 3 || p[p.length - 1][0] - p[0][0] < 7) return null;
      var m = slope(p), cur = p[p.length - 1][1];
      if (m >= -0.02 || cur <= 0) return null;
      var daysLeft = cur / -m; if (daysLeft > 730) return null;
      var when = new Date(NOW6 + daysLeft * 86400000).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
      return F('pred-disk', 'Storage', daysLeft <= 60 ? 'medium' : (daysLeft <= 180 ? 'low' : 'info'), 'At this pace drive C: will be full in about ' + (daysLeft < 60 ? Math.round(daysLeft) + ' days' : Math.round(daysLeft / 30) + ' months') + ' (' + when + ')',
        'Your free space has been shrinking by about ' + (Math.round(-m * 30 * 10) / 10) + ' GB per month over the ' + p.length + ' scans in the history. A full drive makes Windows slow and updates fail.',
        [S('Open the Storage findings of this report: it shows the biggest folders and what is safe to remove.'), S('Move photos, videos and old downloads to an external drive or the cloud.')], p.length + ' scans, free space from ' + Math.round(p[0][1]) + ' GB to ' + Math.round(cur) + ' GB');
    });
    R(function () {
      var p = series('ssdWear'); if (p.length < 3 || p[p.length - 1][0] - p[0][0] < 14) return null;
      var m = slope(p), cur = p[p.length - 1][1]; if (m <= 0.002 || cur >= 80) return null;
      var daysLeft = (80 - cur) / m; if (daysLeft > 3650) return null;
      return F('pred-ssd', 'Storage', daysLeft <= 365 ? 'medium' : 'low', 'The SSD wears out by about ' + (Math.round(m * 30 * 10) / 10) + ' % a month: ' + Math.round(daysLeft / 30) + ' months until 80 % worn',
        'Every SSD has a limited number of writes. At 80 % worn it is time to plan a replacement before it fails. This is an estimate from your scan history.',
        [S('Make sure you have a backup of everything important.'), S('Plan a new SSD around that time. A technician can copy Windows to it without losing anything.')], p.length + ' scans, wear from ' + p[0][1] + ' % to ' + cur + ' %');
    });
    R(function () {
      var p = series('batWear'); if (p.length < 3 || p[p.length - 1][0] - p[0][0] < 14) return null;
      var m = slope(p), cur = p[p.length - 1][1]; if (m <= 0.005 || cur >= 40) return null;
      var daysLeft = (40 - cur) / m; if (daysLeft > 1825) return null;
      return F('pred-bat', 'Performance', daysLeft <= 365 ? 'low' : 'info', 'The battery loses about ' + (Math.round(m * 30 * 10) / 10) + ' % of its capacity a month: ' + Math.round(daysLeft / 30) + ' months until it is 40 % worn',
        'A battery that has lost 40 % of its capacity only lasts a little over half as long as when it was new.',
        [S('Plan a battery replacement around that time. Many laptops let a repair shop change it in minutes.')], p.length + ' scans, battery wear from ' + p[0][1] + ' % to ' + cur + ' %');
    });


    /* ===== 0.7.0: drive health, hardware age, bottleneck, persistence, hardening, privacy, caches, unused programs, browsers ===== */
    var X2 = EX.more2 || {};
    R(function () {
      var bad = [], notes = [];
      arr(D.disks).forEach(function (d) {
        var r = d.reliability; if (!r) return;
        var hdd = /HDD|Unspecified/i.test(String(d.mediaType)) && !/SSD|NVMe/i.test(String(d.name));
        var errs = num(r.readErrors) + num(r.writeErrors);
        var hot = r.temperatureC != null && r.temperatureC >= (hdd ? 50 : 60);
        var old = r.powerOnHours != null && r.powerOnHours >= 35000;
        if (errs > 0 || hot || old) bad.push({ d: d, errs: errs, hot: hot, old: old, hdd: hdd });
      });
      if (!bad.length) return null;
      var sev = bad.some(function (b) { return b.errs > 0; }) ? 'medium' : 'low';
      return F('sto-diskhealth', 'Storage', sev, bad.length + ' drive' + (bad.length > 1 ? 's show' : ' shows') + ' warning signs (' + (sev === 'medium' ? 'read or write errors' : 'heat or age') + ')',
        'Every drive keeps notes about its own health. Errors mean the drive had trouble reading or writing. Heat shortens its life. Many years of running means it is closer to the end, even if it works today.',
        [S('Make a backup of the files you cannot lose, today.'), S('If there are errors: plan to replace the drive soon. A technician can copy Windows and your files to a new one without losing anything.'), S('If it is hot: clean the dust and make sure air can flow around the drive.')],
        bad.map(function (b) { var r = b.d.reliability; return b.d.name + ': ' + (r.temperatureC != null ? r.temperatureC + ' C, ' : '') + (r.powerOnHours != null ? Math.round(r.powerOnHours / 24 / 365 * 10) / 10 + ' years powered on, ' : '') + b.errs + ' errors' + (r.wearPercent != null ? ', wear ' + r.wearPercent + ' %' : ''); }).join('\n'));
    });
    R(function () {
      var gs = arr(X2.gpuSmi).filter(function (x) { return x.tempC != null && x.tempC >= 85; });
      if (!gs.length) return null;
      return F('perf-gpuheat', 'Performance', gs[0].tempC >= 92 ? 'medium' : 'low', 'The graphics card was very hot (' + gs[0].tempC + ' degrees C)',
        'A hot graphics card slows down by itself and wears out faster. The reading was taken during the scan, so it was not under a game load unless something heavy was running.',
        [S('Check that the case fans work and the vents are free of dust.'), S('Close heavy programs (games, video editors) and see if the temperature drops.')], gs.map(function (x) { return x.name + ': ' + x.tempC + ' C' + (x.fanPct != null ? ', fan ' + x.fanPct + ' %' : '') + (x.loadPct != null ? ', load ' + x.loadPct + ' %' : ''); }).join('\n'));
    });
    /* hardware age from the model name (approximate) */
    function cpuYear(n) {
      n = String(n || ''); var m;
      if (/Core\(TM\) Ultra|Core Ultra/i.test(n)) return 2024;
      if ((m = n.match(/i[3579]-(\d{4,5})/i)) || (m = n.match(/Core\(TM\)\s+(?:i[3579]\s+)?(\d{4,5})[A-Z]*/i))) {
        var s = m[1], gen = s.length === 5 ? parseInt(s.slice(0, 2), 10) : parseInt(s.slice(0, 1), 10), Y = { 2: 2011, 3: 2012, 4: 2013, 5: 2015, 6: 2015, 7: 2017, 8: 2017, 9: 2018, 10: 2019, 11: 2021, 12: 2021, 13: 2022, 14: 2023 };
        return Y[gen] ? { year: Y[gen], label: gen + (gen === 1 ? 'st' : gen === 2 ? 'nd' : gen === 3 ? 'rd' : 'th') + ' generation Intel' } : null;
      }
      if (/Ryzen\s+AI/i.test(n)) return { year: 2024, label: 'AMD Ryzen AI' };
      if ((m = n.match(/Ryzen\s+[3579]\s+(?:PRO\s+)?(\d)(\d{3})/i))) { var Z = { 1: 2017, 2: 2018, 3: 2019, 4: 2020, 5: 2021, 6: 2022, 7: 2023, 8: 2024, 9: 2024 }; return Z[m[1]] ? { year: Z[m[1]], label: 'AMD Ryzen ' + m[1] + '000 series' } : null; }
      return null;
    }
    function gpuYear(n) {
      n = String(n || ''); var m;
      if ((m = n.match(/RTX\s*(\d)0\d{2}/i))) { var A = { 2: 2018, 3: 2020, 4: 2022, 5: 2025 }; return A[m[1]] ? { year: A[m[1]], label: 'NVIDIA RTX ' + m[1] + '000 series' } : null; }
      if ((m = n.match(/GTX\s*(\d{3,4})/i))) { var v = parseInt(m[1], 10); return { year: v >= 1600 ? 2019 : (v >= 1000 ? 2016 : (v >= 900 ? 2014 : 2013)), label: 'NVIDIA GTX ' + m[1] }; }
      if ((m = n.match(/RX\s*(\d)\d{3}/i))) { var B = { 5: 2019, 6: 2020, 7: 2022, 9: 2025 }; return B[m[1]] ? { year: B[m[1]], label: 'AMD Radeon RX ' + m[1] + '000 series' } : null; }
      if (/RX\s*[45]\d{2}\b/i.test(n)) return { year: 2017, label: 'AMD Radeon RX 400/500 series' };
      if (/\bArc\b/i.test(n)) return { year: 2022, label: 'Intel Arc' };
      return null;
    }
    function hwAge() {
      var nowY = new Date(g(D, 'meta.generated', Date.now())).getFullYear(), out2 = [];
      var c = cpuYear(g(D, 'system.cpu.name', '')); if (c) out2.push({ what: 'processor', year: c.year, age: nowY - c.year, label: c.label });
      var seen = {}; arr(D.gpus).forEach(function (x) { var y = gpuYear(x.name); if (y && !seen[y.label]) { seen[y.label] = 1; out2.push({ what: 'graphics', year: y.year, age: nowY - y.year, label: y.label }); } });
      var bi = g(D, 'system.bios.date', null); if (bi) { var by = new Date(bi).getFullYear(); if (by > 1990) out2.push({ what: 'bios', year: by, age: nowY - by, label: 'BIOS' }); }
      return out2;
    }
    R(function () {
      var a = hwAge().filter(function (x) { return x.what !== 'bios' && x.age >= 7; });
      if (!a.length) return null;
      var old = a.reduce(function (m, x) { return Math.max(m, x.age); }, 0);
      return F('hw-age', 'Performance', old >= 9 ? 'low' : 'info', 'The ' + a[0].what + ' is about ' + a[0].age + ' years old (' + a[0].label + ')',
        'Parts of this age still work, but they miss newer features (Windows 11 support, faster memory, modern security chips), use more power and are more likely to fail. It is an estimate from the model name.',
        [S('Nothing to do if the PC does what you need. If you plan an upgrade, a new processor usually means a new motherboard and memory too.'), S('Keep a backup: older parts fail more often.')], a.map(function (x) { return x.what + ': ' + x.label + ', released about ' + x.year; }).join('\n'));
    });
    R(function () {
      var p = X2.perf; if (!p || !arr(p.cpu).length) return null;
      function avg(a) { a = arr(a); return a.length ? a.reduce(function (x, y) { return x + num(y); }, 0) / a.length : 0; }
      var c = avg(p.cpu), d = avg(p.disk), q = avg(p.queue), m = arr(p.mem).length ? arr(p.mem)[arr(p.mem).length - 1] : 0, lim = null;
      if (c >= 80) lim = ['processor', c]; else if (d >= 85 || q >= 2) lim = ['drive', d]; else if (m >= 92) lim = ['memory', m];
      if (!lim) return null;
      var why = { processor: 'The processor was busy most of the time. Something is using it heavily. See "Who used the processor" in the Insights tab.', drive: 'The drive was almost always busy. A slow disk (especially an old hard disk) makes everything wait.', memory: 'Memory was almost full. When it is full Windows uses the drive as extra memory, which is much slower.' };
      return F('perf-bottleneck', 'Performance', 'low', 'During a 10-second check the ' + lim[0] + ' was the limit (' + Math.round(lim[1]) + ' % busy)',
        why[lim[0]] + ' This is one 10-second snapshot, so repeat the scan when the PC feels slow to see if it is always the same part.',
        [S('Open Task Manager (Ctrl+Shift+Esc) and sort by the ' + (lim[0] === 'processor' ? 'CPU' : (lim[0] === 'drive' ? 'Disk' : 'Memory')) + ' column to see which program is responsible.'), S('Close it or ask an AI in the AI help tab what that program is.')], 'Average processor ' + Math.round(c) + ' %, drive ' + Math.round(d) + ' %, memory ' + Math.round(m) + ' %');
    });
    R(function () {
      var P = X2.persistence; if (!P) return null;
      var un = arr(P.unusual), us = arr(P.items).filter(function (x) { return x.signature && x.signature !== 'Valid'; });
      if (!un.length && !us.length) return null;
      var KN = { 'winlogon-shell': 'Windows start-up shell was changed', 'winlogon-userinit': 'Windows sign-in program was changed', 'ifeo-debugger': 'A program is replaced by a "debugger"', 'appinit-dlls': 'Extra DLL files load into every program', 'bootexecute': 'Extra program runs before Windows loads', 'wmi-consumer': 'A hidden WMI start-up trigger exists' };
      return F('sec-persist', 'Security', un.length ? 'medium' : 'low', (un.length ? un.length + ' unusual start-up setting' + (un.length > 1 ? 's' : '') : '') + (un.length && us.length ? ' and ' : '') + (us.length ? us.length + ' unsigned program' + (us.length > 1 ? 's' : '') + ' that starts with Windows' : ''),
        'Besides the normal Startup list, Windows has many hidden places where a program can make itself start. Some are used by real tools (debuggers, antivirus), but they are also favourite hiding places for unwanted software, so each one deserves a look.',
        [S('Read the lines under "Evidence". Do you recognise each one?'), S('If you do not, search the name on the internet or ask an AI in the AI help tab before you do anything. Do not delete things you do not understand.')],
        un.map(function (x) { return (KN[x.kind] || x.kind) + ': ' + x.detail; }).concat(us.map(function (x) { return 'Not signed: ' + x.name + ' (' + x.where + ')'; })).slice(0, 14).join('\n'));
    });
    /* hardening checks */
    var HC = X2.hardening || null;
    var HCHK = [
      { id: 'pwLen', w: 2, t: function (h) { return h.pwLen == null ? null : h.pwLen >= 8; }, en: 'Passwords must have at least 8 characters', el: 'Οι κωδικοί πρέπει να έχουν τουλάχιστον 8 χαρακτήρες', fen: 'Windows Pro: press the Windows key, type "Local Security Policy", open Account Policies, Password Policy, and set "Minimum password length" to 12. Windows Home does not have this tool.', fel: 'Windows Pro: πάτα το πλήκτρο Windows, πληκτρολόγησε «Τοπική πολιτική ασφαλείας», άνοιξε Πολιτικές λογαριασμού, Πολιτική κωδικών και βάλε «Ελάχιστο μήκος κωδικού» 12. Τα Windows Home δεν έχουν αυτό το εργαλείο.' },
      { id: 'pwComplex', w: 1, t: function (h) { return h.pwComplex == null ? null : h.pwComplex === 1; }, en: 'Passwords must be complex (mixed characters)', el: 'Οι κωδικοί πρέπει να είναι σύνθετοι (μείγμα χαρακτήρων)', fen: 'Same place as above: turn on "Password must meet complexity requirements".', fel: 'Στο ίδιο σημείο: άναψε το «Ο κωδικός πρέπει να πληροί απαιτήσεις πολυπλοκότητας».' },
      { id: 'lockout', w: 2, t: function (h) { return h.lockout == null ? null : h.lockout > 0; }, en: 'The account locks after too many wrong passwords', el: 'Ο λογαριασμός κλειδώνει μετά από πολλούς λάθος κωδικούς', fen: 'Local Security Policy, Account Policies, Account Lockout Policy: set "Account lockout threshold" to 10.', fel: 'Τοπική πολιτική ασφαλείας, Πολιτικές λογαριασμού, Πολιτική κλειδώματος: βάλε «Όριο κλειδώματος λογαριασμού» 10.' },
      { id: 'smartscreen', w: 2, t: function (h) { return h.smartscreen; }, en: 'SmartScreen checks downloaded programs', el: 'Το SmartScreen ελέγχει τα προγράμματα που κατεβάζεις', fen: 'Settings, Privacy & security, Windows Security, App & browser control, Reputation-based protection: turn the switches on.', fel: 'Ρυθμίσεις, Απόρρητο και ασφάλεια, Ασφάλεια των Windows, Έλεγχος εφαρμογών και προγράμματος περιήγησης, Προστασία βάσει φήμης: άναψε τους διακόπτες.' },
      { id: 'lsaPpl', w: 2, t: function (h) { return h.lsaPpl; }, en: 'Windows login secrets are protected (LSA protection)', el: 'Τα μυστικά σύνδεσης των Windows προστατεύονται (προστασία LSA)', fen: 'Settings, Privacy & security, Windows Security, Device security, Core isolation: turn on "Local Security Authority protection", then restart.', fel: 'Ρυθμίσεις, Απόρρητο και ασφάλεια, Ασφάλεια των Windows, Ασφάλεια συσκευής, Απομόνωση πυρήνα: άναψε την «Προστασία τοπικής αρχής ασφαλείας» και κάνε επανεκκίνηση.' },
      { id: 'wdigestOff', w: 3, t: function (h) { return h.wdigestOff; }, en: 'Old password storage (WDigest) is off', el: 'Η παλιά αποθήκευση κωδικών (WDigest) είναι κλειστή', fen: 'Ask an expert: this old setting keeps passwords readable in memory. It should be 0.', fel: 'Ρώτα έναν ειδικό: αυτή η παλιά ρύθμιση κρατά τους κωδικούς αναγνώσιμους στη μνήμη. Πρέπει να είναι 0.' },
      { id: 'llmnrOff', w: 1, t: function (h) { return h.llmnrOff; }, en: 'Old name lookup (LLMNR) is off', el: 'Η παλιά αναζήτηση ονομάτων (LLMNR) είναι κλειστή', fen: 'Mostly for offices: ask your IT person to turn it off with a policy.', fel: 'Κυρίως για γραφεία: ζήτα από τον υπεύθυνο IT να το κλείσει με πολιτική.' },
      { id: 'netbiosOff', w: 1, t: function (h) { return h.netbiosOff; }, en: 'Old network naming (NetBIOS) is off', el: 'Η παλιά ονοματοδοσία δικτύου (NetBIOS) είναι κλειστή', fen: 'Mostly for offices: ask your IT person.', fel: 'Κυρίως για γραφεία: ρώτα τον υπεύθυνο IT.' },
      { id: 'smbSign', w: 1, t: function (h) { return h.smbSign; }, en: 'File sharing requires a digital signature', el: 'Η κοινή χρήση αρχείων απαιτεί ψηφιακή υπογραφή', fen: 'Mostly for offices: ask your IT person.', fel: 'Κυρίως για γραφεία: ρώτα τον υπεύθυνο IT.' },
      { id: 'psLogging', w: 1, t: function (h) { return h.psLogging; }, en: 'PowerShell activity is logged', el: 'Η δραστηριότητα του PowerShell καταγράφεται', fen: 'Mostly for offices: ask your IT person.', fel: 'Κυρίως για γραφεία: ρώτα τον υπεύθυνο IT.' },
      { id: 'vbs', w: 2, t: function (h) { return h.vbs; }, en: 'Memory integrity (virtualization security) is running', el: 'Η ακεραιότητα μνήμης (ασφάλεια εικονικοποίησης) λειτουργεί', fen: 'Settings, Privacy & security, Windows Security, Device security, Core isolation: turn on "Memory integrity". If it will not turn on, an old driver is blocking it.', fel: 'Ρυθμίσεις, Απόρρητο και ασφάλεια, Ασφάλεια των Windows, Ασφάλεια συσκευής, Απομόνωση πυρήνα: άναψε την «Ακεραιότητα μνήμης». Αν δεν ανάβει, την εμποδίζει κάποιος παλιός driver.' },
      { id: 'credGuard', w: 1, t: function (h) { return h.credGuard; }, en: 'Credential Guard is running', el: 'Το Credential Guard λειτουργεί', fen: 'Mostly for company PCs (Windows Pro, Enterprise): ask your IT person.', fel: 'Κυρίως για εταιρικά PC (Windows Pro, Enterprise): ρώτα τον υπεύθυνο IT.' },
      { id: 'asrRules', w: 2, t: function (h) { return h.asrRules == null ? null : h.asrRules > 0; }, en: 'Defender attack-surface rules are set', el: 'Οι κανόνες μείωσης επιφάνειας επίθεσης του Defender είναι ρυθμισμένοι', fen: 'Mostly for offices: ask your IT person. (Windows Security, App & browser control, Exploit protection.)', fel: 'Κυρίως για γραφεία: ρώτα τον υπεύθυνο IT. (Ασφάλεια των Windows, Έλεγχος εφαρμογών, Προστασία από εκμετάλλευση.)' },
      { id: 'cfa', w: 1, t: function (h) { return h.cfa; }, en: 'Controlled folder access protects your documents', el: 'Η ελεγχόμενη πρόσβαση φακέλων προστατεύει τα έγγραφά σου', fen: 'Settings, Privacy & security, Windows Security, Virus & threat protection, Ransomware protection: turn on "Controlled folder access". It can block some programs, so test it.', fel: 'Ρυθμίσεις, Απόρρητο και ασφάλεια, Ασφάλεια των Windows, Προστασία από ιούς και απειλές, Προστασία από ransomware: άναψε την «Ελεγχόμενη πρόσβαση φακέλων». Μπορεί να μπλοκάρει κάποια προγράμματα, γι’ αυτό δοκίμασέ το.' },
      { id: 'cloudProt', w: 2, t: function (h) { return h.cloudProt; }, en: 'Defender cloud protection is on', el: 'Η προστασία cloud του Defender είναι ανοιχτή', fen: 'Settings, Privacy & security, Windows Security, Virus & threat protection, Manage settings: turn on "Cloud-delivered protection".', fel: 'Ρυθμίσεις, Απόρρητο και ασφάλεια, Ασφάλεια των Windows, Προστασία από ιούς και απειλές, Διαχείριση ρυθμίσεων: άναψε την «Προστασία που παρέχεται από το cloud».' },
      { id: 'puaProt', w: 2, t: function (h) { return h.puaProt; }, en: 'Blocking of unwanted programs is on', el: 'Ο αποκλεισμός ανεπιθύμητων προγραμμάτων είναι ανοιχτός', fen: 'Settings, Privacy & security, Windows Security, App & browser control, Reputation-based protection: turn on "Potentially unwanted app blocking".', fel: 'Ρυθμίσεις, Απόρρητο και ασφάλεια, Ασφάλεια των Windows, Έλεγχος εφαρμογών, Προστασία βάσει φήμης: άναψε τον «Αποκλεισμό δυνητικά ανεπιθύμητων εφαρμογών».' },
      { id: 'netProt', w: 1, t: function (h) { return h.netProt; }, en: 'Network protection is on', el: 'Η προστασία δικτύου είναι ανοιχτή', fen: 'Mostly for offices: ask your IT person.', fel: 'Κυρίως για γραφεία: ρώτα τον υπεύθυνο IT.' },
      { id: 'autorunOff', w: 1, t: function (h) { return h.autorunOff; }, en: 'AutoPlay of USB sticks and discs is off', el: 'Η αυτόματη εκτέλεση USB και δίσκων είναι κλειστή', fen: 'Settings, Bluetooth & devices, AutoPlay: turn "Use AutoPlay for all media and devices" off.', fel: 'Ρυθμίσεις, Bluetooth και συσκευές, Αυτόματη αναπαραγωγή: κλείσε το «Χρήση αυτόματης αναπαραγωγής για όλα τα μέσα και τις συσκευές».' },
      { id: 'remoteAssistOff', w: 1, t: function (h) { return h.remoteAssistOff; }, en: 'Remote Assistance is off', el: 'Η Απομακρυσμένη βοήθεια είναι κλειστή', fen: 'Press the Windows key, type "Allow Remote Assistance", open it and untick "Allow Remote Assistance connections to this computer".', fel: 'Πάτα το πλήκτρο Windows, πληκτρολόγησε «Να επιτρέπονται συνδέσεις Απομακρυσμένης βοήθειας», άνοιξέ το και ξετσέκαρε την επιλογή για αυτόν τον υπολογιστή.' },
      { id: 'ntlmV2', w: 2, t: function (h) { return h.ntlmV2; }, en: 'Only the newer login check (NTLMv2) is used', el: 'Χρησιμοποιείται μόνο ο νεότερος έλεγχος σύνδεσης (NTLMv2)', fen: 'Mostly for offices: ask your IT person.', fel: 'Κυρίως για γραφεία: ρώτα τον υπεύθυνο IT.' },
      { id: 'anonRestricted', w: 1, t: function (h) { return h.anonRestricted; }, en: 'Anonymous access to account lists is blocked', el: 'Η ανώνυμη πρόσβαση σε λίστες λογαριασμών είναι μπλοκαρισμένη', fen: 'Mostly for offices: ask your IT person.', fel: 'Κυρίως για γραφεία: ρώτα τον υπεύθυνο IT.' },
      { id: 'spoolerOff', w: 2, t: function (h) { return h.spoolerHasPrinters ? null : h.spoolerOff; }, en: 'The print service is off when no printer is used', el: 'Η υπηρεσία εκτύπωσης είναι κλειστή όταν δεν υπάρχει εκτυπωτής', fen: 'No printer is installed, but the print service runs. It has been used by attackers in the past. Press the Windows key, type Services, open it, double-click "Print Spooler", set Startup type to Disabled and press Stop.', fel: 'Δεν υπάρχει εκτυπωτής, αλλά η υπηρεσία εκτύπωσης τρέχει. Έχει χρησιμοποιηθεί από επιτιθέμενους. Πάτα το πλήκτρο Windows, πληκτρολόγησε Υπηρεσίες, άνοιξέ το, διπλό κλικ στο «Print Spooler», βάλε Τύπος εκκίνησης Απενεργοποιημένη και πάτα Διακοπή.' },
      { id: 'remoteRegOff', w: 2, t: function (h) { return h.remoteRegOff; }, en: 'Remote registry service is off', el: 'Η υπηρεσία απομακρυσμένου μητρώου είναι κλειστή', fen: 'Press the Windows key, type Services, open it, double-click "Remote Registry" and set Startup type to Disabled.', fel: 'Πάτα το πλήκτρο Windows, πληκτρολόγησε Υπηρεσίες, άνοιξέ το, διπλό κλικ στο «Remote Registry» και βάλε Τύπος εκκίνησης Απενεργοποιημένη.' }
    ];
    function hardList() {
      if (!HC) return [];
      return HCHK.map(function (c) { var r = null; try { r = c.t(HC); } catch (e) { } return { id: c.id, w: c.w, pass: r, en: c.en, el: c.el, fen: c.fen, fel: c.fel }; });
    }
    function hardScore() {
      var l = hardList().filter(function (x) { return x.pass !== null && x.pass !== undefined; }); if (l.length < 6) return null;
      var tot = 0, ok = 0; l.forEach(function (x) { tot += x.w; if (x.pass) ok += x.w; });
      return { score: Math.round(ok / tot * 100), passed: l.filter(function (x) { return x.pass; }).length, total: l.length, unknown: HCHK.length - l.length };
    }
    R(function () {
      var hs = hardScore(); if (!hs) return null;
      var OFFICE = { llmnrOff: 1, netbiosOff: 1, smbSign: 1, psLogging: 1, credGuard: 1, asrRules: 1, netProt: 1, ntlmV2: 1, anonRestricted: 1 };
      var known = hardList().filter(function (x) { return x.pass !== null && x.pass !== undefined && !OFFICE[x.id]; }), fails = known.filter(function (x) { return x.pass === false; }), wsum = fails.reduce(function (a, x) { return a + x.w; }, 0);
      if (wsum < 3) return null;
      return F('sec-hardening', 'Security', hs.score < 50 ? 'medium' : 'low', fails.length + ' of ' + known.length + ' everyday security settings are not switched on (hardening score ' + hs.score + '/100)',
        'Windows has many protection switches that are off by default because they can get in the way. Each one that is on makes an attack harder. The Insights tab lists all of them with a plain explanation and how to switch them on. Some are only worth it in an office. Do not switch things on that you do not understand.',
        [S('Open the Insights tab and read the "Extra security settings" box.'), S('Start with the ones marked "Easy". For the rest, ask your IT person or an AI in the AI help tab.')],
        fails.slice(0, 12).map(function (x) { return x.en; }).join('\n'));
    });
    /* privacy */
    var PR = X2.privacy || null;
    function privList() {
      if (!PR) return [];
      var r = [];
      function add(id, open, en, el, fen, fel) { r.push({ id: id, open: open, en: en, el: el, fen: fen, fel: fel }); }
      if (PR.telemetry != null) add('telemetry', num(PR.telemetry) >= 2, 'Diagnostic data sent to Microsoft: ' + ({ 0: 'minimal', 1: 'required only', 2: 'enhanced', 3: 'full' }[num(PR.telemetry)] || 'set by policy'), 'Διαγνωστικά δεδομένα προς τη Microsoft: ' + ({ 0: 'ελάχιστα', 1: 'μόνο τα απαραίτητα', 2: 'εκτεταμένα', 3: 'πλήρη' }[num(PR.telemetry)] || 'ορισμένα από πολιτική'), 'Settings, Privacy & security, Diagnostics & feedback: choose "Required diagnostic data only" and turn off the optional ones.', 'Ρυθμίσεις, Απόρρητο και ασφάλεια, Διαγνωστικά και σχόλια: διάλεξε «Μόνο τα απαιτούμενα διαγνωστικά δεδομένα» και κλείσε τα προαιρετικά.');
      if (PR.adId != null) add('adId', num(PR.adId) === 1, 'Advertising ID is ' + (num(PR.adId) === 1 ? 'on' : 'off'), 'Το διαφημιστικό ID είναι ' + (num(PR.adId) === 1 ? 'ανοιχτό' : 'κλειστό'), 'Settings, Privacy & security, General: turn off "Let apps show me personalized ads by using my advertising ID".', 'Ρυθμίσεις, Απόρρητο και ασφάλεια, Γενικά: κλείσε το «Να επιτρέπεται στις εφαρμογές να μου δείχνουν εξατομικευμένες διαφημίσεις».');
      if (PR.location) add('location', PR.location === 'Allow', 'Location access is ' + PR.location, 'Η πρόσβαση στην τοποθεσία είναι ' + (PR.location === 'Allow' ? 'επιτρεπτή' : 'απαγορευμένη'), 'Settings, Privacy & security, Location: switch off "Location services" or choose which apps may use it.', 'Ρυθμίσεις, Απόρρητο και ασφάλεια, Τοποθεσία: κλείσε τις «Υπηρεσίες τοποθεσίας» ή διάλεξε ποιες εφαρμογές μπορούν να τη χρησιμοποιούν.');
      if (PR.activityHistory != null) add('activityHistory', num(PR.activityHistory) === 1, 'Activity history is ' + (num(PR.activityHistory) === 1 ? 'on' : 'off'), 'Το ιστορικό δραστηριότητας είναι ' + (num(PR.activityHistory) === 1 ? 'ανοιχτό' : 'κλειστό'), 'Settings, Privacy & security, Activity history (older Windows 10 versions): turn it off.', 'Ρυθμίσεις, Απόρρητο και ασφάλεια, Ιστορικό δραστηριότητας (παλαιότερα Windows 10): κλείσε το.');
      if (PR.recall) add('recall', /Enabled/i.test(PR.recall), 'Windows Recall (screenshots of your screen) is ' + (/Enabled/i.test(PR.recall) ? 'on' : 'off'), 'Το Windows Recall (στιγμιότυπα της οθόνης σου) είναι ' + (/Enabled/i.test(PR.recall) ? 'ανοιχτό' : 'κλειστό'), 'Settings, System, Optional features, find "Recall" and remove it, or turn it off in Settings, Privacy & security, Recall & snapshots.', 'Ρυθμίσεις, Σύστημα, Προαιρετικές λειτουργίες, βρες το «Recall» και αφαίρεσέ το, ή κλείσ’ το στο Απόρρητο και ασφάλεια, Recall και στιγμιότυπα.');
      if (PR.copilotOff != null || PR.recall !== undefined) add('copilot', PR.copilotOff == null || num(PR.copilotOff) !== 1, 'The Copilot AI assistant is ' + (num(PR.copilotOff) === 1 ? 'turned off by a policy' : 'available'), 'Ο βοηθός AI Copilot είναι ' + (num(PR.copilotOff) === 1 ? 'κλειστός από πολιτική' : 'διαθέσιμος'), 'It only reads what you give it. If you do not want it: right-click the taskbar, Taskbar settings, switch Copilot off.', 'Διαβάζει μόνο ό,τι του δίνεις. Αν δεν τον θες: δεξί κλικ στη γραμμή εργασιών, Ρυθμίσεις γραμμής εργασιών, κλείσε το Copilot.');
      if (PR.tailored != null) add('tailored', num(PR.tailored) === 1, 'Tips and ads tailored to your usage data are ' + (num(PR.tailored) === 1 ? 'on' : 'off'), 'Οι εξατομικευμένες συμβουλές και διαφημίσεις με βάση τη χρήση σου είναι ' + (num(PR.tailored) === 1 ? 'ανοιχτές' : 'κλειστές'), 'Settings, Privacy & security, Diagnostics & feedback, Tailored experiences: switch off.', 'Ρυθμίσεις, Απόρρητο και ασφάλεια, Διαγνωστικά και σχόλια, Εξατομικευμένες εμπειρίες: κλείσ’ το.');
      if (PR.clipboardHistory != null) add('clipboardHistory', num(PR.clipboardHistory) === 1, 'Clipboard history is ' + (num(PR.clipboardHistory) === 1 ? 'on' : 'off'), 'Το ιστορικό προχείρου είναι ' + (num(PR.clipboardHistory) === 1 ? 'ανοιχτό' : 'κλειστό'), 'It remembers things you copy, including passwords. Settings, System, Clipboard: switch off "Clipboard history".', 'Θυμάται ό,τι αντιγράφεις, ακόμα και κωδικούς. Ρυθμίσεις, Σύστημα, Πρόχειρο: κλείσε το «Ιστορικό προχείρου».');
      if (PR.bingSearch != null) add('bingSearch', num(PR.bingSearch) === 1, 'Web results in the Start menu search are ' + (num(PR.bingSearch) === 1 ? 'on' : 'off'), 'Τα αποτελέσματα web στην αναζήτηση του μενού Έναρξη είναι ' + (num(PR.bingSearch) === 1 ? 'ανοιχτά' : 'κλειστά'), 'What you type in Start is sent to Bing. Settings, Privacy & security, Search permissions: ask your IT person or search the internet for "disable Bing in Start".', 'Ό,τι πληκτρολογείς στην Έναρξη στέλνεται στο Bing. Ρώτα τον υπεύθυνο IT ή ψάξε στο internet «απενεργοποίηση Bing στην Έναρξη».');
      if (PR.microphone) add('microphone', PR.microphone === 'Allow', 'Microphone access for apps is ' + PR.microphone, 'Η πρόσβαση των εφαρμογών στο μικρόφωνο είναι ' + (PR.microphone === 'Allow' ? 'επιτρεπτή' : 'απαγορευμένη'), 'Settings, Privacy & security, Microphone: check which apps are allowed.', 'Ρυθμίσεις, Απόρρητο και ασφάλεια, Μικρόφωνο: δες ποιες εφαρμογές επιτρέπονται.');
      if (PR.camera) add('camera', PR.camera === 'Allow', 'Camera access for apps is ' + PR.camera, 'Η πρόσβαση των εφαρμογών στην κάμερα είναι ' + (PR.camera === 'Allow' ? 'επιτρεπτή' : 'απαγορευμένη'), 'Settings, Privacy & security, Camera: check which apps are allowed.', 'Ρυθμίσεις, Απόρρητο και ασφάλεια, Κάμερα: δες ποιες εφαρμογές επιτρέπονται.');
      return r;
    }
    R(function () {
      var o = privList().filter(function (x) { return x.open && x.id !== 'microphone' && x.id !== 'camera' && x.id !== 'copilot'; });
      if (o.length < 2) return null;
      return F('sec-privacy', 'Security', 'info', o.length + ' Windows privacy settings share more than they need to',
        'Windows can send diagnostic data, show ads based on you, remember what you copy and more. None of it is dangerous, but it is your choice. The Insights tab lists every setting with how to change it.',
        [S('Open the Insights tab and read the "Privacy of Windows" box.'), S('Change only what you want. Nothing here is required for the PC to work.')], o.map(function (x) { return x.en; }).join('\n'));
    });
    /* caches */
    R(function () {
      var c = arr(X2.caches), t = 0; c.forEach(function (x) { t += num(x.mb); });
      var w = arr(g(D, 'extras.storage.folders', [])).filter(function (f) { return /Temp|Windows Update/i.test(f.name); }); w.forEach(function (x) { t += num(x.mb); });
      if (t < 1500) return null;
      return F('sto-caches', 'Storage', 'info', 'About ' + fmtGB(t / 1024) + ' of temporary files and caches can be cleaned',
        'These are leftovers that programs keep to be faster or that Windows no longer needs. Removing them is safe, they are rebuilt when needed. Use the cleaner that comes with Windows, not a third-party "cleaner".',
        [S('Press the Windows key, type "Storage settings" and open it. Click "Temporary files".'), S('Tick the boxes you want (Windows Update Cleanup, Temporary files, Thumbnails, Delivery Optimization) and click Remove files. Leave "Downloads" unticked.')],
        c.concat(w).sort(function (a, b) { return b.mb - a.mb; }).slice(0, 10).map(function (x) { return x.name + ': ' + fmtGB(num(x.mb) / 1024) + (x.partial ? ' (partly measured)' : ''); }).join('\n'));
    });
    /* programs that seem unused */
    function unusedApps() {
      var runs = arr(X2.recentRuns); if (runs.length < 20) return [];
      var nowT = NOW6;
      return arr(D.apps && D.apps.list).filter(function (a) {
        if (num(a.sizeMB) < 400) return false;
        var id = String(a.installDate || ''); if (!/^\d{8}$/.test(id)) return false;
        var dd = new Date(id.slice(0, 4) + '-' + id.slice(4, 6) + '-' + id.slice(6, 8)).getTime(); if (!isFinite(dd) || (nowT - dd) < 365 * 86400000) return false;
        var toks = String(a.name).toLowerCase().replace(/\(.*?\)|\d+(\.\d+)*|x64|x86|64-bit|32-bit/g, ' ').split(/[^a-z0-9]+/).filter(function (w) { return w.length >= 4; });
        if (!toks.length) return false;
        return !runs.some(function (r) { return toks.some(function (w) { return r.exe.indexOf(w) >= 0; }); });
      }).sort(function (a, b) { return b.sizeMB - a.sizeMB; });
    }
    R(function () {
      var u = unusedApps(); if (u.length < 2) return null;
      var t = u.reduce(function (a, x) { return a + num(x.sizeMB); }, 0);
      return F('soft-unused', 'Software', 'info', u.length + ' big programs show no sign of being used recently (' + fmtGB(t / 1024) + ')',
        'We compared installed programs with what Windows remembers having started recently (the "Prefetch" list). A program that is big, over a year old and missing from that list may be unused. This is only a hint: Prefetch is short, and some programs run under another name.',
        [S('Look at the list under "Evidence". Do you still use each one?'), S('To remove one: Settings, Apps, Installed apps, click the three dots next to it and choose Uninstall. Make a backup first if it holds your data (for example games or video projects).')],
        u.slice(0, 12).map(function (x) { return x.name + ' - ' + fmtGB(num(x.sizeMB) / 1024); }).join('\n'));
    });
    R(function () {
      var b = arr(X2.browsers).filter(function (x) { return num(x.fileDays) > 90; }); if (!b.length) return null;
      return F('sec-browser-old', 'Security', 'low', b.length + ' browser' + (b.length > 1 ? 's have' : ' has') + ' not been updated for over 3 months',
        'Browsers normally update themselves every few weeks. One that has not changed for months is one of the most common ways to catch an infection, because it reads everything from the internet.',
        [S('Open the browser, click the three dots (or the menu), then Help, About. It checks and updates by itself. Restart it when it asks.'), S('If you no longer use it, uninstall it (Settings, Apps, Installed apps).')], b.map(function (x) { return x.name + ' ' + x.version + ', last changed ' + x.fileDays + ' days ago'; }).join('\n'));
    });
    /* basic security checklist in five groups (used by Insights and the client report) */
    function basicList() {
      function has(ids) { return V_findingsNow().filter(function (f) { return ids.indexOf(f.id) >= 0 && !(typeof V !== 'undefined' && V.isResolved && V.isResolved(f)); }); }
      function grp(en, el, hdEn, hdEl, ids, minusInfo) {
        var f = has(ids), bad = f.filter(function (x) { return x.sev === 'high' || x.sev === 'medium'; });
        return { en: en, el: el, hen: hdEn, hel: hdEl, st: bad.length ? 'bad' : (f.length ? 'warn' : 'ok'), items: f };
      }
      return [
        grp('Firewall', 'Τείχος προστασίας', 'The wall between your PC and the network', 'Ο τοίχος ανάμεσα στον υπολογιστή και το δίκτυο', ['sec-fw', 'sec-ports', 'sec-rdp', 'sec-rdp-nla']),
        grp('Malware protection', 'Προστασία από κακόβουλο λογισμικό', 'Antivirus on, up to date and scanning', 'Antivirus ανοιχτό, ενημερωμένο και σαρώνει', ['sec-av', 'sec-av2', 'sec-avold', 'sec-def-sigs', 'sec-def-threats', 'sec-def-tamper', 'sec-def-scan', 'soft-pup']),
        grp('Secure settings', 'Ασφαλείς ρυθμίσεις', 'Protections switched on, risky things off', 'Προστασίες ανοιχτές, επικίνδυνα πράγματα κλειστά', ['sec-uac', 'sec-uac-level', 'sec-autologon', 'sec-smb1', 'sec-legacy', 'sec-sb', 'sec-tpm', 'sec-hardening', 'sec-persist', 'sec-lock', 'sec-ext', 'sec-wifi-open']),
        grp('User access', 'Πρόσβαση χρηστών', 'Only the right people, with passwords', 'Μόνο οι σωστοί άνθρωποι, με κωδικούς', ['sec-nopass', 'sec-guest', 'sec-builtinadmin', 'sec-admins', 'sec-pwexp']),
        grp('Updates', 'Ενημερώσεις', 'Windows, Office and programs kept up to date', 'Windows, Office και προγράμματα ενημερωμένα', ['upd-patch', 'upd-fail', 'upd-off', 'upd-apps', 'win-eol', 'win-eol-11', 'soft-office-eol', 'sec-browser-old'])
      ];
    }
    function V_findingsNow() { return out; }

    // expose helpers that need the data and the findings of this scan
    RT = { hardList: hardList, hardScore: hardScore, privList: privList, basicList: basicList, hwAge: hwAge, unusedApps: unusedApps, HCHK: HCHK };
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
    var ex2 = g(D, 'extras', null);
    if (ex2) {
      var dd = g(ex2, 'securityMore.defender', null);
      if (dd && dd.signatureAgeDays != null && dd.signatureAgeDays < 7 && !ids['sec-def-sigs']) ok('Antivirus knows the newest viruses', 'definitions ' + dd.signatureAgeDays + ' days old');
      if (dd && dd.threats30d === 0) ok('No threats found in the last 30 days');
      if (g(ex2, 'networkTest.ping.lost', null) === 0 && !ids['net-gw']) ok('Your router answers quickly', g(ex2, 'networkTest.ping.avgMs', '?') + ' ms');
      if (g(ex2, 'networkTest.dns.ok', null) === true && !ids['net-dns']) ok('Website names are looked up fine');
      if (g(ex2, 'networkTest.timeSync.local', null) === false) ok('The clock syncs with internet time');
      if (!ids['bak-none'] && (g(ex2, 'backup.fileHistory', false) || g(ex2, 'backup.oneDriveFolders.documents', false) || g(ex2, 'backup.oneDriveFolders.desktop', false))) ok('Some form of backup is in place');
      if (g(ex2, 'backup.winRE', null) === true) ok('Windows recovery menu is available');
      var ri = g(ex2, 'reliability.stabilityIndex', null);
      if (ri != null && ri >= 8) ok('Windows reliability score is high', ri + ' out of 10');
    }
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
    SEV_ORDER: SEV_ORDER, AREAS: AREAS, readiness: readiness(), battery: g(D, 'battery', null),
    days: num(g(D, 'events.days', 30), 30), periodChoice: !!(D.events && D.events.availableDays),
    RT: RT, withProfile: withProfile, scoreOf: score, META: META, noiseFor: noiseFor, PROFILES: PROFILES, BUGCODES: BUGCODES, bugKey: bugKey, baseFindings: findings, profile: 'home'
  };
}
/* ---------- period of the Event Viewer data: 7, 30 or 60 days (the scan collects 60 and the report narrows it down) ---------- */
(function () {
  var R = window.__PCDATA__; if (!R || !R.events || !R.events.system || !R.events.system.win) return;
  var N = 30; try { N = parseInt(localStorage.getItem('veagle.pccheck.period') || '30', 10); } catch (e) { }
  if ([1, 7, 30, 60].indexOf(N) < 0) N = 30;
  R.events.availableDays = true; R.events.fullDays = R.events.days;
  if (N === 60) { R.events.days = 60; R.meta.periodDays = 60; return; }
  var key = N === 1 ? 'count1' : (N === 7 ? 'count7' : 'count30'), wk = N === 1 ? 'd1' : (N === 7 ? 'd7' : 'd30'), gen = new Date(R.meta.generated).getTime(), cut = gen - N * 86400000;
  ['system', 'application'].forEach(function (k) {
    var S = R.events[k]; if (!S) return;
    S.groups = (S.groups || []).map(function (gp) { var c = {}; Object.keys(gp).forEach(function (x) { c[x] = gp[x]; }); c.count = gp[key] != null ? gp[key] : gp.count; return c; }).filter(function (gp) { return gp.count > 0; });
    if (S.win && S.win[wk]) { S.total = S.win[wk].total; S.errors = S.win[wk].errors; S.warnings = S.win[wk].warnings; }
    S.perDay = (S.perDay || []).slice(-N);
  });
  R.events.appCrashes = (R.events.appCrashes || []).map(function (a) { var c = {}; Object.keys(a).forEach(function (x) { c[x] = a[x]; }); c.count = a[key] != null ? a[key] : a.count; return c; }).filter(function (a) { return a.count > 0; });
  var hk = N === 1 ? 'appHangs1' : (N === 7 ? 'appHangs7' : 'appHangs30'); if (R.events[hk] != null) R.events.appHangs = R.events[hk];
  R.events.days = N; R.meta.periodDays = N;
  if (R.extras && R.extras.timeline) R.extras.timeline = R.extras.timeline.filter(function (e) { return new Date(e.t).getTime() >= cut; });
  if (R.extras && R.extras.reliability && R.extras.reliability.bugchecks) R.extras.reliability.bugchecks = R.extras.reliability.bugchecks.filter(function (b) { return new Date(b.time).getTime() >= cut; });
})();
var V = Engine(window.__PCDATA__ || null);
V.Engine = Engine;
V.setProfile = function (key) {
  V.profile = V.PROFILES[key] ? key : 'home';
  V.findings = V.withProfile(V.baseFindings, V.profile);
  V.counts = { high: 0, medium: 0, low: 0, info: 0 };
  V.findings.forEach(function (x) { V.counts[x.sev]++; });
  V.score = V.scoreOf(V.findings);
  if (V.userAdjust) V.userAdjust();
};
