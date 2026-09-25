/**
 * Comparing a written sentence with the dictated one.
 *
 * Words are aligned with a longest-common-subsequence diff. Where one written
 * word stands in for one dictated word and the two are close (a spelling
 * mistake rather than a different word), the same diff runs again on the
 * letters, so "word" for "wordt" is marked as `word<ins>t</ins>` instead of
 * crossing out the whole word.
 *
 * A plain browser script: exposes window.DictionDiff (the tests load it the
 * same way, in a vm context).
 */
self.DictionDiff = (function () {
  'use strict';

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Normalize typographic variants so a straight quote on a keyboard
  // is not counted as a spelling mistake.
  function tokenize(s) {
    return String(s)
      .normalize('NFC')
      .replace(/[‘’ʼ]/g, "'")
      .replace(/[“”„]/g, '"')
      .replace(/[–—]/g, '-')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
  }

  // LCS diff of two sequences (words or letters). Returns ops of
  // {t: 'eq'|'add'|'del', w}: 'add' = written but not expected,
  // 'del' = expected but not written.
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

  // Split ops into runs: an 'eq' op on its own, or a run of changes
  // collected as {adds, dels}.
  function chunks(ops) {
    var out = [];
    var k = 0;
    while (k < ops.length) {
      if (ops[k].t === 'eq') {
        out.push({ eq: ops[k].w });
        k++;
        continue;
      }
      var adds = [];
      var dels = [];
      while (k < ops.length && ops[k].t !== 'eq') {
        (ops[k].t === 'add' ? adds : dels).push(ops[k].w);
        k++;
      }
      out.push({ adds: adds, dels: dels });
    }
    return out;
  }

  // Letter-level ops when `written` looks like a misspelling of `expected`:
  // at least half of the longer word survives in order. Otherwise null.
  function letterOps(expected, written) {
    var e = Array.from(expected);
    var w = Array.from(written);
    var ops = diff(e, w);
    var same = ops.filter(function (o) { return o.t === 'eq'; }).length;
    return same * 2 >= Math.max(e.length, w.length) ? ops : null;
  }

  function renderLetters(ops) {
    return chunks(ops).map(function (c) {
      if (c.eq !== undefined) return esc(c.eq);
      return (c.adds.length ? '<del>' + esc(c.adds.join('')) + '</del>' : '') +
        (c.dels.length ? '<ins>' + esc(c.dels.join('')) + '</ins>' : '');
    }).join('');
  }

  function renderSwap(adds, dels) {
    var html = '';
    if (adds.length) html += '<del>' + esc(adds.join(' ')) + '</del>';
    if (adds.length && dels.length) html += ' ';
    if (dels.length) html += '<ins>' + esc(dels.join(' ')) + '</ins>';
    return html;
  }

  // One changed word pair: letter marks if it is a near miss, else a swap
  function renderPair(written, expected) {
    var ops = letterOps(expected, written);
    if (!ops) return renderSwap([written], [expected]);
    return '<span class="w-fix" title="' + esc(written + ' → ' + expected) + '">' +
      renderLetters(ops) + '</span>';
  }

  // Render word ops like a teacher's correction: strike through what was
  // written, underline what it should have been.
  function renderOps(ops) {
    return chunks(ops).map(function (c) {
      if (c.eq !== undefined) return '<span class="w-ok">' + esc(c.eq) + '</span>';
      if (c.adds.length && c.adds.length === c.dels.length) {
        return c.adds.map(function (w, i) { return renderPair(w, c.dels[i]); }).join(' ');
      }
      return renderSwap(c.adds, c.dels);
    }).join(' ');
  }

  // Compare a written attempt with the expected sentence
  function check(expectedText, writtenText) {
    var expected = tokenize(expectedText);
    var written = tokenize(writtenText);
    var ops = diff(expected, written);
    var correct = ops.filter(function (o) { return o.t === 'eq'; }).length;
    return {
      ops: ops,
      correct: correct,
      total: expected.length,
      written: written.length,
      perfect: correct === expected.length && written.length === expected.length,
      html: renderOps(ops),
    };
  }

  return {
    esc: esc,
    tokenize: tokenize,
    diff: diff,
    letterOps: letterOps,
    renderOps: renderOps,
    check: check,
  };
})();
