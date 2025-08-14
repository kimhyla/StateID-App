param(
  [string]$BaseUrl = "http://localhost:8787"
)

Write-Host "=== StateID smoke ==="

# /healthz
$health = Invoke-WebRequest -Uri "$BaseUrl/healthz" -UseBasicParsing
if ($health.StatusCode -ne 200) { Write-Error "/healthz failed"; exit 1 }
Write-Host "/healthz OK"

# /version
$ver = Invoke-WebRequest -Uri "$BaseUrl/version" -UseBasicParsing
if ($ver.StatusCode -ne 200) { Write-Error "/version failed"; exit 1 }
Write-Host "/version OK"

Write-Host "Smoke passed."
