import { listDictations } from '../services/storage.js';

export function setupIndexRoutes(app, render) {
  app.get('/', (req, res) => {
    try {
      const dictations = listDictations();

      let dictationsHtml = '';
      if (dictations.length === 0) {
        dictationsHtml = '<p class="empty-state">Nog geen dictees. Maak je eerste dictee!</p>';
      } else {
        dictationsHtml = '<div>';
        for (const dictation of dictations) {
          const date = new Date(dictation.created).toLocaleDateString('nl-NL', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });

          dictationsHtml += `
            <div class="dictation-card">
              <h3 class="dictation-title">
                <a href="/dictation/${dictation.id}" class="dictation-link">
                  Dictee ${dictation.id}
                </a>
              </h3>
              <p style="margin-bottom: 8px;"><strong>Onderwerpen:</strong> ${dictation.topics.join(', ')}</p>
              <p class="dictation-date">${date}</p>
              <div>
                <a href="/dictation/${dictation.id}" class="btn btn-small">Bekijken</a>
                <form method="POST" action="/dictation/${dictation.id}/delete" style="display: inline-block; margin-left: 10px;" onsubmit="return confirm('Weet je zeker dat je dit dictee wilt verwijderen?');">
                  <button type="submit" class="delete btn-small">Verwijderen</button>
                </form>
              </div>
            </div>
          `;
        }
        dictationsHtml += '</div>';
      }

      const html = render('home.html', { dictations: dictationsHtml });
      res.send(html);
    } catch (error) {
      console.error('Error loading dictations:', error);
      res.status(500).send('Error loading dictations');
    }
  });
}
