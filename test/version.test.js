// test/version.test.js (ESM)
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { server } from '../src/server.js';

const PORT = 30311;
let listener;

before(async () => {
  await new Promise((resolve) => {
    listener = server.listen(PORT, '127.0.0.1', resolve);
  });
});

after(async () => {
  await new Promise((resolve) => listener.close(resolve));
});

test('GET /version returns package version', async () => {
  const res = await fetch(`http://127.0.0.1:${PORT}/version`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(typeof body.version === 'string' && body.version.length > 0);
});
