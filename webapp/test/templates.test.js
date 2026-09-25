import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { fillTemplate, renderTemplate, renderWithLayout } from '../utils/templates.js';
import app from '../app.js';

test('fillTemplate replaces every occurrence of a placeholder', () => {
  assert.equal(fillTemplate('{{a}} and {{a}}', { a: 'x' }), 'x and x');
});

test('fillTemplate inserts `$` replacement patterns literally', () => {
  const tpl = '<p>{{text}}</p><footer>tail</footer>';
  for (const text of ["cost $'", 'cost $&', 'cost $`', 'cost $$', 'cost $1']) {
    assert.equal(fillTemplate(tpl, { text }), `<p>${text}</p><footer>tail</footer>`);
  }
});

test('fillTemplate does not substitute placeholders found inside values', () => {
  const out = fillTemplate('{{topic}} / {{secret}}', { topic: '{{secret}}', secret: 'S' });
  assert.equal(out, '{{secret}} / S');
});

test('fillTemplate leaves unknown placeholders and renders null/undefined as empty', () => {
  assert.equal(fillTemplate('[{{missing}}][{{n}}][{{u}}]', { n: null, u: undefined }), '[{{missing}}][][]');
});

test('fillTemplate ignores inherited object properties', () => {
  assert.equal(fillTemplate('{{constructor}}', {}), '{{constructor}}');
});

test('renderTemplate fills a standalone view', () => {
  const html = renderTemplate('403.html', {
    langCode: 'nl',
    forbiddenTitle: 'T',
    forbiddenMessage: 'M',
    forbiddenBack: 'B',
  });
  assert.match(html, /<html lang="nl">/);
  assert.doesNotMatch(html, /\{\{\w+\}\}/);
});

test('renderWithLayout wraps content and shares data with the layout', () => {
  const html = renderWithLayout('dictations.html', {
    langCode: 'en-US',
    dictationsHeading: 'Heading',
    dictations: '<p>{{langCode}} stays literal</p>',
  });
  assert.match(html, /<html lang="en-US">/);
  assert.match(html, /<h1>Heading<\/h1>/);
  assert.match(html, /<p>\{\{langCode\}\} stays literal<\/p>/);
});

// Regression: a sentence containing `$'` used to pull the rest of the page
// template into the sentence and duplicate the page markup.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ID = 'c0ffee00';
const dir = path.join(__dirname, '..', 'dictations', ID);
const SENTENCE = "The ticket cost $' at the {{dictationId}} gate.";
let server;
let base;

before(async () => {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'metadata.json'), JSON.stringify({
    id: ID, title: 'Price $& check', language: 'en-US', topics: ['{{csrfInput}}', 'b', 'c'],
    sentences: [SENTENCE], created: new Date().toISOString(),
  }));
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

test('dictation page renders user and AI text literally', async () => {
  const html = await (await fetch(`${base}/dictation/${ID}`)).text();
  const escaped = SENTENCE.replace(/'/g, '&#039;');
  assert.ok(html.includes(`<div class="sentence-text" hidden>${escaped}</div>`), 'sentence is intact');
  assert.ok(html.includes('Price $&amp; check'), 'title is intact');
  assert.ok(html.includes('<span class="topic-chip">{{csrfInput}}</span>'), 'topic is not substituted');
  assert.equal(html.match(/<article class="sentence-item">/g).length, 1, 'markup is not duplicated');
});
