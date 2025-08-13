param([string]$Url="http://localhost:8787/healthz")
$ErrorActionPreference="Stop"
try {
  $r = Invoke-WebRequest $Url -UseBasicParsing -TimeoutSec 3
  $r.Content | Write-Output
  Write-Host "Smoke OK ($($r.StatusCode))"
  exit 0
} catch {
  Write-Error ("Smoke failed for {0}: {1}" -f $Url, $_.Exception.Message)
  exit 1
}
