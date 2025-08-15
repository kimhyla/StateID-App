// src/server.js (ESM)

import http from 'node:http';
import { parse as parseUrl, fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

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

const server = http.createServer((req, res) => {
  const { method } = req;
  const { pathname, query } = parseUrl(req.url, true);
  res.setHeader('Content-Type', 'application/json');

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

  // GET /ids -> { items: [...] }
  if (method === 'GET' && pathname === '/ids') {
    res.writeHead(200);
    res.end(JSON.stringify({ items: IDS }));
    return;
  }

  // NEW: GET /ids/search?query=... -> { items: [...] }
  if (method === 'GET' && pathname === '/ids/search') {
    const q = (query?.query ?? '').trim();
    if (!q) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'query required' }));
      return;
    }
    const needle = q.toLowerCase();
    const items = IDS.filter(
      (x) =>
        x.id.toLowerCase().includes(needle) ||
        x.name.toLowerCase().includes(needle)
    );
    res.writeHead(200);
    res.end(JSON.stringify({ items }));
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

// Only listen when run directly (not when imported by tests)
if (process.argv[1] && process.argv[1].endsWith('src/server.js')) {
  server.listen(PORT, HOST, () => {
    console.log(`StateID server listening on http://${HOST}:${PORT}`);
  });
}

export default server;
export { server };
