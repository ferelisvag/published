@echo off
setlocal
title VEAGLE PC Check - Live (Veagle Eye)
cd /d "%~dp0"
mode con cols=92 lines=40
color 0F
echo.
echo  VEAGLE PC Check - Live data with Veagle Eye
echo  --------------------------------------------
echo.
echo  IMPORTANT: for live data, the black window of Veagle Eye
echo  must stay OPEN. If you close it, the live data stops.
echo.
echo  Veagle Eye is a separate free program. It listens only on
echo  your own computer (127.0.0.1) and sends nothing to the internet.
echo.
set "EYE="
if exist "%~dp0VeagleEye.exe" set "EYE=%~dp0VeagleEye.exe"
if not defined EYE if exist "%~dp0..\VeagleEye.exe" set "EYE=%~dp0..\VeagleEye.exe"
if not defined EYE (
  echo  VeagleEye.exe was not found next to this file.
  echo  Download it from: https://ferelisvag.github.io/published/veagle-eye/
  echo  Save VeagleEye.exe in this same folder and run this file again.
  echo.
  echo  Press any key to close this window.
  pause >nul
  exit /b 1
)
echo  Found: %EYE%
echo.
choice /C YN /M " Start Veagle Eye now"
if errorlevel 2 (
  echo.
  echo  OK, nothing was started.
  pause
  exit /b 0
)
echo.
echo  Starting Veagle Eye. In ITS black window copy the line
echo  "Address" and paste it in the PC Check report, tab Live.
echo.
start "" "%EYE%"
echo  You can close THIS window. Do NOT close the Veagle Eye window.
pause
