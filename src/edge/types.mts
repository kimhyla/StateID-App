export type UrlString = string & { readonly __brand: "UrlString" };

export interface MeetingWindow {
  startUtc: string;
  endUtc?: string;
  graceUntilUtc?: string;
}

export interface WrapperTokenPayload {
  keyId: string;
  meeting: MeetingWindow;
  dest?: string;
  d?: string;
  url?: string;
  expEpochSec?: number;
  [k: string]: unknown;
}

export interface EnvBindings {
  SIGNING_KEYS_JSON?: string;

  TIME_SKEW_SECONDS?: string | number;
  WINDOW_START_BUFFER_SECONDS?: string | number;

  KEY_GRACE_SECONDS?: string | number;
  KEY_GRACE_HOURS?: string | number;

  REDIRECT_BUDGET_MS?: string | number;
  ALLOWED_HOSTS?: string;
}

export type SignatureAlg = "HMAC-SHA256" | "HMAC-SHA512";

export interface SignatureHeader {
  v: 1;
  alg: SignatureAlg;
  kid: string;
  ts: number;
  exp: number;
  macB64Url: string;
}

export interface SignatureVerificationResult {
  valid: boolean;
  withinWindow: boolean;
  failOpen: boolean;
  reason?: string;
  usedKey?: "current" | "previous";
}

export interface GeoResult {
  ip: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  tz: string | null;
  asn: string | null;
  org: string | null;
  source: "cloudflare" | "unknown";
}
