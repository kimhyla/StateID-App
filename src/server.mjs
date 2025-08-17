/* File: src/server.mjs */
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFile, writeFile, mkdir, stat, readdir } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = path.resolve(__dirname, '..');
const PORT       = process.env.PORT || 8787;

const app = express();
app.use(express.json());

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

// --- redirect ---
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

// --- BRIDGE: send a goal to aider/watch-goal ---
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
