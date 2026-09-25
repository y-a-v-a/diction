/**
 * Response headers that limit what a page may load and who may embed it.
 *
 * The Content-Security-Policy is written for what the app actually uses:
 * - scripts and styles are same-origin, plus inline <script>/<style> blocks
 *   and a few inline handlers in the views ('unsafe-inline');
 * - fonts come from Google Fonts;
 * - audio is served either by this app (filesystem storage) or from Vercel
 *   Blob, and player.js also fetch()es it to draw the waveform, so the Blob
 *   origin is allowed for both media and connections.
 *
 * Even with inline scripts allowed, the policy blocks scripts from other
 * origins, plugins, <base> hijacking, forms posting elsewhere and framing.
 */
const BLOB_ORIGIN = 'https://*.public.blob.vercel-storage.com';

export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  `media-src 'self' ${BLOB_ORIGIN}`,
  `connect-src 'self' ${BLOB_ORIGIN}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

export function securityHeaders(req, res, next) {
  res.set({
    'Content-Security-Policy': CONTENT_SECURITY_POLICY,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  });
  next();
}

/**
 * The path of the page that linked here, if it is on this site; otherwise
 * '/'. For redirecting "back" without becoming an open redirect.
 */
export function sameOriginReferrer(req) {
  const referer = req.get('Referer');
  if (!referer) return '/';
  try {
    const url = new URL(referer);
    if (url.host !== req.get('host')) return '/';
    // Collapse leading slashes: "//evil.example" would be protocol-relative
    return '/' + url.pathname.replace(/^\/+/, '') + url.search;
  } catch {
    return '/';
  }
}
