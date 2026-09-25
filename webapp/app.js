import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { getLocale, isValidLocale } from './i18n/index.js';
import crypto from 'crypto';
import { csrfMiddleware, isAdmin } from './utils/security.js';
import { renderWithLayout } from './utils/templates.js';
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

// UI language middleware — sets req.lang (a UI locale) based on cookie
app.use((req, res, next) => {
  const langCode = req.cookies.lang && isValidLocale(req.cookies.lang) ? req.cookies.lang : 'nl';
  req.lang = getLocale(langCode);
  req.langCode = langCode;
  next();
});

// Language switch endpoint
app.get('/lang/:code', (req, res) => {
  const { code } = req.params;
  if (isValidLocale(code)) {
    res.cookie('lang', code, { maxAge: 365 * 24 * 60 * 60 * 1000, sameSite: 'lax' });
  }
  res.redirect(req.get('Referer') || '/');
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve static audio files from the local dictations directory.
// Only relevant for the filesystem storage backend (local/Docker); on Vercel
// audio is served straight from Blob's public URLs.
//
// Only /<id>/<n>.mp3 is exposed: the same directories hold metadata.json,
// which contains the play-mode PIN and the full sentence text. Anything else
// falls through to the regular routes (and their 404).
// redirect: false stops the static handler from 301-ing the /dictations
// listing page to /dictations/ just because a directory with that name exists.
const AUDIO_PATH = /^\/[0-9a-f]{8}\/\d+\.mp3$/;
const serveAudio = express.static(path.join(__dirname, 'dictations'), { redirect: false });
app.use('/dictations', (req, res, next) => {
  if (!AUDIO_PATH.test(req.path)) return next();
  serveAudio(req, res, next);
});

/**
 * Render a view inside layout.html.
 * Layout-level placeholders (nav, lang, theme) are filled automatically from
 * req.lang; `data` adds page-specific values and may override them.
 */
function render(req, templateName, data = {}) {
  const ui = req.lang.ui;
  return renderWithLayout(templateName, {
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
  });
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
