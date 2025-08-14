// test/ids.test.js (ESM)
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { server } from '../src/server.js';

const PORT = 30312;
let listener;

before(async () => {
  await new Promise((resolve) => {
    listener = server.listen(PORT, '127.0.0.1', resolve);
  });
});

after(async () => {
  await new Promise((resolve) => listener.close(resolve));
});

test('GET /ids returns a list with CA, NY, TX', async () => {
  const res = await fetch(`http://127.0.0.1:${PORT}/ids`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body.items), 'items should be an array');
  const ids = body.items.map((x) => x.id);
  for (const want of ['CA', 'NY', 'TX']) {
    assert.ok(ids.includes(want), `missing ${want}`);
  }
});

test('GET /ids/CA returns a single item', async () => {
  const res = await fetch(`http://127.0.0.1:${PORT}/ids/CA`);
  assert.equal(res.status, 200);
  const item = await res.json();
  assert.equal(item.id, 'CA');
});

test('GET /ids/ZZ returns 404', async () => {
  const res = await fetch(`http://127.0.0.1:${PORT}/ids/ZZ`);
  assert.equal(res.status, 404);
  const body = await res.json();
  assert.equal(body.error, 'Not found');
});
