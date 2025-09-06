import { signPayloadHeader } from "../src/edge/signing.mjs";

type Env = Record<string, string>;

async function main() {
  const env: Env = {
    // falls back to "secret-k1" (base64) if not provided via env
    SIGNING_KEYS_JSON:
      process.env.SIGNING_KEYS_JSON ??
      JSON.stringify({ k1: Buffer.from("secret-k1", "utf8").toString("base64") }),
  };

  const now = Date.now();
  const dest = "https://video.example.org/room?id=local-123";

  const payload = {
    keyId: "k1",
    meeting: {
      startUtc: new Date(now + 0 * 60_000).toISOString(),
      endUtc: new Date(now + 35 * 60_000).toISOString(),
    },
    dest,
    expEpochSec: Math.floor((now + 30 * 60_000) / 1000),
  };

  const hdr = await signPayloadHeader(payload as any, env as any);

  const t = Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
  const sig = Buffer.from(JSON.stringify(hdr), "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  const url =
    "http://127.0.0.1:8787/r?d=" +
    encodeURIComponent(dest) +
    "&t=" +
    encodeURIComponent(t) +
    "&sig=" +
    encodeURIComponent(sig);

  console.log("Signed URL:\n" + url + "\n");
  console.log("Header (decoded):");
  console.log(JSON.stringify(hdr, null, 2));
  console.log("Payload (decoded):");
  console.log(JSON.stringify(payload, null, 2));
}

main().catch((e) => {
  console.error("Signer error:", e);
  process.exit(1);
});
