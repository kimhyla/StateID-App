$Host.UI.RawUI.WindowTitle = "STATEID TEST"
Set-Location "$env:USERPROFILE\Desktop\StateID-App"

"== /healthz =="; Invoke-RestMethod http://127.0.0.1:8787/healthz | Format-List

"`n== /ids (first few) ==";
try {
  $ids = Invoke-RestMethod http://127.0.0.1:8787/ids
  $ids.items | Select-Object -First 5 | Format-Table
} catch { $_ | Format-List }

"`n== /redirect/CA (expect 302) ==";
try {
  $resp = Invoke-WebRequest -Uri "http://127.0.0.1:8787/redirect/CA" -MaximumRedirection 0 -ErrorAction Stop
} catch {
  $resp = $_.Exception.Response
}
"StatusCode: $($resp.StatusCode)"
"Location:   $($resp.Headers.Location)"

"`nOpening UI in your browser..."
start http://127.0.0.1:8787/
