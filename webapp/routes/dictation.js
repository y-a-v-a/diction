import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDictation, deleteDictation, updateDictation, isRevealed as checkRevealed } from '../services/storage.js';
import { escapeHtml, deleteRateLimiter, validateCsrfToken } from '../utils/security.js';
import { getLanguage } from '../languages/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Render a standalone template (bypasses layout.html)
 */
function renderTemplate(templateName, data = {}) {
  let html = fs.readFileSync(path.join(__dirname, '../views', templateName), 'utf-8');
  for (const [key, value] of Object.entries(data)) {
    html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return html;
}

export function setupDictationRoutes(app, render) {
  // GET /dictation/:id - Show dictation detail page
  app.get('/dictation/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { warning } = req.query;

      if (!/^[0-9a-f]{8}$/.test(id)) {
        return res.status(400).send(req.lang.ui.invalidId);
      }

      const dictation = getDictation(id);

      if (!dictation) {
        return res.status(404).send(req.lang.ui.notFound);
      }

      const languageCode = dictation.language || 'nl';
      const lang = getLanguage(languageCode);
      const ui = req.lang.ui;

      const revealed = checkRevealed(dictation);

      const date = new Date(dictation.created).toLocaleDateString(ui.dateLocale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      let warningHtml = '';
      if (warning === 'audio-incomplete') {
        warningHtml = `
          <div style="background-color: #fff3cd; border: 1px solid #ffc107; color: #856404; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
            <strong>${escapeHtml(ui.audioWarningLabel)}</strong> ${escapeHtml(ui.audioWarning)}
          </div>
        `;
      }

      let audioPlayersHtml = '';
      for (let i = 0; i < dictation.sentences.length; i++) {
        const hiddenAttr = revealed ? '' : ' hidden';
        audioPlayersHtml += `
          <div class="sentence-item">
            <div class="sentence-number">${escapeHtml(ui.sentence)} ${i + 1}</div>
            <audio controls src="/dictations/${id}/${i}.mp3"></audio>
            <div class="sentence-text"${hiddenAttr}>${escapeHtml(dictation.sentences[i])}</div>
          </div>
        `;
      }

      const showTextLabel = revealed ? ui.hideText : ui.showText;
      const showTextButton = `<button id="showTextBtn" class="secondary">${escapeHtml(showTextLabel)}</button>`;

      const playModeLink = dictation.pin
        ? `<a href="/dictation/${id}/play" class="btn">${escapeHtml(ui.playMode)}</a>`
        : '';

      const languageIndicator = `<span class="language-badge">${escapeHtml(lang.displayName)}</span>`;
      const escapedTopics = dictation.topics.map(t => escapeHtml(t)).join(', ');
      const displayTitle = dictation.title ? escapeHtml(dictation.title) : id;
      const csrfInput = `<input type="hidden" name="_csrf" value="${escapeHtml(req.csrfToken)}">`;

      const html = render(req, 'dictation.html', {
        title: displayTitle,
        dictationId: id,
        csrfInput: csrfInput,
        topics: escapedTopics,
        topicsLabel: ui.topics,
        date: date,
        dateLabel: ui.createdAt,
        warning: warningHtml,
        audioPlayers: audioPlayersHtml,
        showTextButton: showTextButton,
        playModeLink: playModeLink,
        languageIndicator: languageIndicator,
        deleteDictation: ui.deleteDictation,
        deleteConfirm: escapeHtml(ui.deleteConfirm),
        backHome: ui.backHome,
        showText: escapeHtml(ui.showText),
        hideText: escapeHtml(ui.hideText),
      });

      res.send(html);
    } catch (error) {
      console.error('Error loading dictation:', error);
      res.status(500).send('Error loading dictation');
    }
  });

  // GET /dictation/:id/play - Play mode (PIN-protected)
  app.get('/dictation/:id/play', (req, res) => {
    try {
      const { id } = req.params;

      if (!/^[0-9a-f]{8}$/.test(id)) {
        return res.status(400).send(req.lang.ui.invalidId);
      }

      const dictation = getDictation(id);
      if (!dictation) {
        return res.status(404).send(req.lang.ui.notFound);
      }

      if (!dictation.pin) {
        return res.redirect(`/dictation/${id}`);
      }

      const languageCode = dictation.language || 'nl';
      const lang = getLanguage(languageCode);
      const ui = lang.ui;
      const displayTitle = dictation.title ? escapeHtml(dictation.title) : id;

      // Check PIN cookie
      const csrfInput = `<input type="hidden" name="_csrf" value="${escapeHtml(req.csrfToken)}">`;
      const cookieName = `play_pin_${id}`;
      if (req.cookies[cookieName] !== dictation.pin) {
        return res.send(renderTemplate('play-pin.html', {
          title: displayTitle,
          dictationId: id,
          langCode: languageCode,
          csrfInput: csrfInput,
          enterPin: ui.enterPin,
          pinPlaceholder: ui.pinPlaceholder,
          submit: ui.submit,
          error: '',
        }));
      }

      // Build sentence cards
      const languageIndicator = `<span class="language-badge">${escapeHtml(lang.displayName)}</span>`;
      let sentenceCards = '';
      for (let i = 0; i < dictation.sentences.length; i++) {
        const hiddenClass = i === 0 ? '' : ' hidden';
        sentenceCards += `
          <div class="play-sentence-card${hiddenClass}">
            <div class="play-sentence-number">${escapeHtml(ui.sentence)} ${i + 1}</div>
            <audio controls src="/dictations/${id}/${i}.mp3"></audio>
            <div class="play-sentence-text">${escapeHtml(dictation.sentences[i])}</div>
          </div>
        `;
      }

      res.send(renderTemplate('play.html', {
        title: displayTitle,
        dictationId: id,
        langCode: languageCode,
        csrfToken: escapeHtml(req.csrfToken),
        playMode: ui.playMode,
        languageIndicator: languageIndicator,
        sentenceCards: sentenceCards,
        totalSentences: String(dictation.sentences.length),
        sentenceLabel: ui.sentence,
        nextSentence: ui.nextSentence,
        closePage: ui.closePage,
        revealAll: ui.revealAll,
        revealConfirm: escapeHtml(ui.revealConfirm),
      }));
    } catch (error) {
      console.error('Error loading play mode:', error);
      res.status(500).send('Error loading play mode');
    }
  });

  // POST /dictation/:id/play - PIN submission
  app.post('/dictation/:id/play', (req, res) => {
    try {
      const { id } = req.params;
      const { pin } = req.body;

      if (!validateCsrfToken(req)) {
        return res.status(403).send(req.lang.ui.forbiddenError || 'Forbidden');
      }

      if (!/^[0-9a-f]{8}$/.test(id)) {
        return res.status(400).send(req.lang.ui.invalidId);
      }

      const dictation = getDictation(id);
      if (!dictation || !dictation.pin) {
        return res.redirect(`/dictation/${id}`);
      }

      const languageCode = dictation.language || 'nl';
      const lang = getLanguage(languageCode);
      const ui = lang.ui;
      const displayTitle = dictation.title ? escapeHtml(dictation.title) : id;

      if (!pin || pin.trim() !== dictation.pin) {
        const csrfInput = `<input type="hidden" name="_csrf" value="${escapeHtml(req.csrfToken)}">`;
        return res.send(renderTemplate('play-pin.html', {
          title: displayTitle,
          dictationId: id,
          langCode: languageCode,
          csrfInput: csrfInput,
          enterPin: ui.enterPin,
          pinPlaceholder: ui.pinPlaceholder,
          submit: ui.submit,
          error: `<div class="error">${escapeHtml(ui.pinError)}</div>`,
        }));
      }

      // Set PIN cookie and redirect to play mode
      res.cookie(`play_pin_${id}`, pin.trim(), {
        httpOnly: true,
        maxAge: 86400000, // 24 hours
        sameSite: 'lax',
      });
      res.redirect(`/dictation/${id}/play`);
    } catch (error) {
      console.error('Error verifying PIN:', error);
      res.status(500).send('Error verifying PIN');
    }
  });

  // POST /dictation/:id/reveal - Reveal all text (PIN-protected)
  app.post('/dictation/:id/reveal', (req, res) => {
    try {
      const { id } = req.params;

      if (!validateCsrfToken(req)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      if (!/^[0-9a-f]{8}$/.test(id)) {
        return res.status(400).json({ error: 'Invalid dictation ID' });
      }

      const dictation = getDictation(id);
      if (!dictation) {
        return res.status(404).json({ error: 'Dictation not found' });
      }

      // Verify PIN cookie
      if (dictation.pin) {
        const cookieName = `play_pin_${id}`;
        if (req.cookies[cookieName] !== dictation.pin) {
          return res.status(403).json({ error: 'Unauthorized' });
        }
      }

      updateDictation(id, { revealed: true });
      res.json({ success: true });
    } catch (error) {
      console.error('Error revealing dictation:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /dictation/:id/delete - Delete a dictation
  app.post('/dictation/:id/delete', (req, res) => {
    try {
      // CSRF validation
      if (!validateCsrfToken(req)) {
        return res.status(403).send(req.lang.ui.forbiddenError || 'Forbidden');
      }

      // Rate limiting check
      const clientIp = req.ip || req.connection.remoteAddress;
      if (!deleteRateLimiter.check(clientIp)) {
        return res.status(429).send(req.lang.ui.deleteRateLimitError);
      }

      const { id } = req.params;

      // Validate ID format (8 lowercase hex characters)
      if (!/^[0-9a-f]{8}$/.test(id)) {
        return res.status(400).send(req.lang.ui.invalidId);
      }

      const success = deleteDictation(id);

      if (success) {
        console.log(`Dictation ${id} deleted`);
      }

      res.redirect('/dictations');
    } catch (error) {
      console.error('Error deleting dictation:', error);
      res.status(500).send('Error deleting dictation');
    }
  });
}
