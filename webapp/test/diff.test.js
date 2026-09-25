import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

// public/diff.js is a plain browser script; run it the way a page would
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const context = { self: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'public', 'diff.js'), 'utf-8'), context);
const D = context.self.DictionDiff;

test('tokenize normalizes typographic quotes and dashes', () => {
  assert.deepEqual([...D.tokenize('  ‘Hoi’ — zei  “hij”  ')], ["'Hoi'", '-', 'zei', '"hij"']);
});

test('a perfect attempt', () => {
  const r = D.check('De kat slaapt.', 'De  kat slaapt.');
  assert.equal(r.perfect, true);
  assert.equal(r.correct, 3);
  assert.equal(r.total, 3);
});

test('a missing letter is marked inside the word', () => {
  const r = D.check('Hij wordt groot.', 'Hij word groot.');
  assert.equal(r.correct, 2);
  assert.equal(r.perfect, false);
  assert.match(r.html, /<span class="w-fix" title="word → wordt">word<ins>t<\/ins><\/span>/);
});

test('a wrong letter is struck and replaced inside the word', () => {
  const r = D.check('Wij lopen hard.', 'Wij loopen hart.');
  assert.match(r.html, /lo<del>o<\/del>pen/);
  assert.match(r.html, /har<del>t<\/del><ins>d<\/ins>/);
});

test('capitalization and punctuation are near misses', () => {
  assert.match(D.check('Hallo daar.', 'hallo daar,').html, /<del>h<\/del><ins>H<\/ins>allo/);
  assert.match(D.check('Hallo daar.', 'Hallo daar,').html, /daar<del>,<\/del><ins>\.<\/ins>/);
});

test('an unrelated word is swapped whole', () => {
  const r = D.check('Ik zie de hond.', 'Ik zie het hond.');
  assert.match(r.html, /<del>het<\/del> <ins>de<\/ins>/);
  assert.doesNotMatch(r.html, /w-fix/);
});

test('missing and extra words are marked as words', () => {
  const missing = D.check('Ik zie de grote hond.', 'Ik zie de hond.');
  assert.match(missing.html, /<ins>grote<\/ins>/);
  assert.equal(missing.correct, 4);
  const extra = D.check('Ik zie de hond.', 'Ik zie de de hond.');
  assert.match(extra.html, /<del>de<\/del>/);
  assert.equal(extra.perfect, false);
});

test('two words run together are not paired letter by letter', () => {
  // 1 written word for 2 expected: counts differ, so a plain swap
  const r = D.check('Er is een ijsje.', 'Er is eenijsje.');
  assert.match(r.html, /<del>eenijsje\.<\/del> <ins>een ijsje\.<\/ins>/);
});

test('output is escaped', () => {
  const r = D.check('a <b> c', 'a <i> c');
  assert.doesNotMatch(r.html, /<b>|<i>/);
  assert.match(r.html, /&lt;/);
  assert.doesNotMatch(D.check('x', 'x"y').html, /title="[^"]*"y/);
});

test('letters outside the BMP are compared as whole characters', () => {
  const ops = D.letterOps('a😀b', 'a😀c');
  assert.ok(ops);
  assert.deepEqual([...ops.filter((o) => o.t === 'eq').map((o) => o.w)], ['a', '😀']);
});
