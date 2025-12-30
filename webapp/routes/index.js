import { listDictations } from '../services/storage.js';

export function setupIndexRoutes(app, render) {
  app.get('/', (req, res) => {
    try {
      const dictations = listDictations();

      let dictationsHtml = '';
      if (dictations.length === 0) {
        dictationsHtml = '<p style="color: #999;">Nog geen dictees. Maak je eerste dictee!</p>';
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
            <div style="border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; border-radius: 4px;">
              <h3 style="margin-bottom: 10px; color: #2c3e50;">
                <a href="/dictation/${dictation.id}" style="text-decoration: none; color: #3498db;">
                  Dictee ${dictation.id}
                </a>
              </h3>
              <p style="margin-bottom: 8px;"><strong>Onderwerpen:</strong> ${dictation.topics.join(', ')}</p>
              <p style="color: #666; font-size: 14px; margin-bottom: 10px;">${date}</p>
              <div>
                <a href="/dictation/${dictation.id}" class="btn" style="font-size: 13px; padding: 6px 12px;">Bekijken</a>
                <form method="POST" action="/dictation/${dictation.id}/delete" style="display: inline-block; margin-left: 10px;" onsubmit="return confirm('Weet je zeker dat je dit dictee wilt verwijderen?');">
                  <button type="submit" class="delete" style="font-size: 13px; padding: 6px 12px;">Verwijderen</button>
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
