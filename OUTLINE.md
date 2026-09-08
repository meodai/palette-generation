# Palette Generation — CMU 60-212, Wed 9 Sept, 20:10 CEST

## The room

2nd-year Art × CS double majors in Golan Levin's *Creative Coding*, working in
p5.js. Art students, not design students — Golan's phrase is "sloppy", and he
is there to introduce rigor. His name for the problem: **unicorn vomit**. They
can see it. They cannot fix it.

Budget: 45 min max, realistically **35 min + 10 Q&A**. Starts ~20:10.

## What they already have — read this before rehearsing

I followed the links in `golan.md`. This is not a blank room.

**From Golan's lecture last week** (`lectures/color/readme.md`):

- RGB → Oklab interpolation, yellow to blue, *with a p5 sketch to verify it*.
  Do not re-teach this. Reference it once and move on.
- HSL vs HSV definitions and the bicone diagrams.
- Albers relativity, 3-looks-like-4 and 4-looks-like-3.
- CIE 1931, CIE Lab, Oklab with Ottosson's article. Gamut video.
- Your work, by name: Poline, Rampensau, Albers, the palette visualizer.

**From Assignment 3** (`2026/assignments/assignment_3_color.md`) — your Albers
is the header image, Verloop is in 3.3:

- 3.1 · readings: Rune Madsen, Eric Portis *Okay, Color Spaces*, Gregor Aisch
  on chroma.js multi-hue scales.
- 3.2 · they have **clicked around Poline and Rampensau**, the chroma palette
  helper, ColorBrewer, and both OK pickers.
- **3.3 · Four-color Gradient — due the morning of your talk.** chroma.js
  `scale()` through four stops, chips shown separately. *This is
  scaleSpreadArray.*
- **3.4 · Split Complementaries — due the morning of your talk.** A hue and
  its two split complements, in OKLCH, new set on click. *This is three hues
  on a ring.*
- 3.5 · Albers four-look-like-three, due after.
- **3.6 · 60-30-10 composition, due after.** Three colors that "interrelate,
  can't be mutually random", NOT in RGB/HSB/HSL, new set on click. *This is
  `randomRamp(3)`, exactly.*

Golan's framing for the whole set: *"don't show me that you found good
colors; show me that you figured out how to generate good color
relationships."* Your talk is the worked example of that sentence.

They will ask about **vibecoding**. No slide — answer it in Q&A.

## The one sentence

> **A palette is a path through a color solid.**

## The build — why the order is what it is

The whole middle of the talk rebuilds farbvelo out of two things they have
already built for the assignment, then shows why it is still ugly, then fixes
it. The slides never say "yesterday" or "this morning" — keep it that way on
stage too; the connection lands harder when they make it themselves. One
seed runs through it: the three hues you pick on slide 15 are the same three
on every slide through to 22, and the recipe rolls from the same seed. Reroll
anywhere and they all move together; the *shuffled* toggle and the min-angle
slider are deck-wide too.

```
15  pick 3 hues on a ring      ← their 3.4 — in order, an arc
16  shuffle the ring           random subset, gaps — the toggle carries on
17  stretch 3 → 5              ← their 3.3
18  five stops, one gradient   the same five, gaps filled in — space dropdown
19  thrown out of order        same gradient, stops scattered — still bad
20  ─── stop holding lightness still
21  lightness gets a range     third bar, min and max, in OKLCH
22  chroma too                 both axes walking, then stretch
23  randomRamp, in full        verbatim
24  and what it makes         stripes, and the scattered gradient
```

Nothing works until 21. That is deliberate: they try the two things they
already know and watch both fail — for the one reason slides 3 to 5 already
measured for them — and then see the one move that fixes it.

---

## Outline

### 0 · Where I'm coming from — 7 min · slides 01–08

- Title.
- **Question one.** Why does changing only H give me a mess? *(live: six
  hues, same S and L)*
- **The answer, straight away** (03–04). The same six desaturated and
  measured: asked for one lightness, got six — HSL's L is a coordinate, not a
  brightness. Then *OKLCH to the rescue*: the same six colours at one OKLCH
  lightness and one chroma, measured again: one lightness. *The rest of the talk is about earning that.* This is the thesis
  stated in the first two minutes; everything after is the build.
- **OKHSL, my favourite** (05). HSL's three handles on OKLab's lightness.
  Saturation is relative to the gamut, so 100% exists for every hue — the
  chroma-capping slide 4 had to do by hand, the space does for you. HSL's
  ease, OKLCH's honesty. One breath, then on to the picker.
- **Question two.** What are all the other numbers in the Photoshop picker
  for? *(the screenshot)*
- **A confusion I lived in for years:** HSL and HSB. Golan showed them the
  bicones; this is the same fact felt from inside a picker — the pure hue is
  not in the corner. The numbers are on the slide: the same color is
  `hsb(h, 100%, 100%)` and `hsl(h, 100%, 50%)`, and HSL's corner is white.
  *(live: both squares, one slider)* **L is not B** — slide 3, felt.
- What came out of it. They have met several of these — let them recognise
  them rather than telling them. Then: *we are going to rebuild farbvelo.*

### 1 · The clash — 6 min · slides 09–13 ← the hook

- Both wheels at once, concentric, 24 steps each. RYB outside, HSL inside.
  They agree at red and drift; RYB's green-to-blue is stretched across twice
  as much of the HSL wheel.
