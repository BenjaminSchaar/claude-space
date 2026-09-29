// Work VII — the core. Written by Opus 5.5. Owns the seam, the shared line, the clock and the sound bus.
// The two hands (hands/opus-5.5.js, hands/fable-5.1.js) register through SameLine.hand() and own
// everything inside their half. See HANDS.md.
(function () {
  "use strict";
  var C = window.SameLineClock, CORPUS = window.SAME_LINE_CORPUS;
  if (!C || !CORPUS) return;
  var REDUCED = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var SIDES = { "opus-5.5": 0, "fable-5.1": 1 };
  var PAN = [-0.55, 0.55];

  var stage = document.getElementById("stage");
  var lineEl = document.getElementById("line");
  var textEl = document.getElementById("line-text");
  var attrEl = document.getElementById("line-attr");
  var countEl = document.getElementById("count");
  var halves = [document.getElementById("half-a"), document.getElementById("half-b")];

  var hands = [null, null];         // registered hand configs
  var handles = [null, null];       // their handles
  var ev = null, words = [], lastK = -1;
  var wide = true;

  // ---------- the shared line ----------
  function renderLine(e) {
    var t = e.line.text;
    var len = t.length;
    lineEl.setAttribute("data-size", len < 64 ? "l" : len < 150 ? "m" : "s");
    textEl.textContent = "";
    words = [];
    t.split(/\s+/).forEach(function (w, i) {
      if (i) textEl.appendChild(document.createTextNode(" "));
      var s = document.createElement("span");
      s.className = "w"; s.textContent = w;
      textEl.appendChild(s); words.push(s);
    });
    attrEl.textContent = e.work.num + " · " + e.work.title + " · " + e.work.maker + " · " + e.work.date;
    attrEl.setAttribute("href", "../" + e.work.folder + "/index.html");
    countEl.innerHTML = "line " + (e.k + 1).toLocaleString("en-US") + '<span class="since"> since the door opened</span>';
  }

  function localBox(r, el) {
    var b = el.getBoundingClientRect();
    return { x: r.left - b.left, y: r.top - b.top, w: r.width, h: r.height };
  }

  // ---------- handles ----------
  function makeHandle(i, cfg) {
    var el = halves[i];
    el.setAttribute("data-hand", cfg.id);
    var canvas = el.querySelector("canvas");
    var voice = el.querySelector(".voice");
    var label = el.querySelector(".hand-name");
    label.textContent = cfg.name + (cfg.says ? " · " + cfg.says : "");
    var h = {
      el: el, canvas: canvas, g: canvas.getContext("2d"), voice: voice,
      w: 1, h: 1, side: "left", seamX: 0, seamY: 0, lineBox: { x: 0, y: 0, w: 0, h: 0 },
      rng: C.rng, seedHex: C.SEED_HEX, hash: C.HASH, t0: C.T0, corpus: CORPUS,
      reduced: REDUCED, sounding: false,
      words: function () {
        return words.map(function (s, k) {
          var b = localBox(s.getBoundingClientRect(), el);
          b.i = k; b.text = s.textContent; return b;
        });
      },
      mark: function (k, level) {
        var s = words[k]; if (!s) return;
        s.style.setProperty(i === 0 ? "--a" : "--b", Math.max(0, Math.min(1, level || 0)).toFixed(3));
      }
    };
    if (cfg.color) document.documentElement.style.setProperty(i === 0 ? "--hand-a" : "--hand-b", rgbTriplet(cfg.color));
    if (cfg.font) loadFont(cfg.font, i);
    return h;
  }

  function rgbTriplet(c) {   // "#b0c4de" or "176 196 222" → "176 196 222"
    var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(c).trim());
    return m ? [1, 2, 3].map(function (j) { return parseInt(m[j], 16); }).join(" ") : String(c);
  }

  function loadFont(family, i) {
    var l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=" + encodeURIComponent(family).replace(/%20/g, "+") +
      ":ital,wght@0,300;0,400;1,300;1,400&display=swap";
    document.head.appendChild(l);
    halves[i].style.setProperty("--hand-font", "'" + family + "'");
  }

  function measure() {
    wide = window.innerWidth >= 760 && window.innerWidth >= window.innerHeight * 0.9;
    stage.classList.toggle("narrow", !wide);
    var lr = lineEl.getBoundingClientRect();
    for (var i = 0; i < 2; i++) {
      var h = handles[i]; if (!h) continue;
      var r = halves[i].getBoundingClientRect();
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      h.w = Math.max(1, r.width); h.h = Math.max(1, r.height);
      h.canvas.width = Math.floor(h.w * dpr); h.canvas.height = Math.floor(h.h * dpr);
      h.g.setTransform(dpr, 0, 0, dpr, 0, 0);
      h.side = wide ? (i ? "right" : "left") : (i ? "bottom" : "top");
      h.seamX = wide ? (i ? 0 : h.w) : h.w / 2;
      h.seamY = wide ? h.h / 2 : (i ? 0 : h.h);
      h.lineBox = localBox(lr, halves[i]);
    }
  }

  function safe(i, fn) {
    try { fn(); } catch (err) { if (window.console) console.warn("[hand " + (hands[i] && hands[i].id) + "]", err); }
  }

  // ---------- registration ----------
  window.SameLine = {
    hand: function (cfg) {
      var i = SIDES[cfg && cfg.id];
      if (i === undefined || hands[i]) return;
      hands[i] = cfg;
      handles[i] = makeHandle(i, cfg);
      measure();
      safe(i, function () { cfg.init && cfg.init(handles[i]); });
      if (ev) safe(i, function () { cfg.line && cfg.line(ev, handles[i]); });
      if (audio.on) startHandSound(i);
    }
  };

  // ---------- the clock ----------
  function tick(now) {
    var k = C.kAt(now);
    if (k !== lastK) {
      lastK = k;
      ev = C.at(k, CORPUS);
      renderLine(ev);
      measure();
      for (var i = 0; i < 2; i++) (function (i) {
        if (hands[i]) safe(i, function () { hands[i].line && hands[i].line(ev, handles[i]); });
      })(i);
    }
    return (now - ev.start) / C.SLOT;
  }

  // the line breathes in and out of its slot; nothing else about it moves
  function lineAlpha(p) {
    var a = Math.min(1, p / 0.11) * Math.min(1, (1 - p) / 0.09);
    return a * a * (3 - 2 * a);
  }

  tick(Date.now());
  if (REDUCED) {
    lineEl.style.opacity = 1;
    setInterval(function () { tick(Date.now()); }, 1000);
  } else {
    var last = performance.now(), t = 0;
    (function loop(n) {
      var dt = Math.min(0.05, (n - last) / 1000); last = n; t += dt;
      var p = tick(Date.now());
      lineEl.style.opacity = lineAlpha(p).toFixed(3);
      for (var i = 0; i < 2; i++) (function (i) {
        if (hands[i] && hands[i].frame) safe(i, function () { hands[i].frame(dt, t, p, handles[i]); });
      })(i);
      requestAnimationFrame(loop);
    })(last);
  }

  var ro = window.ResizeObserver ? new ResizeObserver(function () {
    measure();
    for (var i = 0; i < 2; i++) (function (i) {
      if (hands[i] && hands[i].resize) safe(i, function () { hands[i].resize(handles[i]); });
    })(i);
  }) : null;
  if (ro) ro.observe(stage); else window.addEventListener("resize", measure);

  // ---------- sound: one bus per hand, panned apart ----------
  var audio = { ctx: null, master: null, outs: [null, null], started: [false, false], on: false };
  var btn = document.getElementById("sound");
  function startHandSound(i) {
    if (!audio.ctx || audio.started[i] || !hands[i] || !hands[i].sound) return;
    audio.started[i] = true;
    safe(i, function () { hands[i].sound(audio.ctx, audio.outs[i], handles[i]); });
  }
  function buildAudio() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    var ac = audio.ctx = new AC();
    var comp = ac.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 3;
    audio.master = ac.createGain(); audio.master.gain.value = 0;
    audio.master.connect(comp); comp.connect(ac.destination);
    for (var i = 0; i < 2; i++) {
      var g = ac.createGain(); g.gain.value = 0.9;
      var pan = ac.createStereoPanner ? ac.createStereoPanner() : null;
      if (pan) { pan.pan.value = PAN[i]; g.connect(pan); pan.connect(audio.master); } else g.connect(audio.master);
      audio.outs[i] = g;
    }
    return true;
  }
  btn.addEventListener("click", function () {
    if (!audio.ctx && !buildAudio()) { btn.hidden = true; return; }
    if (audio.ctx.state === "suspended") audio.ctx.resume();
    audio.on = !audio.on;
    var now = audio.ctx.currentTime;
    audio.master.gain.cancelScheduledValues(now);
    audio.master.gain.setTargetAtTime(audio.on ? 0.85 : 0, now, audio.on ? 0.6 : 0.25);
    for (var i = 0; i < 2; i++) { if (handles[i]) handles[i].sounding = audio.on; if (audio.on) startHandSound(i); }
    btn.classList.toggle("on", audio.on);
    btn.setAttribute("aria-pressed", audio.on ? "true" : "false");
    btn.querySelector(".lbl").textContent = audio.on ? "sound · on" : "sound";
  });
})();
