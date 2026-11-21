#!/usr/bin/env python3
"""Builds the LogoTest folder (test window for the ASCII logo, NOT part of the ZIP).
Run from source/:  python3 tools/make_logotest.py   ->  dist/LogoTest/ + dist/VEAGLE-LogoTest.zip
Reads the real Step() function, the logo and the step names from app/collector.ps1."""
import re, os, zipfile, shutil
src = open('app/collector.ps1', encoding='ascii').read()
ver = re.search(r"\$script:Version\s*=\s*'([^']+)'", src).group(1)
rows = re.search(r"\$script:LogoRows = @\((.*?)\n\)", src, re.S).group(1)
rows = re.findall(r"^\s*'(.*)',?\s*$", rows, re.M)
step = re.search(r"(function Step\(.*?\n\}\n)", src, re.S).group(1)
d = {}
for n, l in re.findall(r"Step (\d+) \$TOTAL '([^']*)'", src): d[int(n)] = l
d[10] = 'Outdated applications (winget)'
labels = [(n, d[n]) for n in sorted(d)]
assert len(rows) == 26 and len(labels) == 26, (len(rows), len(labels))
out = 'dist/LogoTest'
shutil.rmtree(out, ignore_errors=True); os.makedirs(out)
def w(name, text):
    with open(os.path.join(out, name), 'w', encoding='ascii', newline='') as f:
        f.write(text.replace('\r\n', '\n').replace('\n', '\r\n'))
w('logo.txt', '\n'.join(rows) + '\n')
lab = ',\n'.join("    '%s'" % l for _, l in labels)
ps = f"""# VEAGLE PC Check - logo test window (fake scan, 26 steps in about 10 seconds, changes nothing)
$ErrorActionPreference = 'SilentlyContinue'
$script:Version = '{ver}'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$swTotal = [Diagnostics.Stopwatch]::StartNew()
$script:CurStep = 0
$script:CurLabel = ''
function Flush-StepErrors {{ }}

$rows = @(Get-Content -LiteralPath (Join-Path $root 'logo.txt'))
while ($rows.Count -lt 26) {{ $rows += '' }}
$script:LogoRows = $rows

{step}
$labels = @(
{lab}
)

try {{
    $Host.UI.RawUI.WindowTitle = 'VEAGLE logo test'
    $sz = $Host.UI.RawUI.WindowSize
    if ($sz.Width -lt 132) {{
        $bs = $Host.UI.RawUI.BufferSize; $bs.Width = 132; if ($bs.Height -lt 300) {{ $bs.Height = 300 }}; $Host.UI.RawUI.BufferSize = $bs
        $sz.Width = 132; $Host.UI.RawUI.WindowSize = $sz
    }}
}} catch {{ }}
Write-Host ''
Write-Host '   __     _______    _    ____ _     _____' -ForegroundColor Red
Write-Host '   \\ \\   / | ____|  / \\  / ___| |   | ____|' -ForegroundColor Red
Write-Host '    \\ \\ / /|  _|   / _ \\| |  _| |   |  _|' -ForegroundColor Red
Write-Host '     \\ V / | |___ / ___ | |_| | |___| |___' -ForegroundColor DarkRed
Write-Host '      \\_/  |_____/_/   \\_\\____|_____|_____|' -ForegroundColor DarkRed
Write-Host ''
Write-Host '   P C   C H E C K   (LOGO TEST - nothing is scanned)' -ForegroundColor White
Write-Host ''
$TOTAL = 26
for ($i = 1; $i -le $TOTAL; $i++) {{
    Step $i $TOTAL $labels[$i - 1]
    Start-Sleep -Milliseconds 350
}}
Write-Host ''
Write-Host '    DONE (test). Edit logo.txt (26 lines), save, and run LogoTest.bat again.' -ForegroundColor Green
"""
w('LogoTest.ps1', ps)
w('LogoTest.bat', """@echo off
title VEAGLE logo test
cd /d "%~dp0"
mode con cols=132 lines=52
color 0F
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0LogoTest.ps1"
echo.
pause
""")
w('README.txt', """VEAGLE logo test
================
1. Double-click LogoTest.bat. It plays the scan window with the 26 steps in about 10 seconds.
   It scans nothing and changes nothing.
2. To change the logo: open logo.txt in Notepad (26 lines, characters: space * # only, up to 52 wide),
   save, double-click LogoTest.bat again.
3. When you like it, send me the logo.txt (or a screenshot) and I put it in the real program.
""")
z = 'dist/VEAGLE-LogoTest.zip'
with zipfile.ZipFile(z, 'w', zipfile.ZIP_DEFLATED) as zf:
    for n in sorted(os.listdir(out)): zf.write(os.path.join(out, n), 'VEAGLE-LogoTest/' + n)
print('ok', z)
