/**
 * Minimal HTML template rendering for the views/ directory.
 *
 * Templates use {{name}} placeholders. Substitution is a single pass with a
 * replacer function, which matters for two reasons:
 *
 * - Values are inserted literally. A string replacement would interpret
 *   `$'`, `$&` and `` $` `` in a value (e.g. a sentence about money) as
 *   "paste part of the template here".
 * - Inserted values are never scanned again, so a topic or sentence that
 *   happens to contain `{{something}}` is shown as-is instead of being
 *   substituted with server-generated HTML.
 *
 * Values are inserted as-is: callers remain responsible for escaping.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VIEWS_DIR = path.join(__dirname, '..', 'views');
const PLACEHOLDER = /\{\{(\w+)\}\}/g;

// In production templates never change, so read each one once. In development
// re-read on every render so HTML edits show up without a restart.
const useCache = process.env.NODE_ENV === 'production';
const cache = new Map();

/**
 * Read a template from views/ (cached in production)
 */
export function loadTemplate(name) {
  if (useCache && cache.has(name)) {
    return cache.get(name);
  }
  const html = fs.readFileSync(path.join(VIEWS_DIR, name), 'utf-8');
  if (useCache) {
    cache.set(name, html);
  }
  return html;
}

/**
 * Replace {{key}} placeholders with values from `data` in a single pass.
 * Unknown placeholders are left untouched; null/undefined values render empty.
 */
export function fillTemplate(template, data = {}) {
  return template.replace(PLACEHOLDER, (match, key) => {
    if (!Object.hasOwn(data, key)) return match;
    return data[key] == null ? '' : String(data[key]);
  });
}

/**
 * Render a standalone template (a full HTML document, no layout)
 */
export function renderTemplate(name, data = {}) {
  return fillTemplate(loadTemplate(name), data);
}

/**
 * Render a content template inside layout.html. Both see the same data;
 * the filled content is inserted as {{content}} and not scanned again.
 */
export function renderWithLayout(name, data = {}) {
  const content = renderTemplate(name, data);
  return fillTemplate(loadTemplate('layout.html'), { ...data, content });
}
