## StateID — MVP (Compact)

### 01-chunk

StateID — MVP Product Specification

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
• Look for Video link, Telehealth URL, Meeting link, or Location in your appointment template.
• Common spots: Settings ? Appointments ? Templates or Client Communication ? 
Email/Text Templates.
Step 4 — For each service you selected
“Do you generate a new invite link for each new video-conference session, or use the same link every time for all your sessions?”
For each chosen service, show two checkboxes (pick one):
• ? New invite link each session (no further steps)
• ? Same link every time

When checked, show Your Join Link for that service with a Copy button and one line:
“To run StateID seamlessly in the background, paste this link wherever you usually put your video-conference invite link (for example: your client portal template, your email template, or your default room settings in Zoom/Meet/Teams). If that’s not possible, no worries—we’ll send a one-line manual verification at the start of your video conference.” [Help]
Help (collapsed; same guidance as above).


### 02-chunk

Step 5 — If we can’t auto-verify your client’s State
? Assume it’s the same as last session
? Ask the client for their State (one line)

Mobile host note (shown during onboarding):
“On desktop, you’ll be able to see your client’s State during the conference call. However, iOS/Android rules don’t allow for that on mobile phones. So StateID will silently verify and save your client’s State into your logs, which you can use for audits.”

Onboarding (Mobile)
• Same steps and wording as desktop.
• If setup was finished on desktop, mobile automatically shows your account as configured.
• If setup is incomplete, mobile resumes from where you left off.
• Real-time in-call notifications remain desktop-only in MVP.

Onboarding failure handling
• Editor rights check (exact copy):
“You are not an editor on this Calendar. That means StateID can’t verify your client’s State automatically in the background. To fix this, you can either request editor access on the calendar, or just allow manual overrides. Either will work fine. If you are granted Editor access in the future, StateID will update itself.”
We auto-reprobe access on app launch and every 24h; there’s also Recheck now.
(Implementation rules—part of MVP but not surfaced to users: we only work with events you already create; we never create new invites or send attendee updates; read-only ICS feeds cannot be rewritten.)

5. Core Behavior

5.1 Calendar Auto-Rewrite (primary path) + Background Backstops
• Google: Calendar API watch ? server rewrite of body/location; store original join URL in event extendedProperties (rollback-safe).
• Outlook: Microsoft Graph subscription ? server rewrite of body/location; store original in extended properties.
• Parse Location/Description/ICS for supported join URLs (Zoom/Meet/Teams/Webex/Doxy/VSee/Doximity/RingCentral/BlueJeans/etc.).
• Replace visible join URL with a StateID wrapper (looks normal to clients).
• Preserve full destination URL (all query params/tokens) and store original in event metadata.

Timing & attendee updates (final policy)
We aim to land the rewrite pre-send. If an invite already went, MVP does not send attendee update emails (maximum invisibility). In those edge cases, therapists see carry-forward or Ask at session time; ledger remains compliant.

Backstops (background-only; no therapist action)
• Zoom (when connected):
o Prepend one ultra-short verify line to the meeting agenda/description via API (flows into Zoom emails/ICS).
o If verification is still missing at host start, quietly add the short verify link to the 
Waiting Room message.
• Teams: Add one ultra-short verify line at the top of the Outlook event body (appears in Teams in-call Details).
• Meet: Calendar rewrite places the wrapper in the event Description, which shows in in-call Meeting details.

How invites reach clients (covered)
• Calendar-sent emails/SMS (Google/Outlook): rewritten body ? wrapped link delivered.
• Zoom-sent emails: if Connect Zoom is enabled, our agenda line appears there too; otherwise rely on calendar emails (common today).
• Portal-only flows (no visible URL): handled via Your Join Link (if using a fixed room) or the therapist banner (Ask / Mark / Acknowledge).
• Static room per therapist: Your Join Link routes all clicks through StateID.
Performance budget
• Client click budget ~100–200 ms. If exceeded or any error: fail open (immediate redirect to original); server performs 3–5 background retries.
• Multiple links priority: Location field takes precedence over Description; within a field the order is Zoom ? Teams ? Meet ? Webex ? registry ? custom. Wrap the first match only.
• Idempotence key for series/exceptions: (calendarId, eventId, occurrenceStartUtc, urlFingerprint).
• Zoom Waiting Room message: best-effort / account-dependent (non-blocking).


