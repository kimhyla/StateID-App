// src/server.js (ESM)
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseUrl } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = parseInt(process.env.PORT, 10) || 8787;
const HOST = process.env.HOST || '0.0.0.0';

let version = '0.0.0';
try {
  const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));
  version = pkg.version || version;
} catch {
  // ignore if package.json can't be read
}

const SAMPLE_IDS = [
  { id: 'CA', name: 'California', fields: ['clientState', 'allowedStates'], notes: 'stub' },
  { id: 'NY', name: 'New York',    fields: ['clientState', 'allowedStates'], notes: 'stub' },
  { id: 'TX', name: 'Texas',       fields: ['clientState', 'allowedStates'], notes: 'stub' }
];

function sendJson(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(data)
  });
  res.end(data);
}

function handler(req, res) {
  const { pathname } = parseUrl(req.url, true);

  if (req.method === 'GET' && pathname === '/healthz') {
    return sendJson(res, 200, { status: 'ok' });
  }

  if (req.method === 'GET' && pathname === '/version') {
    return sendJson(res, 200, { version });
  }

  if (req.method === 'GET' && pathname === '/ids') {
    return sendJson(res, 200, { items: SAMPLE_IDS });
  }

  if (req.method === 'GET' && pathname.startsWith('/ids/')) {
    const id = decodeURIComponent(pathname.split('/')[2] || '');
    const item = SAMPLE_IDS.find(x => x.id.toLowerCase() === id.toLowerCase());
    return item ? sendJson(res, 200, item) : sendJson(res, 404, { error: 'Not found' });
  }

  return sendJson(res, 404, { error: 'Not found' });
}

export const server = http.createServer(handler);

// If run directly (node src/server.js), start listening
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(PORT, HOST, () => {
    console.log(`StateID server listening on http://${HOST}:${PORT}`);
  });
}
