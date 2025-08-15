17. Day-in-the-life (after setup)
Clinician creates an appointment as usual (Google/Outlook; or Zoom creates it).
StateID quietly wraps the join link. If Zoom is connected, we also set a tiny agenda line (and, only if needed, a Waiting-Room link); Teams shows a tiny line in Details.
Client taps the invite at session time.
Our edge runs the near-instant check (~0.1–0.2s) and deep-links/302s to Zoom/Meet. If it would take longer, we fail open and finish in the background.
In the desktop app, the clinician sees:
Verified, or Out-of-scope (Acknowledge/Correct the State), or—if detection failed—either the Assume toast or the Ask banner.
Later (or monthly), they open Exports and generate the Named Audit Pack (local) for an insurer/board.
