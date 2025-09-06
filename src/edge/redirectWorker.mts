import type {
  EnvBindings,
  WrapperTokenPayload,
  MeetingWindow,
  SignatureHeader,
  SignatureVerificationResult,
} from "./types.mjs";

import {
  isWithinMeetingWindow,
  REDIRECT_BUDGET_MS as CONFIG_REDIRECT_BUDGET_MS,
} from "./config.mjs";

import {
  verifyPayloadHeader,
  verifyPayload,
} from "./signing.mjs";

function nowMs(): number {
  // @ts-ignore
  return (typeof performance !== "undefined" && performance?.now)
    // @ts-ignore
    ? performance.now()
    : Date.now();
}

function parseIntOr<T extends number>(s: unknown, fallback: T): number {
  if (typeof s === "string" && s.trim() !== "") {
    const n = Number(s);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

/** Safer: strip fragments and stop at '#' — handles repeated params too. */
function getRawQueryParam(url: string, name: string): string | null {
  const q = url.split("#", 1)[0];
  const m = q.match(new RegExp(`[?&]${name}=([^&#]*)`));
  return m ? m[1] : null;
}

function normalizeDestForCheck(maybeUrl: string): string {
  try { return decodeURIComponent(maybeUrl); } catch { return maybeUrl; }
}

function hostAllowed(host: string, allowCsv?: string): boolean {
  if (!allowCsv) return true;
  const items = allowCsv.split(",").map(s => s.trim()).filter(Boolean);
  return items.some(pat => {
    if (pat.startsWith("*.")) {
      const suffix = pat.slice(1);
      return host.endsWith(suffix) && host !== suffix.slice(1);
    }
    return host === pat;
  });
}

function base64UrlToStd(b64u: string): string {
  const s = b64u.replace(/-/g, "+").replace(/_/g, "/");
  return s + "===".slice((s.length + 3) % 4);
}

function base64DecodeFlexibleToString(b64: string): string | null {
  try {
    const normalized = b64.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "===".slice((normalized.length + 3) % 4);
    const bin =
      typeof atob === "function"
        ? atob(padded)
        : Buffer.from(padded, "base64").toString("binary");
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  } catch { return null; }
}

function decodeJsonFromB64OrNull<T = unknown>(b64: string): T | null {
  const s = base64DecodeFlexibleToString(b64);
  if (s == null) return null;
  try { return JSON.parse(s) as T; } catch { return null; }
}

function parseHeaderFromSigParam(sigParam: string): SignatureHeader | null {
  const json = base64DecodeFlexibleToString(sigParam);
  if (!json) return null;
  try {
    const obj = JSON.parse(json);
    if (
      obj && typeof obj === "object" &&
      ("ts" in obj) && ("exp" in obj) &&
      ("macB64Url" in obj) &&
      (obj.alg === "HMAC-SHA256" || obj.alg === "HMAC-SHA512") &&
      obj.v === 1
    ) return obj as SignatureHeader;
  } catch {}
  return null;
}

function extractMeetingWindowFromPayload(payload: any): MeetingWindow | null {
  const candidate =
    payload?.meeting ??
    payload?.window ??
    (payload && (("startUtc" in payload) || ("endUtc" in payload) || ("graceUntilUtc" in payload)) ? payload : null);

  if (!candidate?.startUtc) return null;
  return {
    startUtc: String(candidate.startUtc),
    endUtc: candidate.endUtc ? String(candidate.endUtc) : undefined,
    graceUntilUtc: candidate.graceUntilUtc ? String(candidate.graceUntilUtc) : undefined,
  };
}

async function geoProbeStub(req: Request): Promise<Record<string, unknown>> {
  try {
    const cf: any = (req as any).cf;
    const ip =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      null;
    return {
      ip,
      country: cf?.country ?? null,
      region: cf?.region ?? null,
      city: cf?.city ?? null,
      tz: cf?.timezone ?? null,
      asn: cf?.asn ?? null,
      org: cf?.asOrganization ?? null,
      source: cf ? "cloudflare" : "unknown",
    };
  } catch { return {}; }
}

function getBudgetMs(env: EnvBindings): number {
  const override = parseIntOr((env as any)?.REDIRECT_BUDGET_MS, -1);
  return override > 0 ? override : CONFIG_REDIRECT_BUDGET_MS;
}

function response302VerbatimLocation(verbatimDest: string, extraHeaders?: Record<string, string>): Response {
  const headers = new Headers({ "Location": verbatimDest, "Cache-Control": "no-store", ...extraHeaders });
  return new Response(null, { status: 302, headers });
}

function response4xx(status: 400 | 401 | 403 | 404, code: string, msg: string, extra?: Record<string, string>): Response {
  const headers = new Headers({ "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8", "X-StateID": code, ...extra });
  return new Response(`${code}\n${msg}\n`, { status, headers });
}

export async function handleRedirectRequest(request: Request, env: EnvBindings): Promise<Response> {
  const t0 = nowMs();
  const budgetMs = getBudgetMs(env);
  const deadline = t0 + budgetMs;
  const overBudget = () => nowMs() > deadline;

  const maybeFailOpen = (verbatimDest: string): Response | null => {
    if (!overBudget()) return null;
    return response302VerbatimLocation(verbatimDest, { "X-StateID": "fail-open", "X-StateID-Why": "budget_exceeded" });
  };

  const url = new URL(request.url);

  if (!/^\/r(\/|$|\?)/.test(url.pathname)) return response4xx(404, "not_found", "Route not found.");

  const rawDest = getRawQueryParam(request.url, "d");
  if (!rawDest) return response4xx(400, "missing_dest", "Missing required query parameter: d");

  const foEarly = maybeFailOpen(rawDest);
  if (foEarly) return foEarly;

  const destForCheck = normalizeDestForCheck(rawDest);
  let hostForAudit = "invalid-url";
  try {
    const u = new URL(destForCheck);
    if (!/^https?:$/.test(u.protocol)) return response4xx(400, "invalid_scheme", "Only http/https destinations are allowed.");
    hostForAudit = u.hostname || "unknown";
  } catch { return response4xx(400, "invalid_dest", "Destination URL is malformed."); }

  const allowCsv = (env as any)?.ALLOWED_HOSTS as string | undefined;
  if (!hostAllowed(hostForAudit, allowCsv)) {
    return response4xx(400, "blocked_destination", "Destination host is not allowed by policy.", { "X-StateID-Host": hostForAudit });
  }

  const geoPromise = geoProbeStub(request);

  const sigParam = url.searchParams.get("sig") || "";
  const t = url.searchParams.get("t") || "";

  let payload: WrapperTokenPayload | Record<string, unknown> = {};
  if (t) {
    const parsed = decodeJsonFromB64OrNull<WrapperTokenPayload>(t);
    if (!parsed) return response4xx(400, "bad_payload_b64", "Payload base64 or JSON invalid.");
    payload = parsed;
  }

  const foBeforeVerify = maybeFailOpen(rawDest);
  if (foBeforeVerify) return foBeforeVerify;

  let verified = false;
  let method: "header" | "legacy" | "deny" = "deny";
  let verifyWhy = "";
  let usedKey: string | undefined;

  try {
    if (sigParam) {
      const hdr: SignatureHeader | null = parseHeaderFromSigParam(sigParam);
      if (hdr) {
        const headerRes: SignatureVerificationResult = await verifyPayloadHeader(payload as WrapperTokenPayload, hdr, env);
        if (headerRes?.valid) { verified = true; method = "header"; usedKey = headerRes.usedKey as string | undefined; }
        else { verifyWhy = headerRes?.reason || "header_verify_failed"; }
      } else { verifyWhy = "bad_sig_header_format"; }
    } else { verifyWhy = "missing_sig"; }
  } catch (err: any) { verifyWhy = `header_verify_exception:${err?.message ?? "error"}`; }

  if (!verified) {
    try {
      if (t && sigParam) {
        const legacySigStdB64 = base64UrlToStd(sigParam);
        const legacyOk = await verifyPayload(payload as WrapperTokenPayload, legacySigStdB64, env);
        if (legacyOk) {
          const legacyWin = extractMeetingWindowFromPayload(payload);
          if (legacyWin) {
            const within = isWithinMeetingWindow(legacyWin);
            if (within) { verified = true; method = "legacy"; }
            else { verifyWhy = "legacy_window_expired_or_not_yet_valid"; }
          } else { verifyWhy = "legacy_no_window_fields"; }
        } else { verifyWhy = "legacy_verify_failed"; }
      } else if (!sigParam) { verifyWhy = "missing_sig"; }
      else { verifyWhy = "missing_t"; }
    } catch (err: any) { verifyWhy = `legacy_verify_exception:${err?.message ?? "error"}`; }
  }

  if (verified) {
    try {
      const p: any = payload || {};
      const embeddedDest = p?.dest ?? p?.d ?? p?.url ?? null;
      if (embeddedDest) {
        const normalizedEmbedded = normalizeDestForCheck(String(embeddedDest));
        if (normalizedEmbedded !== destForCheck) { verified = false; method = "deny"; verifyWhy = "dest_mismatch"; }
      }
    } catch {}
  }

  (env as any)?.waitUntil?.(geoPromise);
  (!((env as any)?.waitUntil)) && (async () => {
    try {
      const geo = await geoPromise;
      const log = { ts: new Date().toISOString(), ok: verified, method, why: verifyWhy || null, ms: Math.round(nowMs() - t0), host: hostForAudit, cf: geo ?? null };
      console.log("[stateid.redirect]", JSON.stringify(log));
    } catch (e) { console.log("[stateid.redirect.log_error]", String(e)); }
  })();

  if (verified) {
    const hdr: Record<string, string> = { "X-StateID": method };
    if (usedKey) hdr["X-StateID-UsedKey"] = usedKey;
    return response302VerbatimLocation(rawDest, hdr);
  }

  const code = verifyWhy || "verify_failed";
  const status: 400 | 401 | 403 =
    code.includes("expired") || code.includes("not_yet_valid") ? 401 :
    code === "missing_dest" || code === "invalid_dest" || code === "invalid_scheme" || code === "bad_payload_b64" || code === "blocked_destination" || code === "bad_sig_header_format" ? 400 :
    403;
  return response4xx(status, code, "Redirect denied.");
}

export default {
  async fetch(request: Request, env: EnvBindings, ctx?: { waitUntil: (p: Promise<any>) => void }) {
    if (ctx?.waitUntil) (env as any).waitUntil = ctx.waitUntil.bind(ctx);
    return handleRedirectRequest(request, env);
  },
};
