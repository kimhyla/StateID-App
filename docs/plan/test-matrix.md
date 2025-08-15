# Test Matrix

Goals
- Ensure MVP behavior is correct, fast, and privacy-safe across wrapper, calendar rewriters (Google/Graph), desktop agent, and exports.
- Explicitly cover calendar rewrite edge cases, wrapper p95 latency, fail-open behavior, and export integrity.

Test Levels and Scope
- Unit (fast, isolated)
  - URL validation and canonicalization (allow http/https, deny others).
  - Redirect handler status codes and header preservation.
  - Logging toggle (LOG_REQUESTS) on/off; correlation ID propagation.
  - Redaction functions (query removal, email hashing).
  - HTML/RTF/text rewriter functions (no external calls).
  - Ledger append/rotation logic; checksum generation.

- Integration (real subsystems, sandbox APIs, ephemeral env)
  - Wrapper end-to-end: redirect 302, preserves query string, logs event; fail-open when ledger write fails.
  - Google Calendar: create/update recurring and single events; verify wrapper URLs present; verify non-meeting links untouched.
  - Microsoft Graph: same matrix as Google; include RTF body cases.
  - Export job writes daily ZIP containing JSON + CSV + manifest; verify schema and checksums.
  - Feature flags flipping at runtime (environment refresh or reload endpoint) changes behavior within 60s.

- End-to-End (black-box, user flows)
  - “Create calendar event with meeting link” → “Invite shows rewritten URL” → “Click opens wrapper” → “Redirect to original meeting” → “Ledger contains event” → “Export contains record.”
  - Desktop agent triggers “Export Now” and file appears in user Documents; integrity passes.
  - Fail-open: force ledger failure; verify redirect still succeeds and error is logged.

- Performance
  - Wrapper latency: 50 RPS for 5 minutes; p95 ≤ 150 ms in staging, ≤ 75 ms local. Zero 5xx.
  - Memory footprint stable; no unbounded growth in buffers.

- Security
  - Open-redirect prevention (deny javascript:, data:, file:, etc.).
  - Rate limit behavior (returns 429 after threshold).
  - Secrets redaction in logs.

Calendar Rewrite Edge Cases
- Google:
  - Single event creation/update; recurring series create/update/cancel (entire series and single occurrence).
  - HTML vs plain text descriptions; links inside anchor tags; multiple meeting links.
  - External organizer vs internal; timezone variants; ICS import.
- Microsoft Graph:
  - HTML and RTF bodies; organizer vs attendee edits; Teams/Zoom/Webex links; attachments with links.

Environments
- Local: Node tests, smoke.js, mocked Google/Graph where possible.
- Sandbox: Dedicated Google Workspace and M365 tenants with test accounts; nightly scheduled integration suite.
- Staging: Same build as prod; load/perf tests; flag rehearsals.

Tooling
- Node test runner (node --test), supertest/http for integration, smoke.js for health checks.
- Optional load: autocannon or k6; artifact upload of latency summaries.
- HTML/RTF parsing libs in tests for canonical expected bodies.

Data Sets and Fixtures
- Test accounts: gcal-test@, graph-test@; seeded calendars.
- Meeting URLs covering Zoom, Meet, Teams, Webex; variants with/without query params.
- Redaction allowlist for safe parameters.

Exit Criteria per Milestone
- Milestone 1: All wrapper unit + integration + smoke tests green; p95 local target met.
- Milestone 3/4: Calendar integration suites pass for Google/Graph respectively; manual spot checks okay.
- Milestone 6: Export validation (schema + checksum) passes and file is readable.
- Milestone 8/9: Flags/security tests green; no open-redirect regressions.

Reporting
- CI publishes JUnit and latency summaries; weekly trend of p95 and 5xx rate; export integrity rate (100%).
