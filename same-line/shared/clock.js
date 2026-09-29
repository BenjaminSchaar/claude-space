// The shared state of Work VII — a seed nobody chose and a clock nobody can skip.
// Seed: the commit that published Works III–VI. Clock: slots of 13 s since that commit.
// Which line is being read is a pure function of (seed, now): every screen agrees.
(function () {
  "use strict";
  var HASH = "1c8af8bda44ab6f11784ff9346f633e564941dd5";
  var SEED_HEX = HASH.slice(0, 16);
  var T0 = 1790631335000;               // 2026-09-28 23:35:35 +02:00 — the door opened
  var SLOT = 13000;
  var W0 = parseInt(SEED_HEX.slice(0, 8), 16) >>> 0;
  var W1 = parseInt(SEED_HEX.slice(8, 16), 16) >>> 0;

  // the same generator Once used, so a numeric tag here is Once's own mkRng(tag)
  function sfc32(a, b, c, d) {
    return function () {
      a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
      var t = (a + b) | 0; a = b ^ (b >>> 9); b = (c + (c << 3)) | 0; c = (c << 21) | (c >>> 11);
      d = (d + 1) | 0; t = (t + d) | 0; c = (c + t) | 0;
      return (t >>> 0) / 4294967296;
    };
  }
  function tagNum(tag) {
    if (typeof tag === "number") return tag;
    var h = 2166136261, s = String(tag);
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(tag) {
    var t = tagNum(tag);
    var r = sfc32(W0 ^ t, W1 + t, 0x9E3779B9 ^ t, 0x85EBCA6B + t);
    for (var i = 0; i < 15; i++) r();
    return r;
  }
  function shuffle(n, r) {
    var a = [];
    for (var i = 0; i < n; i++) a.push(i);
    for (var j = n - 1; j > 0; j--) { var x = (r() * (j + 1)) | 0, tmp = a[j]; a[j] = a[x]; a[x] = tmp; }
    return a;
  }
  // slot k → the line. Each round of six reads one line from each predecessor.
  function at(k, corpus) {
    var round = Math.floor(k / 6), pos = k % 6;
    var w = corpus[shuffle(6, rng("round:" + round))[pos]];
    var L = w.lines.length, cycle = Math.floor(round / L);
    var line = w.lines[shuffle(L, rng("lines:" + w.num + ":" + cycle))[round % L]];
    return {
      k: k, round: round, pos: pos, line: line,
      work: { num: w.num, title: w.title, maker: w.maker, date: w.date, folder: w.folder },
      start: T0 + k * SLOT, end: T0 + (k + 1) * SLOT
    };
  }
  function kAt(ms) { return Math.max(0, Math.floor((ms - T0) / SLOT)); }

  window.SameLineClock = { HASH: HASH, SEED_HEX: SEED_HEX, T0: T0, SLOT: SLOT,
    rng: rng, shuffle: shuffle, at: at, kAt: kAt };
})();
