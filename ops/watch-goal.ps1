Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'

$repo   = Resolve-Path "$PSScriptRoot\.."
$inbox  = Join-Path $repo 'ops\inbox'
$outbox = Join-Path $repo 'ops\outbox'
$queue  = Join-Path $repo 'ops\queue'
New-Item -ItemType Directory -Force $inbox, $outbox, $queue | Out-Null

$goal   = Join-Path $inbox 'GOAL.txt'
if (!(Test-Path $goal)) { New-Item -ItemType File -Path $goal | Out-Null }
$events = Join-Path $outbox 'events.log'

function Append-Queue { param($lane,$commands)
  $file = Join-Path $queue ($lane.ToLower()+'.in')
  Add-Content $file ($commands -join [Environment]::NewLine)
  Add-Content $events "[$(Get-Date -Format s)] queued -> $lane ($($commands.Count))"
}

$lastWrite = Get-Date 0
Write-Host "Watching $goal (save the file to trigger). Ctrl+C to stop."
while ($true) {
  $gi = Get-Item $goal -ErrorAction SilentlyContinue
  if ($gi -and $gi.LastWriteTime -gt $lastWrite) {
    $lastWrite = $gi.LastWriteTime
    $content = (Get-Content -Raw -Path $goal) -replace "`r",""
    $matches = [regex]::Matches($content,'```(repo|server|client)\s*([\s\S]*?)```',[System.Text.RegularExpressions.RegexOptions]::IgnoreCase)

    $repoCmds   = @()
    $serverCmds = @()
    $clientCmds = @()
    foreach ($m in $matches) {
      $lane  = $m.Groups[1].Value.ToLower()
      $block = ($m.Groups[2].Value.Trim() -split "`n") | Where-Object { $_.Trim() -ne '' }
      switch ($lane) {
        'repo'   { $repoCmds   += $block }
        'server' { $serverCmds += $block }
        'client' { $clientCmds += $block }
      }
    }
    if ($repoCmds.Count)   { Append-Queue REPO   $repoCmds }
    if ($serverCmds.Count) { Append-Queue SERVER $serverCmds }
    if ($clientCmds.Count) { Append-Queue CLIENT $clientCmds }
  }
  Start-Sleep -Milliseconds 300
}
