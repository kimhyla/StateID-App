# Architecture Overview (MVP)

This document describes the MVP architecture for a link wrapper/redirect service with calendar rewriters (Google/Graph), an optional desktop agent, and a local ledger/export (“Named Audit Pack”). It outlines boundaries, data shapes, flags, and observability.

High-Level Components
- Wrapper/Redirect Service
  - Fast HTTP service that validates a target URL, logs a redirect event to a ledger, and issues a 302 to the original target.
  - Must fail-open (redirect even if ledger write fails) and meet latency targets.
- Calendar Rewriter (Google Calendar, Microsoft Graph)
  - Processes event bodies/locations to replace meeting links with wrapper URLs.
  - Controlled by feature flags; idempotent; respects privacy redaction settings.
- Desktop Agent (Windows-first)
  - Lightweight tray app offering “Export Now” and local helper endpoints if needed.
  - Stores exports locally; communicates with wrapper service via localhost or network.
- Ledger & Export (Named Audit Pack)
  - Append-only write-ahead log of redirect events; daily export to ZIP with JSON/CSV and checksums.
- Feature Flags/Kill Switches
  - Env-backed flags in MVP; centralized evaluation; read-only /flags endpoint.
- Observability
  - Structured logs, request/redirect metrics, correlation IDs, health/version endpoints.

Data Flow (happy path)
1) Calendar event authored (Google/Graph) → rewriter transforms meeting URL(s) to wrapper URLs.
2) User clicks link (from invite) → browser hits Wrapper /r?u=<url>.
3) Wrapper validates and canonicalizes target → emits ledger event (async) → issues 302 to target.
4) Ledger appends event → periodic export job produces Named Audit Pack to local disk.
5) Desktop agent can trigger export on demand and surfaces export location to the user.

ASCII Diagram
- Client → [Wrapper /r] → 302 → Target (Zoom/Meet/Teams)
                     ↘ (async) → [Ledger WAL] → [Daily Export ZIP]
- Calendar APIs → [Rewriter (Google/Graph)] → stores modified event bodies with wrapper URLs
- Desktop Agent ↔ [Wrapper] (export trigger) → [Local Filesystem]

Boundaries and Contracts
- Wrapper API
  - GET /r?u=<url>: 302 redirect; denies non-http/https; preserves query.
  - GET /healthz: 200 OK when ready.
  - GET /version: JSON/version string.
  - GET /flags: read-only view of active flags (no secrets).
- Rewriter API (internal modules/jobs)
  - Input: event body/location, event metadata (eventId, organizer, timestamps).
  - Output: modified body/location with wrapper URLs, audit record.
- Export Interface
  - Triggered by schedule or desktop agent; writes to local filesystem (configurable directory).

Data Shapes (documentation, not code)
- Redirect Event (ledger record)
  - eventId: string (uuid)
  - occurredAt: ISO-8601 UTC
  - request: { method, path, query, ipHash, userAgent (redacted) }
  - target: { originalUrl (redacted as configured), wrapperUrl, allowed: boolean }
  - outcome: { status: "redirected"|"blocked"|"error", httpStatus, latencyMs, errorCode? }
  - flags: { wrapEnabled, privacy, killRewrite, platform }
  - correlationId: string
- Export Manifest
  - version: "1.0"
  - generatedAt: ISO-8601 UTC
  - files: [ { path, sha256 } ]
  - counts: { events, errors }
- Calendar Rewrite Audit
  - provider: "google"|"graph"
  - eventId, organizer (hashed/pseudonymous)
  - originalUrl(s) (redacted or hashed), wrapperUrl(s)
  - action: "created"|"updated"|"cancelled"
  - result: "rewritten"|"unchanged"|"skipped"

Privacy & Security
- Redaction: REDACT_QUERY removes sensitive parameters except allowlist; HASH_EMAILS protects identities in stored fields.
- Open-redirect prevention: only http/https; canonicalized hostname; deny-list known bad hosts if needed.
- Storage: MVP stores ledger locally; exports are local ZIPs; document handling responsibilities in runbook.
- DSR: MVP supports tombstoning records by pseudonymous user id (best-effort within 7 days).

Feature Flags & Kill Switches
- Flags: FLAG_WRAP_ENABLED, FLAG_GCAL_REWRITE, FLAG_GRAPH_REWRITE, FLAG_KILL_REWRITE, REDACT_QUERY, HASH_EMAILS, LOG_REQUESTS.
- Behavior:
  - When FLAG_KILL_REWRITE=true: no rewriting; service remains available.
  - Flags visible at /flags for diagnostics (read-only).

Observability
- Logging: one structured line per request; error logs on ledger failures; redaction in logger.
- Metrics: counters (requests_total, errors_total); timers (redirect_duration_ms p50/p95).
- Tracing: correlation ID captured from x-request-id or generated; propagated in logs/metrics.
- Health: /healthz and /version used by smoke and deploy checks.

Non-Goals (MVP)
- No cross-platform desktop parity (Windows-first only).
- No remote feature flag service (env-based).
- No external export destinations (email/cloud) in MVP; local only.
- No auto-update for agent.

Operational Runbook (summary)
- Deploy: set FLAG_WRAP_ENABLED=true to activate; keep rewriters disabled until validated in sandbox.
- Rollback: set FLAG_KILL_REWRITE=true or disable specific provider flags.
- Performance: keep ledger writes async; monitor p95; scale service horizontally if needed.
