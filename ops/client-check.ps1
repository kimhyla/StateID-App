$ErrorActionPreference = "Continue"
$Base = "http://127.0.0.1:8787"
$ok = $false
for ($i=0; $i -lt 20; $i++) {
  try {
    $h = Invoke-RestMethod -Uri "$Base/healthz" -TimeoutSec 2
    if ($h.status -eq "ok") {
      $ok = $true
      $h | ConvertTo-Json -Depth 5 | Write-Output
      break
    }
  } catch {}
  Start-Sleep -Milliseconds 500
}
if ($ok) {
  try { Invoke-RestMethod -Uri "$Base/ids" | ConvertTo-Json -Depth 5 | Write-Output }
  catch { @{ status="error calling /ids"; message=$_.Exception.Message } | ConvertTo-Json | Write-Output }
} else {
  @{ status="timeout waiting for healthz" } | ConvertTo-Json | Write-Output
}
