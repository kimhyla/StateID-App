// src/server.js (ESM)

import http from 'node:http';
import { parse as parseUrl, fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const HOST = '0.0.0.0';
const PORT = 8787;

// Read package version for /version
const pkg = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
);

// Tiny sample “State IDs” used by /ids and /ids/:id
const IDS = [
  { id: 'CA', name: 'California' },
  { id: 'NY', name: 'New York' },
  { id: 'TX', name: 'Texas' },
];

// Persistence paths
const ROOT_DIR = fileURLToPath(new URL('..', import.meta.url));
const DATA_DIR = resolve(ROOT_DIR, 'data');
const IDS_FILE = resolve(DATA_DIR, 'ids.json');

// Load any previously persisted IDs and merge into memory (case-insensitive, normalized)
function loadPersistedIds() {
  try {
    if (!existsSync(IDS_FILE)) return;
    const txt = readFileSync(IDS_FILE, 'utf8');
    const parsed = JSON.parse(txt);
    const items = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.items) ? parsed.items : [];
    for (const raw of items) {
      if (!raw || typeof raw !== 'object') continue;
      const id = String(raw.id ?? '').trim();
      const name = String(raw.name ?? '').trim();
      if (!id || !name) continue;
      const normId = id.toUpperCase();
      const exists = IDS.some((x) => x.id.toUpperCase() === normId);
      if (!exists) {
        IDS.push({ id: normId, name });
      }
    }
  } catch {
    // ignore malformed file
  }
}
loadPersistedIds();

// Persist current IDs to disk as { items: [...] }
function saveIds() {
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(IDS_FILE, JSON.stringify({ items: IDS }, null, 2), 'utf8');
  } catch {
    // ignore write errors
  }
}

// Minimal JSON body parser (<=1MB). Throws on invalid JSON or too large.
function readJsonBody(req, limitBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limitBytes) {
        // abort and signal error
        try { req.destroy(); } catch {}
        reject(new Error('too large'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const buf = Buffer.concat(chunks);
        const str = buf.toString('utf8');
        resolve(JSON.parse(str));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const { method } = req;
  const { pathname, query } = parseUrl(req.url, true);
  res.setHeader('Content-Type', 'application/json');

  // Optional request logging
  const logRequests =
    process.env.LOG_REQUESTS === 'true' || process.env.LOG_REQUESTS === '1';
  const startMs = Date.now();
  const reqId =
    req.headers['x-request-id'] ||
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  if (logRequests) {
    res.on('finish', () => {
      try {
        const dur = Date.now() - startMs;
        console.log(`${method} ${pathname} -> ${res.statusCode} id=${reqId} dur=${dur}ms`);
      } catch {
        // noop
      }
    });
  }

  // GET /healthz
  if (method === 'GET' && pathname === '/healthz') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  // GET /version  -> { version }
  if (method === 'GET' && pathname === '/version') {
    res.writeHead(200);
    res.end(JSON.stringify({ version: pkg.version }));
    return;
  }

  // GET /r?u=<url> -> 302 redirect
  if (method === 'GET' && pathname === '/r') {
    const raw = query?.u ?? '';
    const target = String(raw).trim();
    if (!target) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'missing target' }));
      return;
    }

    let urlObj;
    try {
      urlObj = new URL(target);
    } catch {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'invalid target' }));
      return;
    }

    const protocol = urlObj.protocol;
    if (protocol !== 'http:' && protocol !== 'https:') {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'invalid target' }));
      return;
    }

    // Fail-open ledger write
    try {
      ledgerWrite({ method, path: pathname, target });
    } catch {
      // ignore errors, still redirect
    }

    res.statusCode = 302;
    res.setHeader('Location', target);
    res.end();
    return;
  }

  // POST /ids -> create new item (behind WRITE_IDS flag)
  if (method === 'POST' && pathname === '/ids') {
    const canWrite =
      process.env.WRITE_IDS === 'true' || process.env.WRITE_IDS === '1';
    if (!canWrite) {
      res.writeHead(405);
      res.end(JSON.stringify({ error: 'writes disabled' }));
      return;
    }

    // Minimal JSON body parse (<=1MB), treat any failure as invalid json
    try {
      const body = await readJsonBody(req);
      const idRaw = body?.id;
      const nameRaw = body?.name;

      const id = String(idRaw ?? '').trim();
      const name = String(nameRaw ?? '').trim();

      if (!id || !name) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'id and name required' }));
        return;
      }

      const normId = id.toUpperCase();

      // Duplicate check (case-insensitive)
      const exists = IDS.some((x) => x.id.toUpperCase() === normId);
      if (exists) {
        res.writeHead(409);
        res.end(JSON.stringify({ error: 'duplicate id' }));
        return;
      }

      const item = { id: normId, name };
      IDS.push(item);
      saveIds();

      res.writeHead(201);
      res.end(JSON.stringify({ item }));
      return;
    } catch {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'invalid json' }));
      return;
    }
  }

  // GET /ids -> { items: [...] }
  if (method === 'GET' && pathname === '/ids') {
    res.writeHead(200);
    res.end(JSON.stringify({ items: IDS }));
    return;
  }

  // GET /ids/search?q=... or /ids/search?query=... -> { items: [...] }
  if (method === 'GET' && pathname === '/ids/search') {
    const raw = query?.q ?? query?.query ?? '';
    const q = String(raw).trim();
    if (!q) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'query required' }));
      return;
    }

    // Optional limit validation
    const limitRaw = query?.limit;
    let limit;
    if (limitRaw !== undefined) {
      const s = String(limitRaw).trim();
      if (!/^\d+$/.test(s) || Number(s) <= 0) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'invalid limit' }));
        return;
      }
      limit = Number(s);
    }

    const needle = q.toLowerCase();
    const items = IDS.filter(
      (x) =>
        x.id.toLowerCase().includes(needle) ||
        x.name.toLowerCase().includes(needle)
    );

    const result = limit !== undefined ? items.slice(0, limit) : items;
    res.writeHead(200);
    res.end(JSON.stringify({ items: result }));
    return;
  }

  // GET /ids/:id -> item or 404
  const match = pathname.match(/^\/ids\/([A-Za-z]{2})$/);
  if (method === 'GET' && match) {
    const id = match[1].toUpperCase();
    const item = IDS.find((x) => x.id === id);
    if (!item) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
      return;
    }
    res.writeHead(200);
    res.end(JSON.stringify(item));
    return;
  }

  // Fallback 404
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

// Only listen when run directly (not when imported by tests) — Windows-safe
const entry = process.argv[1] ? resolve(process.argv[1]) : '';
const thisFile = fileURLToPath(import.meta.url);
if (entry === thisFile) {
  server.listen(PORT, HOST, () => {
    console.log(`StateID server listening on http://${HOST}:${PORT}`);
  });
}

export default server;
export { server };
