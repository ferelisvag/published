# VEAGLE PC Check

Δωρεάν έλεγχος υγείας για υπολογιστές με Windows 10 και 11. Μόνο ανάγνωση: σαρώνει υλικό, δίσκους, ασφάλεια, προγράμματα και Event Viewer και φτιάχνει μια αναφορά HTML. Προαιρετικά δίνει τα ευρήματα σε ένα AI για δεύτερη γνώμη (πρώτα στο Claude, μετά ChatGPT, Gemini, Copilot).

https://ferelisvag.github.io/published/veagle-pc-check/

Αυτή η εφαρμογή **δεν τρέχει μέσα στον browser**. Η σελίδα είναι η παρουσίαση και το manual, και από εκεί κατεβαίνει το ZIP.

## Τι περιέχει ο φάκελος

| Αρχείο | Τι είναι |
|---|---|
| `index.html` | Η σελίδα παρουσίασης και το manual (EN + GR με κουμπί), με το SHA-256 του ZIP |
| `demo.html` | Δείγμα αναφοράς με demo δεδομένα (ανοίγει από τη σελίδα) |
| `download/VEAGLE-PC-Check-v….zip` | Το ZIP που κατεβάζουν οι φίλοι |
| `shots/` | Screenshots για τη σελίδα |
| `source/` | Όλο το project: ο κώδικας της σάρωσης και ο δημιουργός της αναφοράς |
| `manifest.webmanifest`, εικονίδια | Για την κάρτα στο ferelisapps |

## Τι κάνει το ZIP

- `VEAGLE-PC-Check.bat`: πλήρης σάρωση (3–5 λεπτά). Ζητά δικαιώματα διαχειριστή και τρέχει το `app/collector.ps1`.
- `VEAGLE-PC-Check-Quick.bat`: γρήγορη σάρωση (~30 δευτ.), χωρίς msinfo32, winget, DISM.
- Φτιάχνει φάκελο `Reports\<ημερομηνία-ώρα>` με `report.html`, `data.json` και `raw\`.
- Η αναφορά: Dashboard, Findings (περίπου 75 έλεγχοι, με απλά λόγια, χρόνο, δυσκολία και ρίσκο), Hardware, Software, Events, Compare (πριν/μετά), Tools (οδηγός για αρχάριους, μήνυμα για βοηθό, script διορθώσεων με κλειστές εντολές, CSV, πολλά PC σε έναν πίνακα), AI help, Share-safe copy, τύπος PC (Home/Work/Gaming), Windows 11 readiness, υγεία μπαταρίας.
- Όλα τοπικά. Δεν ανεβαίνει τίποτα. Δικτυακά: το `winget upgrade` (ποια προγράμματα έχουν ενημέρωση), ένα ping στο router και μία αναζήτηση του www.microsoft.com.
- Οι εξαγωγές και το πακέτο για AI γράφουν «VEAGLE - ferelis.gr» και ότι φτιάχτηκε με τη βοήθεια του Claude.

## Πώς φτιάχνεται νέα έκδοση

Όλα γίνονται από τον φάκελο `source/` (χρειάζεται Python 3 με Pillow). Η αναφορά είναι ένα `template.html` με ενσωματωμένες γραμματοσειρές και λογότυπο, και ο collector βάζει μέσα τα δεδομένα.

1. Άλλαξε τον κώδικα: `source/app/collector.ps1` (σάρωση) ή `source/src/` (αναφορά). Σε κάθε νέα έκδοση ανέβασε τον αριθμό στο `collector.ps1` (`$script:Version`) και στο `make_sample.py`.
2. `python3 make_sample.py`, `python3 build.py`, `python3 tools/make_sample_report.py`
3. `python3 package.py`: φτιάχνει το ZIP στο `dist/` και τυπώνει το SHA-256.
4. `python3 make_landing.py`: φτιάχνει το `dist/index.html` με το νέο SHA-256, μέγεθος και την ένδειξη «Έκδοση Η.Μ · ΩΩ:ΛΛ».
5. Αντίγραψε: `dist/index.html` → `index.html`, το ZIP → `download/` (σβήσε το παλιό), `tools/sample-report.html` → `demo.html`.
6. Έλεγξε τον collector σε πραγματικά Windows πριν τον μοιραστείς, γιατί δεν μπορεί να δοκιμαστεί σε Linux.

Ο collector ελέγχεται σε σύνταξη με PowerShell 7 (`Parser.ParseFile`) και πρέπει να μένει **καθαρό ASCII**: το Windows PowerShell 5.1 διαβάζει αλλιώς τα αρχεία χωρίς BOM και χαλάνε οι χαρακτήρες. Το `build.py` αρνείται να χτίσει αν βρει κυριολεκτικά `</script>` μέσα στο JavaScript της αναφοράς.

## Σημειώσεις

- **GitHub Release:** από συνεδρία Claude Code δεν επιτρέπεται η δημιουργία Release, γι' αυτό το ZIP κατεβαίνει από το `download/`. Αν θες Release, ανέβασέ το χειροκίνητα στο GitHub και άλλαξε τον σύνδεσμο λήψης στο `index.html`.
- Δεν υπάρχει GoatCounter ή άλλη παρακολούθηση στη σελίδα, σύμφωνα με το «χωρίς παρακολούθηση» της σελίδας εφαρμογών.
- Γνωστός περιορισμός: μερικοί έλεγχοι διαβάζουν αγγλικά κείμενα (π.χ. DISM) και σε Windows άλλης γλώσσας δείχνουν «unknown».
- Ο έλεγχος «έτοιμος για Windows 11» εκτιμά τον επεξεργαστή από το όνομά του. Τελικός κριτής είναι το PC Health Check της Microsoft.
