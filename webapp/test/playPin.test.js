import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import app from '../app.js';
import { RateLimiter, safeEqual, playPinToken } from '../utils/security.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ID = 'abcd1234';
const PIN = '4821';
const dir = path.join(__dirname, '..', 'dictations', ID);
const CSRF = 'test-csrf-token';
let server;
let base;

before(async () => {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'metadata.json'), JSON.stringify({
    id: ID, title: 'Pin test', language: 'en-US', topics: ['a', 'b', 'c'],
    sentences: ['One sentence.'], pin: PIN, created: new Date().toISOString(),
  }));
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

function submitPin(pinField, ip) {
  return fetch(`${base}/dictation/${ID}/play`, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      cookie: `_csrf=${CSRF}`,
      // Each test uses its own client address so rate limits don't interfere
      'x-forwarded-for': ip,
    },
    body: `_csrf=${CSRF}&${pinField}`,
  });
}

test('safeEqual compares strings and rejects non-strings', () => {
  assert.equal(safeEqual('1234', '1234'), true);
  assert.equal(safeEqual('1234', '12345'), false);
  assert.equal(safeEqual(undefined, '1234'), false);
  assert.equal(safeEqual(['1234'], '1234'), false);
});

test('RateLimiter only counts what is recorded', () => {
  const limiter = new RateLimiter(60 * 1000, 2);
  assert.equal(limiter.isLimited('k'), false);
  limiter.hit('k');
  assert.equal(limiter.isLimited('k'), false);
  limiter.hit('k');
  assert.equal(limiter.isLimited('k'), true);
  assert.equal(limiter.isLimited('other'), false);
  assert.equal(limiter.check('other'), true);
});

test('correct PIN sets a cookie that does not contain the PIN', async () => {
  const res = await submitPin(`pin=${PIN}`, '10.0.0.1');
  assert.equal(res.status, 302);
  const cookie = res.headers.get('set-cookie');
  const value = cookie.match(new RegExp(`play_pin_${ID}=([^;]+)`))[1];
  assert.equal(value, playPinToken(ID, PIN));
  assert.ok(!value.includes(PIN));

  const page = await fetch(`${base}/dictation/${ID}/play`, { headers: { cookie: `play_pin_${ID}=${value}` } });
  assert.match(await page.text(), /play-sentence-card/);
});

test('the raw PIN is no longer accepted as a cookie', async () => {
  const page = await fetch(`${base}/dictation/${ID}/play`, { headers: { cookie: `play_pin_${ID}=${PIN}` } });
  const html = await page.text();
  assert.doesNotMatch(html, /play-sentence-card/);
  assert.match(html, /name="pin"/);
});

test('a non-string PIN is a wrong PIN, not a server error', async () => {
  const res = await submitPin('pin[]=1', '10.0.0.2');
  assert.equal(res.status, 401);
  assert.match(await res.text(), /Incorrect PIN/);
});

test('wrong PINs are rate limited per client', async () => {
  for (let i = 0; i < 10; i++) {
    const res = await submitPin('pin=0000', '10.0.0.3');
    assert.equal(res.status, 401, `attempt ${i + 1}`);
  }
  // Now even the right PIN is refused for this client...
  const blocked = await submitPin(`pin=${PIN}`, '10.0.0.3');
  assert.equal(blocked.status, 429);
  assert.match(await blocked.text(), /Too many attempts/);
  // ...while another client is unaffected
  const other = await submitPin(`pin=${PIN}`, '10.0.0.4');
  assert.equal(other.status, 302);
});
