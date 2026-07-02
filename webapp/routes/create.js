/**
 * Create routes — thin HTTP adapter around the core's generateDictation.
 * Owns access control, CSRF, rate limiting and rendering; the generation
 * pipeline itself lives in core/.
 */
import {
  generateDictation,
  DictationInputError,
  listContentLanguages,
} from '../core/index.js';
import { escapeHtml, createRateLimiter, validateCsrfToken } from '../utils/security.js';
import { requireCreateAccess, renderPassphrasePage, createAccessHash } from '../utils/createAccess.js';

/**
 * Build language select dropdown HTML from the core's content languages
 */
function buildLanguageSelect(selectedCode) {
  let html = '<select id="language" name="language" required>';
  for (const lang of listContentLanguages()) {
    const selected = lang.code === selectedCode ? ' selected' : '';
    html += `<option value="${escapeHtml(lang.code)}"${selected}>${escapeHtml(lang.displayName)}</option>`;
  }
  html += '</select>';
  return html;
}

/**
 * Map a DictationInputError to a localized, user-facing message
 */
function inputErrorMessage(error, ui) {
  if (error.field === 'sentenceCount') return ui.sentenceCountError;
  if (error.field === 'pin') return ui.pinFormatError;
  const labels = { topic1: ui.topic1Label, topic2: ui.topic2Label, topic3: ui.topic3Label };
  const label = (labels[error.field] || error.field).replace(/:$/, '');
  return `${label}: ${error.reason}`;
}

export function setupCreateRoutes(app, render) {
  /**
   * Render the create form; `extra` overrides tokenInput/error per case
   */
  function renderCreateForm(req, { tokenInput = '', languageCode = null, error = '' } = {}) {
    const ui = req.lang.ui;
    const csrfInput = `<input type="hidden" name="_csrf" value="${escapeHtml(req.csrfToken)}">`;
    return render(req, 'create.html', {
      tokenInput,
      csrfInput,
      languageSelect: buildLanguageSelect(languageCode || req.langCode),
      createHeading: ui.createHeading,
      createDescription: ui.createDescription,
      languageLabel: ui.languageLabel,
      topic1Label: ui.topic1Label,
      topic1Placeholder: ui.topic1Placeholder,
      topic2Label: ui.topic2Label,
      topic2Placeholder: ui.topic2Placeholder,
      topic3Label: ui.topic3Label,
      topic3Placeholder: ui.topic3Placeholder,
      sentenceCountLabel: ui.sentenceCountLabel,
      pinLabel: ui.pinLabel,
      pinHint: ui.pinHint,
      generateButton: ui.generateButton,
      cancelButton: ui.cancelButton,
      generating: ui.generating,
      generatingHint: ui.generatingHint,
      error,
    });
  }

  // POST /create/auth - Passphrase verification
  app.post('/create/auth', (req, res) => {
    if (!validateCsrfToken(req)) {
      return res.status(403).send(req.lang.ui.forbiddenError || 'Forbidden');
    }

    const passphrase = process.env.CREATE_PASSPHRASE;
    const submitted = req.body.passphrase;

    if (!passphrase || !submitted || submitted !== passphrase) {
      const ui = req.lang.ui;
      return res.status(401).send(
        renderPassphrasePage(req, `<div class="error">${escapeHtml(ui.passphraseError)}</div>`)
      );
    }

    res.cookie('create_access', createAccessHash(passphrase), {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'strict',
    });
    res.redirect('/create');
  });

  // GET /create - Show creation form (protected)
  app.get('/create', requireCreateAccess, (req, res) => {
    const token = req.query.token || '';
    const tokenInput = token ? `<input type="hidden" name="token" value="${escapeHtml(token)}">` : '';
    res.send(renderCreateForm(req, { tokenInput }));
  });

  // POST /create - Generate new dictation (protected by secret token)
  app.post('/create', requireCreateAccess, async (req, res) => {
    try {
      const ui = req.lang.ui;

      // CSRF validation
      if (!validateCsrfToken(req)) {
        return res.status(403).send(ui.forbiddenError || 'Forbidden');
      }

      // Rate limiting check
      const clientIp = req.ip || req.connection.remoteAddress;
      if (!createRateLimiter.check(clientIp)) {
        return res.status(429).send(
          renderCreateForm(req, { error: `<div class="error">${escapeHtml(ui.rateLimitError)}</div>` })
        );
      }

      const { topic1, topic2, topic3, sentenceCount, language, pin } = req.body;

      try {
        const { dictation, audioComplete } = await generateDictation({
          topics: [topic1, topic2, topic3],
          sentenceCount,
          language,
          pin,
        });

        res.redirect(audioComplete
          ? `/dictation/${dictation.id}`
          : `/dictation/${dictation.id}?warning=audio-incomplete`);
      } catch (error) {
        if (error instanceof DictationInputError) {
          return res.status(400).send(
            renderCreateForm(req, {
              languageCode: language,
              error: `<div class="error">${escapeHtml(inputErrorMessage(error, ui))}</div>`,
            })
          );
        }

        console.error('Error creating dictation:', error);
        const errorHtml = `
          <div class="error">
            <strong>${escapeHtml(ui.createError)}</strong><br>
            ${escapeHtml(error.message)}
          </div>
        `;
        res.status(500).send(renderCreateForm(req, { languageCode: language, error: errorHtml }));
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      res.status(500).send(req.lang.ui.unexpectedError);
    }
  });
}
