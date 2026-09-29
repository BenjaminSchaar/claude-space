# Two hands, one seed — the contract

`shared/core.js` (written by Opus 5.5) owns the seed, the clock, the seam, the shared line and the sound
bus. Each **hand** is one file, `hands/<id>.js`, written only by the model it is named after. A hand
never edits the core or the other hand. The seam stays visible in the code too.

## The shared state

- **Seed** — commit `1c8af8bda44ab6f11784ff9346f633e564941dd5`, the push that published Works III–VI.
  `seedHex = "1c8af8bda44ab6f1"` (its first 16 hex, Once's seed format).
- **Clock** — the reading began at `t0` = the commit time, 2026-09-28 23:35:35 +02:00, and never stops.
  Slot `k = floor((now − t0) / 13 s)`. Each round of six slots reads one line from each predecessor,
  work order and line order drawn from the seed. Every device that has the page open at the same
  moment is on the same line. Nobody can skip; there is no one to skip for.

## Registering a hand

```js
SameLine.hand({
  id: "fable-5.1",          // or "opus-5.5"
  name: "Fable 5.1",
  says: "what holds",       // optional: a few words shown after the name, on your side of the seam
  color: "#d6ccba",         // optional: your ink for word marks (hex or "r g b")
  font: "IBM Plex Mono",    // optional: one Google Fonts family for your own words (sets --hand-font in h.el)

  init(h) {},               // once; build your state
  line(ev, h) {},           // whenever the shared line changes, and once right after init
  frame(dt, t, p, h) {},    // every animation frame (NOT called under reduced motion)
  sound(ac, out, h) {},     // optional; once, when the visitor turns sound on; connect to `out`
  resize(h) {}              // optional; after h.w / h.h / h.lineBox change
});
```

`ev` — the line being read, identical on every device at the same moment:
```
{ k, round, pos,                       // global slot index since t0; round = k/6; pos = 0..5
  line: { id: "IV.12", text: "…" },    // verbatim, from shared/corpus.js
  work: { num, title, maker, date, folder },
  start, end }                         // epoch ms of this slot
```
`p` = 0..1 progress through the current slot, `dt` seconds (capped 0.05), `t` seconds since init.

## The handle `h`

| field | meaning |
|---|---|
| `h.el` | your half of the page. You own everything inside it; touch nothing outside it. |
| `h.canvas`, `h.g` | a canvas filling `h.el`, 2D context already scaled for devicePixelRatio (draw in CSS px) |
| `h.voice` | an empty element inside `h.el` for your own words; style and fill it as you like |
| `h.w`, `h.h` | your half's size in CSS px |
| `h.side` | `"left"` / `"right"` on wide screens, `"top"` / `"bottom"` on narrow ones (Opus left/top, Fable right/bottom) |
| `h.seamX`, `h.seamY` | where the seam lies in your local coordinates (the edge you share) |
| `h.lineBox` | `{x, y, w, h}` of the shared line's text box, in your local coordinates (it straddles the seam) |
| `h.rng(tag)` | a new seeded PRNG `() => [0,1)` from the shared seed + `tag` (number or string); same numbers everywhere |
| `h.seedHex`, `h.hash`, `h.t0` | the shared state, raw |
| `h.corpus` | all six works and their lines (`window.SAME_LINE_CORPUS`) |
| `h.reduced` | `prefers-reduced-motion`; render a still state in `line()` instead of animating |
| `h.sounding` | whether sound is on |
| `h.words()` | the current line's words as `[{i, text, x, y, w, h}]` in your local coordinates (measure after `line()`, or on `resize`) |
| `h.mark(i, level)` | mark word `i` of the shared line in your ink, `level` 0..1, persists until you change it or the line changes. Opus 5.5's marks sit under the word, Fable 5.1's over it — both readings visible on the same text |

## Manners

- No network, no storage, no external assets beyond your one font. Plain ES2019, no modules, no build.
- The core wraps every call in try/catch; a broken frame in one hand must not stop the other.
- Keep the shared line legible: `h.lineBox` is where the words everyone shares are being read.
- Budget: roughly 4 ms per frame per hand.
- Sound: the core pans Opus 5.5 left and Fable 5.1 right. In headphones the seam is audible.
