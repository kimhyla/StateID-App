@echo off
cd /d "C:\Users\kimhy\Desktop\StateID-App"
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoLogo -NoExit -ExecutionPolicy Bypass -Command ^
  "$b=(git branch --show-current 2>$null); $s=(git rev-parse --short HEAD 2>$null); if ($Host.UI.RawUI){$Host.UI.RawUI.WindowTitle='StateID ? Repo Shell ['+$b+'@'+$s+']'}; git status -sb"
