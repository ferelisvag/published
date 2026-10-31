@echo off
setlocal
title VEAGLE PC Check
cd /d "%~dp0"

net session >nul 2>&1
if %errorlevel% neq 0 (
  echo Asking Windows for administrator rights ...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

if not exist "%~dp0app\collector.ps1" (
  echo app\collector.ps1 was not found. Extract the whole ZIP first, then run this file again.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0app\collector.ps1"

echo.
echo Press any key to close this window.
pause >nul
