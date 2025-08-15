import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import server from '../src/server.js';

const listen = (srv) =>
  new Promise((resolve, reject) => {
    try {
      srv.listen(0, () => resolve(srv.address().port));
    } catch (err) {
      reject(err);
    }
  });

const close = (srv) =>
  new Promise((resolve) => {
    if (!srv.listening) return resolve();
    srv.close(() => resolve());
  });

const requestRaw = (port, path) =>
  new Promise((resolve, reject) => {
    const req = http.request(
      { host: '127.0.0.1', port, path, method: 'GET' },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          resolve({ statusCode: res.statusCode, headers: res.headers, body });
        });
      }
    );
    req.on('error', reject);
    req.end();
  });

test('302 for http target (preserve query string)', async () => {
  const port = await listen(server);
  const target = 'http://example.com/foo?x=1&y=2';
  const { statusCode, headers } = await requestRaw(
    port,
    '/r?u=' + encodeURIComponent(target)
  );
  await close(server);

  assert.equal(statusCode, 302);
  assert.equal(headers.location, target);
});

test('302 for https target', async () => {
  const port = await listen(server);
  const target = 'https://example.com/abc?z=9';
  const { statusCode, headers } = await requestRaw(
    port,
    '/r?u=' + encodeURIComponent(target)
  );
  await close(server);

  assert.equal(statusCode, 302);
  assert.equal(headers.location, target);
});

test('400 for missing u', async () => {
  const port = await listen(server);
  const { statusCode, body } = await requestRaw(port, '/r');
  await close(server);

  assert.equal(statusCode, 400);
  assert.doesNotThrow(() => JSON.parse(body));
  const json = JSON.parse(body);
  assert.equal(json.error, 'missing target');
});

test('400 for non-http schemes', async () => {
  const port = await listen(server);
  const bad = 'javascript:alert(1)';
  const { statusCode, body } = await requestRaw(
    port,
    '/r?u=' + encodeURIComponent(bad)
  );
  await close(server);

  assert.equal(statusCode, 400);
  const json = JSON.parse(body);
  assert.equal(json.error, 'invalid target');
});

test('302 even when LEDGER_THROW=true (fail-open)', async () => {
  process.env.LEDGER_THROW = 'true';
  const port = await listen(server);
  const target = 'http://example.com/';
  const { statusCode, headers } = await requestRaw(
    port,
    '/r?u=' + encodeURIComponent(target)
  );
  await close(server);
  delete process.env.LEDGER_THROW;

  assert.equal(statusCode, 302);
  assert.equal(headers.location, target);
});
