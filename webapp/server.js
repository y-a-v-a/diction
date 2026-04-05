import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getLanguage, isValidLanguage } from './languages/index.js';
import { csrfMiddleware } from './utils/security.js';
import { setupIndexRoutes } from './routes/index.js';
import { setupCreateRoutes } from './routes/create.js';
import { setupDictationRoutes } from './routes/dictation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

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

// Serve static audio files from dictations directory
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

// Start server
app.listen(PORT, () => {
  console.log(`\n🎙️  Dictee app running on http://localhost:${PORT}`);
  console.log(`\nMake sure you have created a .env file with:`);
  console.log(`- ANTHROPIC_API_KEY`);
  console.log(`- ELEVENLABS_API_KEY`);
  console.log(`- ELEVENLABS_VOICE_ID\n`);
});
