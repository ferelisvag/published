/* Οδηγίες χρήσης (manual) του Veagle OS. Ανοίγει από το κουμπί «?» πάνω δεξιά, από το πλήκτρο F1 ή από το φάκελο Εργαλεία.
   Τα κείμενα είναι για εντελώς αρχάριους. Κάθε ενότητα είναι [τίτλος, [παράγραφοι]] σε ελληνικά και αγγλικά (ανάλογα με τη γλώσσα). */
(function () {
  'use strict';
  var OS = window.OS; if (!OS) return;
  var h = OS.h, EN = window.OSLANG === 'en';
  var M = [
    [['Τι είναι το Veagle OS', 'What Veagle OS is'], [
      ['Είναι μια δική σου αρχική σελίδα που μοιάζει με λειτουργικό σύστημα: έχεις φακέλους, εφαρμογές, εργαλεία και widgets, όλα σε μία οθόνη μέσα στον browser.', 'It is your own start page that looks like an operating system: folders, apps, tools and widgets, all on one screen inside your browser.'],
      ['Δεν χρειάζεται λογαριασμό ούτε εγκατάσταση. Ό,τι ορίζεις μένει μόνο στον δικό σου browser, σε αυτόν τον υπολογιστή.', 'No account and no installation needed. Whatever you set stays only in your own browser, on this computer.']
    ]],
    [['Τα πρώτα βήματα', 'First steps'], [
      ['1. Αριστερά βλέπεις τους φακέλους. Πάτα έναν για να ανοίξει το παράθυρό του με τα περιεχόμενα.', '1. On the left you see the folders. Click one to open its window with the contents.'],
      ['2. Κάτω βλέπεις τη γραμμή με τις γρήγορες εφαρμογές (το «dock»).', '2. At the bottom you see the bar with quick apps (the “dock”).'],
      ['3. Δεξιά βλέπεις τα widgets: ρολόι, καιρό, εκκρεμότητες, σημειώσεις.', '3. On the right you see the widgets: clock, weather, tasks, notes.'],
      ['4. Πάνω δεξιά έχεις το «+» (νέα εφαρμογή), το «?» (αυτές οι οδηγίες), το εικονίδιο των widgets και τις Ρυθμίσεις.', '4. At the top right you have “+” (new app), “?” (these instructions), the widgets icon and Settings.']
    ]],
    [['Φάκελοι και εφαρμογές', 'Folders and apps'], [
      ['Κάθε πλακίδιο μέσα σε φάκελο ανοίγει ένα site σε νέα καρτέλα ή ένα εργαλείο μέσα στο ίδιο το Veagle OS.', 'Each tile inside a folder opens a website in a new tab or a tool inside Veagle OS itself.'],
      ['Για να προσθέσεις δικό σου link πάτα το «+» πάνω δεξιά, γράψε όνομα και διεύθυνση και διάλεξε φάκελο. Μένει μόνο στον browser σου. Με «Εξαγωγή» στις Ρυθμίσεις μπορείς να το κρατήσεις σε αρχείο.', 'To add your own link press “+” at the top right, write a name and address and choose a folder. It stays only in your browser. With “Export” in Settings you can keep it in a file.'],
      ['Τα παράθυρα σέρνονται από τον τίτλο τους, ελαχιστοποιούνται και κλείνουν με τα κουμπιά δεξιά, όπως στα Windows.', 'Windows are dragged by their title, and minimized or closed with the buttons on the right, like in Windows.']
    ]],
    [['Αναζήτηση και συντομεύσεις', 'Search and shortcuts'], [
      ['Πάτα Ctrl+K (ή κάνε κλικ στο πεδίο αναζήτησης πάνω αριστερά) και γράψε μέρος από ένα όνομα: βρίσκει εφαρμογές και links.', 'Press Ctrl+K (or click the search box at the top left) and type part of a name: it finds apps and links.'],
      ['Μπορείς να γράψεις και π.χ. «g καιρός αθήνα»: το «g» ψάχνει στο Google. Άλλα γράμματα: yt (YouTube), maps (χάρτες), gh (GitHub), w (Βικιπαίδεια), tr (μετάφραση).', 'You can also type e.g. “g weather athens”: “g” searches Google. Other letters: yt (YouTube), maps (maps), gh (GitHub), w (Wikipedia), tr (translate).']
    ]],
    [['Widgets (η στήλη δεξιά)', 'Widgets (the column on the right)'], [
      ['Πάτα «Προσαρμογή» κάτω από τα widgets (ή Alt+Shift+E). Κάθε κάρτα παίρνει βελάκια για τη σειρά, «–» για να μαζεύει και «×» για να κρύβεται. Τα κρυμμένα widgets τα ξαναβάζεις με «Πρόσθεσε».', 'Press “Customize” under the widgets (or Alt+Shift+E). Each card gets arrows for the order, “–” to collapse and “×” to hide. Hidden widgets come back with “Add”.'],
      ['Διαθέσιμα: Ρολόι, Καιρός, Εκκρεμότητες, Σύστημα, Σημειώσεις, Σήμερα, Συντομεύσεις, Τα sites μου, Pomodoro, Ώρες στον κόσμο, Αντίστροφη μέτρηση, Διαχείριση εργασιών, IP και DNS, Η σύνδεσή μου, Εργαλεία δικτύου.', 'Available: Clock, Weather, Tasks, System, Notes, Today, Shortcuts, My sites, Pomodoro, World clocks, Countdown, Task manager, IP and DNS, My connection, Network tools.'],
      ['Η «Διαχείριση εργασιών» δείχνει μόνο όσα μπορεί να μετρήσει ένας browser (φόρτο της σελίδας, καρέ, μνήμη σελίδας, μπαταρία). Το πραγματικό ποσοστό CPU και RAM του υπολογιστή δεν το δίνει κανένας browser.', 'The “Task manager” shows only what a browser can measure (page load, frames, page memory, battery). No browser gives the real CPU and RAM usage of the computer.']
    ]],
    [['Κέντρο ελέγχου περιβάλλοντος', 'Environment control center'], [
      ['Ανοίγει με το εικονίδιο των widgets πάνω δεξιά ή με Alt+Shift+C. Εδώ αλλάζεις:', 'It opens with the widgets icon at the top right or with Alt+Shift+C. Here you change:'],
      ['• Διάταξη των widgets: μία στήλη, δύο στήλες ή ελεύθερη (σέρνεις κάθε κάρτα από τον τίτλο της όπου θέλεις στην οθόνη).', '• Widget layout: one column, two columns or free (drag each card by its title anywhere on the screen).'],
      ['• Πλάτος, πυκνότητα, μέγεθος εικονιδίων, θέμα, επιφάνεια εργασίας.', '• Width, density, icon size, theme, workspace.'],
      ['• Διακόπτες: δευτερόλεπτα στο ρολόι, σωματίδια στο φόντο, τελείες κατάστασης, οθόνη εκκίνησης και το Internet.', '• Switches: seconds on the clock, particles in the background, status dots, boot screen and Internet.'],
      ['Τίποτα δεν αλλάζει μόνο του: ό,τι βλέπεις αλλάζει μόνο όταν το επιλέξεις.', 'Nothing changes by itself: what you see changes only when you choose it.']
    ]],
    [['Internet και ιδιωτικότητα', 'Internet and privacy'], [
      ['Ο διακόπτης «Internet» είναι κλειστός από την αρχή. Όσο είναι κλειστός, το Veagle OS δεν στέλνει τίποτα πουθενά.', 'The “Internet” switch is off from the start. While it is off, Veagle OS sends nothing anywhere.'],
      ['Αν τον ανοίξεις (Κέντρο ελέγχου ή Ρυθμίσεις), ο καιρός, τα διαγνωστικά, ο έλεγχος sites, το IP και DNS κ.λπ. μπορούν να ρωτούν το internet, και τα περισσότερα μόνο όταν πατήσεις κουμπί.', 'If you turn it on (Control center or Settings), weather, diagnostics, site checks, IP and DNS etc. can ask the internet, and most only when you press a button.'],
      ['Οι εκκρεμότητες, οι σημειώσεις και οι ρυθμίσεις σου μένουν στον browser (localStorage). Αν καθαρίσεις τα δεδομένα του browser, θα χαθούν· γι’ αυτό κάνε αντίγραφο ασφαλείας.', 'Your tasks, notes and settings stay in your browser (localStorage). If you clear the browser data they are lost, so make a backup.']
    ]],
    [['Αντίγραφο ασφαλείας', 'Backup'], [
      ['Άνοιξε τις Ρυθμίσεις (εικονίδιο πάνω δεξιά ή φάκελος Εργαλεία) και πάτα «Εξαγωγή». Κατεβαίνει ένα αρχείο με τις ρυθμίσεις, τις σημειώσεις, τα widgets και τα δικά σου links.', 'Open Settings (icon at the top right or the Tools folder) and press “Export”. A file downloads with your settings, notes, widgets and your own links.'],
      ['Σε άλλον browser ή υπολογιστή πάτα «Εισαγωγή» και διάλεξε το αρχείο.', 'On another browser or computer press “Import” and choose the file.']
    ]],
    [['Επιφάνειες εργασίας', 'Workspaces'], [
      ['Οι κάψουλες πάνω («Όλα», «Δουλειά», «Μηχανή», «Φωτογραφία») δείχνουν διαφορετικό σύνολο φακέλων. Εναλλαγή και με Alt+1 … Alt+4.', 'The pills at the top (“All”, “Work”, “Motorbike”, “Photography”) show a different set of folders. You can also switch with Alt+1 … Alt+4.']
    ]],
    [['Θέματα και λειτουργίες', 'Themes and modes'], [
      ['Στις Ρυθμίσεις διαλέγεις θέμα: Veagle, Terminal, Clinic, Aegean ή Holo HUD.', 'In Settings you choose a theme: Veagle, Terminal, Clinic, Aegean or Holo HUD.'],
      ['Πάνω υπάρχουν και άλλες «λειτουργίες» προβολής (Cyber, Galaxy, City, Orbit, Reactor, Ocean, Wall, Mind Map) που δείχνουν τα ίδια στοιχεία με άλλον τρόπο. Για να γυρίσεις, πάτα «Desktop».', 'At the top there are also other display “modes” (Cyber, Galaxy, City, Orbit, Reactor, Ocean, Wall, Mind Map) that show the same items in another way. To go back, press “Desktop”.']
    ]],
    [['Γλώσσα', 'Language'], [
      ['Το κουμπί «EN» / «EL» πάνω δεξιά αλλάζει τη γλώσσα. Η σελίδα φορτώνει ξανά και η επιλογή θυμάται.', 'The “EN” / “EL” button at the top right changes the language. The page reloads and the choice is remembered.']
    ]],
    [['Terminal', 'Terminal'], [
      ['Η εφαρμογή Terminal (στο dock) δέχεται απλές εντολές. Γράψε «help» για τη λίστα, π.χ. «ls» για φακέλους και «open» για να ανοίξεις κάτι.', 'The Terminal app (in the dock) accepts simple commands. Type “help” for the list, e.g. “ls” for folders and “open” to open something.']
    ]],
    [['Συντομεύσεις πληκτρολογίου', 'Keyboard shortcuts'], [
      ['F1: αυτές οι οδηγίες · Ctrl+K: αναζήτηση · Alt+1…4: επιφάνεια εργασίας · Alt+Shift+W: εμφάνιση/απόκρυψη widgets · Alt+Shift+E: προσαρμογή widgets · Alt+Shift+C: κέντρο ελέγχου · Esc: κλείσιμο.', 'F1: these instructions · Ctrl+K: search · Alt+1…4: workspace · Alt+Shift+W: show/hide widgets · Alt+Shift+E: customize widgets · Alt+Shift+C: control center · Esc: close.']
    ]],
    [['Κάτι δεν δουλεύει;', 'Something is not working?'], [
      ['• «Ο καιρός θέλει internet»: άνοιξε το διακόπτη Internet και διάλεξε πόλη στις Ρυθμίσεις.', '• “Weather needs the internet”: turn on the Internet switch and choose a city in Settings.'],
      ['• Εξαφανίστηκαν τα widgets: πάτα Alt+Shift+W ή άνοιξε το Κέντρο ελέγχου και άνοιξε τον διακόπτη «Εμφάνιση των widgets».', '• The widgets disappeared: press Alt+Shift+W or open the Control center and turn on “Show the widgets”.'],
      ['• Μπέρδεψες τη διάταξη: Κέντρο ελέγχου → «Επαναφορά διάταξης».', '• You messed up the layout: Control center → “Reset layout”.'],
      ['• Οι αλλαγές χάθηκαν: ο browser μάλλον καθάρισε τα δεδομένα του ή άνοιξες τη σελίδα σε ανώνυμο παράθυρο. Εκεί τίποτα δεν μένει.', '• Your changes are gone: the browser probably cleared its data, or you opened the page in a private window. Nothing is kept there.']
    ]]
  ];
  function pick(p) { return EN ? p[1] : p[0]; }
  function build(body) {
    var a = h('div', 'app'); a.style.maxHeight = '70vh'; a.style.overflow = 'auto'; body.appendChild(a);
    a.appendChild(h('p', 'n', EN ? 'Click a heading to open or close it.' : 'Πάτα έναν τίτλο για να ανοίξει ή να κλείσει.'));
    M.forEach(function (s, i) {
      var d = h('details'); if (i < 2) d.open = true; d.style.cssText = 'border-top:1px solid var(--line);padding:6px 0';
      var sm = h('summary', '', pick(s[0])); sm.style.cssText = 'cursor:pointer;font-weight:600;padding:4px 0'; d.appendChild(sm);
      s[1].forEach(function (p) { var e = h('p', '', pick(p)); e.style.cssText = 'margin:6px 0;line-height:1.5;font-size:13px'; d.appendChild(e); });
      a.appendChild(d);
    });
  }
  OS.registerApp('manual', { title: EN ? 'Instructions' : 'Οδηγίες χρήσης', path: '/usr/manual', icon: 'doc', width: 620, build: build });
  var sb = document.getElementById('addbtn');
  if (sb && sb.parentNode && !document.getElementById('helpbtn')) {
    var b = h('button', 'addbtn'); b.id = 'helpbtn'; b.type = 'button'; b.textContent = '?'; b.style.cssText = 'font:600 13px var(--mono)';
    b.title = EN ? 'Instructions (F1)' : 'Οδηγίες χρήσης (F1)'; b.setAttribute('aria-label', b.title);
    b.addEventListener('click', function () { OS.openApp('manual'); });
    sb.parentNode.insertBefore(b, sb);
  }
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'F1') return; e.preventDefault(); OS.openApp('manual');
  });
})();
