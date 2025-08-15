OS and Windows.
• Latency SLOs: Wrapper p95 ? 200 ms across key regions; fail-open rate below the target threshold.
• Privacy proof: Named export keeps PHI local; no names/emails leave the device (verified by intercept tests).

13. Metrics (internal)
• % sessions Verified (overall/by clinician).
• % Out-of-scope warnings.
• p50/p95 verification latency.
• Fail-open rate; background-success rate.
• Banner impression rate; action mix (Approve / Enter state / Ask).
• Carry-forward usage vs Ask usage.
• “Not a client” suppression count.
• Logged note edit rate.
• Overlapping-meeting disambiguations chosen correctly (%).

14. Integrations (MVP ? V1)
• MVP: Google Calendar, Microsoft 365 (Outlook), Zoom Connect (optional).
• Custom patterns: “Add your own join-URL pattern” (https-only, validation).
• V1 options (optional restores):
o Outlook OnAppointmentSend add-in (org deploy).
o iOS/Android Share extensions (“Share ? StateID Wrap”).
o Vanity domains/CNAME for Join Links.
• V2+: Apple Calendar (EventKit/macOS), Zoom/Teams in-meeting apps (one-tap Ask), org SSO (Workspace/Entra), basic org analytics.

15. Edge Cases
• Typed Meeting ID / old raw link: apply Assume or Ask.
• Portal-only (hidden URLs): Your Join Link (fixed room) or policy banners; Zoom Waiting-Room backstop if Zoom.
• VPN/border anomalies: if Verified but likely out-of-scope, show banner; Acknowledge or Correct the State.
• Group sessions: per-attendee chips when emails present; one Ask covers all; session-level status otherwise.
• Yahoo-only manual events: use Your Join Link or banners.
• Non-client sessions: “Not a client session — do not log” ? soft-delete + minimal deletion marker.

16. Developer Checklists (MVP)

16.1 Wrapper/Redirect service
• Resolve short id ? destination URL + session context.
• Parallel geo lookups; stop at first confident answer.
• 302 within 200 ms; record attempt; background retries.
• On destination 4xx/5xx: immediate 302 to original URL.
• “Blinkless” HTML: minimal weight, instant JS redirect/deep-link, dark splash, preconnect.
• Token TTL (“meeting window”): valid from start?60 minutes to end+12 hours (or start+12h if no explicit end).
• Background retries after fail-open: 250ms ? 750ms ? 2s; stop after <3 minutes total.
• Deduplicate by (session_id, click_id) to avoid double-counting.

16.2 Calendar rewriter
• Regex detect (plus custom patterns); replace safely; store original in extended props.
• Idempotent on edits/reschedules; handle recurring series/exceptions.
• Google/Outlook hooks: on create/edit/send with rollback safety.
• Do not send attendee update emails if we miss pre-send (MVP policy).
• Test matrix: Google (primary/secondary/delegated/shared; series master vs exception; sendUpdates=none); Outlook/Graph (user/shared/delegated/resource; series master vs instance; ?sendUpdates=none; cross-tenant). Verify no attendee update emails and idempotent wraps; document any leak cases.

16.3 Desktop Agent
• OAuth bootstrap; token refresh.
• Banner/toast UI: Verified pill, out-of-scope banner, carry-forward toast, Ask banner with one-click Copy (single-line or per-attendee block).
• Background health chips for connectors; Recheck now.
• “Not a client session — do not log”: soft-delete with minimal marker.
• Overlay heuristic: Anchor to a safe screen edge and never cover meeting controls (mute/leave). When overlapping meetings exist, scope to the meeting whose window is focused within the event’s time window; fallback to most recent user interaction.

16.4 Ledger/Exports
• Generate note_text on status resolution; regenerate on change; persist edit history (view history in row).
• Named Audit Pack (local): pull calendar events locally via OAuth; join on event id/start; render PDF/CSV client-side; no PHI to server.
• Webhook renewal daemons for Google watch and Microsoft Graph subscriptions (auto-renew, backoff, alerting).
• Feature flags / kill switches per connector (e.g.,
