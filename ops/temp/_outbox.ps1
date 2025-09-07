$Host.UI.RawUI.WindowTitle = "STATEID OUTBOX"
Set-Location "$env:USERPROFILE\Desktop\StateID-App"
while ($true) {
  Clear-Host
  Write-Host "`nOutbox (newest first):`n"
  Get-ChildItem .\ops\outbox -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 25 Name,Length,LastWriteTime |
    Format-Table -AutoSize
  Start-Sleep -Seconds 2
}
