import { getDictation, deleteDictation } from '../services/storage.js';

export function setupDictationRoutes(app, render) {
  // GET /dictation/:id - Show dictation playback page
  app.get('/dictation/:id', (req, res) => {
    try {
      const { id } = req.params;

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

      // Build audio players HTML
      let audioPlayersHtml = '';
      for (let i = 0; i < dictation.sentences.length; i++) {
        const sentence = dictation.sentences[i];
        audioPlayersHtml += `
          <div class="sentence-item">
            <div class="sentence-number">Zin ${i + 1}</div>
            <audio controls src="/dictations/${id}/${i}.mp3"></audio>
            <div class="sentence-text">${sentence}</div>
          </div>
        `;
      }

      const html = render('dictation.html', {
        id: id,
        topics: dictation.topics.join(', '),
        date: date,
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