### 03-chunk

5.2 Verification & Status (therapist-visible) — If/Then with Scope
If auto-detect captures a confident state within the click budget
? Show: Verified ? — {{STATE}}
? Scope outcome: evaluate against Allowed States + PSYPACT + “Outside U.S.” rule
?• If in-scope: no banner.
?• If out-of-scope: show Out-of-scope banner: Client may be in {STATE} — outside your allowed states. Actions: Acknowledge · Correct the State (opens state picker; sets Provider Assigned).
? Actions: none required (normal UI only).
? Ledger (immediate): status=verified, method=auto, state={{STATE}}, within_scope={true|false}.

Else if policy = Assume and there is a prior verified state within the cap (see §5.4)
? Show: Assumed (from prior) — {{STATE}} with the carry-forward toast (§7.3).
? Scope outcome: same evaluation as above
?• If in-scope: no banner (toast only).
?• If out-of-scope: show Out-of-scope banner with Acknowledge · Correct the State (equivalent to entering a new state; sets Provider Assigned).
? Actions: Approve (keep assumption) · Enter Client’s current State (opens dropdown).
? Logging (no-action guarantee): as soon as the toast is shown, write a ledger row: status=assumed_from_prior, method=assumed, state={{STATE}}, within_scope={true|false}.
? Ledger when Approved: status=assumed_from_prior, method=assumed.
? Ledger if Enter is used (or “Correct the State” from the banner): status=provider_assigned, method=provider_assigned, state={{NEW_STATE}} (history preserved; scope re-evaluated).

Else if the therapist manually selects a state (no auto/self-declared available yet)
? Show: Provider Assigned — {{STATE}}
? Scope outcome: evaluate and, if out-of-scope, show banner with Acknowledge · Correct the State (may pick a different state).
? Actions: may change state later; normal out-of-scope rules apply.
? Ledger (immediate): status=provider_assigned, method=provider_assigned, state={{STATE}}, within_scope={true|false}.

Else (no verification captured yet)
? Show: Unverified- No known State with the Ask banner (§7.4).
? Actions (banner): Ask Client for State (1-click Copy) · Assign a State (opens picker) · Assume State from Prior Session (if available within cap) · Acknowledge & Dismiss.
? Logging (no-action guarantee): when the Ask banner is shown, write a ledger row immediately: status=unverified, within_scope=unknown (no method yet).
? If Assign a State is used: update to status=provider_assigned, method=provider_assigned, state={{STATE}} and evaluate scope (show banner if out-of-scope).
? If Assume State from Prior Session is used (within cap): update to status=assumed_from_prior, method=assumed, state={{PRIOR_STATE}} and evaluate scope.
? When the client uses the Ask link and confirms: flip UI to Verified — {{STATE}}; set method=self_declared; evaluate scope.
? Tie-breaker: if both auto and self-declared exist and disagree, status uses auto; self_declared_state is still saved for export.
Export-only fields (unchanged):
method ? {auto, self_declared, provider_assigned, assumed}; self_declared_state (nullable).

5.3 License Scope (Allowed States check)
• Every Verified result checked against Allowed States (+ PSYPACT).
o In-scope: silent success.
o Out-of-scope: show small warning banner (see §7).
• Outside U.S. evaluates out-of-scope unless explicitly allowed in Settings.
• If PSYPACT is enabled, PSYPACT-member states are treated as in-scope even if not individually checked in Allowed States.

5.4 Failure Handling (no verification yet)
Keep it minimal to stay invisible.
Low-confidence geo: treat as Unverified and show the normal options.


### 04-chunk

