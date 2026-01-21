import path from 'path';
import { generateSentences } from '../services/claude.js';
import { generateSpeech, delay, getCurrentService } from '../services/tts.js';
import { generateId, createDictation, getDictationPath, deleteDictation } from '../services/storage.js';
import { escapeHtml, createRateLimiter } from '../utils/security.js';

/**
 * Middleware to check if request has valid secret token
 * For PoC/demo: only users with the secret token can access /create
 */
function requireSecretToken(req, res, next) {
  const secretToken = process.env.CREATE_SECRET_TOKEN;

  // If no token is configured, allow access (for development)
  if (!secretToken) {
    console.warn('⚠️  CREATE_SECRET_TOKEN not set in .env - /create route is unprotected!');
    return next();
  }

  // Check token in query string (GET) or request body (POST)
  const providedToken = req.query.token || req.body.token;

  if (!providedToken || providedToken !== secretToken) {
    console.warn(`🔒 Unauthorized access attempt to /create from ${req.ip}`);
    return res.status(403).send(`
      <!DOCTYPE html>
      <html lang="nl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Toegang Geweigerd</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .error-box {
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            text-align: center;
            max-width: 400px;
          }
          h1 { color: #e74c3c; margin-top: 0; }
          p { color: #555; line-height: 1.6; }
          a { color: #667eea; text-decoration: none; font-weight: 600; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="error-box">
          <h1>🔒 Toegang Geweigerd</h1>
          <p>Je hebt geen toegang tot deze pagina. Deze functie is alleen beschikbaar voor geautoriseerde gebruikers.</p>
          <p><a href="/">← Terug naar home</a></p>
        </div>
      </body>
      </html>
    `);
  }

  // Token is valid, continue
  next();
}

/**
 * Validate and sanitize a topic string
 */
function validateTopic(topic, fieldName) {
  // Type check
  if (typeof topic !== 'string') {
    throw new Error(`${fieldName} moet een tekstwaarde zijn.`);
  }

  // Trim whitespace
  const trimmed = topic.trim();

  // Check if empty
  if (!trimmed) {
    throw new Error(`${fieldName} mag niet leeg zijn.`);
  }

  // Check length
  if (trimmed.length > 100) {
    throw new Error(`${fieldName} mag maximaal 100 tekens bevatten.`);
  }

  // Check for control characters (except newlines and tabs which we'll strip)
  if (/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/.test(trimmed)) {
    throw new Error(`${fieldName} bevat ongeldige tekens.`);
  }

  // Remove any newlines or tabs to prevent prompt injection
  const sanitized = trimmed.replace(/[\n\r\t]/g, ' ');

  // Check for excessive special characters (potential abuse)
  const specialCharCount = (sanitized.match(/[^a-zA-Z0-9\s\-_.,!?]/g) || []).length;
  if (specialCharCount > sanitized.length * 0.5) {
    throw new Error(`${fieldName} bevat te veel speciale tekens.`);
  }

  return sanitized;
}

export function setupCreateRoutes(app, render) {
  // GET /create - Show creation form (protected by secret token)
  app.get('/create', requireSecretToken, (req, res) => {
    // Pass the token to the template so it can be included in the form
    const token = req.query.token || '';
    const tokenInput = token ? `<input type="hidden" name="token" value="${escapeHtml(token)}">` : '';
    const html = render('create.html', { tokenInput });
    res.send(html);
  });

  // POST /create - Generate new dictation (protected by secret token)
  app.post('/create', requireSecretToken, async (req, res) => {
    try {
      // Rate limiting check
      const clientIp = req.ip || req.connection.remoteAddress;
      if (!createRateLimiter.check(clientIp)) {
        return res.status(429).send(
          render('create.html', {}) +
          '<div class="error">Te veel verzoeken. Probeer het over een minuut opnieuw.</div>'
        );
      }

      const { topic1, topic2, topic3, sentenceCount } = req.body;

      // Validate and sanitize topics
      let topics;
      try {
        topics = [
          validateTopic(topic1, 'Onderwerp 1'),
          validateTopic(topic2, 'Onderwerp 2'),
          validateTopic(topic3, 'Onderwerp 3')
        ];
      } catch (validationError) {
        return res.status(400).send(
          render('create.html', {}) +
          `<div class="error">${escapeHtml(validationError.message)}</div>`
        );
      }

      // Validate sentence count
      const count = parseInt(sentenceCount, 10);
      if (isNaN(count) || count < 1 || count > 8) {
        return res.status(400).send(
          render('create.html', {}) +
          '<div class="error">Aantal zinnen moet tussen 1 en 8 zijn.</div>'
        );
      }

      // Generate unique ID
      const id = generateId();
      const dictationPath = getDictationPath(id);
      let dictationCreated = false;

      try {
        // Step 1: Generate sentences using Claude
        console.log(`Generating ${count} sentences for dictation ${id}...`);
        const sentences = await generateSentences(topics[0], topics[1], topics[2], count);
        console.log(`Generated ${sentences.length} sentences`);

        // Step 2: Create dictation metadata immediately (preserve Claude's work)
        createDictation(id, topics, sentences);
        dictationCreated = true;
        console.log(`Dictation ${id} metadata saved`);

        // Step 3: Generate audio for each sentence
        console.log(`Generating audio files for dictation ${id} using ${getCurrentService()}...`);
        for (let i = 0; i < sentences.length; i++) {
          const audioPath = path.join(dictationPath, `${i}.mp3`);
          console.log(`Generating audio ${i + 1}/${sentences.length}...`);

          await generateSpeech(sentences[i], audioPath);

          // Add delay to avoid rate limiting (except after last request)
          if (i < sentences.length - 1) {
            await delay(500);
          }
        }

        console.log(`Dictation ${id} created successfully with all audio`);

        // Redirect to the dictation page
        res.redirect(`/dictation/${id}`);

      } catch (error) {
        console.error('Error creating dictation:', error);

        if (dictationCreated) {
          // Dictation metadata exists with sentences - keep it even if audio generation failed
          console.log(`Dictation ${id} kept with partial audio due to: ${error.message}`);
          res.redirect(`/dictation/${id}?warning=audio-incomplete`);
        } else {
          // Claude generation failed - nothing useful to keep
          deleteDictation(id);

          // Escape error message to prevent XSS
          const safeErrorMessage = escapeHtml(error.message);
          const errorHtml = `
            <div class="error">
              <strong>Fout bij het maken van het dictee:</strong><br>
              ${safeErrorMessage}
            </div>
          `;
          res.status(500).send(render('create.html', {}) + errorHtml);
        }
      }

    } catch (error) {
      console.error('Unexpected error:', error);
      res.status(500).send('Er is een onverwachte fout opgetreden.');
    }
  });
}
