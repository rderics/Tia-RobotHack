# Tia - install (or update) on a Windows PC in one go. Teammates run ONE line in PowerShell:
#   irm https://raw.githubusercontent.com/rderics/Tia-RobotHack/main/scripts/install.ps1 | iex
# or double-click "Install Tia.cmd" from https://rderics.id.lv/tia-get/
#
# What it does: downloads Tia to %USERPROFILE%\Tia (git if available, else a zip), installs Node/Python/ffmpeg/
# cloudflared/Obsidian with winget, Tia's packages, the team keys (tia-team.env from Downloads/Desktop), registers both
# Obsidian vaults, and puts a "Tia" icon on the desktop. Running it again updates Tia and keeps your .env and data.
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
$dest = if ($env:TIA_DIR) { $env:TIA_DIR } else { Join-Path $env:USERPROFILE "Tia" }
$testRun = $env:TIA_TEST -eq "1"   # test install: no winget, no Obsidian/desktop changes
$repo = "https://github.com/rderics/Tia-RobotHack"
function Say($t) { Write-Host "`n== $t" -ForegroundColor Cyan }
function Has($c) { [bool](Get-Command $c -ErrorAction SilentlyContinue) }
function Refresh-Path { $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User") }
# (not named "Winget": a function with that name hides winget.exe and calls itself forever)
function Install-WithWinget($id, $name) {
  $wg = Get-Command winget -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $wg) { Write-Host "winget missing - install $name by hand" -ForegroundColor Yellow; return }
  Write-Host "Installing $name..."
  & $wg.Source install --id $id -e --accept-package-agreements --accept-source-agreements --silent | Out-Null
  Refresh-Path
}

Write-Host "Tia installer - AI secretary (RobotHack 2026)" -ForegroundColor Magenta

Say "1/6 Download Tia"
# Git makes Tia update herself from GitHub later (Tia checks every 15 minutes)
if (-not (Has "git") -and -not $testRun) { Install-WithWinget "Git.Git" "Git (for automatic updates)" }
if (Test-Path (Join-Path $dest ".git")) {
  if (Has "git") { git -C $dest pull --ff-only; Write-Host "Updated with git pull" }
} elseif ((Has "git") -and -not (Test-Path $dest)) {
  git clone "$repo.git" $dest
} elseif ((Has "git") -and (Test-Path $dest)) {
  # an older zip copy → turn it into a git copy (keeps .env, data and config.json – they're not in git)
  git -C $dest init -q; git -C $dest remote add origin "$repo.git" 2>$null
  git -C $dest fetch -q origin main; git -C $dest reset -q --hard origin/main; git -C $dest branch -q -M main; git -C $dest branch -q --set-upstream-to=origin/main main
  Write-Host "Switched to automatic updates (git)"
} else {
  $zip = Join-Path $env:TEMP "tia-main.zip"
  $tmp = Join-Path $env:TEMP "tia-main"
  Invoke-WebRequest "$repo/archive/refs/heads/main.zip" -OutFile $zip
  if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
  Expand-Archive $zip $tmp -Force
  $src = Get-ChildItem $tmp | Select-Object -First 1
  New-Item -ItemType Directory -Force $dest | Out-Null
  # copy over, but never touch the PC's own settings and data
  robocopy $src.FullName $dest /E /NFL /NDL /NJH /NJS /NP /XD data node_modules /XF .env config.json | Out-Null
  Remove-Item $zip, $tmp -Recurse -Force -ErrorAction SilentlyContinue
}
Write-Host "Tia is in $dest"
Set-Location $dest

Say "2/6 Team keys"
# The shared keys (free AI, WhatsApp Business) come from the TEAM CODE (Rinalds shares it in Discord) – no file needed.
# Tia refreshes them at every start. (An old tia-team.env in Downloads still works too.)
$envFile = Join-Path $dest ".env"
$haveCode = (Test-Path $envFile) -and ((Get-Content $envFile -Raw) -match "(?m)^TIA_TEAM_CODE=\S+")
$teamFile = @((Join-Path $env:USERPROFILE "Downloads\tia-team.env"), (Join-Path $env:USERPROFILE "Desktop\tia-team.env")) | Where-Object { Test-Path $_ } | Select-Object -First 1
function Save-Env($pairs) {
  $lines = @(); if (Test-Path $envFile) { $lines = @(Get-Content $envFile) }
  foreach ($k in $pairs.Keys) { $lines = @($lines | Where-Object { $_ -notmatch "^$k=" }); $lines += "$k=$($pairs[$k])" }
  Set-Content -Path $envFile -Value $lines -Encoding ascii
}
if (-not $haveCode -and -not $teamFile -and -not $testRun) {
  $code = (Read-Host "Team code from Rinalds (press Enter to skip)").Trim()
  if ($code) {
    try {
      $r = Invoke-RestMethod -Method Post -Uri "https://rderics.id.lv/tia-team" -ContentType "application/json" -Body (@{ code = $code } | ConvertTo-Json)
      $pairs = @{ TIA_TEAM_CODE = $code }
      foreach ($l in ($r.env -split "`r?`n")) { if ($l -match "^([A-Z0-9_]+)=(.+)$") { $pairs[$Matches[1]] = $Matches[2].Trim() } }
      Save-Env $pairs
      Write-Host "Joined the team - $($pairs.Count - 1) keys saved on this PC. Tia keeps them up to date." -ForegroundColor Green
    } catch { Write-Host "That code didn't work ($($_.Exception.Message)). You can type it later in Tia -> Settings -> Join the team." -ForegroundColor Yellow }
  } else { Write-Host "Skipped - type the team code later in Tia -> Settings -> Join the team." -ForegroundColor Yellow }
} elseif ($teamFile) {
  $pairs = @{}
  Get-Content $teamFile | ForEach-Object { if ($_ -match "^\s*([A-Z0-9_]+)=(.+)$") { $pairs[$Matches[1]] = $Matches[2].Trim() } }
  Save-Env $pairs
  Write-Host "Team keys from $teamFile." -ForegroundColor Green
} else { Write-Host "Team keys already set up." -ForegroundColor Green }

