# File: ops/server-run.ps1
# Starts ops\launch-node.cmd (which appends Node stdout/stderr to ops\outbox\server-node.log),
# writes ONLY to ops\outbox\server-run.log (separate file), probes /healthz, exits 0/1.
# No writes to server-node.log to avoid file sharing issues.

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot  = Split-Path -Parent $scriptDir
$outDir    = Join-Path $repoRoot 'ops\outbox'
$runLog    = Join-Path $outDir 'server-run.log'
$launcher  = Join-Path $repoRoot 'ops\launch-node.cmd'

New-Item -ItemType Directory -Force -Path $outDir | Out-Null

function Log($msg){ Add-Content -Path $runLog -Value ("$(Get-Date -Format o)  " + $msg) -Encoding UTF8 -Force }

Log "==== server-run start ===="

if (-not (Test-Path $launcher)) { Log "ERROR: Missing launcher $launcher"; exit 1 }

# Stop any existing server for this repo
Get-CimInstance Win32_Process -Filter "name = 'node.exe'" |
  Where-Object { $_.CommandLine -match 'src\\server\.mjs' } |
  ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force } catch {} }

# Start launcher hidden (launcher appends to server-node.log)
Start-Process -FilePath "cmd.exe" -ArgumentList "/c `"$launcher`"" -WorkingDirectory $repoRoot -WindowStyle Hidden

# Probe /healthz (up to ~6s)
$ok = $false
for ($i=0; $i -lt 30; $i++) {
  Start-Sleep -Milliseconds 200
  try {
    $h = Invoke-RestMethod -Uri 'http://127.0.0.1:8787/healthz' -TimeoutSec 1
    if ($h.status -eq 'ok') { $ok = $true; break }
  } catch { }
}

if ($ok) { Log "READY: /healthz => ok"; exit 0 }
else {
  Log "ERROR: /healthz timed out; killing server.mjs"
  Get-CimInstance Win32_Process -Filter "name = 'node.exe'" |
    Where-Object { $_.CommandLine -match 'src\\server\.mjs' } |
    ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force } catch {} }
  exit 1
}
