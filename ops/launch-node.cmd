@echo off
setlocal

REM Resolve repo root: one level up from ops\
for %%i in ("%~dp0..") do set "ROOT=%%~fi"
set "SRV=%ROOT%\src\server.mjs"
set "OUTBOX=%ROOT%\ops\outbox"
set "LOG=%OUTBOX%\server-node.log"

if not exist "%OUTBOX%" mkdir "%OUTBOX%"

rem Header to make runs obvious
>> "%LOG%" echo(==== %date% %time% launch-node ====

pushd "%ROOT%"
rem Append both stdout and stderr to the same log, no extra spaces, exact quoting
node "%SRV%" >> "%LOG%" 2>&1
popd

endlocal
