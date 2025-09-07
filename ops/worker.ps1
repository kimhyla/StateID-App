# File: ops/worker.ps1
# Polls ops\queue\*.in and executes ONE line exactly once (stores last cmd in .offset).
# Single-instance via global mutex. Logs to ops\outbox\server-worker.log.

$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot  = Split-Path -Parent $scriptDir
$queueDir  = Join-Path $repoRoot 'ops\queue'
$outDir    = Join-Path $repoRoot 'ops\outbox'
$logFile   = Join-Path $outDir  'server-worker.log'

New-Item -ItemType Directory -Force -Path $queueDir, $outDir | Out-Null

# Single-instance lock
$mutex = New-Object System.Threading.Mutex($false, 'Global\StateID_ServerWorker_Mutex')
if (-not $mutex.WaitOne(0, $false)) {
  Add-Content -Path $logFile -Encoding utf8 -Value ("$(Get-Date -Format o)  INFO: Another worker is running. Exiting.")
  exit 0
}

function Log($msg){ Add-Content -Path $logFile -Value ("$(Get-Date -Format o)  " + $msg) -Encoding UTF8 -Force }

$queues = @('server','client','repo')

# Ensure .in files exist
foreach ($q in $queues) {
  $in = Join-Path $queueDir "$q.in"
  if (-not (Test-Path $in)) { "" | Set-Content -Path $in -Encoding utf8 }
}

function Get-TrimmedLine($path){
  try { $raw = Get-Content -Raw -Path $path -ErrorAction Stop } catch { return '' }
  if ($null -eq $raw) { return '' }
  # Trim leading/trailing whitespace/newlines
  $line = ($raw -replace '^\s+','') -replace '\s+$',''
  return $line
}

try {
  Log "==== worker started ===="
  while ($true) {
    foreach ($q in $queues) {
      $in     = Join-Path $queueDir "$q.in"
      $offset = Join-Path $queueDir "$q.offset"

      $cmdLine = Get-TrimmedLine $in
      if (-not $cmdLine) { continue }

      $prev = ''
      if (Test-Path $offset) { $prev = Get-Content -Raw -Path $offset -ErrorAction SilentlyContinue }

      if ($prev -eq $cmdLine) {
        # already executed this exact line; wait for change
        continue
      }

      Log "==== $q.in EXEC ===="
      Log ("CMD: " + $cmdLine)

      try {
        $out = & cmd.exe /c $cmdLine 2>&1
        if ($out) { $out | Add-Content -Path $logFile -Encoding utf8 }
        # Mark executed & blank queue so it cannot retrigger
        Set-Content -Path $offset -Value $cmdLine -Encoding utf8
        "" | Set-Content -Path $in -Encoding utf8
        Log "DONE."
      } catch {
        Log ("ERROR: " + $_.Exception.Message)
      }
    }
    Start-Sleep -Milliseconds 400
  }
}
finally {
  try { $mutex.ReleaseMutex() | Out-Null } catch {}
}
