import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  getAllowedEmails,
  isEmailAllowed,
  isGoogleConfigured,
  getCallbackUrl,
  getAuthUrl,
  exchangeCodeForTokens,
  decodeIdToken,
  createSessionToken,
  verifySessionToken,
} from '../utils/googleAuth.js';
import { isAdmin } from '../utils/security.js';

const SECRET = 'test-session-secret';

/** Build a minimal Express-like req stub. */
function reqStub({ headers = {}, cookies = {}, protocol = 'http' } = {}) {
  const lower = {};
  for (const [k, v] of Object.entries(headers)) lower[k.toLowerCase()] = v;
  return {
    protocol,
    cookies,
    get(name) {
      return lower[String(name).toLowerCase()];
    },
  };
}

/** Encode a fake Google id_token (header.payload.signature). */
function fakeIdToken(payload) {
  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64(payload)}.sig`;
}

test('getAllowedEmails parses, trims, and lowercases', () => {
  process.env.ADMIN_EMAILS = ' Alice@Example.com , bob@example.com ,';
  assert.deepEqual(getAllowedEmails(), ['alice@example.com', 'bob@example.com']);
});

test('isEmailAllowed is case-insensitive and respects the allowlist', () => {
  process.env.ADMIN_EMAILS = 'alice@example.com';
  assert.equal(isEmailAllowed('ALICE@example.com'), true);
  assert.equal(isEmailAllowed('mallory@example.com'), false);
  assert.equal(isEmailAllowed(''), false);
  assert.equal(isEmailAllowed(undefined), false);
});

test('isEmailAllowed denies everyone when allowlist is empty', () => {
  process.env.ADMIN_EMAILS = '';
  assert.equal(isEmailAllowed('alice@example.com'), false);
});

test('isGoogleConfigured reflects presence of client id and secret', () => {
  delete process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_SECRET;
  assert.equal(isGoogleConfigured(), false);
  process.env.GOOGLE_CLIENT_ID = 'id';
  process.env.GOOGLE_CLIENT_SECRET = 'secret';
  assert.equal(isGoogleConfigured(), true);
});

test('getCallbackUrl honors explicit env and falls back to the request', () => {
  process.env.GOOGLE_CALLBACK_URL = 'https://example.com/auth/google/callback';
  assert.equal(getCallbackUrl(reqStub()), 'https://example.com/auth/google/callback');

  delete process.env.GOOGLE_CALLBACK_URL;
  const req = reqStub({ headers: { host: 'localhost:3000' } });
  assert.equal(getCallbackUrl(req), 'http://localhost:3000/auth/google/callback');

  const proxied = reqStub({
    headers: { host: 'diction.example.com', 'x-forwarded-proto': 'https' },
  });
  assert.equal(getCallbackUrl(proxied), 'https://diction.example.com/auth/google/callback');
});

test('getAuthUrl includes required OAuth parameters', () => {
  process.env.GOOGLE_CLIENT_ID = 'my-client-id';
  const url = new URL(getAuthUrl({ state: 'xyz', callbackUrl: 'http://localhost:3000/auth/google/callback' }));
  assert.equal(url.origin + url.pathname, 'https://accounts.google.com/o/oauth2/v2/auth');
  assert.equal(url.searchParams.get('client_id'), 'my-client-id');
  assert.equal(url.searchParams.get('redirect_uri'), 'http://localhost:3000/auth/google/callback');
  assert.equal(url.searchParams.get('response_type'), 'code');
  assert.equal(url.searchParams.get('state'), 'xyz');
  assert.match(url.searchParams.get('scope'), /openid/);
  assert.match(url.searchParams.get('scope'), /email/);
});

test('decodeIdToken extracts the JWT payload', () => {
  const token = fakeIdToken({ email: 'alice@example.com', email_verified: true });
  const payload = decodeIdToken(token);
  assert.equal(payload.email, 'alice@example.com');
  assert.equal(payload.email_verified, true);
});

test('decodeIdToken rejects malformed tokens', () => {
  assert.throws(() => decodeIdToken('not-a-jwt'));
});

test('exchangeCodeForTokens posts to Google and returns parsed JSON', async () => {
  process.env.GOOGLE_CLIENT_ID = 'id';
  process.env.GOOGLE_CLIENT_SECRET = 'secret';
  let captured;
  const fetchImpl = async (url, opts) => {
    captured = { url, opts };
    return {
      ok: true,
      async json() {
        return { id_token: 'tok', access_token: 'at' };
      },
    };
  };
  const result = await exchangeCodeForTokens({
    code: 'auth-code',
    callbackUrl: 'http://localhost:3000/auth/google/callback',
    fetchImpl,
  });
  assert.equal(result.id_token, 'tok');
  assert.equal(captured.url, 'https://oauth2.googleapis.com/token');
  assert.equal(captured.opts.method, 'POST');
  const body = new URLSearchParams(captured.opts.body);
  assert.equal(body.get('code'), 'auth-code');
  assert.equal(body.get('grant_type'), 'authorization_code');
});

test('exchangeCodeForTokens throws on a non-ok response', async () => {
  const fetchImpl = async () => ({
    ok: false,
    status: 400,
    async text() {
      return 'invalid_grant';
    },
  });
  await assert.rejects(
    exchangeCodeForTokens({ code: 'bad', callbackUrl: 'http://x/cb', fetchImpl }),
    /Token exchange failed: 400/
  );
});

test('session token round-trips and carries the normalized email', () => {
  const token = createSessionToken('Alice@Example.com', { secret: SECRET });
  const data = verifySessionToken(token, { secret: SECRET });
  assert.ok(data);
  assert.equal(data.email, 'alice@example.com');
});

test('verifySessionToken rejects a tampered payload', () => {
  const token = createSessionToken('alice@example.com', { secret: SECRET });
  const [, sig] = token.split('.');
  const forgedPayload = Buffer.from(
    JSON.stringify({ email: 'mallory@example.com', exp: Date.now() + 1000 })
  ).toString('base64url');
  const forged = `${forgedPayload}.${sig}`;
  assert.equal(verifySessionToken(forged, { secret: SECRET }), null);
});

test('verifySessionToken rejects a wrong signing secret', () => {
  const token = createSessionToken('alice@example.com', { secret: SECRET });
  assert.equal(verifySessionToken(token, { secret: 'other-secret' }), null);
});

test('verifySessionToken rejects an expired token', () => {
  const token = createSessionToken('alice@example.com', { secret: SECRET, ttlMs: 1000, now: 0 });
  assert.equal(verifySessionToken(token, { secret: SECRET, now: 10_000 }), null);
});

test('verifySessionToken handles missing/garbage input', () => {
  assert.equal(verifySessionToken(undefined, { secret: SECRET }), null);
  assert.equal(verifySessionToken('', { secret: SECRET }), null);
  assert.equal(verifySessionToken('no-dot', { secret: SECRET }), null);
  assert.equal(verifySessionToken('a.b', { secret: '' }), null);
});

test('isAdmin accepts a valid session for an allowlisted email', () => {
  process.env.SESSION_SECRET = SECRET;
  process.env.ADMIN_EMAILS = 'alice@example.com';
  const token = createSessionToken('alice@example.com', { secret: SECRET });
  assert.equal(isAdmin(reqStub({ cookies: { admin_session: token } })), true);
});

test('isAdmin rejects a valid session for a non-allowlisted email', () => {
  process.env.SESSION_SECRET = SECRET;
  process.env.ADMIN_EMAILS = 'alice@example.com';
  const token = createSessionToken('mallory@example.com', { secret: SECRET });
  assert.equal(isAdmin(reqStub({ cookies: { admin_session: token } })), false);
});

test('isAdmin rejects requests with no session cookie', () => {
  process.env.SESSION_SECRET = SECRET;
  process.env.ADMIN_EMAILS = 'alice@example.com';
  assert.equal(isAdmin(reqStub({ cookies: {} })), false);
});