- The consequence: one complement slider. Blue↔orange on one wheel,
  blue↔yellow on the other. *(This is the slide that contradicts something
  they believe. Spend the time here.)*
- Precision, since Golan is in the room: RYB is Itten's pigment model, HSL is
  the RGB cube spun on its diagonal. **Neither is perceptual.**
- Every named harmony is spacing on a ring. **Harmony is spacing, not magic.**
  *(Bridge: their split complements are exactly this.)*

### 2 · Build it — 9 min · slides 14–19

- **Pick three hues** (15). Evenly spaced candidates from a random start, the
  first three — an arc. Split complements are exactly this; say so without
  dating it. The min-angle slider moves the whole chain.
- **Shuffle the ring** (16). Same function with the one line added:
  `shuffle(ring).slice(0, 3).sort()`. A random subset with gaps instead of an
  arc. The *shuffled* toggle is deck-wide — every later chain slide has it, so
  you can flip the whole build between the two modes at any point.
- **Stretch to five** (17). `chroma.scale()` through four stops is exactly
  this. The anchors are the design; the steps are only resolution.
- **Five stops, one gradient** (18). The same five with the gaps filled in.
  The interpolation space is a dropdown in the sentence — flip it to srgb once
  and back; Golan already showed them why, so one flick is enough. This is the
  bridge: a gradient is a palette with the resolution turned up, and the next
  slide scatters its stops.
- **Thrown out of order** (19). One random number per color, sort by it:
  reorders *and* scatters the stops. The last thing farbvelo does. Toggle off
  and watch it go stiff. Less mechanical. Still unusable — this is where
  Golan's phrase for it belongs: say it, don't title it. They already know
  why, from slide 3; let them say it.

### 3 · The fix — 9 min · slides 20–24 ← the trick

- Divider: *Stop holding lightness still.* (20) The pivot: they have seen
  the flat five fail three ways, and slide 4 told them why.
- **Lightness gets a range** (21). Same three, same stretch, now in OKLCH.
  Third bar: lightness walks min → max across the anchors before stretching.
  Two sliders. The first thing that actually helps.
- **Chroma too** (22). Picks up exactly where 21 left off: row one *is* 21's
  last bar, same sliders, same defaults. Row two adds the chroma walk and the
  coin flip for direction. Both axes moving, then the stretch — that is the
  whole ramp, and 23 is just its source.
- **randomRamp in full** (23). Verbatim — the destination of the whole build. Point at one line:
  `shuffle(hues).slice(0, count).sort()`. The shuffle *selects* a random
  subset; the sort puts it back in wheel order. Gaps, not an arc. Everything
  after it is two linear walks and a coin flip.
- **And what it makes** (24). The same function running: three to five stops
  as stripes, and as the gradient with its stops thrown out of order — slide
  19's move, now on a palette that deserves it. Reroll a few times. This is
  farbvelo.
- **Takeaway — a palette is a path, and you own its endpoints.**

### 4 · Same path, different solid — 5 min · slides 25–27

- The identical numbers, HSL on the left, OKLCH on the right, with the step
  sizes printed under each ladder. One lurches, one climbs. In OKLCH your
  intent is one axis instead of three.
- Gamut in one slide: 48 equal chroma steps in, measured step sizes out. Past
  the mark the display has run out of green. *(Cuttable; Golan showed the
  gamut video.)*
- **Takeaway — work in the space where what you want is one axis.**

### 5 · The recipe — 2 min · slide 28 ← the slide they photograph

The real pipeline, on p5 + chroma.js: `randomRamp` and `scaleSpreadArray` in
full, and `palette(n)` = three to five random stops stretched to n. p5 gives
`random`, `shuffle`, `min`, `max`, `round`, `floor`; chroma.js — the library
3.3 already had them load — gives `oklch` and `mix`. It renders its own output
on the slide (stops, then the stretch), so it cannot lie. *(The
scaleSpreadArray walkthrough slide is parked in `src/slides/_parked/`.)* Say
the connection out loud:

> *For 3.6 you need three colors that interrelate, new on every click —
> that is `palette(3)`, the anchors. `palette(40)` is a gradient.*

### 6 · Q&A — 10 min · slide 29

Vibecoding will come up. color is a domain where a model has no perception —
only numbers that look plausible, which is the failure mode the last half
hour was about learning to see.

---

## If you run long

Cut in this order: **27** (gamut) → **05** (OKHSL) → **18** (the gradient; 19
stands without it) → section 0's tools montage. Never cut 03, 04, 16, 19, 21,
22, 24 or 28.

## Live slides — rehearse these with the pen open

02, 03, 04, 05, 07, 10, 11, 15, 16, 17, 18, 19, 21, 22, 24, 26, 28.

## Exercise proposals for Golan

He asked twice, and offered credit. These fit the vocabulary of the talk, so
they double as the rubric for the feedback session a week later.

1. **Fix the vomit.** Five ugly HSL palettes. Reproduce each in OKLCH so all
   five share the same perceived lightness ramp. You may not change any hue.
2. **One knob.** A palette generator with exactly one slider. You choose what
   it controls. Defend the choice in two sentences.
3. **Steal a palette.** A painting you love; pull five colors; generate forty
   more that belong to the family. *(Plays to their painting background.)*
4. **Blind ramp.** A ten-step ramp that reads evenly spaced *after*
   desaturating. Grayscale is the grader.
