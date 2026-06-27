/**
 * Google OAuth 2.0 social login helpers.
 *
 * Implements the authorization-code flow against Google using only built-in
 * `fetch` and `crypto` — no extra dependencies. Admin sessions are kept
 * stateless via an HMAC-signed cookie, so there is no session store to manage.
 */

import crypto from 'crypto';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

const DEFAULT_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

/**
 * Secret used to sign admin session cookies.
 * Falls back to GOOGLE_CLIENT_SECRET so a working OAuth config also yields a
 * working signing key, but a dedicated SESSION_SECRET is recommended.
 */
export function getSessionSecret() {
  return process.env.SESSION_SECRET || process.env.GOOGLE_CLIENT_SECRET || '';
}

/**
 * Parse the ADMIN_EMAILS allowlist (comma-separated) into a normalized array.
 */
export function getAllowedEmails() {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Returns true when the given email is on the admin allowlist.
 * An empty allowlist denies everyone (matching the previous "no secret => no
 * admin" behavior).
 */
export function isEmailAllowed(email) {
  if (!email) return false;
  const allowed = getAllowedEmails();
  if (allowed.length === 0) return false;
  return allowed.includes(String(email).trim().toLowerCase());
}

/**
 * True when the minimum Google OAuth configuration is present.
 */
export function isGoogleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/**
 * Resolve the OAuth callback URL.
 * Uses GOOGLE_CALLBACK_URL when set, otherwise derives it from the request,
 * honoring the X-Forwarded-Proto header behind a reverse proxy.
 */
export function getCallbackUrl(req) {
  if (process.env.GOOGLE_CALLBACK_URL) return process.env.GOOGLE_CALLBACK_URL;
  const proto = (req.get && req.get('x-forwarded-proto')) || req.protocol || 'http';
  const host = req.get && req.get('host');
  return `${proto}://${host}/auth/google/callback`;
}

/**
 * Build the Google consent-screen URL.
 */
export function getAuthUrl({ state, callbackUrl }) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    redirect_uri: callbackUrl,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange an authorization code for tokens at Google's token endpoint.
 * `fetchImpl` is injectable for testing.
 */
export async function exchangeCodeForTokens({ code, callbackUrl, fetchImpl = fetch }) {
  const body = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirect_uri: callbackUrl,
    grant_type: 'authorization_code',
  });

  const res = await fetchImpl(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Token exchange failed: ${res.status} ${text}`);
  }
  return res.json();
}

/**
 * Decode the payload of a Google ID token (a JWT).
 *
 * The token is received directly from Google's token endpoint over TLS in the
 * authorization-code flow, so decoding (without re-verifying the signature) is
 * the standard, safe way to read the user's profile claims.
 */
export function decodeIdToken(idToken) {
  const parts = String(idToken).split('.');
  if (parts.length !== 3) throw new Error('Invalid id_token');
  return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
}

/**
 * Create a signed, stateless admin session token for the given email.
 * Format: `base64url(payload).base64url(hmac)`.
 */
export function createSessionToken(email, { ttlMs = DEFAULT_SESSION_TTL_MS, now = Date.now(), secret = getSessionSecret() } = {}) {
  if (!secret) throw new Error('Missing session secret');
  const payload = base64url(
    JSON.stringify({ email: String(email).trim().toLowerCase(), exp: now + ttlMs })
  );
  const sig = base64url(crypto.createHmac('sha256', secret).update(payload).digest());
  return `${payload}.${sig}`;
}

/**
 * Verify a session token's signature and expiry.
 * Returns the decoded payload ({ email, exp }) when valid, otherwise null.
 */
export function verifySessionToken(token, { now = Date.now(), secret = getSessionSecret() } = {}) {
  if (!token || typeof token !== 'string' || !secret) return null;

  const idx = token.lastIndexOf('.');
  if (idx < 1) return null;

  const payload = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const expected = base64url(crypto.createHmac('sha256', secret).update(payload).digest());

  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  let data;
  try {
    data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
  } catch {
    return null;
  }

  if (!data || typeof data.exp !== 'number' || data.exp < now) return null;
  return data;
}

export const SESSION_COOKIE = 'admin_session';
export const STATE_COOKIE = 'oauth_state';
export const SESSION_TTL_MS = DEFAULT_SESSION_TTL_MS;
