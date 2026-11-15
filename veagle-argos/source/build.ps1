# Builds the portable VeagleArgos.exe (single file, no install needed).
# Usage:  powershell -ExecutionPolicy Bypass -File build.ps1 [-Venv <venv folder>]
param([string]$Venv = "$PSScriptRoot\.venv")
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$py = Join-Path $Venv "Scripts\python.exe"
if (-not (Test-Path $py)) {
    Write-Host "Creating venv in $Venv ..."
    py -3 -m venv $Venv
    & $py -m pip install --upgrade pip
}
& $py -m pip install -q -r requirements.txt

# Windows file properties (Details tab): VEAGLE - ferelis.gr
New-Item -ItemType Directory -Force build | Out-Null
$ver = & $py -c "import re;print(re.search(r'APP_VERSION = \""([^\""]+)\""', open('veagle_homecam.py', encoding='utf-8').read()).group(1))"
$parts = ($ver.Split('.') + @('0','0','0','0'))[0..3] -join ', '
@"
VSVersionInfo(
  ffi=FixedFileInfo(filevers=($parts), prodvers=($parts)),
  kids=[StringFileInfo([StringTable('040904B0', [
    StringStruct('CompanyName', 'VEAGLE - ferelis.gr'),
    StringStruct('FileDescription', 'Veagle Argos Panoptis - ONVIF / RTSP camera viewer'),
    StringStruct('FileVersion', '$ver'),
    StringStruct('InternalName', 'VeagleArgos'),
    StringStruct('LegalCopyright', 'VEAGLE - ferelis.gr'),
    StringStruct('OriginalFilename', 'VeagleArgos.exe'),
    StringStruct('ProductName', 'Veagle Argos'),
    StringStruct('ProductVersion', '$ver')])]),
  VarFileInfo([VarStruct('Translation', [1033, 1200])])]
)
"@ | Set-Content -Encoding utf8 build\version_info.txt

& $py -m PyInstaller --noconfirm --clean --onefile --windowed `
    --name VeagleArgos --icon "$PSScriptRoot\assets\veagle.ico" `
    --version-file "$PSScriptRoot\build\version_info.txt" `
    --add-data "$PSScriptRoot\assets;assets" `
    --distpath dist --workpath build --specpath build `
    veagle_homecam.py
if ($LASTEXITCODE -ne 0) { throw "PyInstaller failed" }

Write-Host ""
Write-Host "Done: $PSScriptRoot\dist\VeagleArgos.exe"
