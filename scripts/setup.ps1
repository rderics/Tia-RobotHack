# Tia - one-time setup on a Windows PC (run again after every `git pull`).
# Right-click -> "Run with PowerShell", or in a terminal in the Tia folder:
#   powershell -ExecutionPolicy Bypass -File scripts\setup.ps1
# It installs what is missing (Node.js, Python, ffmpeg via winget), then Tia's own packages.
# Nothing personal is needed: without a config.json Tia runs the fictional demo business (Liepa Interjers).

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Say($text) { Write-Host "`n== $text" -ForegroundColor Cyan }
function Has($cmd) { [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }
function Refresh-Path {
  $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
}
function Install-WithWinget($id, $name) {
  if (-not (Has "winget")) { throw "$name is missing and winget is not available. Install $name by hand, then run this again." }
  Write-Host "Installing $name with winget ($id)..."
  winget install --id $id -e --accept-package-agreements --accept-source-agreements --silent
  Refresh-Path
}

Say "1/5 Node.js"
if (-not (Has "node")) { Install-WithWinget "OpenJS.NodeJS.LTS" "Node.js LTS" }
if (-not (Has "node")) { throw "Node.js was installed but this window can't see it yet. Close it and run setup again." }
Write-Host "Node.js $(node -v)"

Say "2/5 Python"
$py = $null
foreach ($c in @("python", "py")) {
  if (Has $c) {
    $v = & $c --version 2>&1
    if ($v -match "Python 3\.(\d+)" -and [int]$Matches[1] -ge 9) { $py = $c; break }
  }
}
if (-not $py) {
  Install-WithWinget "Python.Python.3.12" "Python 3.12"
  $py = "python"
}
Write-Host "$(& $py --version)"

Say "3/5 ffmpeg (for hold-to-talk)"
if (-not (Has "ffmpeg")) { Install-WithWinget "Gyan.FFmpeg" "ffmpeg" }
if (Has "ffmpeg") { Write-Host "ffmpeg found" } else { Write-Host "ffmpeg not visible yet - restart the PC or this window; talking to Tia needs it, everything else works." -ForegroundColor Yellow }

Say "4/5 Tia's packages (npm + pip)"
npm install --no-fund --no-audit
if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
# Some npm setups skip install scripts, so Electron's app may be missing - fetch it directly.
if (-not (Test-Path "node_modules\electron\path.txt")) {
  Write-Host "Downloading the Electron desktop app..."
  node node_modules\electron\install.js
}
& $py -m pip install --disable-pip-version-check -q -r requirements.txt
if ($LASTEXITCODE -ne 0) { throw "pip install failed" }
Write-Host "Packages ready"

Say "5/5 Claude (Tia's live brain)"
if (Has "claude") {
  Write-Host "Claude Code found. If it isn't logged in yet, open a terminal, type: claude   and log in once."
} else {
  Write-Host "Claude Code not found - optional." -ForegroundColor Yellow
  Write-Host "Without it Tia still works: 'Start the day' plays the saved real run, and talking uses the offline script."
  Write-Host "For live answers install Claude Code: https://claude.com/claude-code  (then run: claude  and log in)."
}

Write-Host "`nDone. Double-click 'Start Tia.cmd' in the Tia folder (or run: npm run web) and open http://localhost:4747" -ForegroundColor Green
