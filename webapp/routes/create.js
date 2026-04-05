import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { generateSentences, generateTitle } from '../services/claude.js';
import { generateSpeech, delay, getCurrentService } from '../services/tts.js';
import { generateId, createDictation, getDictationPath, deleteDictation } from '../services/storage.js';
import { escapeHtml, createRateLimiter } from '../utils/security.js';
import { getAvailableLanguages, getLanguage, isValidLanguage } from '../languages/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Middleware to check if request has valid secret token
 */
function requireSecretToken(req, res, next) {
  const secretToken = process.env.CREATE_SECRET_TOKEN;

  if (!secretToken) {
    console.warn('CREATE_SECRET_TOKEN not set in .env - /create route is unprotected!');
    return next();
  }

  const providedToken = req.query.token || req.body.token;

  if (!providedToken || providedToken !== secretToken) {
    console.warn(`Unauthorized access attempt to /create from ${req.ip}`);
    const forbiddenPagePath = path.join(__dirname, '../views/403.html');
    const forbiddenPage = fs.readFileSync(forbiddenPagePath, 'utf-8');
    return res.status(403).send(forbiddenPage);
  }

  next();
}

/**
 * Validate and sanitize a topic string
 */
function validateTopic(topic, fieldName) {
  if (typeof topic !== 'string') {
    throw new Error(`${fieldName}: invalid`);
  }

  const trimmed = topic.trim();

  if (!trimmed) {
    throw new Error(`${fieldName}: empty`);
  }

  if (trimmed.length > 100) {
    throw new Error(`${fieldName}: too long`);
  }

  if (/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/.test(trimmed)) {
    throw new Error(`${fieldName}: invalid characters`);
  }

  const sanitized = trimmed.replace(/[\n\r\t]/g, ' ');

  const specialCharCount = (sanitized.match(/[^a-zA-Z0-9\s\-_.,!?]/g) || []).length;
  if (specialCharCount > sanitized.length * 0.5) {
    throw new Error(`${fieldName}: too many special characters`);
  }

  return sanitized;
}

/**
 * Build language select dropdown HTML
 */
function buildLanguageSelect(selectedCode) {
  const languages = getAvailableLanguages();
  let html = '<select id="language" name="language" required>';
  for (const lang of languages) {
    const selected = lang.code === selectedCode ? ' selected' : '';
    html += `<option value="${escapeHtml(lang.code)}"${selected}>${escapeHtml(lang.displayName)}</option>`;
  }
  html += '</select>';
  return html;
}

