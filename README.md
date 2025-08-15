# StateID-App

Tiny Node (v22 ESM) HTTP server with a small “StateID” API, tests, smoke script, Docker, and CI.

## Routes
- `GET /healthz` → `{ "status":"ok" }`
- `GET /version` → `{ "version":"x.y.z" }` (from `package.json`)
- `GET /ids` → `{ "items":[ { "id":"CA","name":"California" }, { "id":"NY","name":"New York" }, { "id":"TX","name":"Texas" } ] }`
- `GET /ids/:id` → a single item or `404 { "error":"Not found" }`
- `GET /ids/search?query=…` → items whose `id` or `name` contains the query (case-insensitive); missing/empty query → `400 { "error":"query required" }`

## Quickstart (Windows / PowerShell)
```powershell
npm ci
npm run dev   # starts http://localhost:8787
