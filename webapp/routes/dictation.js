import { getDictation, deleteDictation } from '../services/storage.js';
import { escapeHtml, deleteRateLimiter } from '../utils/security.js';
import { getLanguage } from '../languages/index.js';

export function setupDictationRoutes(app, render) {
  // GET /dictation/:id - Show dictation playback page
  app.get('/dictation/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { warning } = req.query;

      // Validate ID format (8 lowercase hex characters)
      if (!/^[0-9a-f]{8}$/.test(id)) {
        return res.status(400).send('Ongeldige dictee ID');
      }

      const dictation = getDictation(id);

      if (!dictation) {
        return res.status(404).send('Dictee niet gevonden');
      }

      // Load language config (backward compat: default to Dutch)
      const languageCode = dictation.language || 'nl';
      const lang = getLanguage(languageCode);
      const ui = lang.ui;

      // Determine reveal state
      const revealAt = dictation.revealAt ? new Date(dictation.revealAt) : null;
      const isRevealed = !revealAt || new Date() >= revealAt;

      // Format the date
      const date = new Date(dictation.created).toLocaleDateString(ui.dateLocale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      // Build warning message if present
      let warningHtml = '';
      if (warning === 'audio-incomplete') {
        warningHtml = `
          <div style="background-color: #fff3cd; border: 1px solid #ffc107; color: #856404; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
            <strong>Let op:</strong> Niet alle audio bestanden konden worden gegenereerd (bijv. door quotum limiet).
            De zinnen zijn wel opgeslagen en audio bestanden die wel zijn gegenereerd kun je hieronder afspelen.
          </div>
        `;
      }

      // Build audio players HTML
      let audioPlayersHtml = '';
      for (let i = 0; i < dictation.sentences.length; i++) {
        const sentenceTextHtml = isRevealed
          ? `<div class="sentence-text">${escapeHtml(dictation.sentences[i])}</div>`
          : '';

        audioPlayersHtml += `
          <div class="sentence-item">
            <div class="sentence-number">${escapeHtml(ui.sentence)} ${i + 1}</div>
            <audio controls src="/dictations/${id}/${i}.mp3"></audio>
            ${sentenceTextHtml}
          </div>
        `;
      }

      // Build countdown or show-text button
      let countdownHtml = '';
      let showTextButton = '';

      if (isRevealed) {
        showTextButton = `<button id="showTextBtn" class="secondary">${escapeHtml(ui.showText)}</button>`;
      } else {
        countdownHtml = `
          <div id="countdown" class="countdown-container" data-reveal-at="${escapeHtml(dictation.revealAt)}" data-dictation-id="${id}" data-show-text-label="${escapeHtml(ui.showText)}">
            <p><strong>${escapeHtml(ui.textRevealed)}</strong></p>
            <p id="countdownTimer" class="countdown-timer"></p>
          </div>
        `;
      }

      // Language indicator
      const languageIndicator = `<span class="language-badge">${escapeHtml(lang.displayName)}</span>`;

      // Escape topics to prevent XSS
      const escapedTopics = dictation.topics.map(t => escapeHtml(t)).join(', ');

      const html = render('dictation.html', {
        id: id,
        topics: escapedTopics,
        topicsLabel: ui.topics,
        date: date,
        dateLabel: ui.createdAt,
        warning: warningHtml,
        audioPlayers: audioPlayersHtml,
        countdown: countdownHtml,
        showTextButton: showTextButton,
        languageIndicator: languageIndicator,
        deleteDictation: ui.deleteDictation,
        deleteConfirm: escapeHtml(ui.deleteConfirm),
        backHome: ui.backHome,
      });

      res.send(html);
    } catch (error) {
      console.error('Error loading dictation:', error);
      res.status(500).send('Error loading dictation');
    }
  });

  // GET /dictation/:id/sentences - JSON API for sentence reveal
  app.get('/dictation/:id/sentences', (req, res) => {
    try {
      const { id } = req.params;

      if (!/^[0-9a-f]{8}$/.test(id)) {
        return res.status(400).json({ error: 'Invalid dictation ID' });
      }

      const dictation = getDictation(id);

      if (!dictation) {
        return res.status(404).json({ error: 'Dictation not found' });
      }

      const revealAt = dictation.revealAt ? new Date(dictation.revealAt) : null;
      const isRevealed = !revealAt || new Date() >= revealAt;

      if (!isRevealed) {
        return res.json({ revealed: false, revealAt: dictation.revealAt });
      }

      return res.json({
        revealed: true,
        sentences: dictation.sentences
      });
    } catch (error) {
      console.error('Error fetching sentences:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /dictation/:id/delete - Delete a dictation
  app.post('/dictation/:id/delete', (req, res) => {
    try {
      // Rate limiting check
      const clientIp = req.ip || req.connection.remoteAddress;
      if (!deleteRateLimiter.check(clientIp)) {
        return res.status(429).send('Te veel verwijderverzoeken. Probeer het over een minuut opnieuw.');
      }

      const { id } = req.params;

      // Validate ID format (8 lowercase hex characters)
      if (!/^[0-9a-f]{8}$/.test(id)) {
        return res.status(400).send('Ongeldige dictee ID');
      }

      const success = deleteDictation(id);

      if (success) {
        console.log(`Dictation ${id} deleted`);
      }

      res.redirect('/');
    } catch (error) {
      console.error('Error deleting dictation:', error);
      res.status(500).send('Error deleting dictation');
    }
  });
}
