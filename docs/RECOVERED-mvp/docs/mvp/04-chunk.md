dismiss
• Ask (1-click copy): popup shows Copy (single-line or per-attendee block when emails known). Tiny hint to paste into chat.
• Client taps; StateID verifies and silently returns them to the call; UI flips to Verified.

Group sessions
• Single banner with per-attendee chips when emails are present; header “StateID: 1 of 3 verified”; chips update live.
• One Ask covers all pending attendees.
• If no attendee emails (portal-only), show session-level status (no chips).
• When attendee emails exist, Ask provides per-attendee short links (one block to copy). If a single broadcast link is pasted, the Ask page prompts the client to confirm their email to map correctly.
• If no emails (portal-only), therapist may Assign a State per-attendee via chips (manual mapping).

Assume same state cap: If the last verified state is older than 90 days, do not assume; mark Unverified and show the banner.

5.5 Out-of-scope Warning (exact copy)
Banner: Client may be in {STATE} — outside your allowed states.
Buttons: Acknowledge · Correct the State (dropdown of states)
• Correct the State logs Provider Assigned with that state and re-evaluates scope.
• Export records override_reason=clinician_override_out_of_scope and override_timestamp_utc.

5.6 “Not a client session — do not log”
• Link under the status pill / banner footer.
• Clicking immediately discards this event from the ledger; banner closes.
• If a row was already recorded, we soft-delete it (excluded from export) and retain a minimal deletion marker for 30 days.
• Presentation: small, unobtrusive inline text link (12–13 px), low-emphasis color, no icon; accessible name “Not a client session — do not log”.
• Placement: visible in the footer of the carry-forward toast and Ask/Out-of-scope banners; on the Verified pill, place it in a “?” overflow menu (no persistent link on the pill).
• Visibility rules: desktop in active meeting only; hide on mobile; hide if already marked “not a client.” Do not duplicate the link (if a banner/toast is present, place it there only).
• Undo: after click, show a brief Undo toast (2.5s; not keyboard accessible); if not undone, keep a minimal 30-day deletion marker with reason=non_client.

6. Client Experience
• No GPS or OS location prompts; network signals + optional self-attestation.
• Tap invite ? ~0.1–0.2s check ? Zoom/Meet/Teams opens.
Immediate deep-link try (e.g., zoommtg://…) or fast 302; DNS/TLS preconnect; dark background; page <2KB.
• In-session Ask: tiny link in chat opens the browser and returns to the call; audio/video continue.
• No client app. No account creation.
• Mobile clients fully supported (iOS/Android).

7. Therapist UI — Exact Copy & Elements
Purpose: Canonical UI strings only. Behavior/conditions live in §5.2 (flow), scope banner rules in §5.3, and link placement/visibility in §5.6.

7.1 Verified
• Pill: Verified ?
• Note: Footer/overflow link “Not a client session — do not log” per §5.6 (overflow on pill).

7.2 Out-of-scope
• Banner: Client may be in {STATE} — outside your allowed states.
• Buttons: Acknowledge · Correct the State (dropdown of states)
• Note: Footer link “Not a client session — do not log” per §5.6.

7.3 Carry-forward toast (Policy A)
• StateID: Location not detected. Defaulted to last known State ({STATE}) ({AGE} ago).
• Approve · Enter Client’s current State
• Note: Footer link “Not a client session — do not log” per §5.6.

7.4 Ask banner (Policy B)
• StateID: Location not captured.
• Ask client for State · Assign a State · Mark same State as last session ({STATE}) · Acknowledge & dismiss
• Note: Footer link “Not a client session — do not log” per §5.6.
Ask — prefilled message (exact)
perl
CopyEdit
Hi! Please tap to confirm your state for my records — it won’t interrupt the call: {short link}
(Ask flow shows one-click Copy; therapist pastes into chat.)

8. Dashboard (Desktop & Mobile)
Form factors
• Desktop (primary): Full dashboard inside desktop
