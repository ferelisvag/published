@echo off
setlocal
title VEAGLE PC Check
cd /d "%~dp0"
mode con cols=92 lines=40
color 0F

net session >nul 2>&1
if %errorlevel% neq 0 (
  echo.
  echo  VEAGLE PC Check
  echo  ---------------
  echo  Windows will now ask: "Do you want to allow this app to make changes?"
  echo  Click YES. The check only reads things, it changes nothing.
  echo.
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

if not exist "%~dp0app\collector.ps1" (
  echo app\collector.ps1 was not found.
  echo You probably started this from inside the ZIP. Right-click the ZIP, choose Extract All, open the new folder and try again.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0app\collector.ps1"

echo.
echo The report should now be open in your browser. If not, open the Reports folder and double-click report.html.
echo Press any key to close this window.
pause >nul
