/* File: src/server.mjs */
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFile, writeFile, mkdir, stat, readdir } from 'fs/promises';
import crypto from 'crypto';
import { createToken, verifyToken, defaultSecret } from './lib/token.mjs';
import { appendLedger, readLastN, readAll } from './lib/ledger.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = path.resolve(__dirname, '..');
const PORT       = process.env.PORT || 8787;
const WRAP_SECRET = defaultSecret();
const LEDGER_PATH = process.env.LEDGER_PATH || path.join(ROOT, 'ops', 'ledger', 'attendee-events.jsonl');

const app = express();
app.use(express.json());

// Request utils for structured logging and timing
function newRequestId() { return crypto.randomBytes(8).toString('hex'); }
function msSince(startHr) {
  const diff = process.hrtime.bigint() - startHr;
  return Number(diff / 1000000n);
}
function logStructured(obj) {
  try { console.log(JSON.stringify(obj)); } catch { console.log(String((obj && obj.msg) || 'log')); }
}

const IDS_PATH  = path.join(ROOT, 'data', 'ids.json');
const OPS_DIR   = path.join(ROOT, 'ops');
const INBOX     = path.join(OPS_DIR, 'inbox');
const OUTBOX    = path.join(OPS_DIR, 'outbox');
const GOAL_TXT  = path.join(INBOX, 'GOAL.txt');
const CHEAT_TXT = path.join(OPS_DIR, 'CHEATSHEET.txt');

async function loadItems() {
  const buf = await readFile(IDS_PATH);
  let txt = buf.toString('utf8');
  if (txt.charCodeAt(0) === 0xFEFF) txt = txt.slice(1); // strip BOM if present
  const parsed = JSON.parse(txt);
  if (!parsed || !Array.isArray(parsed.items)) {
    throw new Error('Invalid ids.json: expected { "items": [] }');
  }
  return parsed.items;
}

async function saveItems(items) {
  const json = JSON.stringify({ items }, null, 2);
  await writeFile(IDS_PATH, json, 'utf8');
}

// --- health ---
app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));

// --- ids list ---
app.get('/ids', async (_req, res) => {
  try {
    const items = await loadItems();
    res.json({ items });
  } catch (err) {
    console.error('[StateID] /ids error:', err.message);
    res.status(500).json({ error: 'failed_to_read_ids' });
  }
});

// --- update one id's url ---
app.patch('/ids/:id', async (req, res) => {
  try {
    const id = String(req.params.id || '').trim().toUpperCase();
    const { url } = req.body ?? {};
    const items = await loadItems();
    const item = items.find(i => String(i.id).toUpperCase() === id);
    if (!item) return res.status(404).json({ error: 'unknown_id' });
    item.url = url ? String(url) : undefined; // blank = unset
    await saveItems(items);
    res.json({ item });
  } catch (err) {
    console.error('[StateID] /ids PATCH error:', err.message);
    res.status(500).json({ error: 'internal_error' });
  }
});

/* --- redirect --- */
app.get('/redirect/:id', async (req, res) => {
  const id = String(req.params.id || '').trim();
  try {
    const items = await loadItems();
    const found = items.find(i => String(i.id).toUpperCase() === id.toUpperCase());
    if (!found) return res.status(404).json({ error: 'unknown_id' });
    if (!found.url) return res.status(409).json({ error: 'no_url_set' });
    return res.redirect(302, found.url);
  } catch (err) {
    console.error('[StateID] /redirect error:', err.message);
    res.status(500).json({ error: 'internal_error' });
  }
});

/* --- Wrapper/Redirect MVP --- */
// POST /wrap  -> issue token + short path
app.post('/wrap', async (req, res) => {
  const start = process.hrtime.bigint();
  const request_id = newRequestId();
  const route = '/wrap';
  try {
    const { urlOriginal, eventId, attendee } = req.body || {};
    const url = String(urlOriginal || '').trim();
    if (!/^https?:\/\//i.test(url)) {
      const duration_ms = msSince(start);
      logStructured({ level: 'warn', msg: 'wrap_invalid_url', request_id, route, duration_ms });
      return res.status(400).json({ error: 'invalid_url', detail: 'urlOriginal must start with http:// or https://' });
    }
    const exp = Math.floor(Date.now() / 1000) + 6 * 3600;
    const claims = { urlOriginal: url, exp };
    if (eventId) claims.eventId = String(eventId);
    if (attendee) claims.attendee = String(attendee);

    const token = createToken(claims, WRAP_SECRET, 'v1');
    const duration_ms = msSince(start);
    logStructured({ level: 'info', msg: 'wrap_issued', request_id, route, duration_ms });
    res.json({ token, url: `/w/${encodeURIComponent(token)}` });
  } catch (e) {
    const duration_ms = msSince(start);
    logStructured({ level: 'error', msg: 'wrap_error', request_id, route, duration_ms });
    res.status(500).json({ error: 'internal_error' });
  }
});

