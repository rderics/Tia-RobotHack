# One-time: connect Tia on this computer to a web address through a Cloudflare Tunnel.
# Needs `cloudflared tunnel login` done first (it saves cert.pem in %USERPROFILE%\.cloudflared).
# Usage:  powershell -ExecutionPolicy Bypass -File scripts\tunnel-setup.ps1 [-Hostname tia.rderics.id.lv]
param([string]$Hostname = "tia.rderics.id.lv", [string]$Name = "tia", [int]$Port = 4747)
$ErrorActionPreference = "Stop"
$cf = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
$dir = Join-Path $env:USERPROFILE ".cloudflared"
if (-not (Test-Path (Join-Path $dir "cert.pem"))) { throw "Run: & '$cf' tunnel login   (then pick the domain and click Authorize)" }

# 1. The tunnel (reuse it if it already exists)
$existing = & $cf tunnel list --output json | ConvertFrom-Json | Where-Object { $_.name -eq $Name }
if (-not $existing) { & $cf tunnel create $Name | Out-Host; $existing = & $cf tunnel list --output json | ConvertFrom-Json | Where-Object { $_.name -eq $Name } }
$id = $existing.id
Write-Host "Tunnel $Name = $id"

# 2. The web address points at the tunnel (DNS record in Cloudflare)
& $cf tunnel route dns --overwrite-dns $Name $Hostname | Out-Host

# 3. What the tunnel serves: only Tia, nothing else on this computer
$config = @"
tunnel: $id
credentials-file: $(Join-Path $dir "$id.json")
ingress:
  - hostname: $Hostname
    service: http://localhost:$Port
  - service: http_status:404
"@
[IO.File]::WriteAllText((Join-Path $dir "tia.yml"), $config) # no BOM - cloudflared reads plain UTF-8
Write-Host "Saved $dir\tia.yml - start with:  & '$cf' tunnel --config '$dir\tia.yml' run $Name"
