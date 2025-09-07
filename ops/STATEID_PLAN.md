# StateID MVP – Understanding, Plan, Architecture, and First Task

This document confirms understanding of the StateID MVP (per ops/CHEATSHEET.txt), calls out gaps/assumptions, proposes an implementation plan with milestones and risks, outlines a high‑level architecture, and defines the first concrete task (implemented in this change set).

## Understanding

StateID provides:
- An editable catalog of IDs (two-letter codes) with optional outbound URLs.
- A short-lived wrapper link generator (/wrap) producing signed tokens that redirect via /w/:token to the original URL.
- A JSONL ledger recording redirect attempts (status, timing, request_id, optional event/attendee, IP/UA).
- Tail/audit and CSV export for the ledger.
- A minimal static UI to view/edit IDs and operate the wrapper/audit flows.
- A “bridge” for local automation with GOAL.txt and CHEATSHEET.txt (write/append, status, and outbox utilities).

Key acceptance:
- POST /wrap -> { token, url } with exp ~6h, signature HMAC-SHA256, base64url.
- GET /w/:token -> 302 redirect to urlOriginal when valid; otherwise 400 JSON error.
- /audit?limit=N returns last N ledger rows, most recent first.
- /export.csv streams CSV with specified header/filters.
- Windows-friendly I/O and CRLF tolerant.
- Request IDs on logs/ledger.

## Gaps and Assumptions

- Error envelope: Spec shows { "error": { "code", "message" } }, while server currently returns { error: "code", detail? }. We’ll align in a controlled step to avoid breaking existing consumers/tests.
- Request ID generator: Spec calls for crypto.randomUUID(); server uses randomBytes(8). We will switch to randomUUID (done in this change).
- Optional request logging: Tests imply LOG_REQUESTS-driven logging (healthz hit is expected to log). Middleware not present; we add a lightweight, opt-in, one-line logger (done in this change).
- /version endpoint: Mentioned by tests summary but not implemented; we will add a read-only endpoint that returns version/build info (planned).
- Ids write semantics: Only PATCH of existing items is supported. If future tests expect create/delete, we’ll add minimal POST/DELETE with validation.
- Token error codes: Spec examples: BadRequest | Unauthorized | Expired. Current verifyToken returns statuses; we’ll map to canonical codes/messages in the error envelope in a subsequent milestone.
- Concurrency: JSON/JSONL file operations rely on fs with append/write. For MVP, single-process is assumed; contention and atomicity will be handled with append-only + simple retries if needed.
- Secrets: defaultSecret() is used; rotation and external secret sourcing are deferred.
- Security: Path traversal on /outbox/text is mitigated via basename; reading ops/CHEATSHEET.txt via ../ may not resolve (UI tolerates empty). Acceptable for MVP.

## Implementation Plan (1–3 weeks)

Milestone 1 (Week 1): Baseline fit + observability
- Add LOG_REQUESTS middleware to log one line per request (on finish) when LOG_REQUESTS=true. [DONE]
- Switch request ID to crypto.randomUUID() and continue logging in wrap/redirect and ledger rows. [DONE]
- Add GET /version returning minimal build info (app, node, env-safe options). [Planned]
- Smoke and unit tests for logging toggle, healthz, basic wrap/redirect happy path.

Milestone 2 (Week 2): Error model + robustness
- Normalize error envelope to { error: { code, message } } across routes; provide backward-compatible minimal fields for a transition window.
- Map token verification statuses to canonical codes/messages (Unauthorized/Expired/BadRequest).
- Harden I/O: defensive reads (BOM strip, CRLF tolerant), safe JSON parsing with precise 4xx/5xx mapping.

Milestone 3 (Week 3): UX + export polish
- Optimize ledger tail and CSV export for large files (streamed scan, bounded memory).
- Add /version details, optional git SHA if available, and expose in UI.
- Optional: minimal ids creation endpoint behind a simple allowlist to support future admin flows.

## Risks and Mitigations

- Test compatibility: Changing error shapes may break tests. Mitigate with phased change and dual fields during migration.
- File I/O race conditions on Windows: Use append-only where possible and stat-retry on transient errors.
- Token misuse: Enforce strict URL validation; short TTL; ensure HMAC secret stability across restarts.
- Logging volume: Optional and disabled by default; logs only when LOG_REQUESTS=true.

## High-level Architecture

Components
- Express server (src/server.mjs): Routes for healthz, ids (list/patch), redirect (/redirect/:id), wrapper (/wrap, /w/:token), audit/export, bridge endpoints, outbox helpers.
- Token library (src/lib/token.mjs): createToken, verifyToken, defaultSecret using HMAC-SHA256 and base64url.
- Ledger library (src/lib/ledger.mjs): append JSONL row, read tail last N, read all (for CSV).
- Data: data/ids.json for ID catalog.
- UI: public/index.html vanilla JS app interacting with server endpoints.
- Ops files: ops/inbox/GOAL.txt, ops/CHEATSHEET.txt, ops/outbox/*, ops/ledger/attendee-events.jsonl.

Data flows
- POST /wrap: validate urlOriginal → sign token (exp ~6h) → return {token, url}.
- GET /w/:token: verify token → append ledger row (status, timing, request_id, event/attendee, ip/ua) → 302 redirect to urlOriginal or 400 error.
- /audit: readLastN from JSONL for UI.
- /export.csv: readAll + time filtering → CSV.
- Bridge: /bridge/goal writes GOAL.txt and optional CHEATSHEET.txt; /bridge/status returns stat info; /outbox endpoints serve file listings and tails.

## First Concrete Task (implemented)

Task: Add optional, per-request logging middleware controlled by LOG_REQUESTS, and switch request IDs to crypto.randomUUID() to match spec. The middleware logs one concise line when the response finishes: "METHOD PATH -> STATUS DURATIONms". Execution is gated at request time by LOG_REQUESTS so tests can toggle the env per run.

Next Suggested Tasks
- Introduce GET /version.
- Prepare error envelope normalization (dual shape period), then switch UI and tests.
