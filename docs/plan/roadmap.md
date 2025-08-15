# MVP Roadmap

Source: docs/spec/mvp.md (chunked MVP). This plan turns the MVP into actionable milestones with testable acceptance criteria, dependencies, sizing, and PR checkpoints. It deliberately avoids code changes and focuses on delivery.

Conventions
- Branch naming: feat/<kebab-slug> (or fix/<slug>, chore/<slug> for non-feature work)
- PR checkpoints: design notes in PR description, API contract, unit tests, integration tests, smoke test update (if applicable), rollback plan, docs update (README or /docs)
- Sizing: T-shirt size (S=1–2d, M=3–5d, L=6–10d, XL=10+d) with rough person-days (pd)

Milestone 1 — Wrapper/Redirect Service MVP
- Scope & outcomes: Public HTTP endpoint that receives a wrapped link, logs a ledger event, and redirects to target quickly and reliably.
- Acceptance criteria:
  - GET /r?u=<url-encoded-target> responds 302 to target; preserves query string; prevents open redirects for non-HTTP(S).
  - p95 latency ≤ 75 ms locally, ≤ 150 ms in staging under 50 RPS, with zero data loss for 5 minutes of traffic.
  - Fail-open: if ledger write fails, redirection still occurs and a structured error log is emitted.
  - Health checks: GET /healthz (200 OK) and GET /version (returns semantic version).
- Key dependencies: Node.js runtime; HTTP server; structured logging; basic in-memory ledger buffer with async flush.
- Size: M (4 pd)
- Branch: feat/wrapper-redirect-mvp
- PR checkpoints: API contract (/r, /healthz, /version); unit tests for redirect + validation; smoke test for /healthz; load test notes; rollback via env FLAG_WRAP_ENABLED=false.

Milestone 2 — Request Logging & Observability Baseline
- Scope & outcomes: Toggleable request logging, correlation IDs, minimal metrics.
- Acceptance criteria:
  - LOG_REQUESTS=true emits one log line per request with method, path, status, duration, correlationId.
  - Correlation ID generation/propagation (x-request-id header if provided, else generated).
  - Basic counters: total requests, total 5xx; timers: redirect latency p50/p95.
- Key dependencies: logger, process.env for flags, minimal metrics collector.
- Size: S (2 pd)
- Branch: feat/observability-baseline
- PR checkpoints: logger format; unit tests for toggling; integration test asserting log presence/absence; docs for ops.

Milestone 3 — Google Calendar Rewriter (MVP)
- Scope & outcomes: Rewrite outgoing Google Calendar event links to wrapper; reversible via flag.
- Acceptance criteria:
  - For created/updated events (single + recurring), meeting URLs in description/location are replaced with wrapper URLs.
  - Feature flag: FLAG_GCAL_REWRITE=true enables rewrite; off leaves content unmodified.
  - Coverage: HTML and plain text bodies; non-meeting links are untouched.
  - Audit entry recorded containing eventId, organizer, originalUrl (redacted where required), wrapperUrl, timestamp.
- Key dependencies: Google Calendar API, OAuth2 or service account (domain-wide delegation) in sandbox tenant.
- Size: L (8 pd)
- Branch: feat/gcal-rewriter
- PR checkpoints: API token flow doc; sandbox setup; unit tests for rewrite function; integration test against sandbox; rollback plan (disable flag).

Milestone 4 — Microsoft 365 (Graph) Calendar Rewriter (MVP)
- Scope & outcomes: Rewrite meeting links in Outlook/Graph events similarly to Google.
- Acceptance criteria:
  - Create/update hooks/process that rewrite links with FLAG_GRAPH_REWRITE=true.
  - Handles: single, recurring, update, cancellation; HTML/RTF/plain text; organizer vs attendee edits.
  - Audit entry parity with Google.
- Key dependencies: Microsoft Graph API; app registration in dev tenant.
- Size: L (8 pd)
- Branch: feat/graph-rewriter
- PR checkpoints: token acquisition doc; unit + integration tests; rollback flag.

Milestone 5 — Desktop Agent (Windows-first)
- Scope & outcomes: Lightweight tray app that can initiate exports locally and expose a localhost callback for deep links if needed.
- Acceptance criteria:
  - Install/start/exit flows verified on Windows 10.
  - Local “Export Now” action triggering export API call and storing export file to user Documents.
  - Auto-update deferred (out of MVP).
