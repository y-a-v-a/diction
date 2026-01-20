import { getDictation, deleteDictation } from '../services/storage.js';
import { escapeHtml, deleteRateLimiter } from '../utils/security.js';

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

      // Format the date
      const date = new Date(dictation.created).toLocaleDateString('nl-NL', {
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
        const sentence = dictation.sentences[i];
        // Escape sentence to prevent XSS
        const escapedSentence = escapeHtml(sentence);
        audioPlayersHtml += `
          <div class="sentence-item">
            <div class="sentence-number">Zin ${i + 1}</div>
            <audio controls src="/dictations/${id}/${i}.mp3"></audio>
            <div class="sentence-text">${escapedSentence}</div>
          </div>
        `;
      }

      // Escape topics to prevent XSS
      const escapedTopics = dictation.topics.map(t => escapeHtml(t)).join(', ');

      const html = render('dictation.html', {
        id: id,
        topics: escapedTopics,
        date: date,
        warning: warningHtml,
        audioPlayers: audioPlayersHtml
      });

      res.send(html);
    } catch (error) {
      console.error('Error loading dictation:', error);
      res.status(500).send('Error loading dictation');
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
