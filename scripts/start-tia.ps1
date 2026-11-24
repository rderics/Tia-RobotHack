# Starts Tia (server + web address) – the same thing every time, e.g. at logon.
# Server: node src/web.js (this folder). Web address: the Cloudflare Tunnel from scripts/tunnel-setup.ps1.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$cf = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
$tunnelConfig = Join-Path $env:USERPROFILE ".cloudflared\tia.yml"
$logs = Join-Path $root "data\logs"
New-Item -ItemType Directory -Force $logs | Out-Null

$server = Start-Process node -ArgumentList "src/web.js" -WorkingDirectory $root -WindowStyle Hidden -PassThru `
  -RedirectStandardOutput (Join-Path $logs "server.log") -RedirectStandardError (Join-Path $logs "server.err.log")
Write-Host "Tia server started (pid $($server.Id))"

if (Test-Path $tunnelConfig) {
  $tunnel = Start-Process $cf -ArgumentList "tunnel", "--config", "`"$tunnelConfig`"", "run", "tia" -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput (Join-Path $logs "tunnel.log") -RedirectStandardError (Join-Path $logs "tunnel.err.log")
  Write-Host "Web address tunnel started (pid $($tunnel.Id))"
} else {
  Write-Host "No tunnel set up yet – run scripts\tunnel-setup.ps1 once."
}
