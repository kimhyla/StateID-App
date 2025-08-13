## 60-sec sanity check
1) Install deps: `npm ci`
2) Start dev: `npm run dev`
3) New tab → verify: `(Invoke-WebRequest http://localhost:8787/healthz -UseBasicParsing).Content`
4) Stop dev: `Ctrl+C`
5) Smoke: `npm run smoke`
6) Tests: `npm test`
7) Docker build: `docker build -t stateid-app:0.1.0 .`
8) Run container: `docker run --rm -p 8787:8787 --name stateid stateid-app:0.1.0`
9) Verify: `(Invoke-WebRequest http://localhost:8787/healthz -UseBasicParsing).StatusCode` → `200`
10) Stop: `Ctrl+C` (or `docker stop stateid`)
**Troubleshoot:** `Test-NetConnection localhost -Port 8787` → `False` means port free; else `netstat -ano | findstr :8787` then `taskkill /PID <pid> /F`.
