param([switch]$Auto)
$root = Split-Path -Parent $PSCommandPath
$repo = Resolve-Path "$root\.."
$autoFlag = if ($Auto.IsPresent) { "-Auto" } else { "" }

Start-Process powershell -ArgumentList "-ExecutionPolicy","Bypass","-NoProfile","-NoExit","-Command","cd `"$repo`"; `$Host.UI.RawUI.WindowTitle='StateID REPO';   .\ops\worker.ps1 -Lane REPO $autoFlag"
Start-Process powershell -ArgumentList "-ExecutionPolicy","Bypass","-NoProfile","-NoExit","-Command","cd `"$repo`"; `$Host.UI.RawUI.WindowTitle='StateID SERVER'; .\ops\worker.ps1 -Lane SERVER $autoFlag"
Start-Process powershell -ArgumentList "-ExecutionPolicy","Bypass","-NoProfile","-NoExit","-Command","cd `"$repo`"; `$Host.UI.RawUI.WindowTitle='StateID CLIENT'; .\ops\worker.ps1 -Lane CLIENT $autoFlag"
Start-Process powershell -ArgumentList "-ExecutionPolicy","Bypass","-NoProfile","-NoExit","-Command","cd `"$repo`"; `$Host.UI.RawUI.WindowTitle='StateID WATCH';  .\ops\watch-goal.ps1"
Write-Host "Started REPO/SERVER/CLIENT worker windows and WATCH."
