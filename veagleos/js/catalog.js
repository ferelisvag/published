/* Veagle OS: ο κατάλογος. Εδώ προσθέτεις φακέλους, εφαρμογές και επιφάνειες εργασίας.
   Νέα εφαρμογή: πρόσθεσε μια γραμμή στο ITEMS (folder = id φακέλου).
     also: ['moto']  → εμφανίζεται και σε άλλους φακέλους
     section: '...'  → τίτλος ομάδας μέσα στο παράθυρο του φακέλου
     app: 'calc'     → ανοίγει ενσωματωμένο εργαλείο αντί για link
   Από την ίδια τη σελίδα προσθέτεις δικά σου με το «+» (μένουν μόνο στον browser σου)
   και τα εξάγεις με «Εξαγωγή» για να μπουν εδώ μόνιμα. Η δημόσια έκδοση ξεκινά με άδειους φακέλους.
   icon: globe link grid doc mail route calc chart gauge money moto play fb ig x in github pin spark dash
         terminal folder music users pulse eagle plus lock box apps sun timer key swap percent radar commit
         sliders list cloud code egg fav (fav = εικονίδιο του ίδιου του site)
   color: χρώμα πλακιδίου (προαιρετικό). soon:true = σχέδιο που δεν έχει ακόμα σελίδα. */
