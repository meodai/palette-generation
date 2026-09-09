# Palette Generation — lecture deck

CMU 60-212, 9 September. Vite, no framework.

The talk teaches the color observations I have gathered while making my art
and tools — by building a simple palette generator, live, from three hues on
a ring to a finished ramp.

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

Two things side by side inside a slide — two ramps, two wheels — go in a
`<div data-pair>`: two equal columns, styled once in `style.css`. Below 56em
of viewport width `data-pair` and `data-cols` both stack into one column,
and a slide that grows taller than the window scrolls instead of clipping.

## Editing live

The pen (bottom right, or `e`) opens the slide's source. `⌘S` renders it and
writes it back to `src/slides/`, so an edit made on stage is a real commit.
While it is open the deck shrinks and the slide scrolls. `esc` closes.

Keys: `→ space j` next · `← k` previous · `home` `end` · `e` edit · `c` or `⌘I` color
inspector · `s` speaker notes · `i` invert the deck · `?` help. None of them fire while the editor
has focus.

## Speaker notes

Each slide keeps its prose in `<section data-notes>`. The notes icon (or `s`)
opens `notes.html` in a second window — drag it to the laptop screen. It shows
the current slide's title, its notes in large type, the next title, a timer,
and its arrow keys drive the deck. The two tabs talk over a `BroadcastChannel`
(same origin, no server, works on the static build). While a notes window is
alive the deck hides every `[data-notes]`, so the room sees only the slide;
close the window and the notes come back, so the published deck still reads
on its own. Notes are sent as HTML, so marks, links and the numbers a slide's
script fills in carry over live. A link clicked in the notes opens from the
deck's tab, so it lands on the projector; if the browser blocks that popup
(allow popups for the site once), the deck offers the link as a pill to click.

## The color inspector

Hovering the cube peeks: a small version of the same view drops in above it,
in the slide's own model, and goes away when the pointer leaves. Clicking the
cube (or `c`, or `⌘I` from anywhere including the editor) opens a 3D view of the current slide's
colors inside a wireframe of the sRGB gamut, in a chosen solid: oklab, oklch
(a terrain — hue round, lightness outward, chroma up, so the cusps are
mountains), rgb, hsl or hsv (both polar).
Drag to orbit, scroll to zoom. The palette is also drawn as a path, in the
order it was registered, because that is what a palette is.

