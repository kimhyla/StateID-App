import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
const GET = u => new Promise((res, rej)=>http.get(u,r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res({status:r.statusCode,body:JSON.parse(d)}));}).on('error',rej));
test('GET /healthz returns ok', async () => {
  const { status, body } = await GET('http://localhost:8787/healthz');
  assert.equal(status, 200); assert.equal(body.status, 'ok');
});
