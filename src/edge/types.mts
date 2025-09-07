// src/edge/types.mts

// ---------- Base scalars ----------
export type IsoUtc = string;

/**
 * URL preservation:
 * We want a nominal “brand” to discourage accidental normalization,
 * but we must remain compatible with plain string usage in current code.
 * Using an *optional* brand makes plain strings still assignable.
 */
export type UrlString = string & { readonly __brand?: "UrlString" };

// ---------- Geo (richer but all optional beyond what worker uses) ----------
export type GeoResult = {
  // Minimal fields current worker may use:
  state?: string;               // Two-letter (e.g., "CT"), or undefined if unknown
  confidence?: number;          // 0.0–1.0 (optional—many providers don’t return a calibrated score)
  provider?: string;            // "A" | "B" | custom
  notes?: string;

  // Optional, coarse, non-PII envelope:
  ip?: string;                  // Canonical client IP as seen at edge
  country?: string;             // ISO 3166-1 alpha-2 (e.g., "US")
  region?: string;              // Subdivision/State (e.g., "CT", "CA")
  city?: string;
  tz?: string;                  // IANA tz (e.g., "America/New_York")
  lat?: number;                 // Approx degrees
  lon?: number;                 // Approx degrees
  accuracyRadiusKm?: number;
  asn?: number;                 // Autonomous System Number
  org?: string;                 // Network/ASN org (non-PII)
  source?: "cloudflare" | "fastly" | "vercel" | "maxmind" | "ip2location" | "unknown";
};

// ---------- Meeting window (add grace; keep names used by current code) ----------
export type MeetingWindow = {
  startUtc: IsoUtc;             // ISO timestamp
  endUtc?: IsoUtc;              // Optional ISO; if missing use start+12h
  graceUntilUtc?: IsoUtc;       // Optional rotation grace bound
};

// ---------- Wrapper token (keep existing fields; add optional timing/idempotency/meta) ----------
export type WrapperTokenPayload = {
  sessionId: string;            // Opaque; no PHI
  clickId: string;              // Unique per attempt
  meeting: MeetingWindow;       // Defines TTL window
  destinationUrl: UrlString;    // Full destination URL (preserve all params verbatim)
  createdAtUtc: IsoUtc;         // Token issue time
  keyId: string;                // Rotation key identifier

  /**
   * TTL precedence (clarity for evaluators):
   * - If present, expEpochSec is the cryptographic upper bound for validity.
   * - Meeting window MUST also be respected; expEpochSec should be <= meeting.endUtc.
   * - graceUntilUtc allows post-rotation verification within a narrow window.
   */
  iatEpochSec?: number;         // issued at (epoch seconds)
  nbfEpochSec?: number;         // not before (epoch seconds)
  expEpochSec?: number;         // expires at (epoch seconds)

  // Optional idempotency + tiny metadata map (non-PHI):
  idem?: string;                // idempotency key for wrap/retry safety
  state?: string;               // opaque tiny state (non-PHI)
  meta?: Record<string, string | number | boolean | null>;

  // Optional coarse geo captured at wrap time:
  geo?: GeoResult;
};

// ---------- Redirect context ----------
export type RedirectContext = {
  request: Request;
  env: EnvBindings;
  waitUntil: (p: Promise<any>) => void;
  now: () => number;            // perf.now() in ms
};

// ---------- Env bindings (keep current, add policy knobs as optional) ----------
export type EnvBindings = {
  // Secrets & runtime — used by current code:
  SIGNING_KEYS_JSON: string;        // JSON: { "active":"k2", "keys": { "k1":"base64", "k2":"base64" } }

  // Time/rotation knobs
  KEY_GRACE_HOURS?: string | number;            // default 24 (legacy hours knob still honored)
  KEY_GRACE_SECONDS?: string | number;          // rotation grace window (seconds)
  TIME_SKEW_SECONDS?: string | number;          // clock drift tolerance (seconds)
  WINDOW_START_BUFFER_SECONDS?: string | number; // how early before startUtc tokens may be valid (default 3600)

  // Redirect SLA knob
  REDIRECT_BUDGET_MS?: string | number;         // p95 budget for fail-open (ms)

  // Policy knobs
  DEFAULT_TTL_SECONDS?: string | number;        // e.g., "900" (short TTL)
  ALLOWED_HOSTS?: string;                       // CSV whitelist, e.g. "zoom.us,teams.microsoft.com"
  EXPECTED_ISSUER?: string;                     // strict iss match (if your issuer is fixed)
  EXPECTED_AUDIENCE?: string;                   // strict aud match (if used)
  KNOWN_SCANNERS_JSON?: string;                 // JSON array of UA substrings to ignore
  DEBUG_VERBOSE?: "0" | "1";                    // opt-in debug (never log secrets/PHI)

  // KV / Queue (Cloudflare-ish stubs; optional for MVP)
  CLICKS_KV?: KVNamespace;      // For dedupe (sessionId+clickId)
  RETRY_QUEUE?: Queue;          // For background retries (optional)

  // Metrics/logs endpoints (optional)
  METRICS_URL?: string;
  LOGS_URL?: string;
};

// Minimal Cloudflare-ish types for TS
export type KVNamespace = {
  get(key: string): Promise<string | null>;
  put(key: string, val: string, opts?: any): Promise<void>;
};
export type Queue = { send<T>(msg: T): Promise<void> };

// ---------- Signature header & verification result ----------
export type SignatureAlg = "HMAC-SHA256" | "HMAC-SHA512";

export type SignatureHeader = {
  v: 1;
  alg: SignatureAlg;
  kid: string;                 // key id used
  ts: number;                  // signing timestamp (epoch seconds)
  exp: number;                 // header expiration (epoch seconds)
  macB64Url: string;           // base64url (no padding) MAC of canonical payload
};

/**
 * usedKey is aligned with rotation mental model.
 * - 'current'  => verified using the currently active key
 * - 'previous' => verified using the previous key (within grace)
 * - undefined  => none matched (invalid)
 */
export type SignatureVerificationResult = {
  valid: boolean;              // cryptographically valid HMAC?
  withinWindow: boolean;       // ts/exp/meeting/grace checks passed
  usedKey?: "current" | "previous";
  failOpen: boolean;           // true if passed through due to SLA protection
  reason?: string;             // non-sensitive diagnostic
};

// ---------- Explicit edge decision (optional helper type) ----------
export type EdgeDecision =
  | {
      action: "redirect";
      location: UrlString;     // MUST equal payload.destinationUrl verbatim
      preserveUrl: true;       // do not alter query/fragment/encoding
      headers?: Record<string, string>;
    }
  | {
      action: "pass";          // pass-through (fail-open or policy decision)
      failOpen?: boolean;      // mark SLA-driven pass-through
      reason?: string;
    };
