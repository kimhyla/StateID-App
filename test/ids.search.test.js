/**
 * test/ids.search.test.js (ESM)
 * Verifies /ids/search behavior:
 * - case-insensitive match on id or name
 * - missing/empty "query" -> 400 { error: "query required" }
 */
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { server } from '../src/server.js';

const PORT = 30313;
let listener;

before(async () => {
  await new Promise((resolve) => {
    listener = server.listen(PORT, '127.0.0.1', resolve);
  });
});

after(async () => {
  await new Promise((resolve) => listener.close(resolve));
});

test('GET /ids/search without query returns 400', async () => {
  const res = await fetch(`http://127.0.0.1:${PORT}/ids/search`);
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error, 'query required');
});

test('GET /ids/search with empty/whitespace query returns 400', async () => {
  const res = await fetch(`http://127.0.0.1:${PORT}/ids/search?query=   `);
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error, 'query required');
});

test('GET /ids/search matches id and name case-insensitively', async () => {
  // Match by id, case-insensitive
  const resId = await fetch(`http://127.0.0.1:${PORT}/ids/search?query=ca`);
  assert.equal(resId.status, 200);
  const bodyId = await resId.json();
  assert.ok(Array.isArray(bodyId.items));
  const idsFromId = bodyId.items.map((x) => x.id);
  assert.ok(idsFromId.includes('CA'));

  // Match by name, case-insensitive
  const resName = await fetch(`http://127.0.0.1:${PORT}/ids/search?query=NeW`);
  assert.equal(resName.status, 200);
  const bodyName = await resName.json();
  assert.ok(Array.isArray(bodyName.items));
  const idsFromName = bodyName.items.map((x) => x.id);
  assert.ok(idsFromName.includes('NY'));

  // Partial name match
  const resPartial = await fetch(`http://127.0.0.1:${PORT}/ids/search?query=xas`);
  assert.equal(resPartial.status, 200);
  const bodyPartial = await resPartial.json();
  assert.ok(Array.isArray(bodyPartial.items));
  const idsFromPartial = bodyPartial.items.map((x) => x.id);
  assert.ok(idsFromPartial.includes('TX'));
});
