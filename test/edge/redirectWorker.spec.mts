import { test } from "node:test";
import assert from "node:assert/strict";

import { handleRedirectRequest } from "../../src/edge/redirectWorker.mts";
import { signPayloadHeader } from "../../src/edge/signing.mts";

type Env = Record<string, string>;

function b64Json(obj: unknown): string { return Buffer.from(JSON.stringify(obj), "utf8").toString("base64"); }
function mkRequest(pathAndQuery: string): Request { return new Request("https://example.com" + pathAndQuery, { method: "GET" }); }

test("header path: 302 with X-StateID: header and UsedKey", async () => {
  const now = Date.now();
  const dest = "https://video.example.org/room?id=local-123";
  const env: Env = {
    SIGNING_KEYS_JSON: JSON.stringify({ k1: Buffer.from("secret-k1","utf8").toString("base64") }),
    ALLOWED_HOSTS: "video.example.org,*.good.example.net",
    REDIRECT_BUDGET_MS: "200",
  };
  const payload = {
    keyId: "k1",
    meeting: { startUtc: new Date(now - 5*60_000).toISOString(), endUtc: new Date(now + 30*60_000).toISOString() },
    dest,
    expEpochSec: Math.floor((now + 20*60_000)/1000),
  };
  const hdr = await signPayloadHeader(payload as any, env as any);
  const t = b64Json(payload);
  const sig = Buffer.from(JSON.stringify(hdr), "utf8").toString("base64").replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");
  const req = mkRequest(`/r?d=${encodeURIComponent(dest)}&t=${encodeURIComponent(t)}&sig=${encodeURIComponent(sig)}`);
  const res = await handleRedirectRequest(req, env as any);

  assert.equal(res.status, 302);
  assert.equal(res.headers.get("X-StateID"), "header");
  const used = res.headers.get("X-StateID-UsedKey");
  assert.ok(used === "current" || used === "previous");
  assert.equal(res.headers.get("Location"), encodeURIComponent(dest));
});

test("fail-open pre-decision budget overrun", async () => {
  const dest = "https://video.example.org/room?id=2";
  const env: Env = { SIGNING_KEYS_JSON: JSON.stringify({}), ALLOWED_HOSTS: "video.example.org,*.good.example.net", REDIRECT_BUDGET_MS: "1" };
  const originalNow = performance.now.bind(performance);
  let calls = 0;
  (performance as any).now = () => (calls++ === 0 ? 0 : 1000);
  try {
    const req = mkRequest(`/r?d=${encodeURIComponent(dest)}`);
    const res = await handleRedirectRequest(req, env as any);
    assert.equal(res.status, 302);
    assert.equal(res.headers.get("X-StateID"), "fail-open");
    assert.equal(res.headers.get("X-StateID-Why"), "budget_exceeded");
    assert.equal(res.headers.get("Location"), encodeURIComponent(dest));
  } finally {
    (performance as any).now = originalNow;
  }
});

test("policy block: disallowed host → 400 blocked_destination", async () => {
  const env: Env = { SIGNING_KEYS_JSON: JSON.stringify({}), ALLOWED_HOSTS: "video.example.org,*.good.example.net", REDIRECT_BUDGET_MS: "200" };
  const bad = "https://bad.example.net/meet/abc";
  const req = mkRequest(`/r?d=${encodeURIComponent(bad)}`);
  const res = await handleRedirectRequest(req, env as any);
  assert.equal(res.status, 400);
  assert.equal(res.headers.get("X-StateID"), "blocked_destination");
});
