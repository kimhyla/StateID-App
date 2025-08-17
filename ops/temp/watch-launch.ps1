$Host.UI.RawUI.WindowTitle = "STATEID WATCH"
Set-Location "$env:USERPROFILE\Desktop\StateID-App"
powershell -NoProfile -ExecutionPolicy Bypass -File .\ops\bridge.ps1
