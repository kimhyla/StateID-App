# File: ops/bridge.ps1 (headless & file-aware)
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot  = Split-Path -Parent $scriptDir
$inboxDir  = Join-Path $repoRoot "ops\inbox"
$outDir    = Join-Path $repoRoot "ops\outbox"
$patchDir  = Join-Path $outDir "patches"
$goalFile  = Join-Path $inboxDir "GOAL.txt"
$logFile   = Join-Path $outDir "aider.log"
$tempDir   = Join-Path $repoRoot "ops\temp"

New-Item -ItemType Directory -Force -Path $inboxDir, $outDir, $patchDir, $tempDir | Out-Null
if (-not (Test-Path $goalFile)) { "" | Out-File -FilePath $goalFile -Encoding utf8 }

function Log($msg) { "$(Get-Date -Format o)  $msg" | Add-Content -Path $logFile -Encoding utf8 -Force }

$aider = Get-Command aider -ErrorAction SilentlyContinue
if (-not $aider) { Log "ERROR: 'aider' CLI not found on PATH. Try: pipx install aider-chat" }

# Files to grant aider edit access
$files = @("public/index.html","src/server.mjs","data/ids.json") | ForEach-Object { Join-Path $repoRoot $_ }

# 2s debounce
$timer = New-Object System.Timers.Timer
$timer.Interval = 2000
$timer.AutoReset = $false
$timer.Enabled = $false

$lastHashFile = Join-Path $tempDir "goal.sha1"
function HashText($p) { if (Test-Path $p) { (Get-FileHash -Algorithm SHA1 -Path $p).Hash } else { "" } }

function Run-AiderOnce {
  try {
    if (-not $aider) { return }
    $currentHash = HashText $goalFile
    $prevHash = if (Test-Path $lastHashFile) { Get-Content -Raw -Path $lastHashFile } else { "" }
    if ($currentHash -eq $prevHash) { Log "GOAL unchanged; skipping."; return }

    $goalText = Get-Content -Raw -Path $goalFile
    if (-not $goalText.Trim()) { Log "GOAL is blank; skipping."; Set-Content -Path $lastHashFile -Value $currentHash; return }

    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    Log "=== AIDER START ($stamp) ==="

    Push-Location $repoRoot
    try {
      $msgFile = Join-Path $tempDir "goal-$stamp.txt"
      Set-Content -Path $msgFile -Value $goalText -Encoding utf8

      $quotedFiles = $files | ForEach-Object { '"{0}"' -f $_ }
      $cmd = 'aider --yes --no-pretty --no-auto-commits --message-file "{0}" {1}' -f $msgFile, ($quotedFiles -join ' ')
      Log "CMD: $cmd"

      $out = & cmd.exe /c $cmd 2>&1
      $out | Add-Content -Path $logFile -Encoding utf8

      $git = Get-Command git -ErrorAction SilentlyContinue
      if ($git) {
        $status = (& git status --porcelain)
        if ($status) {
          $patchPath = Join-Path $patchDir "patch-$stamp.diff"
          (& git diff) | Out-File -FilePath $patchPath -Encoding utf8
          Log "PATCH: $patchPath"
        } else { Log "No working tree changes detected." }
      } else { Log "NOTE: 'git' not found; skipping patch export." }
    } finally { Pop-Location }

    Set-Content -Path $lastHashFile -Value $currentHash
    Log "=== AIDER END ($stamp) ==="
  } catch { Log ("ERROR during aider run: " + $_.Exception.Message) }
}

$null = Register-ObjectEvent -InputObject $timer -EventName Elapsed -Action { Run-AiderOnce }

$fsw = New-Object System.IO.FileSystemWatcher
$fsw.Path = $inboxDir
$fsw.Filter = "GOAL.txt"
$fsw.IncludeSubdirectories = $false
$fsw.EnableRaisingEvents = $true

$onChange = { $timer.Stop(); $timer.Start() }
Register-ObjectEvent -InputObject $fsw -EventName Changed -Action $onChange | Out-Null
Register-ObjectEvent -InputObject $fsw -EventName Created -Action $onChange | Out-Null
Register-ObjectEvent -InputObject $fsw -EventName Renamed -Action $onChange | Out-Null

Log "Bridge ready. Edit and save $goalFile to trigger aider."
Write-Host "Watching $goalFile ... Press Ctrl+C to exit." -ForegroundColor Cyan

while ($true) { Start-Sleep -Seconds 1 }
