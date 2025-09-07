# File: ops/stop-all.ps1
Set-Location "$env:USERPROFILE\Desktop\StateID-App"

# stop node for this repo
Get-CimInstance Win32_Process -Filter "name=''node.exe''" |
  Where-Object { $_.CommandLine -match ''src\\server\.mjs'' } |
  ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force } catch {} }

# stop helper windows
Get-CimInstance Win32_Process -Filter "name=''powershell.exe''" |
  Where-Object {
    $_.CommandLine -match ''ops\\dev-watch\.ps1'' -or
    $_.CommandLine -match ''ops\\temp\\_launch-watch\.ps1'' -or
    $_.CommandLine -match ''ops\\temp\\_outbox\.ps1'' -or
    $_.CommandLine -match ''ops\\temp\\_control\.ps1''
  } | ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force } catch {} }

Write-Host "Stopped server, watcher, and helper windows."