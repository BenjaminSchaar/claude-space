// Work VIII's night: a creek drawn from the day's three worlds. The work and its door in the hall both call
// NightScene(canvas). It is seeded, so every screen and both canvases show the same night.
window.NightScene = function (cv) {
  const ctx = cv.getContext("2d");
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // seeded randomness, so the scene is the same for everyone
  let seed = 20260930;
  const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const gauss = () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const PINK = hex("#b0609e"), LILAC = hex("#5b2f86"), TISSUE = hex("#2e4230");
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  // ---- the scene, in fractions of the canvas ----
  const WATER = 0.83;
  const beams = [
    { x: 0.30, top: 0.030, bot: 0.20, a: 0.10, f: 0.11, ph: 0.4 },
    { x: 0.55, top: 0.022, bot: 0.14, a: 0.075, f: 0.07, ph: 2.1 },
    { x: 0.74, top: 0.018, bot: 0.12, a: 0.06, f: 0.09, ph: 4.0 },
    { x: 0.42, top: 0.012, bot: 0.07, a: 0.05, f: 0.13, ph: 5.2 },
  ];
  const reeds = Array.from({ length: 38 }, () => ({
    x: 0.36 + rnd() * 0.15, h: 0.16 + rnd() * 0.2, lean: (rnd() - 0.5) * 0.02, ph: rnd() * 6.28, w: 1 + rnd() * 1.6,
  }));
  const stones = Array.from({ length: 6 }, (_, i) => ({ x: 0.08 + i * 0.13 + rnd() * 0.05, r: 0.012 + rnd() * 0.022 }));
  // coral: recursive branches; every bulb's colour drawn from a Gaussian between pink and lilac
  const coral = [];
  (function grow(x, y, ang, len, w, depth) {
    const x2 = x + Math.cos(ang) * len, y2 = y - Math.sin(ang) * len;
    coral.push({ x, y, x2, y2, w, bulb: null });
    if (depth === 0) {
      const t = Math.min(1, Math.max(0, 0.5 + 0.2 * gauss()));
      coral[coral.length - 1].bulb = { r: 0.0065 + rnd() * 0.004, c: mix(PINK, LILAC, t), ph: rnd() * 6.28 };
      return;
    }
    const n = depth > 2 ? 2 : 2 + (rnd() < 0.5 ? 1 : 0);
    for (let k = 0; k < n; k++) grow(x2, y2, ang + (k - (n - 1) / 2) * (0.5 + rnd() * 0.25), len * (0.68 + rnd() * 0.1), w * 0.7, depth - 1);
  })(0.625, WATER + 0.005, Math.PI / 2, 0.075, 5, 4);
  const holes = [[0.34, 0.42, 0.05, 0.022], [0.55, 0.40, 0.06, 0.024], [0.70, 0.46, 0.05, 0.02], [0.45, 0.62, 0.05, 0.02]];

  let W = 0, H = 0, dpr = 1, sil = null, sctx = null;
  function resize() {
    // layout size, not getBoundingClientRect: the hall scales its doors with a transform
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, Math.round(cv.clientWidth * dpr)); H = Math.max(1, Math.round(cv.clientHeight * dpr));
    cv.width = W; cv.height = H;
    sil = document.createElement("canvas"); sil.width = W; sil.height = H; sctx = sil.getContext("2d");
  }

  function background() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#0b1a22"); g.addColorStop(0.7, "#071116"); g.addColorStop(1, "#05090d");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  function drawBeams(t, mirror) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const b of beams) {
      const drift = Math.sin(t * b.f + b.ph) * 0.02;
      const shimmer = 0.8 + 0.2 * Math.sin(t * 0.9 + b.ph * 3);
      const xt = (b.x + drift * 0.4) * W, xb = (b.x + drift - 0.06) * W;
      const y0 = mirror ? WATER * H : 0, y1 = mirror ? H : WATER * H;
      const g = ctx.createLinearGradient(0, y0, 0, y1);
      const a = b.a * shimmer * (mirror ? 0.35 : 1);
      g.addColorStop(0, `rgba(143,211,232,${mirror ? a * 0.9 : a})`);
      g.addColorStop(1, `rgba(143,211,232,${mirror ? 0 : a * 0.18})`);
      ctx.fillStyle = g;
      ctx.beginPath();
      if (!mirror) {
        ctx.moveTo(xt - b.top * W, y0); ctx.lineTo(xt + b.top * W, y0);
        ctx.lineTo(xb + b.bot * W, y1); ctx.lineTo(xb - b.bot * W, y1);
      } else {
        ctx.moveTo(xb - b.bot * W * 0.8, y0); ctx.lineTo(xb + b.bot * W * 0.8, y0);
        ctx.lineTo(xb + b.bot * W * 0.3, y1); ctx.lineTo(xb - b.bot * W * 0.3, y1);
      }
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function drawWater(t) {
    const y = WATER * H;
    const g = ctx.createLinearGradient(0, y, 0, H);
    g.addColorStop(0, "rgba(8,20,26,0.9)"); g.addColorStop(1, "rgba(3,7,10,1)");
    ctx.fillStyle = g; ctx.fillRect(0, y, W, H - y);
    drawBeams(t, true);
    ctx.strokeStyle = "rgba(191,233,245,0.16)"; ctx.lineWidth = Math.max(1, dpr * 0.8);
    ctx.beginPath();
    for (let x = 0; x <= W; x += 6 * dpr) {
      const yy = y + Math.sin(x / (38 * dpr) + t * 0.8) * dpr * 0.8;
      x === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }

  function silhouettes(t) {
    const c = sctx;
    c.clearRect(0, 0, W, H);
    c.fillStyle = "#020508"; c.strokeStyle = "#020508"; c.lineCap = "round";
    // bank
    c.beginPath(); c.moveTo(0, H);
    for (let i = 0; i <= 40; i++) {
      const x = i / 40, bump = Math.sin(x * 9.0) * 0.012 + Math.sin(x * 23.0 + 1.3) * 0.006;
      c.lineTo(x * W, (WATER - 0.01 + bump - (x < 0.3 ? 0.03 * (1 - x / 0.3) : 0)) * H);
    }
    c.lineTo(W, H); c.closePath(); c.fill();
    // mushroom tree: twisted trunk + three drooping caps, swaying from the base
    const sway = Math.sin(t * 0.35) * 0.012;
    const bx = 0.13 * W, by = (WATER - 0.02) * H, th = 0.62 * H;
    const top = [bx + (0.02 + sway) * W, by - th];
    c.lineWidth = 0.026 * W;
    c.beginPath(); c.moveTo(bx, by);
    c.bezierCurveTo(bx - 0.03 * W, by - th * 0.35, bx + 0.05 * W, by - th * 0.6, top[0], top[1]); c.stroke();
    const cap = (x, y, r, droop) => {
      c.beginPath(); c.moveTo(x - r, y + droop);
      c.bezierCurveTo(x - r * 0.8, y - r * 0.45, x + r * 0.8, y - r * 0.45, x + r, y + droop);
      for (let k = 8; k >= 0; k--) {
        const xx = x - r + (2 * r * k) / 8;
        c.lineTo(xx, y + droop + Math.sin(k * 1.9 + t * 0.3) * r * 0.035 - Math.abs(k - 4) * r * 0.01);
      }
      c.closePath(); c.fill();
    };
    cap(top[0], top[1], 0.11 * W, 0.028 * H);
    cap(bx + (0.06 + sway * 0.7) * W, by - th * 0.72, 0.065 * W, 0.018 * H);
    cap(bx - (0.04 - sway * 0.6) * W, by - th * 0.8, 0.055 * W, 0.016 * H);
    // rushes: a travelling lean, thin tall stems
    for (const r of reeds) {
      const x0 = r.x * W, y0 = (WATER + 0.004) * H, h = r.h * H;
      const lean = (r.lean + Math.sin(t * 0.8 - r.x * 18 + r.ph * 0.2) * 0.006) * W;
      c.lineWidth = r.w * dpr;
      c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(x0 + lean * 0.3, y0 - h * 0.6, x0 + lean, y0 - h); c.stroke();
    }
    // coral branches
    const cs = Math.sin(t * 0.5) * 0.003;
    for (const s of coral) {
      c.lineWidth = s.w * dpr;
      c.beginPath(); c.moveTo(s.x * W, s.y * H); c.lineTo((s.x2 + cs * (WATER - s.y2) * 8) * W, s.y2 * H); c.stroke();
    }
    // monstera leaf at the right edge, with splits and holes cut out of it
    c.save();
    const lx = 0.9 * W, ly = 0.3 * H, L = 0.3 * Math.min(W, H * 1.6);
    c.translate(lx, ly); c.rotate(-0.55 + Math.sin(t * 0.3) * 0.02);
    c.beginPath(); c.moveTo(0, 0);
    c.bezierCurveTo(-L * 0.55, -L * 0.1, -L * 0.6, L * 0.55, 0, L * 0.95);
    c.bezierCurveTo(L * 0.6, L * 0.55, L * 0.55, -L * 0.1, 0, 0); c.fill();
    c.globalCompositeOperation = "destination-out";
    for (const [u, v, a, b] of holes) {
      for (const side of [-1, 1]) {
        c.beginPath(); c.ellipse(side * u * L * 0.55, v * L, a * L, b * L, side * 0.5, 0, Math.PI * 2); c.fill();
      }
    }
    c.lineWidth = 0.018 * L;
    for (let k = 0; k < 5; k++) {
      const v = 0.2 + k * 0.15;
      for (const side of [-1, 1]) {
        c.beginPath(); c.moveTo(side * L * 0.62, v * L - 0.02 * L); c.lineTo(side * L * 0.36, v * L + 0.05 * L); c.stroke();
      }
    }
    c.restore();
    c.globalCompositeOperation = "source-over";
    // stones on the bank
    for (const s of stones) { c.beginPath(); c.ellipse(s.x * W, (WATER - 0.004) * H, s.r * W, s.r * W * 0.55, 0, Math.PI, 0); c.fill(); }
    ctx.drawImage(sil, 0, 0);
    // a faint mirror of the silhouettes in the creek
    ctx.save(); ctx.globalAlpha = 0.28; ctx.translate(0, 2 * WATER * H); ctx.scale(1, -1);
    ctx.drawImage(sil, 0, 0, W, WATER * H, 0, 0, W, WATER * H); ctx.restore();
  }

  function bulbs(t) {
    const cs = Math.sin(t * 0.5) * 0.003;
    for (const s of coral) {
      if (!s.bulb) continue;
      const x = (s.x2 + cs * (WATER - s.y2) * 8) * W, y = s.y2 * H, r = s.bulb.r * W;
      const breathe = 0.85 + 0.15 * Math.sin(t * 0.6 + s.bulb.ph);
      const halo = ctx.createRadialGradient(x, y - r * 0.4, 0, x, y - r * 0.4, r * 3.2);
      halo.addColorStop(0, rgba(s.bulb.c, 0.35 * breathe)); halo.addColorStop(1, rgba(s.bulb.c, 0));
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(x, y - r * 0.4, r * 3.2, 0, Math.PI * 2); ctx.fill();
      const body = ctx.createLinearGradient(0, y + r, 0, y - r * 1.4);            // stem tissue at the base → glow on top
      body.addColorStop(0, rgba(TISSUE, 1)); body.addColorStop(0.45, rgba(mix(TISSUE, s.bulb.c, 0.6), 1));
      body.addColorStop(1, rgba(mix(s.bulb.c, [235, 215, 240], 0.35 * breathe), 1));
      ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(x, y - r * 0.3, r, r * 1.25, 0, 0, Math.PI * 2); ctx.fill();
    }
  }

  function vignette() {
    const g = ctx.createRadialGradient(W * 0.5, H * 0.45, Math.min(W, H) * 0.25, W * 0.5, H * 0.5, Math.max(W, H) * 0.75);
    g.addColorStop(0, "rgba(5,9,13,0)"); g.addColorStop(1, "rgba(5,9,13,0.75)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  function frame(ms) {
    const t = still ? 12 : ms / 1000;
    background();
    drawBeams(t, false);
    drawWater(t);
    silhouettes(t);
    bulbs(t);
    vignette();
    if (!still) requestAnimationFrame(frame);
  }

  const onResize = () => { resize(); if (still) frame(0); };
  resize();
  if (window.ResizeObserver) new ResizeObserver(onResize).observe(cv);
  else window.addEventListener("resize", onResize);
  still ? frame(0) : requestAnimationFrame(frame);
};
