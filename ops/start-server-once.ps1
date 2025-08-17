# File: ops/start-server-once.ps1
Set-Location "$env:USERPROFILE\Desktop\StateID-App"
New-Item -ItemType Directory -Force -Path ops\queue | Out-Null
"" | Set-Content .\ops\queue\server.in
Remove-Item .\ops\queue\server.offset -ErrorAction SilentlyContinue
$runner = Join-Path (Resolve-Path .).Path "ops\server-run.ps1"
"cmd /c powershell -NoProfile -ExecutionPolicy Bypass -File `"$runner`"`r`n" | Set-Content -NoNewline .\ops\queue\server.in