Say "3/6 Tools (Node, Python, ffmpeg, cloudflared, Obsidian)"
if (-not $testRun) {
if (-not (Has "cloudflared") -and -not (Test-Path "C:\Program Files (x86)\cloudflared\cloudflared.exe")) { Install-WithWinget "Cloudflare.cloudflared" "cloudflared (public address for the phone + WhatsApp)" }
# Composio CLI: connects Gmail, Google Calendar, Slack, Instagram, LinkedIn, Meta Ads (each teammate signs in to their own free account in Tia → Settings)
if (-not (Test-Path (Join-Path $env:USERPROFILE ".composio\composio.exe"))) {
  Write-Host "Installing Composio (app connections)..."
  try { powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/ComposioHQ/composio/next/install.ps1 | iex" } catch { Write-Host "Composio install failed - app connections can be added later with Update Tia." -ForegroundColor Yellow }
}
$obsidianExe = Join-Path $env:LOCALAPPDATA "Programs\Obsidian\Obsidian.exe"
if (-not (Test-Path $obsidianExe)) { Install-WithWinget "Obsidian.Obsidian" "Obsidian (to show the business vault)" }
}

Say "4/6 Tia's setup (packages, Outlook support, AI)"
powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $dest "scripts\setup.ps1")
if ($LASTEXITCODE -ne 0) { throw "setup failed - see above" }
$py = if (Has "python") { "python" } else { "py" }
& $py -m pip install --disable-pip-version-check -q pywin32 2>$null   # classic Outlook drafts

if ($testRun) { Write-Host "Test run: skipping Obsidian + desktop icons"; return }
Say "5/6 Obsidian vaults"
$cfgDir = Join-Path $env:APPDATA "obsidian"
New-Item -ItemType Directory -Force $cfgDir | Out-Null
$cfgFile = Join-Path $cfgDir "obsidian.json"
$o = if (Test-Path $cfgFile) { Get-Content $cfgFile -Raw | ConvertFrom-Json } else { [pscustomobject]@{ vaults = [pscustomobject]@{} } }
if (-not $o.vaults) { $o | Add-Member -NotePropertyName vaults -NotePropertyValue ([pscustomobject]@{}) -Force }
foreach ($name in @("demo\Business vault TIA", "TIA Context vault")) {
  $p = Join-Path $dest $name
  if (-not (Test-Path $p)) { continue }
  $known = $o.vaults.PSObject.Properties | Where-Object { $_.Value.path -eq $p }
  if (-not $known) {
    $id = -join ((1..16) | ForEach-Object { "{0:x}" -f (Get-Random -Maximum 16) })
    $o.vaults | Add-Member -NotePropertyName $id -NotePropertyValue ([pscustomobject]@{ path = $p; ts = [DateTimeOffset]::Now.ToUnixTimeMilliseconds() })
    Write-Host "Obsidian knows: $p"
  }
}
# UTF-8 without BOM - Obsidian can't read a BOM
[IO.File]::WriteAllText($cfgFile, ($o | ConvertTo-Json -Depth 6), (New-Object Text.UTF8Encoding $false))

Say "6/6 Desktop icons"
$desk = [Environment]::GetFolderPath("Desktop")
$ws = New-Object -ComObject WScript.Shell
$lnk = $ws.CreateShortcut((Join-Path $desk "Tia.lnk"))
# Electron directly: Tia opens as her own window (no console, no browser, no "localhost" in sight)
$electron = Join-Path $dest "node_modules\electron\dist\electron.exe"
if (Test-Path $electron) { $lnk.TargetPath = $electron; $lnk.Arguments = "`"$dest`"" } else { $lnk.TargetPath = Join-Path $dest "Start Tia (desktop app).cmd" }
$lnk.WorkingDirectory = $dest
$lnk.IconLocation = Join-Path $dest "src\renderer\assets\icon.ico"
$lnk.WindowStyle = 7   # minimized: only Tia's window shows
$lnk.Description = "Tia - AI secretary"
$lnk.Save()
$vaultLink = "obsidian://open?path=" + [uri]::EscapeDataString((Join-Path $dest "demo\Business vault TIA"))
Set-Content -Path (Join-Path $desk "Tia - Business vault.url") -Value "[InternetShortcut]`r`nURL=$vaultLink`r`n" -Encoding ascii
$lnk3 = $ws.CreateShortcut((Join-Path $desk "Update Tia.lnk"))
$lnk3.TargetPath = "powershell.exe"
$lnk3.Arguments = "-NoProfile -ExecutionPolicy Bypass -Command `"irm https://raw.githubusercontent.com/rderics/Tia-RobotHack/main/scripts/install.ps1 | iex`""
$lnk3.IconLocation = Join-Path $dest "src\renderer\assets\icon.ico"
$lnk3.Save()

Write-Host "`nDone! Double-click 'Tia' on the desktop." -ForegroundColor Green
Write-Host "Phone: in Tia press 'Connect phone' and scan the QR code - it opens the download + connects in one go."
Write-Host "Outlook drafts need classic Outlook with any account signed in."
