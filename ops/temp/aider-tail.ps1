$Host.UI.RawUI.WindowTitle = "STATEID AIDER LOG"
Set-Location "$env:USERPROFILE\Desktop\StateID-App"
Get-Content ".\ops\outbox\aider.log" -Wait -Tail 200
