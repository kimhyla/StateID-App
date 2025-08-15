11. Technical Notes
URL detection (examples)
• Zoom: https?://(www.)?zoom.us/j/[^\s)]+
• Meet: https?://meet.google.com/[a-z-]+
• Teams: https?://teams.microsoft.com/l/meetup-join/[^\s)]+
• Webex, Doxy, VSee, Doximity, RingCentral, BlueJeans… (extend registry)
• Custom platforms (MVP): paste an example join link ? learn domain/shape (https-only; validation hop; warning).
Non-standard calendars
• MVP: Google/Outlook direct support.
• Yahoo coverage: see §3 (originating invites).
• Read-only ICS mirrors: cannot be rewritten.
Retry logic
• Client budget 200 ms; fail open if exceeded.
• Server background 3–5 retries with short backoff.
Geo confidence rules
• Verified (auto) when Provider A confidence ? 0.80 and Provider B agrees or is unknown.
• Or when Provider A confidence is 0.60–0.79 and Provider B agrees on the exact same state.
• Otherwise Unverified. If VPN/hosting is detected, always Unverified with note “Unverified: VPN/hosting detected.”
Custom pattern learning
• Learn domain + path shape; strip query params during learning to avoid token leaks. Preserve the full original URL (including params) for redirect.
Data model (simplified)
• Session {meeting_ref, clinician_id, start_at, platform, original_url, wrapped_url}
• AttendeeEvent {session_id, attendee_slot_hash, status, state, self_declared_state, method, within_scope, override_reason, override_timestamp_utc, timestamp, note_text}
• ClinicianSettings {allowed_states[], psypact_flag, policy_mode, calendars[], external_required, attendee_cap}
Hidden implementation rules (MVP)
• Work only with events the user already creates.
• Never create new invites or send attendee updates.
• If pre-send is missed, do not send updates; rely on policy banners and Zoom backstops.
• Read-only ICS feeds: no rewrite capability.
Zoom/Teams backstops
• Zoom (optional connect): tiny description line; Waiting-Room link only if verification still missing at host start.
• Teams: tiny line in Outlook body (shows in Details tab).
• Meet: covered by calendar rewrite.

12. Acceptance Criteria (MVP)
• After install + OAuth (+ optional Zoom connect), 100% of new calendar invites containing a supported (or custom-patterned) video link are sent with a StateID wrapper automatically, without sending attendee update emails if we miss pre-send.
• p95 ? 200 ms click-through; slower cases fail open and can still complete verification in background.
• Out-of-scope banner appears only when applicable; copy matches spec.
• Failure handling shows only the minimal copy specified (“Location not detected/captured”); low-confidence geo ? Unverified with normal options.
• Ask page records both auto-detected state (if any) and client-selected state (if any).
• “Not a client session — do not log” discards the event; if already saved, soft-delete and retain minimal deletion marker for 30 days.
• For every session with a resolved status, a Logged note is generated and stored; edits persist and appear in exports; edit history retained and viewable.
• Exports: only Named Audit Pack (local); named PDF/CSV produced on device; scope header present.
• Outlook/Google no-update emails: Patches do not generate attendee update emails across shared/delegated/resource calendars; any rare leak cases are documented.
• Series correctness: Editing a series vs. a single instance never duplicates or strips wraps; exceptions preserve the original destination URL in metadata.
• Desktop overlay safety: Banners never overlap Zoom/Teams/Meet mute/leave controls on macOS and Windows.
• Latency SLOs: Wrapper p95 ? 200 ms across key regions; fail-open rate below the target threshold.
• Privacy proof: Named export keeps PHI local; no names/emails leave the device (verified by intercept tests).
