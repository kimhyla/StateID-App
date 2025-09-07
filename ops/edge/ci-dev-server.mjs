// File: ops/edge/ci-dev-server.mjs
// Minimal ESM HTTP server for CI health checks. No dependencies.
import http from 'node:http';
import { URL } from 'node:url';

const port = Number(process.env.PORT || 3000);

const server = http.createServer((req, res) => {
  const { pathname } = new URL(req.url, `http://localhost:${port}`);

  if (pathname === '/healthz') {
    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('ok');
    return;
  }

  // Simple OK at root and any other path
  res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ ok: true, name: 'stateid-edge-ci' }));
});

server.listen(port, () => {
  console.log(`[edge-ci] listening on http://0.0.0.0:${port}`);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT',  () => server.close(() => process.exit(0)));
