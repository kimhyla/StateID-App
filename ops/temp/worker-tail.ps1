$Host.UI.RawUI.WindowTitle = "STATEID WORKER LOG"
Set-Location "$env:USERPROFILE\Desktop\StateID-App"
Get-Content ".\ops\outbox\server-worker.log" -Wait -Tail 200
