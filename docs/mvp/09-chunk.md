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