// GET /w/:token -> verify + ledger + redirect
app.get('/w/:token', async (req, res) => {
  const start = process.hrtime.bigint();
  const request_id = newRequestId();
  const route = '/w/:token';
  const token = String(req.params.token || '');
  const ip = req.ip;
  const ua = req.get('user-agent') || '';
  try {
    const v = verifyToken(token, WRAP_SECRET);
    if (!v.ok) {
      const latency_ms = msSince(start);
      const row = {
        ts: new Date().toISOString(),
        request_id,
        token_kid: 'v1',
        eventId: undefined,
        attendee: undefined,
        ip,
        ua,
        status: v.status,
        latency_ms
      };
      await appendLedger(row, LEDGER_PATH);
      logStructured({ level: 'warn', msg: 'redirect_' + v.status, request_id, route, duration_ms: latency_ms });
      return res.status(400).json({ error: v.status });
    }
    const payload = v.payload || {};
    const latency_ms = msSince(start);
    const row = {
      ts: new Date().toISOString(),
      request_id,
      token_kid: payload.kid || 'v1',
      eventId: payload.eventId,
      attendee: payload.attendee,
      ip,
      ua,
      status: 'ok',
      latency_ms
    };
    await appendLedger(row, LEDGER_PATH);
    logStructured({ level: 'info', msg: 'redirect_ok', request_id, route, duration_ms: latency_ms });
    return res.redirect(302, String(payload.urlOriginal || ''));
  } catch (e) {
    const duration_ms = msSince(start);
    logStructured({ level: 'error', msg: 'redirect_error', request_id, route, duration_ms });
    try {
      await appendLedger(
        {
          ts: new Date().toISOString(),
          request_id,
          token_kid: 'v1',
          eventId: undefined,
          attendee: undefined,
          ip,
          ua,
          status: 'invalid_token',
          latency_ms: duration_ms
        },
        LEDGER_PATH
      );
    } catch {}
    res.status(500).json({ error: 'internal_error' });
  }
});

// GET /audit -> last N rows
app.get('/audit', async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(500, parseInt(req.query.limit) || 50));
    const items = await readLastN(limit, LEDGER_PATH);
    res.json({ items });
  } catch (e) {
    res.status(500).json({ error: 'internal_error' });
  }
});

