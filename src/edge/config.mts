// src/edge/config.mts
import type { EnvBindings, MeetingWindow } from "./types.mjs";

/**
 * StateID — Edge Config (MVP)
 * - p95 budget: fail-open only when the redirect decision exceeds this time.
 * - Meeting window: allow up to 60m early; if no endUtc, treat as start+12h.
 * - Known scanners: helper to ignore link previewers (policy utility).
 */

// -----------------------------------------------------------
// Performance & retry policy
// -----------------------------------------------------------

/** Click-through p95 budget (milliseconds). Exceed → fail-open immediately. */
export const REDIRECT_BUDGET_MS = 200;

/**
 * Background retry backoff (milliseconds).
 * Keeps total well under ~3 minutes; tune as needed.
 */
export const RETRY_DELAYS_MS: Readonly<number[]> = Object.freeze([250, 750, 2000]);

// -----------------------------------------------------------
// Meeting window rules
// -----------------------------------------------------------

/** If no explicit end, treat meeting as start + 12 hours. */
export const DEFAULT_MEETING_LENGTH_HOURS = 12;

/** Allow tokens/verification starting 60 minutes before the scheduled start. */
export const WINDOW_EARLY_MINUTES = 60;

/**
 * True if `now` is within [start - startBufferSeconds, endCap].
 * - If `meeting.endUtc` is provided, the endCap is exactly `endUtc` (no +12h).
 * - If `meeting.endUtc` is missing, the endCap is `startUtc + DEFAULT_MEETING_LENGTH_HOURS`.
 *
 * NOTE: This checks only the window; key rotation grace / cryptographic expiry
 * are enforced in the signature verification layer.
 */
export function isWithinMeetingWindow(
  meeting: MeetingWindow,
  now: Date = new Date(),
  startBufferSeconds: number = 3600 // = WINDOW_EARLY_MINUTES
): boolean {
  const startMs =
    new Date(meeting.startUtc).getTime() - Math.max(0, startBufferSeconds) * 1000;
  const endMs = meeting.endUtc
    ? new Date(meeting.endUtc).getTime() // no +12h when end provided
    : new Date(meeting.startUtc).getTime() +
      DEFAULT_MEETING_LENGTH_HOURS * 60 * 60 * 1000;

  const t = now.getTime();
  return t >= startMs && t <= endMs;
}

// -----------------------------------------------------------
// Known link previewers/crawlers (policy utility)
// -----------------------------------------------------------

/**
 * Known link previewers/crawlers to ignore (e.g., 204 early exit).
 * Override/extend via EnvBindings.KNOWN_SCANNERS_JSON (JSON array of substrings).
 *
 * Example:
 *   env.KNOWN_SCANNERS_JSON = '["Slackbot","facebookexternalhit"]'
 */
export function getKnownScanners(env: EnvBindings): string[] {
  const fromEnv = safeParseStringArray(env.KNOWN_SCANNERS_JSON);
  return fromEnv ?? DEFAULT_SCANNERS;
}

/** Default short list; tuned for invisibility while avoiding false positives. */
const DEFAULT_SCANNERS: Readonly<string[]> = Object.freeze([
  "Slackbot",
  "Discordbot",
  "SkypeUriPreview",
  "facebookexternalhit",
  "Twitterbot",
  "WhatsApp",
  "Embedly",
  "Google-HTTP-Java-Client",
  "link-preview",
  "Bot",
  "Crawler",
]);

/** Robust JSON array-of-strings parser; returns undefined on any issue. */
function safeParseStringArray(input?: string): string[] | undefined {
  if (!input) return undefined;
  try {
    const parsed = JSON.parse(input);
    if (!Array.isArray(parsed)) return undefined;
    return parsed.map((v) => String(v)).filter((v) => v.length > 0);
  } catch {
    return undefined;
  }
}
