rd toast, Ask banner with one-click Copy (single-line or per-attendee block).
• Background health chips for connectors; Recheck now.
• “Not a client session — do not log”: soft-delete with minimal marker.
• Overlay heuristic: Anchor to a safe screen edge and never cover meeting controls (mute/leave). When overlapping meetings exist, scope to the meeting whose window is focused within the event’s time window; fallback to most recent user interaction.
16.4 Ledger/Exports
• Generate note_text on status resolution; regenerate on change; persist edit history (view history in row).
• Named Audit Pack (local): pull calendar events locally via OAuth; join on event id/start; render PDF/CSV client-side; no PHI to server.
• Webhook renewal daemons for Google watch and Microsoft Graph subscriptions (auto-renew, backoff, alerting).
• Feature flags / kill switches per connector (e.g., disable Zoom Waiting Room backstop).
• Observability SLOs: track p50/p95 latency, fail-open %, background success %, rewrite idempotence hits.
• Build a small support labeling tool for overlapping-meeting disambiguation ground truth.

17. Day-in-the-life (after setup)
Clinician creates an appointment as usual (Google/Outlook; or Zoom creates it).
StateID quietly wraps the join link. If Zoom is connected, we also set a tiny agenda line (and, only if needed, a Waiting-Room link); Teams shows a tiny line in Details.
Client taps the invite at session time.
Our edge runs the near-instant check (~0.1–0.2s) and deep-links/302s to Zoom/Meet. If it would take longer, we fail open and finish in the background.
In the desktop app, the clinician sees:
Verified, or Out-of-scope (Acknowledge/Correct the State), or—if detection failed—either the Assume toast or the Ask banner.
Later (or monthly), they open Exports and generate the Named Audit Pack (local) for an insurer/board.


