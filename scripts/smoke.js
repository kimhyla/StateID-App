/* scripts/smoke.js - Node-only smoke test for CI */
import { spawn } from "node:child_process";

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function waitFor(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(url);
      if (r.ok) return true;
    } catch {}
    await sleep(300);
  }
  throw new Error(`Timeout waiting for ${url}`);
}

async function check(url, expected) {
  const r = await fetch(url);
  if (r.status !== expected) {
    throw new Error(`${url} expected ${expected}, got ${r.status}`);
  }
}

(async () => {
  // Start the server as a child process
  const child = spawn(process.execPath, ["src/server.js"], {
    stdio: "inherit",
    env: { ...process.env, PORT: "8787" }
  });

  try {
    const base = "http://127.0.0.1:8787";
    await waitFor(`${base}/healthz`);

    await check(`${base}/healthz`, 200);
    await check(`${base}/version`, 200);
    await check(`${base}/ids`, 200);
    await check(`${base}/ids/CA`, 200);
    await check(`${base}/ids/ZZ`, 404);

    console.log("Smoke passed.");
    child.kill("SIGTERM");
    process.exit(0);
  } catch (err) {
    console.error("Smoke failed:", err?.message || err);
    child.kill("SIGTERM");
    process.exit(1);
  }
})();