Policy A — Assume it’s the same as last session
Toast (exact copy):
StateID: Location not detected. Defaulted to last known State (CT) (12 days ago).
Approve · Enter Client’s current State
• Approve: keep default; ledger = Assumed from prior.
• Enter Client’s current State: dropdown ? ledger = Unverified (provider-assigned).

Policy B — Ask me each time
Banner (exact copy):
StateID: Location not captured.
Ask client for State · Mark same State as last session (CT) · Mark New State… · Acknowledge & dismiss
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


### 05-chunk

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
• Desktop (primary): Full dashboard inside desktop app or browser.
• Mobile web (light): Read-only + safe actions; no exports; no live banners.

Navigation
• Sessions (default) • Exports • Settings • Org (if enabled) • Help
(Admin-only Health panel is hidden from non-admins.)

Sessions (Ledger)
• Columns: Date/Time • Platform • Status • State • Within scope • Method (auto/self-declared/provider-assigned/assumed) • Logged note • Actions
• Actions: Edit note (desktop), Not a client — do not log, Copy logged note
• Filters: date range, status, state, within scope, platform, “suppressed (non-client)”.

Exports
• Named Audit Pack (local, on your computer) — the export.
o Merges calendar names locally; outputs named PDF/CSV; no PHI leaves device.
o Short explainer: “Names are added on your device using your calendar; nothing leaves your computer.”
o If a calendar event lacks names (portal-only), the line remains anonymized.

Settings
• Connections: Google / Microsoft status (Reconnect if permission expired), Zoom optional connect/disconnect.
• Policies: Assume it’s the same as last session or Ask the client for their State (one line); external attendee filter; attendee cap; calendars to watch.
• Allowed States: state checkboxes + PSYPACT toggle; quick buttons Check all / Uncheck all / PSYPACT-only.
• Includes “Outside U.S.” as a checkbox (disabled by default).
• Notes: Use the word Client globally; timestamp toggle; “Mention PSYPACT” toggle; template preview removed.
• Custom video patterns (Advanced): add a niche service by pasting one example link (https); one-time validation; then auto-wrap.
• Privacy & retention: “Keep session records for X years (default 7). If you delete a row, we keep a tiny deletion record so export totals reconcile.”
• Diagnostics: hidden by default; shown only in Support mode (Redirect speed test; Send last 10 wrapping logs — no PHI).
• About: App version, release notes, support contact.
• Org (optional): Users list; invite/remove; seat count; org-level defaults (Allowed States, Policies, Retention); per-user overrides.

Mobile dashboard specifics
• Can: view sessions, Copy logged note, Not a client, Acknowledge/Correct the State (set a different state) via a simple dialog.
• Cannot: run exports; see live banners (desktop-only).

9. Exports — Schema & Local Named Audit Pack

Local Named Audit Pack (only)
• Purpose: produce named audit exports without sending PHI to StateID servers.
• Flow (local): reuse your Google/Microsoft OAuth locally to fetch calendar events; join to ledger via meeting_ref + time; render PDF/CSV on device (WebCrypto temp); you save to disk.
• Output PDF includes header: “Declared scope at export time: Allowed [list]; PSYPACT: On/Off.”
• Exports include schema_version: 1.
CSV/PDF Columns (include Logged note)
• meeting_ref (calendar UID + start; opaque, non-PHI)
• attendee_slot_hash (stable hash; tenant-salted)
• status ? {verified,unverified,assumed_from_prior,provider_assigned}
• state (two-letter; includes DC/territories; “Outside U.S.” available)
• within_scope ? {true,false,unknown}
• timestamp_utc
• method ? {auto,self_declared,provider_assigned,assumed}
• self_declared_state (nullable)
• override_reason (nullable; e.g., clinician_override_out_of_scope, manual_state_assignment)
• override_timestamp_utc (nullable)
• note_text (Logged note)
• license_check_notes (e.g., allowed=[CT,NY,MA] psypact=false)
• geo_confidence (coarse)


### 06-chunk

Retention
• Default 7 years, encrypted at rest.
• Soft-deleted “non-client” events retain only a minimal deletion marker for 30 days, then purge.

