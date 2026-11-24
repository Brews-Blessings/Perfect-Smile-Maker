const test = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');

async function withServer(fn) {
  const server = app.listen(0);
  try { await fn('http://localhost:' + server.address().port); }
  finally { server.close(); }
}

test('health endpoint works', () => withServer(async (base) => {
  const r = await fetch(base + '/api/health');
  const body = await r.json();
  assert.equal(r.status, 200);
  assert.equal(body.data.status, 'ok');
}));

test('holidays endpoint needs login', () => withServer(async (base) => {
  const r = await fetch(base + '/api/holidays/2026');
  assert.equal(r.status, 401);
}));