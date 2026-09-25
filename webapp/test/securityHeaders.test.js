import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

import app from '../app.js';

let server;
let base;
let host;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  host = `127.0.0.1:${server.address().port}`;
  base = `http://${host}`;
});

after(() => {
  server.close();
});

test('pages, assets and errors carry the security headers', async () => {
  for (const p of ['/', '/style.css', '/no-such-page']) {
    const res = await fetch(base + p);
    const csp = res.headers.get('content-security-policy');
    assert.match(csp, /frame-ancestors 'none'/, p);
    assert.match(csp, /object-src 'none'/, p);
    assert.match(csp, /media-src 'self' https:\/\/\*\.public\.blob\.vercel-storage\.com/, p);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff', p);
    assert.equal(res.headers.get('x-frame-options'), 'DENY', p);
    assert.equal(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin', p);
    assert.equal(res.headers.get('x-powered-by'), null, p);
  }
});

function switchLang(referer) {
  const headers = referer ? { referer } : {};
  return fetch(`${base}/lang/en-US`, { redirect: 'manual', headers });
}

test('language switch returns to the page it was clicked on', async () => {
  const res = await switchLang(`${base}/dictations?x=1`);
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('location'), '/dictations?x=1');
  assert.match(res.headers.get('set-cookie'), /lang=en-US/);
});

test('language switch never redirects to another site', async () => {
  const cases = [
    'https://evil.example/phish',
    `https://${host}.evil.example/`,
    `http://${host}//evil.example/x`,
    `http://${host}/\\evil.example/x`,
    'not a url',
    undefined,
  ];
  for (const referer of cases) {
    const location = (await switchLang(referer)).headers.get('location');
    assert.ok(location.startsWith('/') && !location.startsWith('//'), `${referer} -> ${location}`);
    assert.doesNotMatch(location, /^\/\\/, `${referer} -> ${location}`);
  }
  assert.equal((await switchLang('https://evil.example/phish')).headers.get('location'), '/');
});
