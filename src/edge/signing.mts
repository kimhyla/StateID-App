// src/edge/signing.mts
// StateID HMAC signing & verification (MVP §16.1 / §16.4)
// - Dual API: legacy (std base64) + header (base64url, explicit ts/exp)
// - ESM-compatible imports (.mjs) and Node 22 / Workers WebCrypto
//
// Key points implemented here:
// 1) Meeting cap: if endUtc exists → cap at endUtc (no +12h). If no end → default start+12h.
// 2) Grace: honor MeetingWindow.graceUntilUtc by taking min(envGrace, timeUntilGrace).
// 3) Key classification: restrict try-order to [header.kid, active] only.
// 4) Start buffer: WINDOW_START_BUFFER_SECONDS (default 3600) for start−buffer policy.
//
// NOTE: Legacy verifyPayload() performs no temporal checks — do not rely on it for allow/deny.
// Prefer verifyPayloadHeader() for security decisions.

import type {
  WrapperTokenPayload,
  EnvBindings,
  MeetingWindow,
  SignatureHeader,
  SignatureVerificationResult,
  SignatureAlg,
} from "./types.mjs";

// ============================================================================
// LEGACY API (compat layer)
// ============================================================================

/** Sign payload with payload.keyId. Returns standard base64 MAC string (legacy). */
export async function signPayload(
  payload: WrapperTokenPayload,
  env: EnvBindings
): Promise<string> {
  const { keys } = parseKeys(env.SIGNING_KEYS_JSON);
  const b64 = keys[payload.keyId];
  if (!b64) throw new Error(`Signing key not found for keyId=${payload.keyId}`);
  const key = await importHmacKey(b64, "HMAC-SHA256");
  const text = canonicalize(payload);
  const macB64Url = await hmacToBase64Url(key, text);
  return b64urlToStd(macB64Url); // legacy API returns standard base64
}

/**
 * Legacy verification: MAC-only boolean check (no time/window/grace checks).
 * ⚠️ Do not use for security decisions; use verifyPayloadHeader() instead.
 */
export async function verifyPayload(
  payload: WrapperTokenPayload,
  signatureStdB64: string,
  env: EnvBindings
): Promise<boolean> {
  const { active, keys } = parseKeys(env.SIGNING_KEYS_JSON);
  const tryIds = dedupe([payload.keyId, active]); // conservative
  const text = canonicalize(payload);
  const signatureUrl = stdToB64url(signatureStdB64);

  for (const kid of tryIds) {
    const keyB64 = keys[kid];
    if (!keyB64) continue;
    const key = await importHmacKey(keyB64, "HMAC-SHA256");
    const macB64Url = await hmacToBase64Url(key, text);
    if (timingSafeEq(macB64Url, signatureUrl)) return true;
  }
  return false;
}

// ============================================================================
// HEADER API (preferred)
// ============================================================================

/** Create a SignatureHeader (base64url MAC) using the ACTIVE key. */
export async function signPayloadHeader(
  payload: WrapperTokenPayload,
  env: EnvBindings,
  now: Date = new Date(),
  alg: SignatureAlg = "HMAC-SHA256",
): Promise<SignatureHeader> {
  const { active, keys } = parseKeys(env.SIGNING_KEYS_JSON);
  const keyB64 = keys[active];
  if (!keyB64) throw new Error(`Active signing key '${active}' not found`);

  const key = await importHmacKey(keyB64, alg);
  const ts = epochSec(now);
  const exp = computeHeaderExpEpochSec(payload.meeting, payload.expEpochSec);

  const text = canonicalize(payload);
  const macB64Url = await hmacToBase64Url(key, text);
  return { v: 1, alg, kid: active, ts, exp, macB64Url };
}

/**
 * Verify payload + header:
 * - Validates ts/exp with skew, meeting start buffer, and end cap
 * - Verifies MAC with either header.kid or active key
 * - Enforces rotation grace (min of env grace and meeting.graceUntilUtc, if present)
 */
