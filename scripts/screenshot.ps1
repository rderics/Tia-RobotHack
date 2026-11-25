# Saves a screenshot of the whole desktop (all screens) – used to check Tia's real actions (Outlook window, PDF, print dialog).
# Usage: powershell -ExecutionPolicy Bypass -File scripts\screenshot.ps1 [out.png]
param([string]$Out = "$PSScriptRoot\..\data\screen.png")
Add-Type -AssemblyName System.Windows.Forms, System.Drawing
$b = [System.Windows.Forms.SystemInformation]::VirtualScreen
$bmp = New-Object System.Drawing.Bitmap $b.Width, $b.Height
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($b.Left, $b.Top, 0, 0, $bmp.Size)
$bmp.Save((Resolve-Path -LiteralPath (Split-Path $Out) | ForEach-Object { Join-Path $_ (Split-Path $Out -Leaf) }), [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
Write-Output $Out
