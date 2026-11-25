@echo off
rem Double-click to start Tia in your browser (http://localhost:4747). Close this window to stop her.
cd /d "%~dp0"
if not exist node_modules (
  echo First time here - running setup...
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\setup.ps1" || goto :fail
)
if "%TIA_PORT%"=="" set TIA_PORT=4747
start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:%TIA_PORT%/"
echo Tia is starting on http://localhost:%TIA_PORT%/  (close this window to stop)
node src\web.js
goto :eof
:fail
echo Setup failed - see the messages above.
pause
