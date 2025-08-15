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
