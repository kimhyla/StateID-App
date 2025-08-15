/**
 * test/ids.search.limit.test.js (ESM)
 * Verifies optional &limit behavior for /ids/search
 */
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { server } from '../src/server.js';

const PORT = 30314;
let listener;

before(async () => {
  await new Promise((resolve) => {
    listener = server.listen(PORT, '127.0.0.1', resolve);
  });
});

after(async () => {
  await new Promise((resolve) => listener.close(resolve));
});

test('no limit -> returns all matches (>= 1) for a query', async () => {
  const res = await fetch(`http://127.0.0.1:${PORT}/ids/search?query=ca`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body.items));
  assert.ok(body.items.length >= 1);
});

test('limit=1 -> returns exactly 1 item for a query that matches multiple', async () => {
  // Confirm multiple matches exist for query "a"
  const resAll = await fetch(`http://127.0.0.1:${PORT}/ids/search?query=a`);
  assert.equal(resAll.status, 200);
  const bodyAll = await resAll.json();
  assert.ok(Array.isArray(bodyAll.items));
  assert.ok(bodyAll.items.length >= 2, 'expected at least two matches for query "a"');

  // Now apply limit=1
  const resLimited = await fetch(`http://127.0.0.1:${PORT}/ids/search?query=a&limit=1`);
  assert.equal(resLimited.status, 200);
  const bodyLimited = await resLimited.json();
  assert.ok(Array.isArray(bodyLimited.items));
  assert.equal(bodyLimited.items.length, 1);
});

test('invalid limits (0, -1, "abc") -> 400 {error:"invalid limit"}', async () => {
  for (const bad of ['0', '-1', 'abc']) {
    const res = await fetch(`http://127.0.0.1:${PORT}/ids/search?query=a&limit=${encodeURIComponent(bad)}`);
    assert.equal(res.status, 400, `expected 400 for limit=${bad}`);
    const body = await res.json();
    assert.equal(body.error, 'invalid limit');
  }
});