10. Security & Privacy
• No PHI on server by default (MVP). Named exports are generated locally.
• No GPS / OS location prompts; network signals only.
• TLS everywhere; at-rest encryption; per-tenant salts for hashes.
• Minimal cookies; honor DNT; short retention for raw signals.
• US-region hosting; backups follow the same retention.
• Desktop stores OAuth tokens in OS keychain/DPAPI.
• Wrapper link security: HMAC-signed, short-TTL (meeting window), multi-use, destination-bound, known-scanner fingerprints ignored; https-only custom patterns with a one-time validation hop.
• A future HIPAA Track (server-side names; BAA) is optional post-MVP.
• Wrapper link signing keys are rotated on a schedule with a short backward-compatible grace window; tokens include a key identifier.
• Key rotation grace window: 24 hours.

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
• Failure handling shows only the minimal co


### 07-chunk

py specified (“Location not detected/captured”); low-confidence geo ? Unverified with normal options.
• Ask page records both auto-detected state (if any) and client-selected state (if any).
• “Not a client session — do not log” discards the event; if already saved, soft-delete and retain minimal deletion marker for 30 days.
• For every session with a resolved status, a Logged note is generated and stored; edits persist and appear in exports; edit history retained and viewable.
• Exports: only Named Audit Pack (local); named PDF/CSV produced on device; scope header present.
• Outlook/Google no-update emails: Patches do not generate attendee update emails across shared/delegated/resource calendars; any rare leak cases are documented.
• Series correctness: Editing a series vs. a single instance never duplicates or strips wraps; exceptions preserve the original destination URL in metadata.
• Desktop overlay safety: Banners never overlap Zoom/Teams/Meet mute/leave controls on macOS and Windows.
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


### 08-chunk

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


### 09-chunk

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
• Look for Video link, Telehealth URL, Meeting link, or Location in your appointment template.
• Common spots: Settings ? Appointments ? Templates or Client Communication ? Email/Text Templates.
Step 4 — For each service you selected
“Do you generate a new invite link for each new video-conference session, or use the same link every time for all your sessions?”
For each chosen service, show two checkboxes (pick one):
• ? New invite link each session (no further steps)
• ? Same link every time
When checked, show Your Join Link for that service with a Copy button and one line:
“To run StateID seamlessly in the background, paste this link wherever you usually put your video-conference invite link (for example: your client portal template, your email template, or your default room settings in Zoom/Meet/Teams). If that’s not possible, no worries—we’ll send a one-line manual verification at the start of your video conference.” [Help]
Help (collapsed; same guidance as above).
Step 5 — If we can’t auto-verify your client’s State
? Assume it’s the same as last session
? Ask the client for their State (one line)
Mobile host note (shown during onboarding):
“On desktop, you’ll be able to see your client’s State during the conference call. However, iOS/Android rules don’t allow for that on mobile phones. So StateID will silently verify and save your client’s State into your logs, which you can use for audits.”
Onboarding (Mobile)
• Same steps and wording as desktop.
• If setup was finished on desktop, mobile automatically shows your account as configured.
• If setup is incomplete, mobile resumes from where you left off.
• Real-time in-call notifications remain desktop-only in MVP.
Onboarding failure handling
• Editor rights check (exact copy):
“You are not an editor on this Calendar. That means StateID can’t verify your client’s State automatically in the background. To fix this, you can either request editor access on the calendar, or just allow manual overrides. Either will work fine. If you are granted Editor access in the future, StateID will update itself.”
We auto-reprobe access on app launch and every 24h; there’s also Recheck now.
(Implementation rules—part of MVP but not surfaced to users: we only work with events you already create; we never create new invites or send attendee updates; read-only ICS feeds cannot be rewritten.)


### 10-chunk

