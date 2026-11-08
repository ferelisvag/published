/* Θέματα: 5 εμφανίσεις. Το CSS βρίσκεται στο index.html (html[data-theme]), εδώ γίνεται η εφαρμογή και τα χρώματα των σωματιδίων. */
(function () {
  'use strict';
  var OS = window.OS;
  var list = [
    { id: 'veagle', name: 'Veagle', desc: 'Μαύρο και κόκκινο, το προεπιλεγμένο', sw: ['#050708', '#ff1e38', '#e7ecf3'], net: { edge: '255,30,56', node: '231,236,243', packet: '#ff1e38' }, meta: '#050708' },
    { id: 'terminal', name: 'Τερματικό', desc: 'Πράσινο φωσφόρου, όλα σε monospace', sw: ['#020a04', '#39ff6e', '#b8ffc9'], net: { edge: '57,255,110', node: '184,255,201', packet: '#39ff6e' }, meta: '#020a04' },
    { id: 'clinic', name: 'Κλινική', desc: 'Φωτεινό, καθαρό, για την ημέρα', sw: ['#eef3f6', '#d9142c', '#14232d'], net: { edge: '14,138,158', node: '20,35,45', packet: '#d9142c' }, meta: '#eef3f6' },
    { id: 'aegean', name: 'Αιγαίο', desc: 'Βαθύ μπλε με γαλάζια ακτινοβολία', sw: ['#04101f', '#4cc9f0', '#e8f4ff'], net: { edge: '76,201,240', node: '232,244,255', packet: '#4cc9f0' }, meta: '#04101f' }
  ];
  var byId = {}; list.forEach(function (t) { byId[t.id] = t; });
  function apply(id, silent) {
    var t = byId[id] || byId.veagle;
    document.documentElement.setAttribute('data-theme', t.id);
    var on = OS.settings.get('particles');
    window.NETCOL = { edge: t.net.edge, node: t.net.node, packet: t.net.packet, on: on !== false };
    var m = document.getElementById('tcolor'); if (m) m.setAttribute('content', t.meta);
    var bg = document.getElementById('netbg'); if (bg) bg.style.opacity = t.id === 'clinic' ? '.35' : '.6';
    if (!silent) OS.settings.set('theme', t.id);
    OS.emit('theme', t.id);
  }
  OS.themes = { list: list, byId: byId, apply: apply };
  OS.on('start', function () { apply(OS.settings.get('theme'), true); });
  OS.on('setting:particles', function () { apply(OS.settings.get('theme'), true); });
  /* προ-φόρτωση πριν το OS.start ώστε το netbg να έχει χρώματα */
  apply(OS.settings.get('theme'), true);
})();
