@echo off
setlocal
title VEAGLE PC Check (quick scan)
cd /d "%~dp0"
mode con cols=92 lines=40
color 0F

net session >nul 2>&1
if %errorlevel% neq 0 (
  cls
  echo.
  echo      __     _______    _    ____ _     _____
  echo      \ \   / ^| ____^|  / \  / ___^| ^|   ^| ____^|
  echo       \ \ / /^|  _^|   / _ \^| ^|  _^| ^|   ^|  _^|
  echo        \ V / ^| ^|___ / ___ ^| ^|_^| ^| ^|___^| ^|___
  echo         \_/  ^|_____/_/   \_\____^|_____^|_____^|
  echo.
  echo   P C   C H E C K                          ferelis.gr
  echo   ------------------------------------------------------------
  echo    QUICK SCAN  ^(about 1 minute^)
  echo   ------------------------------------------------------------
  echo.
  echo    What happens now:
  echo.
  echo      1. Windows asks: "Do you want to allow this app to make
  echo         changes?"   Click  YES.
  echo      2. A new window opens and checks your PC.
  echo      3. When it finishes, the report opens in your browser.
  echo.
  echo    Safe to run: the check only READS information.
  echo    Nothing is changed on your PC and nothing is uploaded.
  echo.
  echo   ------------------------------------------------------------
  echo   Press any key to continue, or close this window to cancel.
  pause >nul
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

if not exist "%~dp0app\collector.ps1" (
  echo.
  echo  app\collector.ps1 was not found.
  echo  You probably started this from inside the ZIP.
  echo  Right-click the ZIP, choose Extract All, open the new folder and try again.
  echo.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0app\collector.ps1" -Quick

echo.
echo   ------------------------------------------------------------
echo    WHAT NEXT
echo   ------------------------------------------------------------
echo    The report should now be open in your browser.
echo    If it is not, open the folder "Reports", then the newest
echo    folder, and double-click  report.html
echo.
echo    You can close this window now.
echo.
echo    Press any key to close.
pause >nul
