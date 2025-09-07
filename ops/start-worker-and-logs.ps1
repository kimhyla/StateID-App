# File: ops/start-worker-and-logs.ps1
$ErrorActionPreference = 'SilentlyContinue'

# Stop any old worker/tail windows to avoid duplicates
Get-CimInstance Win32_Process -Filter "name='powershell.exe'" |
  Where-Object { $_.CommandLine -match 'ops\\worker\.ps1' -or $_.CommandLine -match 'ops\\temp\\(worker-launch|log-tail|worker-tail)\.ps1' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }

# Ensure log files exist
New-Item -ItemType Directory -Force -Path ops\outbox, ops\temp | Out-Null
if (-not (Test-Path .\ops\outbox\server-node.log))   { New-Item -ItemType File .\ops\outbox\server-node.log   | Out-Null }
if (-not (Test-Path .\ops\outbox\server-worker.log)) { New-Item -ItemType File .\ops\outbox\server-worker.log | Out-Null }

# Build tiny launchers *without* here-strings
$worker = @('$Host.UI.RawUI.WindowTitle = "STATEID WORKER"','Set-Location "$env:USERPROFILE\Desktop\StateID-App"','powershell -NoProfile -ExecutionPolicy Bypass -File .\ops\worker.ps1')
[System.IO.File]::WriteAllLines("$PWD\ops\temp\worker-launch.ps1",$worker,(New-Object System.Text.UTF8Encoding($false)))

$log = @('$Host.UI.RawUI.WindowTitle = "STATEID LOG"','Set-Location "$env:USERPROFILE\Desktop\StateID-App"','Get-Content ".\ops\outbox\server-node.log" -Wait -Tail 200')
[System.IO.File]::WriteAllLines("$PWD\ops\temp\log-tail.ps1",$log,(New-Object System.Text.UTF8Encoding($false)))

$wlog = @('$Host.UI.RawUI.WindowTitle = "STATEID WORKER LOG"','Set-Location "$env:USERPROFILE\Desktop\StateID-App"','Get-Content ".\ops\outbox\server-worker.log" -Wait -Tail 200')
[System.IO.File]::WriteAllLines("$PWD\ops\temp\worker-tail.ps1",$wlog,(New-Object System.Text.UTF8Encoding($false)))

# Start the three windows
Start-Process powershell -ArgumentList "-NoExit","-File","$PWD\ops\temp\worker-launch.ps1"
Start-Process powershell -ArgumentList "-NoExit","-File","$PWD\ops\temp\log-tail.ps1"
Start-Process powershell -ArgumentList "-NoExit","-File","$PWD\ops\temp\worker-tail.ps1"
