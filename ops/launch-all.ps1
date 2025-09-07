# File: ops/launch-all.ps1
param([switch]$NoBrowser)
$ErrorActionPreference='SilentlyContinue'

$root = "$env:USERPROFILE\Desktop\StateID-App"
Set-Location $root
$pwsh = (Get-Command powershell.exe).Source
New-Item -ItemType Directory -Force -Path .\ops\temp | Out-Null

# Clean out any old helper windows
Get-CimInstance Win32_Process -Filter "name='powershell.exe'" |
  Where-Object {
    $_.CommandLine -match 'ops\\dev-watch\.ps1' -or
    $_.CommandLine -match 'ops\\temp\\_launch-watch\.ps1' -or
    $_.CommandLine -match 'ops\\temp\\_outbox\.ps1' -or
    $_.CommandLine -match 'ops\\temp\\_control\.ps1'
  } | ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force } catch {} }

# Write tiny temp launchers as arrays (avoids nested here-strings)
$enc = New-Object System.Text.UTF8Encoding($false)

$watch = @(
  '$Host.UI.RawUI.WindowTitle = "STATEID DEV WATCH"',
  'Set-Location "$env:USERPROFILE\Desktop\StateID-App"',
  'powershell -NoProfile -ExecutionPolicy Bypass -File .\ops\dev-watch.ps1'
)
[IO.File]::WriteAllLines("$root\ops\temp\_launch-watch.ps1",$watch,$enc)
Start-Process $pwsh -ArgumentList '-NoExit','-File',"$root\ops\temp\_launch-watch.ps1"

$control = @(
  '$Host.UI.RawUI.WindowTitle = "STATEID CONTROL"',
  'Set-Location "$env:USERPROFILE\Desktop\StateID-App"'
)
[IO.File]::WriteAllLines("$root\ops\temp\_control.ps1",$control,$enc)
Start-Process $pwsh -ArgumentList '-NoExit','-File',"$root\ops\temp\_control.ps1"

$outbox = @(
  '$Host.UI.RawUI.WindowTitle = "STATEID OUTBOX"',
  'Set-Location "$env:USERPROFILE\Desktop\StateID-App"',
  'while ($true) {',
  '  Clear-Host',
  '  Write-Host "`nOutbox (newest first):`n"',
  '  Get-ChildItem .\ops\outbox -ErrorAction SilentlyContinue |',
  '    Sort-Object LastWriteTime -Descending |',
  '    Select-Object -First 25 Name,Length,LastWriteTime |',
  '    Format-Table -AutoSize',
  '  Start-Sleep -Seconds 2',
  '}'
)
[IO.File]::WriteAllLines("$root\ops\temp\_outbox.ps1",$outbox,$enc)
Start-Process $pwsh -ArgumentList '-NoExit','-File',"$root\ops\temp\_outbox.ps1"

if (-not $NoBrowser) { Start-Process 'http://127.0.0.1:8787/' }
Write-Host "Launched DEV WATCH, CONTROL, OUTBOX window."