export function setupCreateRoutes(app, render) {
  // GET /create - Show creation form (protected by secret token)
  app.get('/create', requireSecretToken, (req, res) => {
    const token = req.query.token || '';
    const tokenInput = token ? `<input type="hidden" name="token" value="${escapeHtml(token)}">` : '';
    const ui = req.lang.ui;
    const html = render(req, 'create.html', {
      tokenInput,
      languageSelect: buildLanguageSelect('nl'),
      createHeading: ui.createHeading,
      createDescription: ui.createDescription,
      languageLabel: ui.languageLabel,
      topic1Label: ui.topic1Label,
      topic1Placeholder: ui.topic1Placeholder,
      topic2Label: ui.topic2Label,
      topic2Placeholder: ui.topic2Placeholder,
      topic3Label: ui.topic3Label,
      topic3Placeholder: ui.topic3Placeholder,
      sentenceCountLabel: ui.sentenceCountLabel,
      pinLabel: ui.pinLabel,
      pinHint: ui.pinHint,
      generateButton: ui.generateButton,
      cancelButton: ui.cancelButton,
      generating: ui.generating,
      generatingHint: ui.generatingHint,
    });
    res.send(html);
  });

  // POST /create - Generate new dictation (protected by secret token)
  app.post('/create', requireSecretToken, async (req, res) => {
    try {
      const ui = req.lang.ui;

      // Rate limiting check
      const clientIp = req.ip || req.connection.remoteAddress;
      if (!createRateLimiter.check(clientIp)) {
        return res.status(429).send(
          render(req, 'create.html', {
            tokenInput: '', languageSelect: buildLanguageSelect('nl'),
            createHeading: ui.createHeading, createDescription: ui.createDescription,
            languageLabel: ui.languageLabel,
            topic1Label: ui.topic1Label, topic1Placeholder: ui.topic1Placeholder,
            topic2Label: ui.topic2Label, topic2Placeholder: ui.topic2Placeholder,
            topic3Label: ui.topic3Label, topic3Placeholder: ui.topic3Placeholder,
            sentenceCountLabel: ui.sentenceCountLabel,
            pinLabel: ui.pinLabel, pinHint: ui.pinHint,
            generateButton: ui.generateButton, cancelButton: ui.cancelButton,
            generating: ui.generating, generatingHint: ui.generatingHint,
          }) + `<div class="error">${escapeHtml(ui.rateLimitError)}</div>`
        );
      }

      const { topic1, topic2, topic3, sentenceCount, language, pin } = req.body;

      // Validate language (dictation language, separate from UI language)
      const languageCode = language && isValidLanguage(language) ? language : 'nl';
      const lang = getLanguage(languageCode);

      function renderCreateError(errorHtml) {
        return render(req, 'create.html', {
          tokenInput: '', languageSelect: buildLanguageSelect(languageCode),
          createHeading: ui.createHeading, createDescription: ui.createDescription,
          languageLabel: ui.languageLabel,
          topic1Label: ui.topic1Label, topic1Placeholder: ui.topic1Placeholder,
          topic2Label: ui.topic2Label, topic2Placeholder: ui.topic2Placeholder,
          topic3Label: ui.topic3Label, topic3Placeholder: ui.topic3Placeholder,
          sentenceCountLabel: ui.sentenceCountLabel,
          pinLabel: ui.pinLabel, pinHint: ui.pinHint,
          generateButton: ui.generateButton, cancelButton: ui.cancelButton,
          generating: ui.generating, generatingHint: ui.generatingHint,
        }) + errorHtml;
      }

      // Validate and sanitize topics
      let topics;
      try {
        topics = [
          validateTopic(topic1, ui.topic1Label),
          validateTopic(topic2, ui.topic2Label),
          validateTopic(topic3, ui.topic3Label)
        ];
      } catch (validationError) {
        return res.status(400).send(
          renderCreateError(`<div class="error">${escapeHtml(validationError.message)}</div>`)
        );
      }

      // Validate sentence count
      const count = parseInt(sentenceCount, 10);
      if (isNaN(count) || count < 1 || count > 8) {
        return res.status(400).send(
          renderCreateError(`<div class="error">${escapeHtml(ui.sentenceCountError)}</div>`)
        );
      }

      // Validate PIN (optional, 4-6 digits)
      let validatedPin = null;
      if (pin && pin.trim()) {
        if (!/^[0-9]{4,6}$/.test(pin.trim())) {
          return res.status(400).send(
            renderCreateError(`<div class="error">${escapeHtml(ui.pinFormatError)}</div>`)
          );
        }
        validatedPin = pin.trim();
      }

      // Generate unique ID
      const id = generateId();
      const dictationPath = getDictationPath(id);
      let dictationCreated = false;

      // Load language config for TTS
      const ttsOptions = {
        languageCode: lang.tts.languageCode,
        voiceId: lang.tts.voiceId || (languageCode !== 'nl' ? process.env[`ELEVENLABS_VOICE_ID_${languageCode.replace('-', '_').toUpperCase()}`] : null),
      };

      try {
        // Step 1: Generate sentences using Claude
        console.log(`Generating ${count} ${languageCode} sentences for dictation ${id}...`);
        const sentences = await generateSentences(topics[0], topics[1], topics[2], count, languageCode);
        console.log(`Generated ${sentences.length} sentences`);

        // Step 2: Generate a title and create dictation metadata
        const title = await generateTitle(topics, sentences, languageCode);
        createDictation(id, topics, sentences, { title, language: languageCode, pin: validatedPin });
        dictationCreated = true;
        console.log(`Dictation ${id} metadata saved`);

        // Step 3: Generate audio for each sentence
        console.log(`Generating audio files for dictation ${id} using ${getCurrentService()}...`);
        for (let i = 0; i < sentences.length; i++) {
          const audioPath = path.join(dictationPath, `${i}.mp3`);
          console.log(`Generating audio ${i + 1}/${sentences.length}...`);

          await generateSpeech(sentences[i], audioPath, ttsOptions);

          if (i < sentences.length - 1) {
            await delay(500);
          }
        }

        console.log(`Dictation ${id} created successfully with all audio`);
        res.redirect(`/dictation/${id}`);

      } catch (error) {
        console.error('Error creating dictation:', error);

        if (dictationCreated) {
          console.log(`Dictation ${id} kept with partial audio due to: ${error.message}`);
          res.redirect(`/dictation/${id}?warning=audio-incomplete`);
        } else {
          deleteDictation(id);
          const safeErrorMessage = escapeHtml(error.message);
          const errorHtml = `
            <div class="error">
              <strong>${escapeHtml(ui.createError)}</strong><br>
              ${safeErrorMessage}
            </div>
          `;
          res.status(500).send(renderCreateError(errorHtml));
        }
      }

    } catch (error) {
      console.error('Unexpected error:', error);
      res.status(500).send(req.lang.ui.unexpectedError);
    }
  });
}
