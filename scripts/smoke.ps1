#requires -Version 3
$ErrorActionPreference = 'Stop'
$ProgressPreference    = 'SilentlyContinue'

$HostName = 'localhost'
$Port     = 8787
$BaseUrl  = "http://${HostName}:$Port"

Write-Host "=== StateID smoke ==="

function Get-StatusCode([string]$uri) {
  try {
    $resp = Invoke-WebRequest -Uri $uri -TimeoutSec 5 -UseBasicParsing
    return $resp.StatusCode
  } catch {
    if ($_.Exception.Response) { return $_.Exception.Response.StatusCode.value__ }
    return 0
  }
}

# Start server only if port isn't already serving
$serverProc     = $null
$alreadyRunning = (Test-NetConnection -ComputerName $HostName -Port $Port).TcpTestSucceeded

if (-not $alreadyRunning) {
  Write-Host "Starting server..."
  $serverProc = Start-Process -FilePath "node" -ArgumentList "src/server.js" -PassThru -WindowStyle Hidden
  # wait until /healthz is ready (max ~20s)
  $code = 0
  $deadline = (Get-Date).AddSeconds(20)
  do {
    Start-Sleep -Milliseconds 300
    $code = Get-StatusCode "$BaseUrl/healthz"
    if ($code -eq 200) { break }
  } until ((Get-Date) -gt $deadline)

  if ($code -ne 200) {
    if ($serverProc) { Stop-Process -Id $serverProc.Id -Force -ErrorAction SilentlyContinue }
    throw "Server did not become ready at $BaseUrl/healthz"
  }
} else {
  Write-Host "Server already running on port $Port; not starting a new one."
}

function Assert-OK([string]$desc, [string]$uri) {
  $resp = Invoke-WebRequest -Uri $uri -TimeoutSec 10 -UseBasicParsing
  if ($resp.StatusCode -ne 200) { throw "$desc FAILED: $($resp.StatusCode)" }
  Write-Host "$desc OK"
}

try {
  Assert-OK "/healthz" "$BaseUrl/healthz"
  Assert-OK "/version" "$BaseUrl/version"
  Assert-OK "/ids"     "$BaseUrl/ids"

  $resp = Invoke-WebRequest -Uri "$BaseUrl/ids/CA" -TimeoutSec 10 -UseBasicParsing
  if ($resp.StatusCode -ne 200 -or ($resp.Content -notmatch 'California')) {
    throw "/ids/CA FAILED"
  }
  Write-Host "/ids/CA OK"

  # Expect 404 for a bad ID (best-effort)
  try {
    $null = Invoke-WebRequest -Uri "$BaseUrl/ids/ZZ" -TimeoutSec 5 -UseBasicParsing
    Write-Warning "/ids/ZZ expected 404 but got 200"
  } catch {
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode.value__ -eq 404) {
      Write-Host "/ids/ZZ 404 OK"
    } else { throw "/ids/ZZ unexpected error" }
  }

  Write-Host "Smoke passed."
  exit 0
}
finally {
  if ($serverProc) {
    Write-Host "Stopping server (pid=$($serverProc.Id))..."
    Stop-Process -Id $serverProc.Id -Force -ErrorAction SilentlyContinue
  }
}
