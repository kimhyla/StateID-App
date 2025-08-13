$ErrorActionPreference="Stop"
$port = if ($env:PORT) { $env:PORT } else { 8787 }
Write-Host "Starting server on port $port…"
$server = Start-Process node -ArgumentList "src/server.js" -PassThru -WindowStyle Hidden
try {
  for ($i=0; $i -lt 40; $i++) { try { Invoke-WebRequest "http://localhost:$port/healthz" -UseBasicParsing -TimeoutSec 1 | Out-Null; break } catch { Start-Sleep -Milliseconds 250 } }
  Write-Host "Running tests…"
  node --test test/*.test.js
  exit $LASTEXITCODE
} finally {
  if ($server -and -not $server.HasExited) { Write-Host "Stopping server (PID $($server.Id))"; Stop-Process -Id $server.Id -Force }
}
