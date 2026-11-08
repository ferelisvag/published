# Veagle Eye

**Ελληνικά** · [English below](#english)

Ζωντανή παρακολούθηση του υπολογιστή σου μέσα στον browser, σε ένα ενιαίο dashboard που ταιριάζει για δεύτερη οθόνη. Επεξεργαστής, μνήμη, δίσκοι, δίκτυο, προγράμματα και ποιος μιλά με το διαδίκτυο, με απλά λόγια. Έχει και εναλλακτικές όψεις (World με χάρτη του κόσμου, Cyber, Orbit, Wall, Mind Map).

## Εγκατάσταση (Windows)
1. Εγκατέστησε την Python από python.org (τσέκαρε «Add python.exe to PATH» ή «py launcher»).
2. Άνοιξε το PowerShell μέσα στον φάκελο και γράψε: `py -m pip install -r requirements.txt`
3. Διπλό κλικ στο `START-VEAGLE-EYE.bat`. Ο browser ανοίγει μόνος του.

Συντομεύσεις: **F** πλήρης οθόνη · **Space** παύση · **1–6** όψεις · **L** γλώσσα.

## Ιδιωτικότητα
> **Όλα τρέχουν τοπικά στον υπολογιστή σου. Τίποτα δεν φεύγει εκτός του υπολογιστή.**

- Δεν στέλνει τίποτα στο διαδίκτυο και δεν αλλάζει τίποτα στον υπολογιστή.
- Ακούει μόνο στο 127.0.0.1, με κωδικό που αλλάζει σε κάθε εκκίνηση.
- Δεν ξεκινά μόνο του και δεν κρατά ιστορικό.
- Οι γραμματοσειρές είναι μέσα στο πακέτο: δεν φορτώνεται τίποτα απ' έξω.

Η χώρα κάθε διεύθυνσης προκύπτει από αρχείο μέσα στο πρόγραμμα (DB-IP.com Lite, CC BY 4.0), χωρίς κανένα ερώτημα στο διαδίκτυο. Χάρτης: Natural Earth (δημόσιο πεδίο).

**Χώρα στον χάρτη (προαιρετικό):** ο χάρτης World βάζει το PC στη θάλασσα. Αν θέλεις να μπει στη χώρα σου, άνοιξε το PowerShell στον φάκελο και γράψε `py veagle_eye.py --home GR` (GR = Ελλάδα, DE = Γερμανία, US = ΗΠΑ…).

Άδεια MIT. Φτιάχτηκε από τον VEAGLE · ferelis.gr με τη βοήθεια του Claude.

## English
Live monitoring of your PC in the browser, as a single-screen dashboard made for a second monitor: CPU, memory, disks, network, programs and who talks to the internet, in plain language, plus alternative views (World map, Cyber, Orbit, Wall, Mind Map).

**Install (Windows):** install Python from python.org, run `py -m pip install -r requirements.txt`, then double-click `START-VEAGLE-EYE.bat`. Shortcuts: **F** fullscreen, **Space** pause, **1–6** views, **L** language.

> **Everything runs locally on your computer. Nothing ever leaves your computer.**

**Privacy:** sends nothing to the internet, changes nothing on your PC, listens on 127.0.0.1 only with a per-start token, no autostart, no history, fonts bundled locally.

**Country on the map (optional):** the World view puts your PC at sea. To place it in your country run `py veagle_eye.py --home GR` (any 2-letter country code).

MIT license. Made by VEAGLE · ferelis.gr with Claude's help.

IP geolocation by DB-IP.com Lite (CC BY 4.0), bundled offline; map data Natural Earth (public domain).
