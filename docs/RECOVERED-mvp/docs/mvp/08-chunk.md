 disable Zoom Waiting Room backstop).
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

4. Installation & Onboarding
Sign-in (passwordless)
• Sign in with Google / Sign in with Microsoft (OAuth), or Sign in with Email (one-time code).
• Same sign-in = same account across desktop and mobile.
• No passwords. No phone number required.
Onboarding (Desktop)
Pre-step: Sign in.
Step 1 — Connect your calendars
Connect Google Calendar and/or Microsoft 365 (Outlook).
Step 2 — Which video-service(s) do you use with clients?
? Zoom
? Google Meet
? Microsoft Teams
? Webex
? Doxy / VSee / Doximity / RingCentral / BlueJeans
? Client portal / EHR
? Another video service (not listed)
• If Zoom is checked ? show inline Connect Zoom (optional) (one click).
• If Another video service (not listed) is checked ? show: Paste one example join link (https).
Step 3 — Client portal / EHR (only if selected)
Show Your Join Link (e.g., https://stateid.app/your-slug) with a Copy button.
One line:
“To run StateID seamlessly in the background, paste this link in your portal where your normal meeting link appears. If that’s not possible, no worries—we’ll send a one-line manual verification at the start of your video conference.” [Help]
Help (collapsed):
• Look for Video link, Teleh
