# Veagle OS · Public edition

**ΕΛ** · Ένα φανταστικό λειτουργικό σύστημα μέσα στον browser: επιφάνεια εργασίας, dock, παράθυρα, αναζήτηση, εργαλεία και 8 άλλες «λειτουργίες» προβολής (Cyber, Galaxy, City, Orbit, Reactor, Ocean, Wall, Mind Map). Βάζεις τα δικά σου links, εφαρμογές και dashboards. Δωρεάν, χωρίς λογαριασμό, χωρίς εγκατάσταση.

**EN** · An imaginary operating system inside your browser: desktop, dock, windows, search, tools and 8 more view modes. You add your own links, apps and dashboards. Free, no account, nothing to install.

Άνοιξέ το / Open it: https://ferelisvag.github.io/published/veagleos/

## Ιδιωτικότητα / Privacy
- Όλα τρέχουν τοπικά στον browser σου. Οι ρυθμίσεις, οι σημειώσεις και οι εφαρμογές σου μένουν στο localStorage αυτού του browser.
- Η σύνδεση στο internet είναι **κλειστή από προεπιλογή**. Αν την ανοίξεις (Ρυθμίσεις → Internet), το OS κάνει μικρά αιτήματα για τον καιρό (open-meteo.com), ping (google.com) και τα εικονίδια των sites (google.com). Χωρίς αυτήν δεν φεύγει τίποτα.
- Καμία παρακολούθηση, καμία εξωτερική γραμματοσειρά (οι γραμματοσειρές είναι μέσα στο φάκελο `fonts/`).
- Everything runs locally in your browser. The internet switch is **off by default**. No tracking, no external fonts.

## Πώς το κάνεις δικό σου / Make it yours
- Το **+** πάνω δεξιά προσθέτει δική σου εφαρμογή ή link. Οι φάκελοι ξεκινούν άδειοι (εκτός από ferelis.gr, Εφαρμογές, Εργαλεία και Link Hub).
- Ρυθμίσεις → Αντίγραφο ασφαλείας: εξάγεις/εισάγεις τα δεδομένα σου.
- Γλώσσα EL/EN: κουμπί πάνω δεξιά ή Ρυθμίσεις.
- Veagle Eye: ανοίγει μέσα σε παράθυρο του OS αν το τρέχεις στον υπολογιστή σου (μόνο όταν το ζητήσεις).

## Για προγραμματιστές / For developers
Καθαρό HTML/JS, χωρίς build. Ο κατάλογος είναι στο `js/catalog.js`, ο πυρήνας στο `js/os.js`, τα αγγλικά στο `js/i18n.js` (λεξικό ελληνικά → αγγλικά· κάθε νέο ελληνικό κείμενο χρειάζεται εγγραφή).

Ιδέα και σχεδιασμός / Idea and design: Vagelis Ferelis · https://ferelis.gr
Γραμματοσειρές / Fonts: Space Grotesk, IBM Plex Sans, IBM Plex Mono (SIL Open Font License, βλ. `fonts/LICENSE-*.txt`).
