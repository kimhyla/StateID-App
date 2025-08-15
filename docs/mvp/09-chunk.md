ealth URL, Meeting link, or Location in your appointment template.
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
• Zoom-sent emails: if Connect Zoom is enabled, our agenda line appears ther
