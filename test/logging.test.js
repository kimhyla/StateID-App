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

const requestOnce = (port, path) =>
  new Promise((resolve, reject) => {
    const req = http.request(
      { host: '127.0.0.1', port, path, method: 'GET' },
      (res) => {
        res.resume();
        res.on('end', () => resolve({ statusCode: res.statusCode }));
      }
    );
    req.on('error', reject);
    req.end();
  });

test('optional request logging on when LOG_REQUESTS=true and off when unset', async () => {
  // Enable logging
  const origLog = console.log;
  const logs = [];
  console.log = (...args) => logs.push(args.join(' '));
  process.env.LOG_REQUESTS = 'true';

  const port = await listen(server);
  await requestOnce(port, '/healthz');
  await close(server);

  // Restore and clear env
  console.log = origLog;
  delete process.env.LOG_REQUESTS;

  assert(
    logs.some((line) => line.includes('GET /healthz -> 200')),
    'Expected a request log when LOG_REQUESTS=true'
  );

  // Now ensure no logging when unset
  const origLog2 = console.log;
  const noLogs = [];
  console.log = (...args) => noLogs.push(args.join(' '));

  const port2 = await listen(server);
  await requestOnce(port2, '/healthz');
  await close(server);

  console.log = origLog2;

  assert(
    !noLogs.some((line) => line.includes('GET /healthz -> 200')),
    'Did not expect request logging when LOG_REQUESTS is unset'
  );
});
