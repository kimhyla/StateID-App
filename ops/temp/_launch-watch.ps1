$Host.UI.RawUI.WindowTitle = "STATEID DEV WATCH"
Set-Location "$env:USERPROFILE\Desktop\StateID-App"
powershell -NoProfile -ExecutionPolicy Bypass -File .\ops\dev-watch.ps1
