/**
 * Security utilities for input validation and sanitization
 */

import crypto from 'crypto';

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
 * Tracks requests per IP address
 */
class RateLimiter {
  constructor(windowMs = 60 * 1000, maxRequests = 5) {
    this.store = new Map();
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;

    // Clean up old entries every 5 minutes
    setInterval(() => {
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
  }

  check(ip) {
    const now = Date.now();
    const userRequests = this.store.get(ip) || [];

    // Remove old requests outside the window
    const recentRequests = userRequests.filter(time => now - time < this.windowMs);

    if (recentRequests.length >= this.maxRequests) {
      return false; // Rate limit exceeded
    }

    // Add current request
    recentRequests.push(now);
    this.store.set(ip, recentRequests);

    return true; // Request allowed
  }
}

/**
 * Check if the request has a valid admin cookie.
 * Compares the `admin` cookie against the SHA-256 hash of ADMIN_SECRET.
 */
export function isAdmin(req) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  const expectedHash = crypto.createHash('sha256').update(secret).digest('hex');
  return req.cookies.admin === expectedHash;
}

// Export rate limiter instances for different endpoints
export const createRateLimiter = new RateLimiter(60 * 1000, 5); // 5 per minute for creates
export const deleteRateLimiter = new RateLimiter(60 * 1000, 10); // 10 per minute for deletes
