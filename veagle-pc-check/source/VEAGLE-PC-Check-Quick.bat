@echo off
setlocal
title VEAGLE PC Check (quick scan)
cd /d "%~dp0"
mode con cols=132 lines=52
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