// GET /export.csv -> CSV of rows filtered by ts
app.get('/export.csv', async (req, res) => {
  try {
    const startIso = typeof req.query.start === 'string' ? req.query.start : null;
    const endIso = typeof req.query.end === 'string' ? req.query.end : null;
    const startMs = startIso ? Date.parse(startIso) : null;
    const endMs = endIso ? Date.parse(endIso) : null;
    const all = await readAll(LEDGER_PATH);
    const filtered = all.filter((r) => {
      const t = Date.parse(r.ts);
      if (Number.isNaN(t)) return false;
      if (startMs !== null && t < startMs) return false;
      if (endMs !== null && t > endMs) return false;
      return true;
    });
    const header = ['ts', 'request_id', 'token_kid', 'eventId', 'attendee', 'ip', 'ua', 'status', 'latency_ms'];
    const esc = (v) => {
      const s = v === undefined || v === null ? '' : String(v);
      return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [header.join(','), ...filtered.map((r) => header.map((k) => esc(r[k])).join(','))];
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.send(lines.join('\r\n'));
  } catch (e) {
    res.status(500).json({ error: 'internal_error' });
  }
});

/* --- BRIDGE: send a goal to aider/watch-goal --- */
app.post('/bridge/goal', async (req, res) => {
  try {
    const goal = String((req.body && req.body.goal) || '').trim();
    const cheatsheet = req.body && typeof req.body.cheatsheet === 'string'
      ? req.body.cheatsheet
      : null;

    if (!goal) {
      return res.status(400).json({ error: 'missing_goal', detail: 'Provide a "goal" string.' });
    }

    await mkdir(INBOX, { recursive: true });
    await writeFile(GOAL_TXT, goal + '\r\n', 'utf8');

    if (cheatsheet !== null) {
      await writeFile(CHEAT_TXT, cheatsheet, 'utf8');
    }

    res.json({ ok: true, goalPath: GOAL_TXT, cheatPath: cheatsheet !== null ? CHEAT_TXT : null });
  } catch (err) {
    console.error('[StateID] /bridge/goal error:', err.message);
    res.status(500).json({ error: 'internal_error' });
  }
});

// --- BRIDGE: status (sizes/mtimes) ---
app.get('/bridge/status', async (_req, res) => {
  try {
    const sGoal  = await stat(GOAL_TXT).catch(() => null);
    const sCheat = await stat(CHEAT_TXT).catch(() => null);
    res.json({
      goal:  sGoal  ? { size: sGoal.size,  mtime: sGoal.mtime }  : null,
      cheat: sCheat ? { size: sCheat.size, mtime: sCheat.mtime } : null
    });
  } catch (err) {
    console.error('[StateID] /bridge/status error:', err.message);
    res.status(500).json({ error: 'internal_error' });
  }
});

// --- NEW: BRIDGE answer endpoint (append/replace CHEATSHEET.txt) ---
app.post('/bridge/answer', async (req, res) => {
  try {
    let { answer, mode } = req.body || {};
    const txt = String(answer || '').trim();
    if (!txt) return res.status(400).json({ error: 'missing_answer' });

    await mkdir(OPS_DIR, { recursive: true });

    const isReplace = String(mode || '').toLowerCase() === 'replace';
    if (isReplace) {
      await writeFile(CHEAT_TXT, txt + '\r\n', 'utf8');
    } else {
      const header = `\r\n--- ChatGPT ${new Date().toISOString()} ---\r\n`;
      await writeFile(CHEAT_TXT, header + txt + '\r\n', { encoding: 'utf8', flag: 'a' });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[StateID] /bridge/answer error:', err.message);
    res.status(500).json({ error: 'internal_error' });
  }
});

// --- NEW: list outbox files (name, size, mtime) ---
app.get('/bridge/outbox', async (_req, res) => {
  try {
    await mkdir(OUTBOX, { recursive: true });
    const names = await readdir(OUTBOX);
    const rows = await Promise.all(
      names.map(async (n) => {
        const s = await stat(path.join(OUTBOX, n)).catch(() => null);
        return s ? { name: n, size: s.size, mtime: s.mtime } : null;
      })
    );
    rows.sort((a, b) => (b?.mtime || 0) - (a?.mtime || 0));
    res.json({ files: rows.filter(Boolean) });
  } catch (err) {
    console.error('[StateID] /bridge/outbox error:', err.message);
    res.status(500).json({ error: 'internal_error' });
  }
});

// static UI
app.use(express.static(path.join(ROOT, 'public'), { index: ['index.html'] }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[StateID] listening on http://127.0.0.1:${PORT}`);
});/* --- Outbox helpers (appended) --- */
import { fileURLToPath as __f } from "url";
const OUTBOX_DIR = path.join(ROOT, "ops", "outbox");

function safeJoinOutbox(name) {
  const base = path.basename(String(name || ""));
  return path.join(OUTBOX_DIR, base);
}

// GET /outbox/list -> {files:[{name,size,mtime}]}
app.get("/outbox/list", async (_req, res) => {
  try {
    const fs = await import("fs/promises");
    await fs.mkdir(OUTBOX_DIR, { recursive: true });
    const entries = await fs.readdir(OUTBOX_DIR);
    const rows = [];
    for (const name of entries) {
      const full = path.join(OUTBOX_DIR, name);
      const s = await fs.stat(full).catch(() => null);
      if (s && s.isFile()) rows.push({ name, size: s.size, mtime: s.mtime });
    }
    rows.sort((a,b) => new Date(b.mtime) - new Date(a.mtime));
    res.json({ files: rows });
  } catch (e) {
    console.error("[StateID] /outbox/list error:", e.message);
    res.status(500).json({ error: "outbox_list_failed" });
  }
});

// GET /outbox/text?name=filename.log  -> text/plain full file
app.get("/outbox/text", async (req, res) => {
  try {
    const fs = await import("fs/promises");
    const full = safeJoinOutbox(req.query.name);
    const buf = await fs.readFile(full);
    res.set("Content-Type", "text/plain; charset=utf-8");
    res.send(buf);
  } catch (e) {
    res.status(404).send("Not found");
  }
});

// GET /outbox/tail?name=filename.log&n=200 -> last N lines (text/plain)
app.get("/outbox/tail", async (req, res) => {
  try {
    const fs = await import("fs/promises");
    const n = Math.max(1, Math.min(2000, parseInt(req.query.n) || 200));
    const full = safeJoinOutbox(req.query.name);
    const txt = (await fs.readFile(full, "utf8")).replace(/^\uFEFF/, "");
    const lines = txt.split(/\r?\n/);
    const tail = lines.slice(-n).join("\n");
    res.set("Content-Type", "text/plain; charset=utf-8");
    res.send(tail);
  } catch (e) {
    res.status(404).send("Not found");
  }
});
/* --- end Outbox helpers --- */
