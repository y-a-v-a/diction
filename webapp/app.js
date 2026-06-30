import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getLanguage, isValidLanguage } from './languages/index.js';
import crypto from 'crypto';
import { csrfMiddleware, isAdmin } from './utils/security.js';
import {
  getAuthUrl,
  getCallbackUrl,
  exchangeCodeForTokens,
  decodeIdToken,
  createSessionToken,
  isEmailAllowed,
  isGoogleConfigured,
  SESSION_COOKIE,
  STATE_COOKIE,
  SESSION_TTL_MS,
} from './utils/googleAuth.js';
import { setupIndexRoutes } from './routes/index.js';
import { setupCreateRoutes } from './routes/create.js';
import { setupDictationRoutes } from './routes/dictation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Behind Vercel's (or any) reverse proxy, trust the X-Forwarded-* headers so
// req.ip, req.protocol and secure-cookie handling reflect the real client.
app.set('trust proxy', 1);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CSRF middleware — sets _csrf cookie + req.csrfToken
app.use(csrfMiddleware);

// Language middleware — sets req.lang based on cookie
app.use((req, res, next) => {
  const langCode = req.cookies.lang && isValidLanguage(req.cookies.lang) ? req.cookies.lang : 'nl';
  req.lang = getLanguage(langCode);
  req.langCode = langCode;
  next();
});

// Language switch endpoint
app.get('/lang/:code', (req, res) => {
  const { code } = req.params;
  if (isValidLanguage(code)) {
    res.cookie('lang', code, { maxAge: 365 * 24 * 60 * 60 * 1000, sameSite: 'lax' });
  }
  res.redirect(req.get('Referer') || '/');
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve static audio files from the local dictations directory.
// Only relevant for the filesystem storage backend (local/Docker); on Vercel
// audio is served straight from Blob's public URLs.
app.use('/dictations', express.static(path.join(__dirname, 'dictations')));

/**
 * Template rendering function
 * Replaces {{placeholders}} in content and layout.
 * Layout-level placeholders (nav, lang) are injected automatically from req.lang.
 */
function render(req, templateName, data = {}) {
  const layoutPath = path.join(__dirname, 'views', 'layout.html');
  const contentPath = path.join(__dirname, 'views', templateName);

  let layout = fs.readFileSync(layoutPath, 'utf-8');
  let content = fs.readFileSync(contentPath, 'utf-8');

  // Merge layout-level strings from the UI language
  const ui = req.lang.ui;
  const layoutData = {
    langCode: req.langCode,
    navHome: ui.navHome,
    navDictations: ui.navDictations,
    appTitle: ui.appTitle,
    langSwitch: ui.langSwitch,
    langSwitchCode: req.langCode === 'nl' ? 'en-US' : 'nl',
    themeSwitch: req.cookies.theme === 'light' ? ui.themeDark : ui.themeLight,
    themeLightLabel: ui.themeLight,
    themeDarkLabel: ui.themeDark,
    footerDescription: ui.footerDescription,
    footerCopyright: ui.footerCopyright,
    ...data,
  };

  // Replace placeholders in content
  for (const [key, value] of Object.entries(layoutData)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    content = content.replace(regex, String(value));
  }

  // Insert content into layout, then replace layout-level placeholders
  layout = layout.replace('{{content}}', content);
  for (const [key, value] of Object.entries(layoutData)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    layout = layout.replace(regex, String(value));
  }

  return layout;
}

// Admin login page — shows the "Sign in with Google" button
app.get('/admin/login', (req, res) => {
  if (isAdmin(req)) return res.redirect('/dictations');
  const ui = req.lang.ui;
  res.send(render(req, 'admin-login.html', {
    adminLoginHeading: ui.adminLoginHeading,
    adminLoginDescription: ui.adminLoginDescription,
    googleSignIn: ui.googleSignIn,
    error: req.query.error ? `<div class="error">${ui.adminLoginError}</div>` : '',
  }));
});

// Start the Google OAuth flow
app.get('/auth/google', (req, res) => {
  if (!isGoogleConfigured()) {
    return res.status(500).send(req.lang.ui.googleNotConfigured);
  }
  const state = crypto.randomBytes(16).toString('hex');
  // sameSite 'lax' so the cookie returns on the top-level redirect from Google
  res.cookie(STATE_COOKIE, state, { httpOnly: true, maxAge: 10 * 60 * 1000, sameSite: 'lax' });
  res.redirect(getAuthUrl({ state, callbackUrl: getCallbackUrl(req) }));
});

// Google OAuth callback — verifies the user and issues an admin session
app.get('/auth/google/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    const savedState = req.cookies[STATE_COOKIE];
    res.clearCookie(STATE_COOKIE);

    if (!code || !state || !savedState || state !== savedState) {
      return res.redirect('/admin/login?error=1');
    }

    const tokens = await exchangeCodeForTokens({ code, callbackUrl: getCallbackUrl(req) });
    const profile = decodeIdToken(tokens.id_token);

    if (!profile.email || profile.email_verified === false || !isEmailAllowed(profile.email)) {
      return res.redirect('/admin/login?error=1');
    }

    const session = createSessionToken(profile.email);
    res.cookie(SESSION_COOKIE, session, { httpOnly: true, maxAge: SESSION_TTL_MS, sameSite: 'lax' });
    res.redirect('/dictations');
  } catch (err) {
    console.error('Google auth error:', err);
    res.redirect('/admin/login?error=1');
  }
});

app.get('/admin/logout', (req, res) => {
  res.clearCookie(SESSION_COOKIE);
  res.redirect('/dictations');
});

// Setup routes
setupIndexRoutes(app, render);
setupCreateRoutes(app, render);
setupDictationRoutes(app, render);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  const ui = req.lang ? req.lang.ui : { unexpectedError: 'An error occurred.' };
  res.status(500).send(ui.unexpectedError);
});

// 404 handler
app.use((req, res) => {
  res.status(404).send(req.lang ? req.lang.ui.notFound : 'Not found');
});

export default app;
