import { listDictations } from '../services/storage.js';
import { escapeHtml } from '../utils/security.js';
import { getLanguage } from '../languages/index.js';

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
          const languageCode = dictation.language || 'nl';
          const lang = getLanguage(languageCode);

          const date = new Date(dictation.created).toLocaleDateString(lang.ui.dateLocale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });

          // Escape user-provided content to prevent XSS
          const escapedTopics = dictation.topics.map(t => escapeHtml(t)).join(', ');

          // Language badge
          const languageBadge = `<span class="badge badge-language">${escapeHtml(lang.displayName)}</span>`;

          // Reveal status badge
          let revealBadge = '';
          if (dictation.revealAt) {
            const isRevealed = new Date() >= new Date(dictation.revealAt);
            if (isRevealed) {
              revealBadge = `<span class="badge badge-revealed">${escapeHtml(lang.ui.textAvailable)}</span>`;
            } else {
              revealBadge = `<span class="badge badge-locked">${escapeHtml(lang.ui.textLocked)}</span>`;
            }
          }

          dictationsHtml += `
            <div class="dictation-card">
              <h3 class="dictation-title">
                <a href="/dictation/${dictation.id}" class="dictation-link">
                  Dictee ${dictation.id}
                </a>
                ${languageBadge}
                ${revealBadge}
              </h3>
              <p style="margin-bottom: 8px;"><strong>Onderwerpen:</strong> ${escapedTopics}</p>
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
