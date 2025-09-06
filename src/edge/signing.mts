import type {
  WrapperTokenPayload,
  EnvBindings,
  MeetingWindow,
  SignatureHeader,
  SignatureVerificationResult,
} from "./types.mjs";

// ============================================================================
// LEGACY API (compat layer)
// ============================================================================
export async function signPayload(payload: WrapperTokenPayload, env: EnvBindings): Promise<string> {
  const { keys } = parseKeys(env.SIGNING_KEYS_JSON);
  const b64 = keys[payload.keyId];
  if (!b64) throw new Error(`Signing key not found for keyId=${payload.keyId}`);
  const key = await importHmacKey(b64, "HMAC-SHA256");
  const text = canonicalize(payload);
  const macB64Url = await hmacToBase64Url(key, text);
  return b64urlToStd(macB64Url);
}

export async function verifyPayload(payload: WrapperTokenPayload, signatureStdB64: string, env: EnvBindings): Promise<boolean> {
  const { active, keys } = parseKeys(env.SIGNING_KEYS_JSON);
  const tryIds = dedupe([payload.keyId, active, ...Object.keys(keys)]);
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
export async function signPayloadHeader(
  payload: WrapperTokenPayload,
  env: EnvBindings,
  now: Date = new Date(),
  alg: "HMAC-SHA256" | "HMAC-SHA512" = "HMAC-SHA256",
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

export async function verifyPayloadHeader(
  payload: WrapperTokenPayload,
  header: SignatureHeader,
  env: EnvBindings,
  now: Date = new Date(),
): Promise<SignatureVerificationResult> {
  if (!header || typeof header !== "object") return fail("missing_header");
  if (header.v !== 1) return fail("bad_version");
  if (header.alg !== "HMAC-SHA256" && header.alg !== "HMAC-SHA512") return fail("bad_alg");
  if (!header.kid || !header.macB64Url || !Number.isFinite(header.ts) || !Number.isFinite(header.exp)) {
    return fail("invalid_header_fields");
  }

  const skewSec = parseNumber(env.TIME_SKEW_SECONDS ?? "30", 30);
  const nowSec = epochSec(now);

  if (header.ts > nowSec + skewSec) return fail("ts_in_future");

  const startBufSec = parseNumber(env.WINDOW_START_BUFFER_SECONDS ?? "3600", 3600);
  const windowStart = computeMeetingWindowStartEpochSec(payload.meeting, startBufSec);
  const windowEnd = computeMeetingWindowEndEpochSec(payload.meeting);

  if (header.exp > windowEnd) return fail("exp_exceeds_meeting_window");
  if (nowSec + skewSec < windowStart) return fail("not_yet_valid");
  if (nowSec - skewSec > header.exp) return fail("expired");

  const { active, keys } = parseKeys(env.SIGNING_KEYS_JSON);
  const tryOrder = dedupe([header.kid, active]);
  const graceSec = deriveGraceSeconds(env, payload.meeting, nowSec);

  const text = canonicalize(payload);
  for (const kid of tryOrder) {
    const k = keys[kid];
    if (!k) continue;
    const key = await importHmacKey(k, header.alg);
    const mac = await hmacToBase64Url(key, text);
    if (timingSafeEq(mac, header.macB64Url)) {
      const usedKey = kid === active ? "current" : "previous" as SignatureVerificationResult["usedKey"];
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

// ===== Helpers =====
function canonicalize(value: unknown): string { return JSON.stringify(value, replacerSorted, 0); }
function replacerSorted(this: any, _k: string, v: unknown): unknown {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    const o = v as Record<string, unknown>, out: Record<string, unknown> = {};
    for (const k of Object.keys(o).sort()) out[k] = o[k];
    return out;
  }
  return v;
}
async function importHmacKey(b64: string, alg: "HMAC-SHA-256"|"HMAC-SHA256"|"HMAC-SHA512"): Promise<CryptoKey> {
  const hash = alg === "HMAC-SHA512" ? "SHA-512" : "SHA-256";
  const raw = base64ToBytes(b64);
  return crypto.subtle.importKey("raw", raw, { name: "HMAC", hash }, false, ["sign","verify"]);
}
function computeHeaderExpEpochSec(meeting: MeetingWindow, payloadExp?: number): number {
  const windowEnd = computeMeetingWindowEndEpochSec(meeting);
  return Math.min(payloadExp ?? windowEnd, windowEnd);
}
export function computeMeetingWindowStartEpochSec(meeting: MeetingWindow, bufferSeconds: number): number {
  const startMs = new Date(meeting.startUtc).getTime() - Math.max(0, bufferSeconds) * 1000;
  return Math.floor(startMs / 1000);
}
export function computeMeetingWindowEndEpochSec(meeting: MeetingWindow): number {
  const startMs = new Date(meeting.startUtc).getTime();
  const endMs = meeting.endUtc ? new Date(meeting.endUtc).getTime() : startMs + 12 * 60 * 60_000;
  return Math.floor(endMs / 1000);
}
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
function parseNumber(v: unknown, dflt: number): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") { const n = Number(v); return Number.isFinite(n) ? n : dflt; }
  return dflt;
}
function dedupe<T>(arr: T[]): T[] { const out: T[] = []; const seen = new Set<T>(); for (const x of arr) { if (x==null||seen.has(x)) continue; seen.add(x); out.push(x);} return out; }
function epochSec(d: Date): number { return Math.floor(d.getTime()/1000); }
function base64ToBytes(b64: string): Uint8Array {
  if (typeof atob === "function") { const bin = atob(b64); const out = new Uint8Array(bin.length); for (let i=0;i<bin.length;i++) out[i]=bin.charCodeAt(i); return out; }
  return new Uint8Array(Buffer.from(b64,"base64"));
}
function bytesToBase64Url(bytes: Uint8Array): string {
  const b64 = typeof btoa === "function" ? (()=>{let s=""; for (let i=0;i<bytes.length;i++) s+=String.fromCharCode(bytes[i]); return btoa(s);})() : Buffer.from(bytes).toString("base64");
  return b64.replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");
}
function b64urlToStd(s: string): string { const pad = s.length%4===2?"==":s.length%4===3?"=":""; return s.replace(/-/g,"+").replace(/_/g,"/")+pad; }
function stdToB64url(s: string): string { return s.replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,""); }
function parseKeys(json?: string): { active: string; keys: Record<string,string> } {
  const obj = json ? JSON.parse(json) as Record<string,string> : {};
  const entries = Object.entries(obj);
  const active = entries.length ? entries[0][0] : "k1";
  return { active, keys: obj };
}
function timingSafeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
async function hmacToBase64Url(key: CryptoKey, text: string): Promise<string> {
  const enc = new TextEncoder();
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(text));
  return bytesToBase64Url(new Uint8Array(sig));
}
