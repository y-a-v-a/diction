/**
 * Security utilities for input validation and sanitization
 */

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

// Export rate limiter instances for different endpoints
export const createRateLimiter = new RateLimiter(60 * 1000, 5); // 5 per minute for creates
export const deleteRateLimiter = new RateLimiter(60 * 1000, 10); // 10 per minute for deletes