5. Core Behavior
5.1 Calendar Auto-Rewrite (primary path) + Background Backstops
• Google: Calendar API watch ? server rewrite of body/location; store original join URL in event extendedProperties (rollback-safe).
• Outlook: Microsoft Graph subscription ? server rewrite of body/location; store original in extended properties.
• Parse Location/Description/ICS for supported join URLs (Zoom/Meet/Teams/Webex/Doxy/VSee/Doximity/RingCentral/BlueJeans/etc.).
• Replace visible join URL with a StateID wrapper (looks normal to clients).
• Preserve full destination URL (all query params/tokens) and store original in event metadata.
Timing & attendee updates (final policy)
We aim to land the rewrite pre-send. If an invite already went, MVP does not send attendee update emails (maximum invisibility). In those edge cases, therapists see carry-forward or Ask at session time; ledger remains compliant.
Backstops (background-only; no therapist action)
• Zoom (when connected):
o Prepend one ultra-short verify line to the meeting agenda/description via API (flows into Zoom emails/ICS).
o If verification is still missing at host start, quietly add the short verify link to the Waiting Room message.
• Teams: Add one ultra-short verify line at the top of the Outlook event body (appears in Teams in-call Details).
• Meet: Calendar rewrite places the wrapper in the event Description, which shows in in-call Meeting details.
How invites reach clients (covered)
• Calendar-sent emails/SMS (Google/Outlook): rewritten body ? wrapped link delivered.
• Zoom-sent emails: if Connect Zoom is enabled, our agenda line appears there too; otherwise rely on calendar emails (common today).
• Portal-only flows (no visible URL): handled via Your Join Link (if using a fixed room) or the therapist banner (Ask / Mark / Acknowledge).
• Static room per therapist: Your Join Link routes all clicks through StateID.
Performance budget
• Client click budget ~100–200 ms. If exceeded or any error: fail open (immediate redirect to original); server performs 3–5 background retries.
• Multiple links priority: Location field takes precedence over Description; within a field the order is Zoom ? Teams ? Meet ? Webex ? registry ? custom. Wrap the first match only.
• Idempotence key for series/exceptions: (calendarId, eventId, occurrenceStartUtc, urlFingerprint).
• Zoom Waiting Room message: best-effort / account-dependent (non-blocking).
5.2 Verification & Status (therapist-visible) — If/Then with Scope
If auto-detect captures a confident state within the click budget
? Show: Verified ? — {{STATE}}
? Scope outcome: evaluate against Allowed States + PSYPACT + “Outside U.S.” rule
?• If in-scope: no banner.
?• If out-of-scope: show Out-of-scope banner: Client may be in {STATE} — outside your allowed states. Actions: Acknowledge · Correct the State (opens state picker; sets Provider Assigned).
? Actions: none required (normal UI only).
? Ledger (immediate): status=verified, method=auto, state={{STATE}}, within_scope={true|false}.
Else if policy = Assume and there is a prior verified state within the cap (see §5.4)
? Show: Assumed (from prior) — {{STATE}} with the carry-forward toast (§7.3).
? Scope outcome: same evaluation as above
?• If in-scope: no banner (toast only).
?• If out-of-scope: show Out-of-scope banner with Acknowledge · Correct the State (equivalent to entering a new state; sets Provider Assigned).
? Actions: Approve (keep assumption) · Enter Client’s current State (opens dropdown).
? Loggi


### 11-chunk

