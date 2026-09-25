import { listDictations, getContentLanguage } from '../core/index.js';
import { escapeHtml, isAdmin } from '../utils/security.js';

/**
 * Decorative waveform bars, deterministic per seed so a card always looks the same
 */
function waveBars(seed, count) {
  let x = 0;
  for (const ch of String(seed)) x = (x * 31 + ch.charCodeAt(0)) >>> 0;
  let html = '';
  for (let i = 0; i < count; i++) {
    x = (x * 1664525 + 1013904223) >>> 0;
    const envelope = Math.sin(Math.PI * (i + 0.5) / count);
    const h = Math.round(20 + 80 * (x / 4294967296) * (0.35 + 0.65 * envelope));
    html += `<i style="--h:${h}%"></i>`;
  }
  return html;
}

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
      homeEyebrow: ui.homeEyebrow,
      homeDemoBefore: escapeHtml(ui.homeDemoBefore),
      homeDemoWrong: escapeHtml(ui.homeDemoWrong),
      homeDemoRight: escapeHtml(ui.homeDemoRight),
      homeDemoAfter: escapeHtml(ui.homeDemoAfter),
      demoWave: waveBars('diction', 36),
    });
    res.send(html);
  });

  app.get('/dictations', async (req, res) => {
    try {
      const ui = req.lang.ui;
      const dictations = await listDictations();

      const csrfInput = `<input type="hidden" name="_csrf" value="${escapeHtml(req.csrfToken)}">`;

      let dictationsHtml = '';
      if (dictations.length === 0) {
        dictationsHtml = `<p class="empty-state">${escapeHtml(ui.emptyState)}</p>`;
      } else {
        dictationsHtml = '<div class="dictation-grid">';
        for (const dictation of dictations) {
          const languageCode = dictation.language || 'nl';
          const lang = getContentLanguage(languageCode);

          const date = new Date(dictation.created).toLocaleDateString(ui.dateLocale, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });

          const escapedTopics = dictation.topics.map(t => escapeHtml(t)).join(' · ');
          const languageBadge = `<span class="badge badge-language">${escapeHtml(lang.displayName)}</span>`;
          const sentenceCount = escapeHtml(ui.sentenceCount.replace('{n}', dictation.sentences.length));

          const displayTitle = dictation.title ? escapeHtml(dictation.title) : `Dictation ${dictation.id}`;

          dictationsHtml += `
            <article class="dictation-card">
              ${languageBadge}
              <div class="card-wave" aria-hidden="true">${waveBars(dictation.id, 40)}</div>
              <h3 class="dictation-title">
                <a href="/dictation/${dictation.id}" class="dictation-link">${displayTitle}</a>
              </h3>
              <p class="dictation-topics">${escapedTopics}</p>
              <div class="dictation-meta">
                <span>${sentenceCount} · ${date}</span>
                ${isAdmin(req) ? `<form method="POST" action="/dictation/${dictation.id}/delete" data-confirm="${escapeHtml(ui.deleteConfirm)}" onsubmit="return confirm(this.dataset.confirm);">
                  ${csrfInput}
                  <button type="submit" class="delete btn-small">${escapeHtml(ui.deleteButton)}</button>
                </form>` : ''}
              </div>
            </article>
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