export async function verifyPayloadHeader(
  payload: WrapperTokenPayload,
  header: SignatureHeader,
  env: EnvBindings,
  now: Date = new Date(),
): Promise<SignatureVerificationResult> {
  // Basic header fields
  if (!header || typeof header !== "object") return fail("missing_header");
  if (header.v !== 1) return fail("bad_version");
  if (header.alg !== "HMAC-SHA256" && header.alg !== "HMAC-SHA512") return fail("bad_alg");
  if (!header.kid || !header.macB64Url || !Number.isFinite(header.ts) || !Number.isFinite(header.exp)) {
    return fail("invalid_header_fields");
  }

  const skewSec = parseNumber(env.TIME_SKEW_SECONDS ?? "30", 30);
  const nowSec = epochSec(now);

  // ts must not be in the future beyond skew
  if (header.ts > nowSec + skewSec) return fail("ts_in_future");

  // Meeting window bounds (start−buffer … end cap)
  const startBufSec = parseNumber(env.WINDOW_START_BUFFER_SECONDS ?? "3600", 3600); // default 60m
  const windowStart = computeMeetingWindowStartEpochSec(payload.meeting, startBufSec);
  const windowEnd = computeMeetingWindowEndEpochSec(payload.meeting);

  // Header exp may not exceed meeting window cap
  if (header.exp > windowEnd) return fail("exp_exceeds_meeting_window");

  // Not yet valid (before start−buffer), allow small positive skew
  if (nowSec + skewSec < windowStart) return fail("not_yet_valid");

  // Expired (after exp), allow small negative skew
  if (nowSec - skewSec > header.exp) return fail("expired");

  // Keys & rotation
  const { active, keys } = parseKeys(env.SIGNING_KEYS_JSON);
  const tryOrder = dedupe([header.kid, active]); // stricter: only header kid or active
  const graceSec = deriveGraceSeconds(env, payload.meeting, nowSec);

  const text = canonicalize(payload);
  for (const kid of tryOrder) {
    const k = keys[kid];
    if (!k) continue;
    const key = await importHmacKey(k, header.alg);
    const mac = await hmacToBase64Url(key, text);
    if (timingSafeEq(mac, header.macB64Url)) {
      const usedKey = (kid === active ? "current" : "previous") as SignatureVerificationResult["usedKey"];
      if (usedKey === "previous" && nowSec > header.exp + graceSec) {
        return { valid: false, withinWindow: true, usedKey, failOpen: false, reason: "rotation_grace_exceeded" };
      }
      return { valid: true, withinWindow: true, usedKey, failOpen: false };
    }
  }

  return { valid: false, withinWindow: true, failOpen: false, reason: "bad_mac" };

  function fail(reason: string): SignatureVerificationResult {
    return { valid: false, withinWindow: false, failOpen: false, reason };
  }
}

// ============================================================================
// Utilities
// ============================================================================

/** Deterministic JSON stringify (recursively sorts object keys). */
function canonicalize(value: unknown): string {
  return JSON.stringify(value, replacerSorted, 0);
}
function replacerSorted(this: any, _key: string, value: unknown): unknown {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    const sorted = Object.keys(obj).sort();
    const out: Record<string, unknown> = {};
    for (const k of sorted) out[k] = obj[k];
    return out;
  }
  return value;
}

/** Import an HMAC key (base64 -> CryptoKey) with selected algorithm. */
async function importHmacKey(
  b64: string,
  alg: "HMAC-SHA-256" | "HMAC-SHA256" | "HMAC-SHA512"
): Promise<CryptoKey> {
  const hash = alg === "HMAC-SHA512" ? "SHA-512" : "SHA-256"; // tolerate "HMAC-SHA-256"
  const raw = base64ToBytes(b64);
  return crypto.subtle.importKey("raw", raw, { name: "HMAC", hash }, false, ["sign", "verify"]);
}

/** Compute header.exp (epoch sec), capped at meeting window bound. */
function computeHeaderExpEpochSec(meeting: MeetingWindow, payloadExp?: number): number {
  const windowEnd = computeMeetingWindowEndEpochSec(meeting);
  return Math.min(payloadExp ?? windowEnd, windowEnd);
}

/** Meeting START = startUtc − bufferSeconds. */
export function computeMeetingWindowStartEpochSec(meeting: MeetingWindow, bufferSeconds: number): number {
  const startMs = new Date(meeting.startUtc).getTime() - Math.max(0, bufferSeconds) * 1000;
  return Math.floor(startMs / 1000);
}

