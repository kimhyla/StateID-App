# Top Risks & Mitigations

Legend
- Level: Low / Medium / High
- Owner: DRI for mitigation

Technical
- Risk: Calendar API quota limits or throttling (Google/Graph)
  - Level: High
  - Owner: Integrations Lead
  - Mitigation: Use sandbox tenants; exponential backoff; batch operations where supported; design rewriter as idempotent; feature flags for gradual rollout.
  - Trigger/Signal: 429s in logs; quota dashboards trend up.

- Risk: Open redirect or unsafe URL handling
  - Level: High
  - Owner: Backend Lead
  - Mitigation: Strict allowlist to http/https; hostname validation; canonicalization; unit and fuzz tests; security headers; independent review.

- Risk: Latency regressions in wrapper under load
  - Level: Medium
  - Owner: Backend Lead
  - Mitigation: Preallocate objects; async I/O; keep ledger writes off hot path; measure p50/p95; add backpressure and shed noncritical work.

- Risk: Data loss in ledger (crash/power failure)
  - Level: Medium
  - Owner: Platform Lead
  - Mitigation: Write-ahead log with fsync on rotation; periodic flush; fail-open redirect with error log; integrity checks in export.

- Risk: Desktop agent packaging and code signing delays
  - Level: Medium
  - Owner: Desktop Lead
  - Mitigation: Use test cert during MVP; defer auto-update; narrow scope to “Export Now” and heartbeat.

Product/UX
- Risk: Over-rewriting legitimate non-meeting links
  - Level: Medium
  - Owner: Product Manager
  - Mitigation: Conservative patterns; host allowlist; staged rollout; user-facing opt-out.

- Risk: User confusion from rewritten links in invites
  - Level: Medium
  - Owner: Product Manager
  - Mitigation: Branded domain; short help text in footer; enable fail-open if issues spike.

Privacy/Compliance
- Risk: Storage of PII (URLs, emails) without sufficient controls
  - Level: High
  - Owner: Privacy Lead
  - Mitigation: Redaction config; hashing of emails; minimization (store necessary fields only); local-only exports in MVP; DSR delete via tombstone.

- Risk: Export contains sensitive data that leaves device
  - Level: Medium
  - Owner: Privacy Lead
  - Mitigation: Clear export location and warning; encrypt ZIP (optional); checksum manifest; document handling.

Calendar Edge Cases
- Risk: Recurring series updates/cancellations desync between organizer/attendees
  - Level: Medium
  - Owner: Integrations Lead
  - Mitigation: Idempotent rewrite; only touch organizer-owned fields; verify deltas in integration tests.

- Risk: HTML/RTF body formatting breaks links or double-encodes
  - Level: Medium
  - Owner: Integrations Lead
  - Mitigation: Use robust HTML parsing; escape correctly; add tests for double-encoding and nested anchors.

Operational
- Risk: Flag misconfiguration causing global disable or unintended enable
  - Level: Medium
  - Owner: On-call
  - Mitigation: Safe defaults (off); /flags read-only endpoint; change log; two-person review for prod flags.

- Risk: Secrets leakage in logs
  - Level: Medium
  - Owner: Platform Lead
  - Mitigation: Structured logging with redaction; never log bodies by default; add lint rule/check.
