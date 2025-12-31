import path from 'path';
import { generateSentences } from '../services/claude.js';
import { generateSpeech, delay, getCurrentService } from '../services/tts.js';
import { generateId, createDictation, getDictationPath, deleteDictation } from '../services/storage.js';

export function setupCreateRoutes(app, render) {
  // GET /create - Show creation form
  app.get('/create', (req, res) => {
    const html = render('create.html', {});
    res.send(html);
  });

  // POST /create - Generate new dictation
  app.post('/create', async (req, res) => {
    try {
      const { topic1, topic2, topic3 } = req.body;

      // Validate topics
      if (!topic1 || !topic2 || !topic3) {
        return res.status(400).send(render('create.html', {}) + '<div class="error">Alle drie onderwerpen zijn verplicht.</div>');
      }

      if (topic1.length > 100 || topic2.length > 100 || topic3.length > 100) {
        return res.status(400).send(render('create.html', {}) + '<div class="error">Onderwerpen mogen maximaal 100 tekens zijn.</div>');
      }

      const topics = [
        topic1.trim(),
        topic2.trim(),
        topic3.trim()
      ];

      // Generate unique ID
      const id = generateId();
      const dictationPath = getDictationPath(id);
      let dictationCreated = false;

      try {
        // Step 1: Generate sentences using Claude
        console.log(`Generating sentences for dictation ${id}...`);
        const sentences = await generateSentences(topics[0], topics[1], topics[2]);
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

          const errorHtml = `
            <div class="error">
              <strong>Fout bij het maken van het dictee:</strong><br>
              ${error.message}
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
