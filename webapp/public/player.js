/**
 * Diction audio player — progressive enhancement for <audio data-player>.
 *
 * Replaces the native controls with a large play button, a scrubbable
 * waveform (decoded from the actual audio when possible), replay, a slower
 * playback speed and a "times heard" counter: the controls that matter when
 * you are writing along with a dictation.
 *
 * Labels are read from the nearest ancestor carrying data-l-* attributes.
 */
(function () {
  'use strict';

  var SLOW_RATE = 0.75;
  var controllers = new WeakMap();
  var all = [];

  var ICONS = {
    play: '<svg class="i-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15a1 1 0 0 0 1.53.85l12-7.5a1 1 0 0 0 0-1.7l-12-7.5A1 1 0 0 0 7 4.5z"/></svg>',
    pause: '<svg class="i-pause" viewBox="0 0 24 24" aria-hidden="true"><rect x="5.5" y="4" width="4.5" height="16" rx="1.2"/><rect x="14" y="4" width="4.5" height="16" rx="1.2"/></svg>',
    replay: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z"/></svg>',
  };

  function formatTime(s) {
    if (!isFinite(s) || s < 0) s = 0;
    var m = Math.floor(s / 60);
    var sec = Math.floor(s % 60);
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function labels(el) {
    var host = el.closest('[data-l-play]');
    var d = host ? host.dataset : {};
    return {
      play: esc(d.lPlay || 'Play'),
      pause: esc(d.lPause || 'Pause'),
      replay: esc(d.lReplay || 'Replay'),
      speed: esc(d.lSpeed || 'Playback speed'),
      heard: esc(d.lHeard || 'Times played'),
      seek: esc(d.lSeek || 'Seek'),
    };
  }

  // Deterministic placeholder bars, used until (or instead of) real peaks
  function seededPeaks(seed, count) {
    var x = 0;
    for (var i = 0; i < seed.length; i++) x = (x * 31 + seed.charCodeAt(i)) >>> 0;
    var out = [];
    for (var j = 0; j < count; j++) {
      x = (x * 1664525 + 1013904223) >>> 0;
      var r = x / 4294967296;
      var envelope = Math.sin(Math.PI * (j + 0.5) / count);
      out.push(0.25 + 0.75 * r * (0.4 + 0.6 * envelope));
    }
    return out;
  }

  var decoder = null;
  function getDecoder() {
    if (decoder) return decoder;
    var Ctx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!Ctx) return null;
    try {
      decoder = new Ctx(1, 1, 44100);
    } catch (e) {
      decoder = null;
    }
    return decoder;
  }

  // Decode the audio and reduce it to `count` normalized peak values
  function realPeaks(src, count) {
    var ctx = getDecoder();
    if (!ctx || !window.fetch) return Promise.reject(new Error('unsupported'));
    return fetch(src)
      .then(function (r) {
        if (!r.ok) throw new Error('fetch failed');
        return r.arrayBuffer();
      })
      .then(function (buf) {
        return new Promise(function (resolve, reject) {
          ctx.decodeAudioData(buf, resolve, reject);
        });
      })
      .then(function (audioBuffer) {
        var data = audioBuffer.getChannelData(0);
        var size = Math.floor(data.length / count) || 1;
        var peaks = [];
        var max = 0;
        for (var i = 0; i < count; i++) {
          var sum = 0;
          var start = i * size;
          for (var j = 0; j < size; j++) {
            var v = data[start + j] || 0;
            sum += v * v;
          }
          var rms = Math.sqrt(sum / size);
          peaks.push(rms);
          if (rms > max) max = rms;
        }
        return peaks.map(function (p) {
          return 0.1 + 0.9 * Math.pow(max ? p / max : 0, 0.75);
        });
      });
  }

  function renderBars(container, peaks) {
    var html = '';
    for (var i = 0; i < peaks.length; i++) {
      html += '<i style="--h:' + Math.round(peaks[i] * 100) + '%"></i>';
    }
    container.innerHTML = html;
  }

  function enhance(audio) {
    if (controllers.has(audio)) return controllers.get(audio);

    var l = labels(audio);
    var wrap = document.createElement('div');
    wrap.className = 'player';
    wrap.innerHTML =
      '<button type="button" class="player-toggle" aria-label="' + l.play + '">' + ICONS.play + ICONS.pause + '</button>' +
      '<div class="player-body">' +
        '<div class="player-wave" role="slider" tabindex="0" aria-label="' + l.seek + '" aria-valuemin="0" aria-valuemax="0" aria-valuenow="0">' +
          '<div class="player-bars"></div><div class="player-bars-played"></div><div class="player-head"></div>' +
        '</div>' +
        '<div class="player-meta">' +
          '<span class="player-time">0:00 / 0:00</span>' +
          '<span class="player-count" title="' + l.heard + '" aria-label="' + l.heard + ': 0"></span>' +
          '<button type="button" class="player-chip player-speed" aria-pressed="false" aria-label="' + l.speed + '">1×</button>' +
          '<button type="button" class="player-chip player-replay">' + ICONS.replay + '<span>' + l.replay + '</span></button>' +
        '</div>' +
      '</div>';

    audio.parentNode.insertBefore(wrap, audio);
    wrap.appendChild(audio);
    audio.removeAttribute('controls');
    audio.preload = 'metadata';

    var toggle = wrap.querySelector('.player-toggle');
    var wave = wrap.querySelector('.player-wave');
    var bars = wrap.querySelector('.player-bars');
    var played = wrap.querySelector('.player-bars-played');
    var time = wrap.querySelector('.player-time');
    var count = wrap.querySelector('.player-count');
    var speed = wrap.querySelector('.player-speed');
    var replay = wrap.querySelector('.player-replay');
    var plays = 0;

    var barCount = Math.max(32, Math.min(110, Math.floor((wave.clientWidth || 480) / 6)));
    var src = audio.currentSrc || audio.getAttribute('src') || '';
    var placeholder = seededPeaks(src, barCount);
    renderBars(bars, placeholder);
    renderBars(played, placeholder);

    function loadPeaks() {
      realPeaks(src, barCount).then(function (peaks) {
        renderBars(bars, peaks);
        renderBars(played, peaks);
      }, function () { /* keep placeholder bars */ });
    }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        if (entries.some(function (e) { return e.isIntersecting; })) {
          io.disconnect();
          loadPeaks();
        }
      }, { rootMargin: '200px' });
      io.observe(wrap);
    } else {
      loadPeaks();
    }

    function renderCount() {
      var dots = '';
      var shown = Math.max(3, Math.min(plays, 5));
      for (var i = 0; i < shown; i++) dots += '<i class="' + (i < plays ? 'on' : '') + '"></i>';
      if (plays > 5) dots += '<span>' + plays + '×</span>';
      count.innerHTML = dots;
      count.setAttribute('aria-label', l.heard + ': ' + plays);
    }
    renderCount();

    function update() {
      var d = audio.duration;
      var t = audio.currentTime;
      var pct = isFinite(d) && d > 0 ? (t / d) * 100 : 0;
      wrap.style.setProperty('--p', pct + '%');
      time.textContent = formatTime(t) + ' / ' + formatTime(d);
      wave.setAttribute('aria-valuemax', isFinite(d) ? Math.round(d) : 0);
      wave.setAttribute('aria-valuenow', Math.round(t));
      wave.setAttribute('aria-valuetext', formatTime(t));
    }

    function play() {
      var p = audio.play();
      if (p && p.catch) p.catch(function () {});
    }
    function pause() { audio.pause(); }
    function togglePlay() { audio.paused ? play() : pause(); }
    function restart() {
      audio.currentTime = 0;
      play();
    }
    function seekTo(fraction) {
      if (!isFinite(audio.duration)) return;
      audio.currentTime = Math.max(0, Math.min(1, fraction)) * audio.duration;
      wrap.classList.add('has-started');
      update();
    }

    audio.addEventListener('loadedmetadata', update);
    audio.addEventListener('timeupdate', update);
    audio.addEventListener('play', function () {
      if (audio.currentTime < 0.25) {
        plays++;
        renderCount();
      }
      all.forEach(function (other) {
        if (other !== audio && !other.paused) other.pause();
      });
      wrap.classList.add('is-playing', 'has-started');
      toggle.setAttribute('aria-label', l.pause);
    });
    audio.addEventListener('pause', function () {
      wrap.classList.remove('is-playing');
      toggle.setAttribute('aria-label', l.play);
    });
    audio.addEventListener('ended', function () {
      audio.currentTime = 0;
      update();
    });

    toggle.addEventListener('click', togglePlay);
    replay.addEventListener('click', restart);
    speed.addEventListener('click', function () {
      var slow = audio.playbackRate === 1;
      audio.playbackRate = slow ? SLOW_RATE : 1;
      speed.textContent = (slow ? SLOW_RATE : 1) + '×';
      speed.setAttribute('aria-pressed', String(slow));
    });

    var dragging = false;
    function fractionFromEvent(e) {
      var rect = wave.getBoundingClientRect();
      return (e.clientX - rect.left) / rect.width;
    }
    wave.addEventListener('pointerdown', function (e) {
      dragging = true;
      wave.setPointerCapture(e.pointerId);
      seekTo(fractionFromEvent(e));
    });
    wave.addEventListener('pointermove', function (e) {
      if (dragging) seekTo(fractionFromEvent(e));
    });
    wave.addEventListener('pointerup', function () { dragging = false; });
    wave.addEventListener('pointercancel', function () { dragging = false; });
    wave.addEventListener('keydown', function (e) {
      var step = 2;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + step);
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') audio.currentTime = Math.max(0, audio.currentTime - step);
      else if (e.key === 'Home') audio.currentTime = 0;
      else if (e.key === 'End' && isFinite(audio.duration)) audio.currentTime = audio.duration;
      else if (e.key === ' ' || e.key === 'Enter') togglePlay();
      else return;
      e.preventDefault();
      update();
    });

    var controller = {
      el: wrap,
      audio: audio,
      play: play,
      pause: pause,
      toggle: togglePlay,
      restart: restart,
    };
    controllers.set(audio, controller);
    all.push(audio);
    update();
    return controller;
  }

  function enhanceAll(root) {
    (root || document).querySelectorAll('audio[data-player]').forEach(enhance);
  }

  window.DictionPlayer = {
    enhance: enhance,
    enhanceAll: enhanceAll,
    get: function (audio) { return controllers.get(audio) || null; },
  };
})();
