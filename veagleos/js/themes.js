/* Θέματα: 5 εμφανίσεις (veagle, terminal, clinic, aegean, hud). Το CSS βρίσκεται στο index.html (html[data-theme]), εδώ γίνεται η εφαρμογή και τα χρώματα των σωματιδίων. */
(function () {
  'use strict';
  var OS = window.OS;
  var list = [
    { id: 'veagle', name: 'Veagle', desc: 'Μαύρο και κόκκινο, το προεπιλεγμένο', sw: ['#050708', '#ff1e38', '#e7ecf3'], net: { edge: '255,30,56', node: '231,236,243', packet: '#ff1e38' }, meta: '#050708' },
    { id: 'terminal', name: 'Τερματικό', desc: 'Πράσινο φωσφόρου, όλα σε monospace', sw: ['#020a04', '#39ff6e', '#b8ffc9'], net: { edge: '57,255,110', node: '184,255,201', packet: '#39ff6e' }, meta: '#020a04' },
    { id: 'clinic', name: 'Κλινική', desc: 'Φωτεινό, καθαρό, για την ημέρα', sw: ['#eef3f6', '#d9142c', '#14232d'], net: { edge: '14,138,158', node: '20,35,45', packet: '#d9142c' }, meta: '#eef3f6' },
    { id: 'aegean', name: 'Αιγαίο', desc: 'Βαθύ μπλε με γαλάζια ακτινοβολία', sw: ['#04101f', '#4cc9f0', '#e8f4ff'], net: { edge: '76,201,240', node: '232,244,255', packet: '#4cc9f0' }, meta: '#04101f' },
    { id: 'hud', name: 'Holo HUD', desc: 'Ολογραφικό περιβάλλον sci-fi με κυανό φως και σάρωση', sw: ['#02070d', '#19e3ff', '#d6f6ff'], net: { edge: '25,227,255', node: '214,246,255', packet: '#19e3ff' }, meta: '#02070d' }
  ];
  var byId = {}; list.forEach(function (t) { byId[t.id] = t; });
  function apply(id, silent) {
    var t = byId[id] || byId.veagle;
    document.documentElement.setAttribute('data-theme', t.id);
    var on = OS.settings.get('particles');
    window.NETCOL = { edge: t.net.edge, node: t.net.node, packet: t.net.packet, on: on !== false };
    var m = document.getElementById('tcolor'); if (m) m.setAttribute('content', t.meta);
    var bg = document.getElementById('netbg'); if (bg) bg.style.opacity = t.id === 'clinic' ? '.35' : '.6';
    var fx = document.getElementById('hudfx');
    if (t.id === 'hud' && !fx) { var d = document.createElement('div'); d.innerHTML = '<svg id="hudfx" viewBox="0 0 600 600" aria-hidden="true" focusable="false" fill="none" stroke="#19e3ff"><g class="r r1"><circle cx="300" cy="300" r="286" stroke-width="1" stroke-dasharray="2 6" opacity=".7"/><circle cx="300" cy="300" r="276" stroke-width="10" stroke-dasharray="1 11.2" opacity=".5"/></g><g class="r r2"><circle cx="300" cy="300" r="238" stroke-width="2" stroke-dasharray="120 40 18 40" opacity=".8"/><circle cx="300" cy="300" r="226" stroke="#ffb020" stroke-width="3" stroke-dasharray="60 520" opacity=".85"/></g><g class="r r3"><circle cx="300" cy="300" r="190" stroke-width="1.5" stroke-dasharray="4 10" opacity=".8"/><path d="M300 98v26M300 476v26M98 300h26M476 300h26" stroke-width="2.5" opacity=".9"/></g><g class="r r4"><circle cx="300" cy="300" r="150" stroke-width="5" stroke-dasharray="90 30" opacity=".55"/><circle cx="300" cy="300" r="132" stroke-width="1" opacity=".7"/></g><g class="core"><circle cx="300" cy="300" r="86" stroke-width="2" opacity=".9"/><path d="M300 236l55 96h-110z" stroke-width="2.5" opacity=".9"/><circle cx="300" cy="300" r="20" fill="#19e3ff" fill-opacity=".25" stroke-width="2"/></g></svg>'; document.body.appendChild(d.firstChild); }
    else if (t.id !== 'hud' && fx) fx.remove();
    if (!silent) OS.settings.set('theme', t.id);
    OS.emit('theme', t.id);
  }
  OS.themes = { list: list, byId: byId, apply: apply };
  OS.on('start', function () { apply(OS.settings.get('theme'), true); });
  OS.on('setting:particles', function () { apply(OS.settings.get('theme'), true); });
  /* προ-φόρτωση πριν το OS.start ώστε το netbg να έχει χρώματα */
  apply(OS.settings.get('theme'), true);
})();
