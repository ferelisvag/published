# VEAGLE Ping Monitor, κώδικας

- `main.go`: τοπικός server (μόνο 127.0.0.1, με κωδικό) και λογική του ping.
- `os_windows.go`: ping με τη λειτουργία `IcmpSendEcho` των Windows (χωρίς διαχειριστή), router, browser.
- `os_other.go`: **προσομοιωμένα** ping, μόνο για δοκιμή της οθόνης σε Linux/Mac. Δεν μπαίνει στο .exe.
- `web/`: η οθόνη της εφαρμογής (ένα HTML) και τα λογότυπα· ενσωματώνονται στο .exe.
- `rsrc.py`: εικονίδιο και ιδιότητες του .exe.

Νέα έκδοση: άλλαξε την «Έκδοση ddmm hhmm» στο `web/index.html`, τρέξε `./build.sh` (Go 1.24+, Python με Pillow)
και ενημέρωσε έκδοση, μέγεθος και SHA-256 στη σελίδα `../index.html`.
