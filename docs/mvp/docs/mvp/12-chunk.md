lowed states.
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
• tim
