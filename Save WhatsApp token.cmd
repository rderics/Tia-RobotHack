@echo off
rem Copy the WhatsApp token in Meta (System users -> Tia -> Generate token -> Copy), then double-click this.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\save-whatsapp-token.ps1"
echo.
pause
