@echo off
chcp 65001 >nul
title Veagle Eye
cd /d "%~dp0"
echo.
echo  Εκκίνηση του Veagle Eye... / Starting Veagle Eye...
echo  (Για έξοδο κλείσε αυτό το παράθυρο / To quit, close this window)
echo.
where py >nul 2>nul
if %errorlevel%==0 (
  py veagle_eye.py
) else (
  python veagle_eye.py
)
if errorlevel 1 (
  echo.
  echo  Κάτι πήγε στραβά. Δες το README.md / Something went wrong. See README.md
  pause
)
