/**
 * Write-along practice for the dictation detail page.
 *
 * Each sentence card has a lined "paper" textarea. Checking compares the
 * written words with the dictated sentence (see diff.js) and marks the
 * differences the way a teacher would: strike through what you wrote,
 * underline what it should have been.
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
  var sessionScore = document.getElementById('sessionScore');
  var finePointer = window.matchMedia && window.matchMedia('(pointer: fine)').matches;

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
    }

    checkBtn.addEventListener('click', check);

    textarea.addEventListener('input', function () {
      if (!result.hidden) {
        result.hidden = true;
        score.hidden = true;
        results[index] = null;
        updateSession();
      }
    });

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
})();
