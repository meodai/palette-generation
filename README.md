# Palette Generation — lecture deck

CMU 60-212, 9 September. Vite, no framework.

```
npm run dev      # localhost:5173, edits write back to src/slides/
npm run build    # static deck in dist/
```

## Slides

One file per slide in `src/slides/`, ordered by filename. Each is a standalone
fragment rooted in `<main data-slide>` and may carry its own `<style>` and
`<script>`.

- **Styles** are auto-scoped with `@scope`, so bare selectors (`h1`, `.note`)
  cannot leak. Use `:scope` for the slide element itself — `:root` is rewritten
  to `:scope` for you. `@keyframes` and `@font-face` are hoisted out. Everything
  in `style.css` that targets slide contents is wrapped in `:where()` and so
  carries no specificity: a plain selector in a slide always wins.
- **Scripts** run on every entry and are torn down on leave. `return () => {…}`
  and that function is your cleanup. The slide's markup is restored to its
  authored state before each run, so re-entering a slide is always a fresh start.
- Add `data-invert` for a dark slide, `data-align="center"`, `data-cols` for two
  columns, `data-bleed` for no padding.

## Editing live

The pen (bottom right, or `e`) opens the slide's source. `⌘S` renders it and
writes it back to `src/slides/`, so an edit made on stage is a real commit.
While it is open the deck shrinks and the slide scrolls. `esc` closes.

Keys: `→ space j` next · `← k` previous · `home` `end` · `e` edit · `c` or `⌘I` color
inspector · `i` invert the deck · `?` help. None of them fire while the editor
has focus.

## The color inspector

The cube next to the pen (or `c`, or `⌘I` from anywhere including the editor) opens a 3D view of the current slide's
colors inside a wireframe of the sRGB gamut, in a chosen solid: oklab, oklch
(a terrain — hue round, lightness outward, chroma up, so the cusps are
mountains), rgb, hsl or hsv (both polar).
Drag to orbit, scroll to zoom. The palette is also drawn as a path, in the
order it was registered, because that is what a palette is.

A slide registers its colors from its script:

```js
colorDebug(colors, { model: 'oklch' });   // model optional, defaults to oklab
```

It returns the colors untouched, so it slots inline: `swatches(colorDebug(five))`.
The model is the one the inspector opens in for that slide; the dropdown can
change it. Colors can be CSS strings or the toolkit's `{ h, c, l }` triples.
The wireframe is one drawing for every model — a grid on the six faces of the
RGB cube, each vertex pushed through the model's transform — which is what
bends it into the bicone, the cone, or the OKLab blob.

## What is in scope on every slide

No imports needed — these are already bound inside every slide `<script>`.

| | |
|---|---|
| `$slide` | this slide's `<main data-slide>` |
| `$slides` | array of every slide element, in order |
| `$deck` | `{ index, count, go(n), next(), previous() }` |
| `rnd(a, b)` | `rnd()` 0–1 · `rnd(n)` 0–n · `rnd(a, b)` a–b — **seeded** |
| `reseed()` | new seed for the whole deck; what a "reroll" button calls |
| `rndInt(a, b)` · `pick(list)` · `shuffle(list)` | |
| `lerp(t, a, b)` · `clamp(v, min, max)` | |
| `oklch({h, c, l})` · `hsl({h, c, l})` · `okhsl({h, c, l})` | the same normalised color, three solids (`okhsl` via `src/okhsl.js`, Ottosson's reference) |
| `mix(a, b, t, space?)` | `color-mix`, in oklab unless told otherwise |
| `rybHue(angle)` | an Itten RYB angle, remapped so a screen can draw it |
| `spacing(deg?)` | read or set the deck-wide max hue spacing (slide 15's slider) |
| `shuffled(on?)` | read or set the deck-wide pick mode: first few of the ring, or a random subset (slide 16's toggle) |
| `rewind()` | rewind the random stream to the current seed — re-pick without re-rolling |
| `hues(count, maxSpacing?)` | a random **subset** of an evenly spaced ring, back in wheel order; defaults to `spacing()` |
| `randomRamp(count, maxSpacing)` | `ramp(hues(…))` — farbvelo's `rmp()` in one call |
| `ramp(hues, {lightness, chroma, flip})` | farbvelo's `rmp()` — the stretch |
| `stretch(list, n, blend)` | farbvelo's `scale()` — grow anchors to n |
| `rgb(color)` · `luma(color)` · `lightness(color)` · `grey(color)` | read back through a 1px canvas; `grey` desaturates in OKLab (chroma 0, L kept) |
| `swatches(colors, target?)` | paint into `[data-strip]` |
| `gradient(colors, {angle, target, space})` | paint as one gradient |
| `wheel(items, target?)` | outline circle, one dot per hue, into `[data-wheel]` |
| `stage(name?)` | find or create `[data-<name>]` in the slide |
| `colorDebug(colors, {model?})` | register this slide's colors for the inspector; returns them |

Colors are `{ h: 0–360, c: 0–1, l: 0–1 }` throughout, so the same triple can be
handed to `oklch()` or `hsl()` — which is the whole argument of slide 26.

The same names are mirrored on `window`, so they work from the devtools console
mid-lecture too.

## One seed for the whole deck

`rnd()` is a seeded stream, rewound to the deck's seed every time a slide is
entered. Slides that draw in the same order therefore get the same answer: the
three hues you pick on slide 15 are the same three that get stretched, named
as vomit, shuffled, measured, ramped and finally handed over in the recipe —
so the sequence reads as one palette being fixed, not eight unrelated demos.

The catch is that it depends on **draw order**. Every slide from 15 (pick
three) through 22 (ramp), and the recipe on 28, calls `hues(3)` as its first
random act. Insert a `rnd()` before that in one of them and it drifts out of
step with the others. And never call `reseed()` on slide *entry* — only from a
reroll button — or entering that slide silently moves everyone else's palette.
A toggle that changes *how* the pick is made (like *shuffled*) should call
`rewind()` and re-pick, so the roll stays and only the choice changes.

Any `reroll` button calls `reseed()`, which moves the seed for every slide at
once — reroll on the vomit slide and the ramp slide four slides later shows the
fix applied to the palette you just chose.

## Parked slides

`src/slides/_parked/` is outside the glob, so anything in it stays out of the
deck without being deleted. Move a file back up one level (with a number) to
restore it.

## Adding an image

Drop files in `public/`; reference them as `name.png` (relative — slides are raw HTML, so Vite cannot rewrite `/name.png` for the project page). Slide 6 uses
`public/picker.png` and falls back to a dashed placeholder if it goes missing.

See `OUTLINE.md` for the talk structure and timings, `golan.md` for context.

## License

[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) — use, adapt and
redistribute the slides and code, as long as you credit
[David Aerne](https://github.com/meodai) and link back to this repository.
See [LICENSE](LICENSE).
