#!/usr/bin/env python3
"""Assembles dist/VEAGLE-PC-Check-v<version>.zip from this folder and prints its SHA-256.
Run build.py (and tools/make_sample_report.py) first."""
import hashlib, pathlib, re, zipfile
root = pathlib.Path(__file__).resolve().parent
version = re.search(r"\$script:Version = '([\d.]+)'", (root / 'app' / 'collector.ps1').read_text(encoding='utf-8')).group(1)
dist = root / 'dist'; dist.mkdir(exist_ok=True)
out = dist / f'VEAGLE-PC-Check-v{version}.zip'
files = {
    'VEAGLE-PC-Check.bat': root / 'VEAGLE-PC-Check.bat',
    'VEAGLE-PC-Check-Quick.bat': root / 'VEAGLE-PC-Check-Quick.bat',
    'README.txt': root / 'README.txt',
    'SAMPLE-REPORT.html': root / 'tools' / 'sample-report.html',
    'app/collector.ps1': root / 'app' / 'collector.ps1',
    'app/template.html': root / 'app' / 'template.html',
}
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for name, path in files.items():
        z.write(path, 'VEAGLE-PC-Check/' + name)
sha = hashlib.sha256(out.read_bytes()).hexdigest()
print(out.name, round(out.stat().st_size / 1024), 'KB')
print('sha256', sha)
(dist / (out.name + '.sha256')).write_text(sha + '  ' + out.name + '\n')
