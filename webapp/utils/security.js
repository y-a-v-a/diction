/**
 * Security utilities for input validation and sanitization
 */

import crypto from 'crypto';
import { verifySessionToken, isEmailAllowed, getSessionSecret, SESSION_COOKIE } from './googleAuth.js';

/**
 * Generate a CSRF token
 */
export function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * CSRF middleware — double-submit cookie pattern.
 * Sets a `_csrf` cookie if not present, attaches `req.csrfToken` for use in templates.
 */
export function csrfMiddleware(req, res, next) {
  let token = req.cookies._csrf;
  if (!token) {
    token = generateCsrfToken();
    res.cookie('_csrf', token, { httpOnly: true, sameSite: 'strict' });
  }
  req.csrfToken = token;
  next();
}

/**
 * Validate CSRF token from request body or header against the cookie.
 * Returns true if valid.
 */
export function validateCsrfToken(req) {
  const cookieToken = req.cookies._csrf;
  const submittedToken = req.body._csrf || req.get('x-csrf-token');
  return cookieToken && submittedToken && cookieToken === submittedToken;
}

/**
 * Escape HTML to prevent XSS attacks
 * @param {string} text - Text to escape
 * @returns {string} - HTML-escaped text
 */
export function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Simple in-memory rate limiter
 * Tracks requests per key (usually the client IP)
 */
export class RateLimiter {
  constructor(windowMs = 60 * 1000, maxRequests = 5) {
    this.store = new Map();
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;

    // Clean up old entries every 5 minutes. `unref()` so this timer never
    // keeps the process alive on its own (matters for the test runner and for
    // serverless functions freezing/exiting cleanly).
    const cleanup = setInterval(() => {
      const now = Date.now();
      for (const [ip, requests] of this.store.entries()) {
        const recentRequests = requests.filter(time => now - time < this.windowMs);
        if (recentRequests.length === 0) {
          this.store.delete(ip);
        } else {
          this.store.set(ip, recentRequests);
        }
      }
    }, 5 * 60 * 1000);
    if (typeof cleanup.unref === 'function') {
      cleanup.unref();
    }
  }

  /**
   * Record a request for `key` and return true if it is still within the
   * limit, false once the limit is exceeded.
   */
  check(key) {
    if (this.isLimited(key)) {
      return false; // Rate limit exceeded
    }
    this.hit(key);
    return true; // Request allowed
  }

  /**
   * True when `key` has used up its allowance in the current window.
   * Does not count as a request itself.
   */
  isLimited(key) {
    return this._recent(key).length >= this.maxRequests;
  }

  /**
   * Count one request (or failed attempt) for `key`.
   */
  hit(key) {
    const recentRequests = this._recent(key);
    recentRequests.push(Date.now());
    this.store.set(key, recentRequests);
  }

  _recent(key) {
    const now = Date.now();
    // Drop requests outside the window
    return (this.store.get(key) || []).filter(time => now - time < this.windowMs);
  }
}

/**
 * Constant-time string comparison. Both sides are hashed first so the
 * comparison takes the same time whatever the lengths are.
 */
export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const digest = (s) => crypto.createHash('sha256').update(s).digest();
  return crypto.timingSafeEqual(digest(a), digest(b));
}

/**
 * Value of the play_pin_<id> cookie that proves the PIN was entered.
 * An HMAC of the PIN rather than the PIN itself, so the cookie never carries
 * the secret and stops working as soon as the PIN changes.
 */
export function playPinToken(id, pin) {
  const key = getSessionSecret() || 'diction-play-pin';
  return crypto.createHmac('sha256', key).update(`play:${id}:${pin}`).digest('hex');
}

/**
 * Check if the request has a valid admin session.
 * Verifies the HMAC-signed `admin_session` cookie issued after Google login
 * and confirms the email is still on the admin allowlist.
 */
export function isAdmin(req) {
  const data = verifySessionToken(req.cookies && req.cookies[SESSION_COOKIE]);
  if (!data) return false;
  return isEmailAllowed(data.email);
}

// Export rate limiter instances for different endpoints
export const createRateLimiter = new RateLimiter(60 * 1000, 5); // 5 per minute for creates
export const deleteRateLimiter = new RateLimiter(60 * 1000, 10); // 10 per minute for deletes
// Wrong play-mode PINs, keyed per client and dictation. A 4-digit PIN has only
// 10,000 options, so without this it can be guessed in minutes.
export const pinRateLimiter = new RateLimiter(15 * 60 * 1000, 10); // 10 wrong PINs per 15 minutes