- Key dependencies: Electron/Tauri or native; code-signing (test cert); installer.
- Size: XL (12 pd)
- Branch: feat/desktop-agent
- PR checkpoints: packaging doc; smoke test to verify agent heartbeat; telemetry opt-in.

Milestone 6 — Ledger & Named Audit Pack (Export)
- Scope & outcomes: Append-only ledger with daily export to a “Named Audit Pack” (ZIP containing JSON + CSV + README).
- Acceptance criteria:
  - Write-ahead log persisted to disk; crash-safe append semantics.
  - Daily export contains schema {eventId, occurredAt, userId/tenantId (pseudonymous), originalUrl (redacted or hashed), wrapperUrl, status, latencyMs}.
  - Integrity: export includes SHA-256 manifest and signature placeholder.
- Key dependencies: local filesystem; rotation; hashing library.
- Size: M (5 pd)
- Branch: feat/ledger-export
- PR checkpoints: schema doc; unit tests for append/rotation; integration test verifying export contents.

Milestone 7 — Privacy & Redaction Controls
- Scope & outcomes: Configurable PII redaction for query strings and host allowlists.
- Acceptance criteria:
  - REDACT_QUERY=true removes query components except allowlist (e.g., zoom.us meeting id).
  - HASH_EMAILS=true hashes email-like tokens in body before storage.
  - DSR-delete: logical tombstone by user identifier within 7 days (best-effort MVP).
- Key dependencies: config management; tested regexes.
- Size: M (4 pd)
- Branch: feat/privacy-controls
- PR checkpoints: redaction rules doc; unit tests; e2e export verifies redaction.

Milestone 8 — Feature Flags & Kill Switches
- Scope & outcomes: Centralized flag evaluation; emergency kill switch to bypass rewriting while keeping service up.
- Acceptance criteria:
  - FLAG_KILL_REWRITE=true causes passthrough (no rewrite) within 60 seconds without redeploy.
  - Flags are observable via GET /flags (read-only).
- Key dependencies: in-memory flag store with periodic refresh; env-backed in MVP.
- Size: S (2 pd)
- Branch: feat/feature-flags
- PR checkpoints: endpoints doc; unit tests; security review (read-only).

Milestone 9 — Security & Abuse Guardrails
- Scope & outcomes: Input validation, open-redirect prevention, rate limits, headers.
- Acceptance criteria:
  - Only http/https targets allowed; hostname allow/deny list supported; 400 on invalid targets.
  - Basic IP-based rate limiting (burst + sustained) configurable.
  - Security headers on all responses; dependency scanning passes.
- Key dependencies: validation lib; rate-limiter; CI security scanning.
- Size: M (4 pd)
- Branch: feat/security-guardrails
- PR checkpoints: threat model note; unit/integration tests; docs.

Milestone 10 — Beta Readiness & Documentation
- Scope & outcomes: Hardening and docs for pilot users.
- Acceptance criteria:
  - Runbook (deploy, rotate keys, flags, rollback).
  - Troubleshooting and FAQ; sample exports; changelog.
  - SLO draft (availability, latency), on-call basics.
- Key dependencies: none beyond earlier work.
- Size: M (3 pd)
- Branch: feat/beta-readiness
- PR checkpoints: docs-only with sign-off.

Two-week Sprint 1 (Concrete Cut)
Goal: Deliver a thin vertical slice of the wrapper service with observability and safety, enabling early internal testing.

- Scope:
  - Milestone 1 (core redirect, health/version, fail-open) and parts of Milestone 2 (logging toggle, correlation IDs).
- Tasks (ready to execute):
  - Implement /healthz and /version endpoints, wire into smoke script.
  - Implement /r redirect handler with validation (http/https only), preserve query string.
  - Add fail-open around ledger write (temporary in-memory); structured error logs.
  - Implement LOG_REQUESTS toggle and correlation IDs; update tests for logging on/off.
  - Add minimal metrics counters/timers (in-process).
  - Add p95 latency measurement script/notes; run locally and record baseline.
  - Write runbook snippet (README section) for env flags used in Sprint 1.
- PRs:
  - feat/wrapper-redirect-mvp
  - feat/observability-baseline
- Exit criteria:
  - node --test test/*.test.js passes locally and in CI.
  - Manual curl verifies /r redirects; logs visible when LOG_REQUESTS=true.
  - p95 ≤ 75 ms locally for 50 RPS for 5 minutes; notes captured in PR.
