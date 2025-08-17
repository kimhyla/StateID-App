$Host.UI.RawUI.WindowTitle = "STATEID WORKER"
Set-Location "$env:USERPROFILE\Desktop\StateID-App"
powershell -NoProfile -ExecutionPolicy Bypass -File .\ops\worker.ps1
