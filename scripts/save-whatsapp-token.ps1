# Saves the WhatsApp sending token from the clipboard into .env (and the team file), after checking it with Meta.
# 1) Meta Business settings → System users → your "Tia" user → Generate token → Copy
# 2) Run:  powershell -ExecutionPolicy Bypass -File scripts\save-whatsapp-token.ps1
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root ".env"
$token = (Get-Clipboard -Raw).Trim()
if ($token -notmatch "^EA[A-Za-z0-9]{50,}$") { Write-Host "The clipboard doesn't hold a Meta token (it starts with EA...). Copy it in Meta first." -ForegroundColor Yellow; exit 1 }
$phoneId = ((Get-Content $envFile | Where-Object { $_ -match "^WHATSAPP_PHONE_NUMBER_IDS=" }) -replace "^WHATSAPP_PHONE_NUMBER_IDS=", "").Split(",")[0].Trim()
try {
  $r = Invoke-RestMethod -Uri "https://graph.facebook.com/v21.0/$phoneId`?fields=display_phone_number,verified_name" -Headers @{ Authorization = "Bearer $token" }
  Write-Host "Token works for $($r.display_phone_number) ($($r.verified_name))" -ForegroundColor Green
} catch { Write-Host "Meta refused that token: $($_.Exception.Message)" -ForegroundColor Yellow; exit 1 }
foreach ($f in @($envFile, (Join-Path $root "data\tia-team.env"))) {
  if (-not (Test-Path $f)) { continue }
  $lines = @(Get-Content $f | Where-Object { $_ -notmatch "^WHATSAPP_TOKEN=" })
  $lines += "WHATSAPP_TOKEN=$token"
  Set-Content -Path $f -Value $lines -Encoding ascii
}
Set-Clipboard -Value " "
Write-Host "Saved in .env (and data\tia-team.env). Restart Tia - the WhatsApp tab can now send." -ForegroundColor Green