window.VEAGLE = {
  version: '2.0 Public',
  folders: [
    { id: 'ferelis',  name: 'ferelis.gr',     path: '/net/ferelis.gr',   icon: 'globe',  desc: 'Ο δημιουργός του Veagle OS και οι εφαρμογές του', slots: 2 },
    { id: 'apps',     name: 'Εφαρμογές',      path: '/usr/apps',         icon: 'box',    desc: 'Δωρεάν δημόσιες εφαρμογές του ferelis.gr', slots: 3 },
    { id: 'dash',     name: 'Dashboards',     path: '/home/dashboards',  icon: 'dash',   desc: 'Πίνακες ελέγχου: βάλε εδώ τους δικούς σου', slots: 4 },
    { id: 'tools',    name: 'Εργαλεία',       path: '/usr/tools',        icon: 'sliders',desc: 'Μικροεργαλεία και ρυθμίσεις του Veagle OS', slots: 2 },
    { id: 'linkhub',  name: 'Link Hub',       path: '/net/linkhub',      icon: 'link',   desc: 'Έτοιμα bookmarks για χρήσιμα sites και εργαλεία, ανά κατηγορία', slots: 3 },
    { id: 'moto',     name: 'Μηχανή',         path: '/home/moto',        icon: 'moto',   desc: 'Διαδρομές, κανάλια και ό,τι αφορά τη μηχανή', slots: 4 },
    { id: 'photo',    name: 'Φωτογραφία',     path: '/home/photo',       icon: 'ig',     desc: 'Φωτογραφία: φως, μέρη, portfolio', slots: 6 },
    { id: 'lab',      name: 'Εργαστήριο',     path: '/opt/lab',          icon: 'spark',  desc: 'Προεπισκοπήσεις και πειράματα σε εξέλιξη', slots: 2 },
    { id: 'github',   name: 'GitHub',         path: '/src/github',       icon: 'github', desc: 'Τα repos σου', slots: 2 },
    { id: 'social',   name: 'Κοινωνικά',      path: '/net/social',       icon: 'users',  desc: 'Προφίλ και κανάλια', slots: 2 },
    { id: 'plans',    name: 'Σχέδια',         path: '/home/plans',       icon: 'pulse',  desc: 'Ιδέες που περιμένουν σειρά', slots: 3 },
    { id: 'personal', name: 'Δικά μου',       path: '/home/user',        icon: 'folder', desc: 'Ελεύθερος χώρος για ό,τι έρθει', slots: 6 }
  ],
  /* Επιφάνειες εργασίας: ποιοι φάκελοι φαίνονται σε καθεμία. Εναλλαγή με Alt+1…4 ή από τη γραμμή. */
  workspaces: [
    { id: 'all',   name: 'Όλα',        folders: null },
    { id: 'work',  name: 'Δουλειά',    folders: ['ferelis', 'dash', 'tools', 'linkhub', 'github', 'plans', 'personal'] },
    { id: 'moto',  name: 'Μηχανή',     folders: ['moto', 'social', 'tools', 'personal'] },
    { id: 'photo', name: 'Φωτογραφία', folders: ['photo', 'social', 'ferelis', 'tools', 'personal'] }
  ],
  /* Συντομεύσεις αναζήτησης: γράψε «g καιρός» στην αναζήτηση. %s = το κείμενο. */
  shortcuts: [
    { k: 'g',    name: 'Google',          url: 'https://www.google.com/search?q=%s' },
    { k: 'yt',   name: 'YouTube',         url: 'https://www.youtube.com/results?search_query=%s' },
    { k: 'maps', name: 'Google Maps',     url: 'https://www.google.com/maps/search/%s' },
    { k: 'gh',   name: 'GitHub',          url: 'https://github.com/search?q=%s' },
    { k: 'w',    name: 'Βικιπαίδεια',     url: 'https://el.wikipedia.org/w/index.php?search=%s' },
    { k: 'tr',   name: 'Μετάφραση',       url: 'https://translate.google.com/?sl=auto&tl=el&text=%s' }
  ],
  /* Στόχοι για τα διαγνωστικά δικτύου (τρέχουν μόνο αν ανοίξεις το Internet στις Ρυθμίσεις) */
  diag: [
    { name: 'Google',               url: 'https://www.google.com/generate_204' },
    { name: 'Cloudflare',           url: 'https://www.cloudflare.com/cdn-cgi/trace' },
    { name: 'GitHub',               url: 'https://github.com/' },
    { name: 'Βικιπαίδεια',          url: 'https://www.wikipedia.org/' }
  ],
  items: [
    /* ferelis.gr */
    { id: 'site',   folder: 'ferelis', name: 'ferelis.gr',        desc: 'Η κύρια σελίδα του δημιουργού',      url: 'https://ferelis.gr',                              icon: 'globe' },
    { id: 'hub',    folder: 'ferelis', name: 'Veagle Link Hub',   desc: 'Bookmarks, ανά κατηγορία',          url: 'https://ferelis.gr/bm.html',                      icon: 'eagle', color: '#141414' },
    { id: 'apppg',  folder: 'ferelis', name: 'Σελίδα εφαρμογών', desc: 'Όλες οι εφαρμογές του ferelis.gr',  url: 'https://ferelis.gr/ferelisapps.html',             icon: 'grid' },

    /* Εφαρμογές (δημόσιες, GitHub Pages) */
    { id: 'route',  folder: 'apps', name: 'Ο δικός μου δρόμος',   desc: 'Βέλτιστη διαδρομή έως 30 στάσεις',      url: 'https://ferelisvag.github.io/published/route-planner/',    icon: 'route', color: '#1d4fa3' },
    { id: 'veagle', folder: 'apps', name: 'Veagle on the road',    desc: 'Διαδρομές και ταξίδια με μηχανή',       url: 'https://ferelisvag.github.io/published/veagleontheroad/',  icon: 'moto',  color: '#141414', also: ['moto'] },
    { id: 'misthos',folder: 'apps', name: 'Υπολόγισε τον μισθό σου', desc: 'Από μικτά σε καθαρά, Ελλάδα',         url: 'https://ferelisvag.github.io/published/misthos/',          icon: 'calc',  color: '#0f5c45' },
    { id: 'broke',  folder: 'apps', name: 'BrokeOMeter',           desc: 'Βγαίνεις τον μήνα ή όχι;',              url: 'https://ferelisvag.github.io/published/brokeometer/',      icon: 'gauge', color: '#12302A' },
    { id: 'fin',    folder: 'apps', name: 'Veagle Finance',        desc: 'Σύνθετος τόκος και επένδυση',           url: 'https://ferelisvag.github.io/published/veaglefinancecalc/',icon: 'chart', color: '#0F172A' },
    { id: 'eye',    folder: 'apps', name: 'Veagle Eye',            desc: 'Τι κάνει ο υπολογιστής σου, τοπικά (Windows)', app: 'eye', icon: 'radar', color: '#141414' },
    { id: 'seismoi',folder: 'apps', name: 'Σεισμοί στην Ελλάδα',   desc: 'Χάρτης και χρονολόγιο σεισμών ≥5',      url: 'https://ferelisvag.github.io/published/seismoi/',          icon: 'pulse' },
    { id: 'egg',    folder: 'apps', name: 'Το Τέλειο Αυγό',        desc: 'Χρονόμετρο βρασμού αυγού',              url: 'https://ferelisvag.github.io/published/perfect-egg/',      icon: 'egg' },
    { id: 'notes',  folder: 'apps', name: 'Veagle Notes',          desc: 'Σημειώσεις σαν το OneNote',             url: 'https://ferelisvag.github.io/published/veagle-notes/',     icon: 'doc' },
    { id: 'pccheck',folder: 'apps', name: 'VEAGLE PC Check',       desc: 'Έλεγχος υγείας για Windows',            url: 'https://ferelisvag.github.io/published/veagle-pc-check/',  icon: 'gauge', color: '#141414' },
    { id: 'gtl',    folder: 'apps', name: 'Google Timeline by Veagle', desc: 'Δες το δικό σου Timeline.json, τοπικά', url: 'https://ferelisvag.github.io/published/googletimelinebyveagle/', icon: 'pin' },

    /* Εργαλεία (ενσωματωμένα) */
    { id: 'tweather', folder: 'tools', name: 'Καιρός και φως',     desc: 'Καιρός, ανατολή, δύση, χρυσή ώρα',     app: 'weather', icon: 'sun',   also: ['photo', 'moto'] },
    { id: 'ttasks',   folder: 'tools', name: 'Εκκρεμότητες',       desc: 'Λίστα με ημερομηνίες',                  app: 'tasks',   icon: 'list' },
    { id: 'tcalc',    folder: 'tools', name: 'Αριθμομηχανή',       desc: 'Πράξεις με ιστορικό',                   app: 'calc',    icon: 'calc' },
    { id: 'ttimer',   folder: 'tools', name: 'Χρονόμετρο',         desc: 'Χρονόμετρο, αντίστροφη μέτρηση, pomodoro', app: 'timer', icon: 'timer' },
    { id: 'tvat',     folder: 'tools', name: 'ΦΠΑ',                desc: 'Με και χωρίς ΦΠΑ',                      app: 'vat',     icon: 'percent' },
    { id: 'tpass',    folder: 'tools', name: 'Κωδικοί',            desc: 'Γεννήτρια ασφαλών κωδικών',             app: 'passgen', icon: 'key' },
    { id: 'tconv',    folder: 'tools', name: 'Μετατροπές',         desc: 'Base64, hex, URL',                      app: 'convert', icon: 'code' },
    { id: 'tnet',     folder: 'tools', name: 'Διαγνωστικά δικτύου',desc: 'Ping και απάντηση γνωστών sites',       app: 'net',     icon: 'radar' },
    { id: 'tset',     folder: 'tools', name: 'Ρυθμίσεις',          desc: 'Θέμα, internet, καιρός, αντίγραφο',     app: 'settings',icon: 'sliders' }
  ],
  /* Dock: item = link/εφαρμογή, folder = παράθυρο φακέλου, app = ενσωματωμένο εργαλείο, launcher, terminal */
  dock: [
    { t: 'item', id: 'site' }, { t: 'item', id: 'hub' }, { t: 'sep' },
    { t: 'folder', id: 'apps' }, { t: 'folder', id: 'dash' }, { t: 'folder', id: 'linkhub' }, { t: 'folder', id: 'github' }, { t: 'sep' },
    { t: 'app', id: 'tasks' }, { t: 'app', id: 'weather' }, { t: 'folder', id: 'tools' }, { t: 'sep' },
    { t: 'launcher' }, { t: 'terminal' }, { t: 'app', id: 'settings' }
  ]
};
