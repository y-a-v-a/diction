import { listDictations } from '../services/storage.js';
import { escapeHtml, isAdmin } from '../utils/security.js';
import { getLanguage } from '../languages/index.js';

export function setupIndexRoutes(app, render) {
  app.get('/', (req, res) => {
    const ui = req.lang.ui;
    const html = render(req, 'home.html', {
      homeHeading: ui.homeHeading,
      homeDescription: ui.homeDescription,
      homeHowItWorks: ui.homeHowItWorks,
      homeStep1: ui.homeStep1,
      homeStep2: ui.homeStep2,
      homeStep3: ui.homeStep3,
      homeStep4: ui.homeStep4,
      homeViewDictations: ui.homeViewDictations,
    });
    res.send(html);
  });

  app.get('/dictations', (req, res) => {
    try {
      const ui = req.lang.ui;
      const dictations = listDictations();

      const csrfInput = `<input type="hidden" name="_csrf" value="${escapeHtml(req.csrfToken)}">`;

      let dictationsHtml = '';
      if (dictations.length === 0) {
        dictationsHtml = `<p class="empty-state">${escapeHtml(ui.emptyState)}</p>`;
      } else {
        dictationsHtml = '<div>';
        for (const dictation of dictations) {
          const languageCode = dictation.language || 'nl';
          const lang = getLanguage(languageCode);

          const date = new Date(dictation.created).toLocaleDateString(ui.dateLocale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });

          const escapedTopics = dictation.topics.map(t => escapeHtml(t)).join(', ');
          const languageBadge = `<span class="badge badge-language">${escapeHtml(lang.displayName)}</span>`;

          const displayTitle = dictation.title ? escapeHtml(dictation.title) : `Dictation ${dictation.id}`;

          dictationsHtml += `
            <div class="dictation-card">
              <h3 class="dictation-title">
                <a href="/dictation/${dictation.id}" class="dictation-link">
                  ${displayTitle}
                </a>
                ${languageBadge}
              </h3>
              <p style="margin-bottom: 8px;"><strong>${escapeHtml(ui.topicsLabel)}:</strong> ${escapedTopics}</p>
              <p class="dictation-date">${date}</p>
              <div>
                <a href="/dictation/${dictation.id}" class="btn btn-small">${escapeHtml(ui.viewButton)}</a>
                ${isAdmin(req) ? `<form method="POST" action="/dictation/${dictation.id}/delete" style="display: inline-block; margin-left: 10px;" data-confirm="${escapeHtml(ui.deleteConfirm)}" onsubmit="return confirm(this.dataset.confirm);">
                  ${csrfInput}
                  <button type="submit" class="delete btn-small">${escapeHtml(ui.deleteButton)}</button>
                </form>` : ''}
              </div>
            </div>
          `;
        }
        dictationsHtml += '</div>';
      }

      const html = render(req, 'dictations.html', {
        dictationsHeading: ui.dictationsHeading,
        dictations: dictationsHtml,
      });
      res.send(html);
    } catch (error) {
      console.error('Error loading dictations:', error);
      res.status(500).send('Error loading dictations');
    }
  });
}
