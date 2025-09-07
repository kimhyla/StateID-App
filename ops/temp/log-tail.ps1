$Host.UI.RawUI.WindowTitle = "STATEID LOG"
Set-Location "$env:USERPROFILE\Desktop\StateID-App"
Get-Content ".\ops\outbox\server-node.log" -Wait -Tail 200