ng (no-action guarantee): as soon as the toast is shown, write a ledger row: status=assumed_from_prior, method=assumed, state={{STATE}}, within_scope={true|false}.
? Ledger when Approved: status=assumed_from_prior, method=assumed.
? Ledger if Enter is used (or “Correct the State” from the banner): status=provider_assigned, method=provider_assigned, state={{NEW_STATE}} (history preserved; scope re-evaluated).
Else if the therapist manually selects a state (no auto/self-declared available yet)
? Show: Provider Assigned — {{STATE}}
? Scope outcome: evaluate and, if out-of-scope, show banner with Acknowledge · Correct the State (may pick a different state).
? Actions: may change state later; normal out-of-scope rules apply.
? Ledger (immediate): status=provider_assigned, method=provider_assigned, state={{STATE}}, within_scope={true|false}.
Else (no verification captured yet)
? Show: Unverified- No known State with the Ask banner (§7.4).
? Actions (banner): Ask Client for State (1-click Copy) · Assign a State (opens picker) · Assume State from Prior Session (if available within cap) · Acknowledge & Dismiss.
? Logging (no-action guarantee): when the Ask banner is shown, write a ledger row immediately: status=unverified, within_scope=unknown (no method yet).
? If Assign a State is used: update to status=provider_assigned, method=provider_assigned, state={{STATE}} and evaluate scope (show banner if out-of-scope).
? If Assume State from Prior Session is used (within cap): update to status=assumed_from_prior, method=assumed, state={{PRIOR_STATE}} and evaluate scope.
? When the client uses the Ask link and confirms: flip UI to Verified — {{STATE}}; set method=self_declared; evaluate scope.
? Tie-breaker: if both auto and self-declared exist and disagree, status uses auto; self_declared_state is still saved for export.
Export-only fields (unchanged):
method ? {auto, self_declared, provider_assigned, assumed}; self_declared_state (nullable).
5.3 License Scope (Allowed States check)
• Every Verified result checked against Allowed States (+ PSYPACT).
o In-scope: silent success.
o Out-of-scope: show small warning banner (see §7).
• Outside U.S. evaluates out-of-scope unless explicitly allowed in Settings.
• If PSYPACT is enabled, PSYPACT-member states are treated as in-scope even if not individually checked in Allowed States.
5.4 Failure Handling (no verification yet)
Keep it minimal to stay invisible.
Low-confidence geo: treat as Unverified and show the normal options.
Policy A — Assume it’s the same as last session
Toast (exact copy):
StateID: Location not detected. Defaulted to last known State (CT) (12 days ago).
Approve · Enter Client’s current State
• Approve: keep default; ledger = Assumed from prior.
• Enter Client’s current State: dropdown ? ledger = Unverified (provider-assigned).
Policy B — Ask me each time
Banner (exact copy):
StateID: Location not captured.
Ask client for State · Mark same State as last session (CT) · Mark New State… · Acknowledge & dismiss
• Ask (1-click copy): popup shows Copy (single-line or per-attendee block when emails known). Tiny hint to paste into chat.
• Client taps; StateID verifies and silently returns them to the call; UI flips to Verified.
Group sessions
• Single banner with per-attendee chips when emails are present; header “StateID: 1 of 3 verified”; chips update live.
• One Ask covers all pending attendees.
• If no attendee emails (portal-only), show session-level status (no chips).
• When attendee emails


### 12-chunk

exist, Ask provides per-attendee short links (one block to copy). If a single broadcast link is pasted, the Ask page prompts the client to confirm their email to map correctly.
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
• Desktop (primary): Full dashboard inside desktop app or browser.
• Mobile web (light): Read-only + safe actions; no expo


### 13-chunk

rts; no live banners.
Navigation
• Sessions (default) • Exports • Settings • Org (if enabled) • Help
(Admin-only Health panel is hidden from non-admins.)
Sessions (Ledger)
• Columns: Date/Time • Platform • Status • State • Within scope • Method (auto/self-declared/provider-assigned/assumed) • Logged note • Actions
• Actions: Edit note (desktop), Not a client — do not log, Copy logged note
• Filters: date range, status, state, within scope, platform, “suppressed (non-client)”.
Exports
• Named Audit Pack (local, on your computer) — the export.
o Merges calendar names locally; outputs named PDF/CSV; no PHI leaves device.
o Short explainer: “Names are added on your device using your calendar; nothing leaves your computer.”
o If a calendar event lacks names (portal-only), the line remains anonymized.
Settings
• Connections: Google / Microsoft status (Reconnect if permission expired), Zoom optional connect/disconnect.
• Policies: Assume it’s the same as last session or Ask the client for their State (one line); external attendee filter; attendee cap; calendars to watch.
• Allowed States: state checkboxes + PSYPACT toggle; quick buttons Check all / Uncheck all / PSYPACT-only.
• Includes “Outside U.S.” as a checkbox (disabled by default).
• Notes: Use the word Client globally; timestamp toggle; “Mention PSYPACT” toggle; template preview removed.
• Custom video patterns (Advanced): add a niche service by pasting one example link (https); one-time validation; then auto-wrap.
• Privacy & retention: “Keep session records for X years (default 7). If you delete a row, we keep a tiny deletion record so export totals reconcile.”
• Diagnostics: hidden by default; shown only in Support mode (Redirect speed test; Send last 10 wrapping logs — no PHI).
• About: App version, release notes, support contact.
• Org (optional): Users list; invite/remove; seat count; org-level defaults (Allowed States, Policies, Retention); per-user overrides.
Mobile dashboard specifics
• Can: view sessions, Copy logged note, Not a client, Acknowledge/Correct the State (set a different state) via a simple dialog.
• Cannot: run exports; see live banners (desktop-only).