/**
 * Meeting END cap:
 * - If endUtc provided → cap at endUtc (no automatic +12h).
 * - If missing → default to start+12h (policy).
 */
export function computeMeetingWindowEndEpochSec(meeting: MeetingWindow): number {
  const startMs = new Date(meeting.startUtc).getTime();
  const endMs = meeting.endUtc
    ? new Date(meeting.endUtc as string).getTime() // no +12h when end provided
    : startMs + 12 * 60 * 60_000;                  // default when end missing
  return Math.floor(endMs / 1000);
}

/**
 * Rotation grace (seconds):
 * - Start from env (KEY_GRACE_SECONDS or KEY_GRACE_HOURS default 24h).
 * - If meeting.graceUntilUtc present → compute seconds until that time from nowSec
 *   and take the MIN of envGrace and meetingGrace.
 */
function deriveGraceSeconds(env: EnvBindings, meeting?: MeetingWindow, nowSec?: number): number {
  const explicitSec = env.KEY_GRACE_SECONDS != null ? parseNumber(env.KEY_GRACE_SECONDS, NaN) : NaN;
  const envGrace = Number.isFinite(explicitSec) && explicitSec >= 0
    ? explicitSec
    : Math.max(0, Math.floor(parseNumber(env.KEY_GRACE_HOURS ?? "24", 24) * 3600));

  if (!meeting?.graceUntilUtc || nowSec == null) return envGrace;

  const untilMs = new Date(meeting.graceUntilUtc).getTime() - nowSec * 1000;
  const meetingGrace = Math.max(0, Math.floor(untilMs / 1000));
  return Math.min(envGrace, meetingGrace);
}

function parseNumber(val: unknown, dflt: number): number {
  if (typeof val === "number" && Number.isFinite(val)) return val;
  if (typeof val === "string") {
    const n = Number(val);
    return Number.isFinite(n) ? n : dflt;
  }
  return dflt;
}

function dedupe<T>(arr: T[]): T[] {
  const out: T[] = [];
  const seen = new Set<T>();
  for (const x of arr) { if (x == null || seen.has(x)) continue; seen.add(x); out.push(x); }
  return out;
}

function epochSec(d: Date): number { return Math.floor(d.getTime() / 1000); }

// ----- Base64 helpers -----

function base64ToBytes(b64: string): Uint8Array {
  if (typeof atob === "function") {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  return new Uint8Array(Buffer.from(b64, "base64"));
}

function bytesToBase64Url(bytes: Uint8Array): string {
  const b64 = typeof btoa === "function"
    ? (() => { let bin = ""; for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]); return btoa(bin); })()
    : Buffer.from(bytes).toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64urlToStd(b64u: string): string {
  const pad = b64u.length % 4 === 2 ? "==" : b64u.length % 4 === 3 ? "=" : "";
  return b64u.replace(/-/g, "+").replace(/_/g, "/") + pad;
}
function stdToB64url(b64: string): string {
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

// ----- Keys helper -----

/**
 * Parse SIGNING_KEYS_JSON.
 * Accepts either:
 *  - {"active":"k2","keys":{"k1":"base64","k2":"base64"}}
 *  - {"k1":"base64","k2":"base64"} (fallback shape; first key becomes active)
 */
function parseKeys(json?: string): { active: string; keys: Record<string, string> } {
  if (!json) return { active: "k1", keys: {} };
  let parsed: any;
  try { parsed = JSON.parse(json); } catch { throw new Error("Invalid SIGNING_KEYS_JSON (not JSON)"); }
  if (parsed && typeof parsed === "object" && parsed.keys && typeof parsed.keys === "object") {
    const keys = parsed.keys as Record<string, string>;
    const active = typeof parsed.active === "string" ? parsed.active : Object.keys(keys)[0] ?? "k1";
    return { active, keys };
  }
  if (parsed && typeof parsed === "object") {
    const keys = parsed as Record<string, string>;
    const first = Object.keys(keys)[0] ?? "k1";
    return { active: first, keys };
  }
  throw new Error("Invalid SIGNING_KEYS_JSON (unexpected shape)");
}

async function hmacToBase64Url(key: CryptoKey, text: string): Promise<string> {
  const enc = new TextEncoder();
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(text));
  return bytesToBase64Url(new Uint8Array(sig));
}

function timingSafeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
