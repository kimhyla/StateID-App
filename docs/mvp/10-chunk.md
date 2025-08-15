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
