@echo off
rem Double-click to open Tia as a desktop window (Electron). Close the window to stop her.
cd /d "%~dp0"
if not exist node_modules (
  echo First time here - running setup...
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\setup.ps1" || goto :fail
)
call npm start
goto :eof
:fail
echo Setup failed - see the messages above.
pause