9. Exports — Schema & Local Named Audit Pack
Local Named Audit Pack (only)
• Purpose: produce named audit exports without sending PHI to StateID servers.
• Flow (local): reuse your Google/Microsoft OAuth locally to fetch calendar events; join to ledger via meeting_ref + time; render PDF/CSV on device (WebCrypto temp); you save to disk.
• Output PDF includes header: “Declared scope at export time: Allowed [list]; PSYPACT: On/Off.”
• Exports include schema_version: 1.
CSV/PDF Columns (include Logged note)
• meeting_ref (calendar UID + start; opaque, non-PHI)
• attendee_slot_hash (stable hash; tenant-salted)
• status ? {verified,unverified,assumed_from_prior,provider_assigned}
• state (two-letter; includes DC/territories; “Outside U.S.” available)
• within_scope ? {true,false,unknown}
• timestamp_utc
• method ? {auto,self_declared,provider_assigned,assumed}
• self_declared_state (nullable)
• override_reason (nullable; e.g., clinician_override_out_of_scope, manual_state_assignment)
• override_timestamp_utc (nullable)
• note_text (Logged note)
• license_check_notes (e.g., allowed=[CT,NY,MA] psypact=false)
• geo_confidence (coarse)
Retention
• Default 7 years, encrypted at rest.
• Soft-deleted “non-client” events retain only a minimal deletion marker for 30 days, then purge.

10. Security & Privacy
• No PHI on server by default (MVP). Named exports are generated locally.
• No GPS / OS location prompts; network signals only.
• TLS everywhere; at-rest encryption; per-tenant salts for hashes.
• Minimal cookies; honor DNT; short retention for raw signals.
• US-region hosting; backups follow the same retention.
• Desktop stores OAuth tokens in OS keychain/DPAPI.
• Wrapper link security: HMAC-signed, short-TTL (meeting window), multi-use, destination-bound, known-scanner fingerprints ignored; https-only custom patterns with a one-time validation hop.
• A future HIPAA Track (server-side names; BAA) is optional post-MVP.
• Wrapper link signing keys are rotated on a schedule with a short backward-compatible grace window; tokens include a key identifier.
• Key rotation grace window: 24 hours.


### 14-chunk

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


### 15-chunk

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
• Feature flags / kill switches per connector (e.g., disable Zoom Waiting Room backstop).
• Observability SLOs: track p50/p95 latency, fail-open %, background success %, rewrite idempotence hits.
• Build a small support labeling tool for overlapping-meeting disambiguation ground truth.


### 16-chunk

17. Day-in-the-life (after setup)
Clinician creates an appointment as usual (Google/Outlook; or Zoom creates it).
StateID quietly wraps the join link. If Zoom is connected, we also set a tiny agenda line (and, only if needed, a Waiting-Room link); Teams shows a tiny line in Details.
Client taps the invite at session time.
Our edge runs the near-instant check (~0.1–0.2s) and deep-links/302s to Zoom/Meet. If it would take longer, we fail open and finish in the background.
In the desktop app, the clinician sees:
Verified, or Out-of-scope (Acknowledge/Correct the State), or—if detection failed—either the Assume toast or the Ask banner.
Later (or monthly), they open Exports and generate the Named Audit Pack (local) for an insurer/board.

