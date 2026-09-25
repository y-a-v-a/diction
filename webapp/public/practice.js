/**
 * Write-along practice for the dictation detail page.
 *
 * Each sentence card has a lined "paper" textarea. Checking compares the
 * written words with the dictated sentence (see diff.js) and marks the
 * differences the way a teacher would: strike through what you wrote,
 * underline what it should have been.
 *
 * What the learner writes is kept in localStorage per dictation, so a reload
 * or a detour to play mode does not wipe it. Drafts expire after 30 days.
 *
 * Labels come from data-l-* attributes on #practice.
 */
(function () {
  'use strict';

  var root = document.getElementById('practice');
  if (!root) return;
  var L = root.dataset;

  var D = window.DictionDiff;

  function fill(template, n, total) {
    return template.replace('{n}', n).replace('{total}', total);
  }

  var cards = Array.prototype.slice.call(root.querySelectorAll('.sentence-item'));
  var results = new Array(cards.length);
  var resets = [];
  var sessionScore = document.getElementById('sessionScore');
  var startOver = document.getElementById('startOver');
  var finePointer = window.matchMedia && window.matchMedia('(pointer: fine)').matches;

  // --- Drafts -------------------------------------------------------------
  // Stored as {saved, items: [{t: text, c: checked} | null, ...]}. Storage
  // can be missing or throw (private mode, blocked site data): then drafts
  // simply are not kept.

  var DRAFT_PREFIX = 'diction:drafts:';
  var DRAFT_MAX_AGE = 30 * 24 * 60 * 60 * 1000;
  var draftKey = DRAFT_PREFIX + (root.dataset.dictation || location.pathname);
  var saveTimer = null;

  function storage() {
    try {
      return window.localStorage;
    } catch (e) {
      return null;
    }
  }

  function readDrafts(key) {
    try {
      var d = JSON.parse(storage().getItem(key));
      if (d && Array.isArray(d.items) && Date.now() - d.saved < DRAFT_MAX_AGE) return d;
    } catch (e) { /* no storage or bad JSON: no draft */ }
    return null;
  }

  // Forget drafts of other dictations once they are too old
  function pruneDrafts() {
    try {
      var store = storage();
      for (var i = store.length - 1; i >= 0; i--) {
        var key = store.key(i);
        if (key && key.indexOf(DRAFT_PREFIX) === 0 && !readDrafts(key)) store.removeItem(key);
      }
    } catch (e) { /* ignore */ }
  }

  // Only promise to keep the writing when storage actually works
  var draftNote = root.querySelector('.draft-note');
  try {
    storage().setItem(DRAFT_PREFIX + 'test', '1');
    storage().removeItem(DRAFT_PREFIX + 'test');
  } catch (e) {
    if (draftNote) draftNote.hidden = true;
  }

  var saved = readDrafts(draftKey);
  var drafts = saved ? saved.items.slice(0, cards.length) : [];
  pruneDrafts();

  function hasDrafts() {
    return drafts.some(function (d) { return d && d.t; });
  }

  function writeDrafts() {
    clearTimeout(saveTimer);
    saveTimer = null;
    try {
      if (hasDrafts()) {
        storage().setItem(draftKey, JSON.stringify({ saved: Date.now(), items: drafts }));
      } else {
        storage().removeItem(draftKey);
      }
    } catch (e) { /* full or unavailable: keep going without */ }
  }

  function saveDrafts() {
    if (startOver) startOver.hidden = !hasDrafts();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(writeDrafts, 400);
  }

  // Don't lose the last keystrokes to the debounce when leaving the page
  window.addEventListener('pagehide', function () {
    if (saveTimer) writeDrafts();
  });

  function updateSession() {
    var correct = 0;
    var total = 0;
    var checked = 0;
    results.forEach(function (r) {
      if (!r) return;
      checked++;
      correct += r.correct;
      total += r.total;
    });
    if (!sessionScore || checked < 2) {
      if (sessionScore) sessionScore.hidden = true;
      return;
    }
    sessionScore.hidden = false;
    sessionScore.textContent = fill(L.lSession, correct, total);
  }

  cards.forEach(function (card, index) {
    var audio = card.querySelector('audio');
    var textarea = card.querySelector('textarea');
    var checkBtn = card.querySelector('.check-btn');
    var result = card.querySelector('.check-result');
    var score = card.querySelector('.sentence-score');
    var solution = card.querySelector('.sentence-text');
    var player = audio && window.DictionPlayer ? window.DictionPlayer.enhance(audio) : null;

    if (audio) {
      audio.addEventListener('play', function () {
        card.classList.add('is-playing');
        if (finePointer && textarea && document.activeElement !== textarea) {
          textarea.focus({ preventScroll: true });
        }
      });
      audio.addEventListener('pause', function () {
        card.classList.remove('is-playing');
      });
    }

    if (!textarea || !checkBtn || !D) return;

    function check() {
      if (!D.tokenize(textarea.value).length) {
        textarea.focus();
        return;
      }
      var r = D.check(solution.textContent, textarea.value);

      result.innerHTML = r.html +
        (r.perfect ? '' : '<span class="check-legend">' + D.esc(L.lLegend) + '</span>');
      result.hidden = false;

      score.hidden = false;
      score.textContent = r.perfect ? L.lPerfect : fill(L.lWords, r.correct, r.total);
      score.classList.toggle('is-perfect', r.perfect);

      results[index] = { correct: r.correct, total: r.total };
      updateSession();

      drafts[index] = { t: textarea.value, c: true };
      saveDrafts();
    }

    function clearResult() {
      result.hidden = true;
      score.hidden = true;
      results[index] = null;
    }

    checkBtn.addEventListener('click', check);

    textarea.addEventListener('input', function () {
      if (!result.hidden) {
        clearResult();
        updateSession();
      }
      drafts[index] = textarea.value.trim() ? { t: textarea.value, c: false } : null;
      saveDrafts();
    });

    resets.push(function () {
      textarea.value = '';
      clearResult();
    });

    // Bring back the saved draft, including its marks if it was checked
    var draft = drafts[index];
    if (draft && typeof draft.t === 'string' && draft.t) {
      textarea.value = draft.t;
      if (draft.c) check();
    } else {
      drafts[index] = null;
    }

    textarea.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        check();
      } else if (e.key === 'Escape' && player) {
        e.preventDefault();
        player.restart();
      }
    });
  });

  if (startOver) {
    startOver.hidden = !hasDrafts();
    startOver.addEventListener('click', function () {
      if (!confirm(startOver.dataset.confirm)) return;
      resets.forEach(function (reset) { reset(); });
      drafts = [];
      writeDrafts();
      updateSession();
      startOver.hidden = true;
      var first = root.querySelector('textarea');
      if (first) first.focus();
    });
  }
})();
