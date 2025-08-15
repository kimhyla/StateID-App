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
Later (or monthly), they open Exports and generate the Named Audit Pack (local) for an insurer/board. StateID — MVP Product Specification
StateID quietly confirms a client’s state for video sessions (Zoom/Meet/Teams/etc.) by auto-wrapping join links inside calendar invites. It adds ~0.1–0.2s overhead, fails open if slower, and produces a clean Verified checkmark plus an audit-ready ledger and export—without changing the therapist’s normal workflow.

1. Goals & Non-Goals
Goals
• Invisible for calendar-based video invites; no workflow change.
• Click-through overhead ? 200 ms p95; fail open if exceeded.
• Clear, exportable audit per attendee: state, status, scope result, timestamp, method, logged note.
• No EHR integration required to succeed.
• Never send attendee update emails if pre-send is missed; rely on in-session policies/backstops.
Non-Goals (MVP)
• Native phone calls / FaceTime.
• In-meeting Zoom/Teams apps (post-MVP).
• Auto-posting to third-party chats.
• Automatic license-board lookups (therapist declares Allowed States + PSYPACT).
• No global clipboard watching / keystroke interception.
• No pre-meeting nudges/reminders; StateID rides existing calendar/meeting flows only.

2. Personas
• Therapist/Clinician (primary): simple Verified indicator, zero friction.
• Practice Owner/Compliance: policy controls + reliable exports.
• Client (indirect): experiences no interruption.

3. Platforms (MVP)
• Desktop Agent: macOS 10.15+; Windows 10+.
• Calendars: Google Workspace Calendar / Microsoft 365 (Outlook).
• Optional Connector: Zoom private OAuth (background safeguards for Zoom flows; see §5.1 “Backstops”).
• Yahoo coverage: when invites originate from Zoom/Teams/Google/Outlook (including “Add to Yahoo”), Yahoo consumes the ICS/body containing our wrapper/line. Direct manual Yahoo-only creation has no API; use Your Join Link or banner fallback.
