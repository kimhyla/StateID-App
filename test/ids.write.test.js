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

const requestJson = (options, body) =>
  new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let json;
        try {
          json = raw ? JSON.parse(raw) : undefined;
        } catch {
          json = undefined;
        }
        resolve({ statusCode: res.statusCode, json });
      });
    });
    req.on('error', reject);
    if (body !== undefined) {
      const data = Buffer.from(JSON.stringify(body));
      req.setHeader('Content-Type', 'application/json');
      req.setHeader('Content-Length', String(data.length));
      req.write(data);
    }
    req.end();
  });

const getJson = (port, path) =>
  requestJson({ host: '127.0.0.1', port, path, method: 'GET' });

const postJson = (port, path, body) =>
  requestJson({ host: '127.0.0.1', port, path, method: 'POST' }, body);

const randomId = () => {
  const a = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const b = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const id = a + b;
  // Avoid clashing with built-ins
  return ['CA', 'NY', 'TX'].includes(id) ? 'ZZ' : id;
};

test('POST /ids write scenarios', async (t) => {
  await t.test('default (no WRITE_IDS): POST /ids => 405 {error:"writes disabled"}', async () => {
    delete process.env.WRITE_IDS;
    const port = await listen(server);
    const res = await postJson(port, '/ids', { id: 'AA', name: 'Alpha' });
    await close(server);

    assert.equal(res.statusCode, 405);
    assert.deepEqual(res.json, { error: 'writes disabled' });
  });

  await t.test('with WRITE_IDS="true": valid POST adds item; then GET /ids includes new id', async () => {
    process.env.WRITE_IDS = 'true';
    const id = randomId();

    const port = await listen(server);
    const create = await postJson(port, '/ids', { id, name: 'Zedland' });
    assert.equal(create.statusCode, 201);
    assert.ok(create.json?.item);
    assert.equal(create.json.item.id, id.toUpperCase());
    assert.equal(create.json.item.name, 'Zedland');

    const list = await getJson(port, '/ids');
    await close(server);

    assert.equal(list.statusCode, 200);
    assert.ok(Array.isArray(list.json.items));
    assert.ok(list.json.items.some((x) => x.id === id.toUpperCase()));
    delete process.env.WRITE_IDS;
  });

  await t.test('missing fields => 400', async () => {
    process.env.WRITE_IDS = 'true';
    const port = await listen(server);
    const res = await postJson(port, '/ids', {}); // missing id and name
    await close(server);

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.json, { error: 'id and name required' });
    delete process.env.WRITE_IDS;
  });

  await t.test('duplicate id => 409', async () => {
    process.env.WRITE_IDS = 'true';
    const id = randomId();

    const port = await listen(server);
    const first = await postJson(port, '/ids', { id, name: 'Firstland' });
    assert.equal(first.statusCode, 201);

    const dup = await postJson(port, '/ids', { id: id.toLowerCase(), name: 'Secondland' });
    await close(server);

    assert.equal(dup.statusCode, 409);
    assert.deepEqual(dup.json, { error: 'duplicate id' });
    delete process.env.WRITE_IDS;
  });
});
