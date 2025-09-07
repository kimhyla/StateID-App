$ErrorActionPreference = "Continue"
$repo = "C:\Users\kimhy\Desktop\StateID-App"
Set-Location -LiteralPath $repo

# Ensure folders
New-Item -ItemType Directory -Force -Path "ops\outbox" | Out-Null
New-Item -ItemType Directory -Force -Path "ops\inbox"  | Out-Null

# Tell the user if GOAL is missing (Bridge UI creates it with "Send goal")
if (-not (Test-Path "ops\inbox\GOAL.txt")) {
  Write-Host "Note: ops\inbox\GOAL.txt not found yet. Use the Bridge UI → Send goal." -ForegroundColor Yellow
}

# Check aider presence
if (-not (Get-Command aider -ErrorAction SilentlyContinue)) {
  Write-Host "aider not found. Install once:  pipx install aider-chat" -ForegroundColor Red
  Read-Host "Press Enter to close"
  exit 1
}

# Transcript becomes the log your UI tails
$log = "ops\outbox\aider.log"
try { Stop-Transcript | Out-Null } catch {}
try { Start-Transcript -Path $log -Append | Out-Null } catch {}

# Make the window label nice
try {
  $b=(git branch --show-current 2>$null); $s=(git rev-parse --short HEAD 2>$null)
  if ($Host.UI.RawUI) { $Host.UI.RawUI.WindowTitle = "Aider — StateID [$b@$s]" }
} catch {}

# Start aider wired to the Bridge GOAL; no --log-file (your build doesn't support it)
# --no-fancy-input reduces control characters in the transcript
aider --message-file "ops\inbox\GOAL.txt" --no-fancy-input

# Close out transcript, keep window open for visibility
try { Stop-Transcript | Out-Null } catch {}
Write-Host "`nAider ended. Log saved to $log"
Read-Host "Press Enter to close"
