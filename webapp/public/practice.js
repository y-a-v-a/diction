/**
 * Write-along practice for the dictation detail page.
 *
 * Each sentence card has a lined "paper" textarea. Checking compares the
 * written words with the dictated sentence (word-level LCS) and marks the
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

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function fill(template, n, total) {
    return template.replace('{n}', n).replace('{total}', total);
  }

  // Normalize typographic variants so a straight quote on a keyboard
  // is not counted as a spelling mistake.
  function tokenize(s) {
    return s
      .normalize('NFC')
      .replace(/[‘’ʼ]/g, "'")
      .replace(/[“”„]/g, '"')
      .replace(/[–—]/g, '-')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
  }

  // Word-level diff: returns ops of {t: 'eq'|'add'|'del', w}
  // 'add' = written but not expected, 'del' = expected but not written
  function diff(expected, written) {
    var n = expected.length;
    var m = written.length;
    var dp = [];
    for (var i = 0; i <= n; i++) {
      dp.push(new Array(m + 1).fill(0));
    }
    for (i = n - 1; i >= 0; i--) {
      for (var j = m - 1; j >= 0; j--) {
        dp[i][j] = expected[i] === written[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
    var ops = [];
    i = 0;
    j = 0;
    while (i < n && j < m) {
      if (expected[i] === written[j]) {
        ops.push({ t: 'eq', w: expected[i] });
        i++;
        j++;
      } else if (dp[i][j + 1] >= dp[i + 1][j]) {
        ops.push({ t: 'add', w: written[j++] });
      } else {
        ops.push({ t: 'del', w: expected[i++] });
      }
    }
    while (j < m) ops.push({ t: 'add', w: written[j++] });
    while (i < n) ops.push({ t: 'del', w: expected[i++] });
    return ops;
  }

  // Group consecutive changes so a misspelled word reads as "wrong → right"
  function renderOps(ops) {
    var out = [];
    var k = 0;
    while (k < ops.length) {
      if (ops[k].t === 'eq') {
        out.push('<span class="w-ok">' + esc(ops[k].w) + '</span>');
        k++;
        continue;
      }
      var adds = [];
      var dels = [];
      while (k < ops.length && ops[k].t !== 'eq') {
        (ops[k].t === 'add' ? adds : dels).push(ops[k].w);
        k++;
      }
      var chunk = '';
      if (adds.length) chunk += '<del>' + esc(adds.join(' ')) + '</del>';
      if (adds.length && dels.length) chunk += ' ';
      if (dels.length) chunk += '<ins>' + esc(dels.join(' ')) + '</ins>';
      out.push(chunk);
    }
    return out.join(' ');
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

    if (!textarea || !checkBtn) return;

    function check() {
      var expected = tokenize(solution.textContent);
      var written = tokenize(textarea.value);
      if (!written.length) {
        textarea.focus();
        return;
      }
      var ops = diff(expected, written);
      var correct = ops.filter(function (o) { return o.t === 'eq'; }).length;
      var perfect = correct === expected.length && written.length === expected.length;

      result.innerHTML = renderOps(ops) +
        (perfect ? '' : '<span class="check-legend">' + esc(L.lLegend) + '</span>');
      result.hidden = false;

      score.hidden = false;
      score.textContent = perfect ? L.lPerfect : fill(L.lWords, correct, expected.length);
      score.classList.toggle('is-perfect', perfect);

      results[index] = { correct: correct, total: expected.length };
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
