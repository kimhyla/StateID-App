$ErrorActionPreference = "Continue"
$repo = "C:\Users\kimhy\Desktop\StateID-App"
$goal = Join-Path $repo "ops\inbox\GOAL.txt"
$log  = Join-Path $repo "ops\outbox\aider.log"

Set-Location -LiteralPath $repo
New-Item -ItemType Directory -Force -Path "ops\outbox","ops\inbox" | Out-Null

function Get-GoalMTimeUtc {
  if (Test-Path $goal) { return (Get-Item $goal).LastWriteTimeUtc }
  else { return [datetime]::SpecifyKind([datetime]::Parse("1970-01-01"), 'Utc') }
}

function Start-AiderOnce {
  try { Stop-Transcript | Out-Null } catch {}
  try { Start-Transcript -Path $log -Append | Out-Null } catch {}
  try {
    $b=(git branch --show-current 2>$null); $s=(git rev-parse --short HEAD 2>$null)
    if ($Host -and $Host.UI -and $Host.UI.RawUI) { $Host.UI.RawUI.WindowTitle = "Aider — StateID [$b@$s]" }
  } catch {}

  if (-not (Get-Command aider -ErrorAction SilentlyContinue)) {
    Write-Host "aider not found. Install once:  pipx install aider-chat" -ForegroundColor Red
    Read-Host "Press Enter to close"
    exit 1
  }

  if (-not (Test-Path $goal)) {
    Write-Host "GOAL.txt isn’t present yet. Use the Bridge UI → Send goal." -ForegroundColor Yellow
    New-Item -ItemType File -Path $goal -Force | Out-Null
  }

  Write-Host "=== AIDER START (loop) === $(Get-Date -Format s)"
  aider --yes --no-pretty --no-auto-commits --message-file "ops\inbox\GOAL.txt" `
        "public\index.html" "src\server.mjs" "data\ids.json"
  Write-Host "=== AIDER EXIT (loop) === $(Get-Date -Format s)"
  try { Stop-Transcript | Out-Null } catch {}
}

$last = Get-GoalMTimeUtc

while ($true) {
  Start-AiderOnce
  Write-Host "Waiting for GOAL.txt change… (Ctrl+C to stop)"
  while ($true) {
    Start-Sleep -Seconds 1
    $now = Get-GoalMTimeUtc
    if ($now -gt $last) { $last = $now; break }
  }
}