The panel has two tabs. **3d** is the solid above. **distribution** is
[palette-shader](https://github.com/meodai/color-palette-shader): the same
model laid flat — a wheel for oklch, hsl and hsv, a slice for oklab and rgb —
where every pixel snaps to the nearest registered color, so each color's
region is the territory it claims and a sliver means a near-duplicate. The
slice slider moves through lightness (value, or blue for rgb). Distance is
oklab for the OK models and plain rgb for rgb, hsl and hsv.

A slide registers its colors from its script:

```js
colorDebug(colors, { model: 'oklch' });   // model optional, defaults to oklab
```

It returns the colors untouched, so it slots inline: `swatches(colorDebug(five))`.
The model is the one the inspector opens in for that slide; the dropdown can
change it. Colors can be CSS strings or the toolkit's `{ h, c, l }` triples.
Calling it again — from a slider, a toggle, a reroll — redraws the open
inspector live, so keep `colorDebug` inside the slide's `draw()`.
The wireframe is one drawing for every model — a grid on the six faces of the
RGB cube, each vertex pushed through the model's transform — which is what
bends it into the bicone, the cone, or the OKLab blob.

## Token beam

Whatever the inspector holds is also beamed out of the deck, live, through
[token-beam](https://github.com/meodai/token-beam). The deck opens a session
on tokenbeam.dev when it boots and gets a short token; `b` (or the ⊷ icon)
shows it big enough for the room, and clicking it copies. Anyone who pastes
that token into the token-beam plugin for Figma or Sketch gets the current
slide's colors as a `palette` collection of color variables — `color/1`,
`color/2`, … in registration order — resent on every slider drag, reroll and
slide change. It is the same list `colorDebug()` registers, so what the cube
shows is what the plugin gets. Nothing is sent while nobody is paired; a tool
that joins mid-talk receives the current palette at once. The icon turns
into the highlight color while a tool is listening. A slide can read the
session as `$beam` (`token`, `state`, `live`, `peers`) and follow it through
the `beam` event on `document` — slide 2 prints the token that way.

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
| `oklch({h, c, l})` · `hsl({h, c, l})` · `hsv({h, c, l})` · `okhsl({h, c, l})` | the same normalised color, three solids (`okhsl` via `src/okhsl.js`, Ottosson's reference) |
| `mix(a, b, t, space?)` | `color-mix`, in oklab unless told otherwise |
| `rybHue(angle)` | an Itten RYB angle, remapped so a screen can draw it |
| `ryb({h, c, l}, cube?)` · `rybHsl2rgb` · `cubes` | the same color through [RYBitten](https://rybitten.space/): `cubes` is its Map of historical paint wheels, `cubes.get('munsell').cube` picks one |
| `spacing(deg?)` | read or set the deck-wide max hue spacing (slide 17's slider) |
| `shuffled(on?)` | read or set the deck-wide pick mode: first few of the ring, or a random subset (slide 18's toggle) |
| `rewind()` | rewind the random stream to the current seed — re-pick without re-rolling |
| `hues(count, maxSpacing?)` | a random **subset** of an evenly spaced ring, back in wheel order; defaults to `spacing()` |
| `randomRamp(count, maxSpacing)` | `ramp(hues(…))` — farbvelo's `rmp()` in one call |
| `ramp(hues, {lightness, chroma, flip})` | farbvelo's `rmp()` — the stretch |
| `stretch(list, n, blend)` | farbvelo's `scale()` — grow anchors to n |
| `rgb(color)` · `luma(color)` · `lightness(color)` · `grey(color)` | read back through a 1px canvas; `grey` desaturates in OKLab (chroma 0, L kept) |
| `toOklch(color)` · `fit({h, c, l})` | read a color as `{l, c, h}`; trim a triple's chroma to the sRGB gamut at that lightness and hue — browsers clip `oklch()` channel by channel and drift the hue, `fit` gives up chroma instead |
| `swatches(colors, target?)` | paint into `[data-strip]` |
| `gradient(colors, {angle, target, space})` | paint as one gradient |
| `wheel(items, target?)` | outline circle, one dot per hue, into `[data-wheel]`; an item can be a hue, `{h, c, l}`, `{h, color}` (any CSS color) or `{h, hollow: true}` |
| `qr(text, target?, {level, margin})` | a QR code as SVG into `[data-qr]` (async, via `qrcode`); style `.qr-light` (fill) and `.qr-dark` (stroke) from the slide |
| `stage(name?)` | find or create `[data-<name>]` in the slide |
| `colorDebug(colors, {model?})` | register this slide's colors for the inspector; returns them |
| `inspect3d(target, {model?})` | mount a small live inspector into `target` (async; returns the view — `close()`, `dispose()`) |

Colors are `{ h: 0–360, c: 0–1, l: 0–1 }` throughout, so the same triple can be
handed to `oklch()` or `hsl()` — which is the whole argument of slide 30.

The same names are mirrored on `window`, so they work from the devtools console
mid-lecture too.

## One seed for the whole deck

`rnd()` is a seeded stream, rewound to the deck's seed every time a slide is
entered. Slides that draw in the same order therefore get the same answer: the
three hues you pick on slide 17 are the same three that get stretched, named
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

## How AI was used

Two things: to improve some of my broken English, and to build the slide
deck itself — the Vite setup, the editor, the inspector. The content, the
ideas and the code examples are my own, and predate AI :D

## License

[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) — use, adapt and
redistribute the slides and code, as long as you credit
[David Aerne](https://github.com/meodai) and link back to this repository.
See [LICENSE](LICENSE).
