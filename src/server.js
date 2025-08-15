// src/server.js (ESM)

import http from 'node:http';
import { parse as parseUrl, fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const HOST = '0.0.0.0';
const PORT = 8787;

// Read package version for /version
const pkg = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
);

 // IDs loaded from data/ids.json at startup
let IDS = [];
let idsLoadFailed = false;

try {
  const idsUrl = new URL('../data/ids.json', import.meta.url);
  const text = await readFile(idsUrl, 'utf8');
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) throw new Error('ids not array');
  const normalized = parsed.map((x) => {
    if (!x || typeof x !== 'object') throw new Error('bad item');
    const id = String(x.id ?? '').trim();
    const name = String(x.name ?? '').trim();
    if (!id || !name) throw new Error('bad item fields');
    return { id, name };
  });
  IDS = normalized;
} catch {
  idsLoadFailed = true;
}

const server = http.createServer((req, res) => {
  const { method } = req;
  const { pathname, query } = parseUrl(req.url, true);
  res.setHeader('Content-Type', 'application/json');

  // Optional request logging
  const logRequests =
    process.env.LOG_REQUESTS === 'true' || process.env.LOG_REQUESTS === '1';
  if (logRequests) {
    res.on('finish', () => {
      try {
        console.log(`${method} ${pathname} -> ${res.statusCode}`);
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

  // Guard for data load failure on /ids endpoints
  if (method === 'GET' && pathname.startsWith('/ids')) {
    if (idsLoadFailed) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'data load failed' }));
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
