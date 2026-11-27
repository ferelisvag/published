#!/bin/sh
# Φτιάχνει το ../download/VeaglePingMonitor.exe (Go 1.24+, Python 3 με Pillow). Τρέχει σε Linux/Mac, ή Git Bash.
set -e
cd "$(dirname "$0")"
python3 rsrc.py
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o ../download/VeaglePingMonitor.exe .
cd ../download && sha256sum VeaglePingMonitor.exe
echo "Ενημέρωσε το SHA-256 και το μέγεθος στο ../index.html"
