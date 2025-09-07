Set-StrictMode -Version Latest
param([string]$RepoPath = "C:\Users\kimhy\Desktop\StateID-App")
Set-Location -LiteralPath "C:\Users\kimhy\Desktop\StateID-App"
if (-not (Test-Path ".git")) {
  Write-Host "Not a git repo: C:\Users\kimhy\Desktop\StateID-App" -ForegroundColor Red
  return
}
try {
  $b = git branch --show-current 2>$null
  $s = git rev-parse --short HEAD 2>$null
  if ($Host -and $Host.UI -and $Host.UI.RawUI) { $Host.UI.RawUI.WindowTitle = "StateID — Repo Shell [$b@$s]" }
} catch {}
git status -sb
Write-Host "
Repo shell ready." -ForegroundColor Green
