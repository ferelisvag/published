# Πλαίσιο για το Claude Code

Repo `ferelisvag/published` (public), δημοσιεύεται με GitHub Pages από το `main` στο https://ferelisvag.github.io/published/. Κάθε εφαρμογή σε δικό της φάκελο, ένα `index.html` με inline CSS/JS, χωρίς build. Leaflet από cdnjs. Ο ιδιοκτήτης (Βαγγέλης) δεν είναι developer: εξηγήσεις στα ελληνικά, απλά, βήμα-βήμα.

## veagleontheroad/ — Veagle on the road (διαδρομές με μηχανή)
- Σημεία με τύπους (TYPES: start, meet, coffee, photo, food, fuel, sight, stop, night, dest). Πρώτο = αφετηρία, τελευταίο = προορισμός, ρόλος από `ptType(r,i)`.
- Σημείο συνάντησης: προσωπικό κομμάτι ως εκεί, κοινή διαδρομή μετά (`splitParts`, `sharedRoute`, `gmapsSections`). Share link/GPX μοιράζονται την κοινή.
- Χρόνοι: `prefs.depart`, `p.wait` (λεπτά), `DEF_WAIT`, `schedule()`.
- Στυλ: `curvy` (Στροφές & επαρχία) και `fast` (Άμεση με διόδια). Δρομολόγηση Valhalla προφίλ `motorcycle`, εφεδρεία OSRM. Αναζήτηση Photon.
- Είσοδος: όνομα + GitHub fine-grained token. Δεδομένα στο private repo `ferelisvag/veagleontheroad-data`: `routes/<id>.json`, `routes/<id>.proposals.json`, `team.json` (χρήστες, δικαιώματα admin/publish/tested, παρέες). Δημόσιες διαδρομές αντιγράφονται στο `veagleontheroad/routes/` + `index.json`.
- Εκδρομές (`r.trip`: leader, members), προτάσεις αλλαγών με έγκριση από τον αρχηγό, αντίγραφα κοινής διαδρομής (`r.linkTo`, `relink()`) που ενημερώνονται αυτόματα.
- **Ανοιχτό θέμα:** η αποφυγή διοδίων (`exclude_tolls` στο Valhalla) δεν δουλεύει στην πράξη. Δεν έχει ελεγχθεί με πραγματικά αιτήματα. Η εφαρμογή δείχνει κάτω από το αποτέλεσμα «Υπηρεσία: … · Διόδια στη διαδρομή: ναι/όχι». Πρώτο βήμα: πραγματικό αίτημα στο valhalla1.openstreetmap.de για π.χ. Ιωάννινα → Κοζάνη με και χωρίς exclude_tolls.
- Λογότυπο: ο αετός του χρήστη (eagle-black/white.png), κείμενο μόνο VEAGLE / ON THE ROAD, χρώματα μαύρο/λευκό/κόκκινο.

## route-planner/ — «Ο δικός μου δρόμος» (δρομολόγια διανομών, έως 30 στάσεις)
- Βέλτιστη σειρά με δικό μας TSP (2-opt + or-opt) πάνω σε πίνακα OSRM/Valhalla, ίδια αφετηρία/επιστροφή, σταθερή πρώτη/τελευταία στάση, χρόνοι στάσεων, κόστος δρομολογίου, GPX/CSV, link. Ίδιο ανοιχτό θέμα με τα διόδια.

## Τρόπος δουλειάς
- Μετά από αλλαγή: έλεγχος σύνταξης του inline script, δοκιμή στον browser, commit + push στο `main`.
- Μην αλλάζεις τη λογική που υπάρχει χωρίς να ρωτήσεις. Ρώτα πριν από μεγάλες αλλαγές.
