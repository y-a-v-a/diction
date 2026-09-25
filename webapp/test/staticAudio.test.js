import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import app from '../app.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ID = 'deadbeef';
const dir = path.join(__dirname, '..', 'dictations', ID);
let server;
let base;
let createdDir = false;

before(async () => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    createdDir = true;
  }
  fs.writeFileSync(path.join(dir, '0.mp3'), Buffer.from('ID3fake'));
  fs.writeFileSync(path.join(dir, 'metadata.json'), JSON.stringify({
    id: ID, title: 'Test', language: 'nl', topics: ['a', 'b', 'c'], sentences: ['Een zin.'],
    pin: '1234', created: new Date().toISOString(),
  }));
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
  if (createdDir) fs.rmSync(dir, { recursive: true, force: true });
});

test('serves dictation audio files', async () => {
  const res = await fetch(`${base}/dictations/${ID}/0.mp3`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /audio\/mpeg/);
});

test('does not expose metadata.json (contains the play-mode PIN)', async () => {
  const res = await fetch(`${base}/dictations/${ID}/metadata.json`);
  assert.equal(res.status, 404);
  assert.doesNotMatch(await res.text(), /1234/);
});

test('does not expose other files in the dictations directory', async () => {
  for (const p of [`/dictations/${ID}/`, `/dictations/${ID}/0.mp3.bak`, `/dictations/${ID}/../${ID}/metadata.json`]) {
    const res = await fetch(`${base}${p}`);
    assert.notEqual(res.status, 200, p);
  }
});

test('/dictations listing is not redirected to /dictations/', async () => {
  const res = await fetch(`${base}/dictations`, { redirect: 'manual' });
  assert.equal(res.status, 200);
});
