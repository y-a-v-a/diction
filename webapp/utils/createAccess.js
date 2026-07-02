/**
 * Access gate for the dictation creation flow — a web-layer concern.
 *
 * The core never checks who is calling it; this middleware decides whether
 * a request may reach the create routes at all. When broader user management
 * arrives (teacher/admin/classmate roles), it replaces or extends this gate
 * without touching the core.
 */
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { escapeHtml } from './security.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Render the standalone passphrase entry page
 */
export function renderPassphrasePage(req, error = '') {
  const ui = req.lang.ui;
  let html = fs.readFileSync(path.join(__dirname, '../views/passphrase.html'), 'utf-8');
  const data = {
    langCode: req.langCode,
    csrfInput: `<input type="hidden" name="_csrf" value="${escapeHtml(req.csrfToken)}">`,
    passphraseHeading: ui.passphraseHeading,
    passphraseDescription: ui.passphraseDescription,
    passphrasePlaceholder: ui.passphrasePlaceholder,
    submit: ui.submit,
    backHome: ui.backHome,
    error,
  };
  for (const [key, value] of Object.entries(data)) {
    html = html.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  }
  return html;
}

/**
 * Hash used both to set and to verify the create_access cookie.
 */
export function createAccessHash(passphrase) {
  return crypto.createHash('sha256').update(passphrase).digest('hex');
}

/**
 * Middleware to check if request has valid access.
 * Checks in order: create_access cookie → URL/body token → passphrase form → 403
 */
export function requireCreateAccess(req, res, next) {
  const secretToken = process.env.CREATE_SECRET_TOKEN;
  const passphrase = process.env.CREATE_PASSPHRASE;

  // If neither protection mechanism is configured, allow access (with warning)
  if (!secretToken && !passphrase) {
    console.warn('Neither CREATE_SECRET_TOKEN nor CREATE_PASSPHRASE set - /create route is unprotected!');
    return next();
  }

  // 1. Check cookie (set after successful passphrase entry)
  const expectedHash = passphrase ? createAccessHash(passphrase) : null;
  if (expectedHash && req.cookies.create_access === expectedHash) {
    return next();
  }

  // 2. Check URL/body token
  if (secretToken) {
    const providedToken = req.query.token || req.body.token;
    if (providedToken && providedToken === secretToken) {
      return next();
    }
  }

  // 3. If passphrase is configured, show the passphrase form
  if (passphrase) {
    return res.status(401).send(renderPassphrasePage(req));
  }

  // 4. Fall back to 403
  console.warn(`Unauthorized access attempt to /create from ${req.ip}`);
  const ui = req.lang.ui;
  let forbiddenPage = fs.readFileSync(path.join(__dirname, '../views/403.html'), 'utf-8');
  const data = {
    langCode: req.langCode,
    forbiddenTitle: ui.forbiddenTitle,
    forbiddenMessage: ui.forbiddenMessage,
    forbiddenBack: ui.forbiddenBack,
  };
  for (const [key, value] of Object.entries(data)) {
    forbiddenPage = forbiddenPage.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  }
  return res.status(403).send(forbiddenPage);
}
