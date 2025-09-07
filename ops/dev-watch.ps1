# File: ops/dev-watch.ps1
$Host.UI.RawUI.WindowTitle = "STATEID DEV WATCH"
Set-Location "$env:USERPROFILE\Desktop\StateID-App"

# kill any leftover node for this repo
Get-CimInstance Win32_Process -Filter "name='node.exe'" |
  Where-Object { $_.CommandLine -match 'src\\server\.mjs' } |
  ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force } catch {} }

$script:proc = $null
$log = Join-Path (Resolve-Path .) 'ops\outbox\server-node.log'
function Start-Server {
  "[dev-watch] starting server..." | Tee-Object -FilePath $log -Append | Out-Null
  # run node via cmd.exe and redirect all output to the log
  $args = '/c node .\src\server.mjs 1>>"' + $log + '" 2>&1'
  $script:proc = Start-Process -FilePath "$env:ComSpec" -ArgumentList $args -PassThru -WorkingDirectory (Resolve-Path .)
}
function Stop-Server {
  if ($script:proc) { try { Stop-Process -Id $script:proc.Id -Force } catch {} }
  $script:proc = $null
}

function LatestStamp {
  Get-ChildItem -Path ".\src",".\public",".\data" -Include *.mjs,*.js,*.json,*.html,*.css `
    -Recurse -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1 -ExpandProperty LastWriteTime
}

"[dev-watch] watching src/public/data (mjs, js, json, html, css). Close window to stop." | Tee-Object -FilePath $log -Append | Out-Null
$last = LatestStamp
Start-Server

while ($true) {
  Start-Sleep -Milliseconds 800
  $now = LatestStamp
  if ($now -and $last -and $now -ne $last) {
    Write-Host "[dev-watch] change detected at $now -> restart"
    "[dev-watch] change detected at $now -> restart" | Tee-Object -FilePath $log -Append | Out-Null
    $last = $now
    Stop-Server
    Start-Server
  }
}