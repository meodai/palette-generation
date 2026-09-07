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
- **3.3 · Four-Colour Gradient — due the morning of your talk.** chroma.js
  `scale()` through four stops, chips shown separately. *This is
  scaleSpreadArray.*
- **3.4 · Split Complementaries — due the morning of your talk.** A hue and
  its two split complements, in OKLCH, new set on click. *This is three hues
  on a ring.*
- 3.5 · Albers four-look-like-three, due after.
- **3.6 · 60-30-10 composition, due after.** Three colours that "interrelate,
  can't be mutually random", NOT in RGB/HSB/HSL, new set on click. *This is
  `randomRamp(3)`, exactly.*

Golan's framing for the whole set: *"don't show me that you found good
colours; show me that you figured out how to generate good colour
relationships."* Your talk is the worked example of that sentence.

They will ask about **vibecoding**. No slide — answer it in Q&A.

## The one sentence

> **A palette is a path through a colour solid.**

## The build — why the order is what it is

The whole middle of the talk rebuilds farbvelo out of two things they have
already built for the assignment, then shows why it is still ugly, then fixes
it. The slides never say "yesterday" or "this morning" — keep it that way on
stage too; the connection lands harder when they make it themselves. One
seed runs through it: the three hues you pick on slide 12 are the same three
on every slide through to 19 and again on the recipe. Reroll anywhere and
they all move together.

```
12  pick 3 hues on a ring      ← their 3.4 — in order, an arc
13  shuffle the ring           random subset, gaps — the toggle carries on
14  stretch 3 → 5              ← their 3.3
15  thrown out of order        same five, scattered — still bad
16  why                        measure the five: five lightnesses
17  same numbers, OKLCH        measure again: one lightness — correct, flat
18  ─── stop holding lightness still
19  lightness gets a range     third bar, min and max, in OKLCH
20  chroma too                 both axes walking, then stretch
21  randomRamp, in full
```

Nothing works until 19. That is deliberate: they try the two things they
already know, watch both fail for one measurable reason, and then see the one
move that fixes it.

---

## Outline

### 0 · Where I'm coming from — 4 min · slides 01–05

- Title.
- **Two questions I never got over.** Why does changing only H give me a mess?
  *(live: six hues, same S and L)* What are all the other numbers in the
  Photoshop picker for? *(the screenshot)*
- **A confusion I lived in for years:** HSL and HSB. Golan showed them the
  bicones; this is the same fact felt from inside a picker — the pure hue is
  not in the corner. The numbers are on the slide: the same colour is
  `hsb(h, 100%, 100%)` and `hsl(h, 100%, 50%)`, and HSL's corner is white. *(live: both squares, one slider)* **L is not B** — the
  seed of slide 18.
- What came out of it. They have met several of these — let them recognise
  them rather than telling them. Then: *we are going to rebuild farbvelo.*

### 1 · The clash — 6 min · slides 06–10 ← the hook

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

### 2 · Build it — 8 min · slides 11–15

- **Pick three hues** (12). Evenly spaced candidates from a random start, the
  first three — an arc. Split complements are exactly this; say so without
  dating it. The min-angle slider moves the whole chain.
- **Shuffle the ring** (13). Same function with the one line added:
  `shuffle(ring).slice(0, 3).sort()`. A random subset with gaps instead of an
  arc. The *shuffled* toggle is deck-wide — every later chain slide has it, so
  you can flip the whole build between the two modes at any point.
- **Stretch to five** (14). `chroma.scale()` through four stops is exactly
  this. The interpolation space is a dropdown in the sentence — flip it to
  srgb once and back; Golan already showed them why, so one flick is enough.
  The anchors are the design; the steps are only resolution.
- **Shuffled** (15). One random number per colour, sort by it: reorders *and*
  scatters the stops. The last thing farbvelo does. Toggle off and watch it go
  stiff. Less mechanical. Still unusable.

### 3 · Why, and the fix — 10 min · slides 16–21 ← the trick

- **Measure it** (16). The same five, desaturated, with the luminance under
  each. Every one was asked for the same L. None obeyed. *(The pivot.
  Everything before failed for this one reason.)*
- **Same numbers, OKLCH** (17). Slide 16 with one word changed. The identical
  triples as OKLCH, desaturated and measured again: one lightness in, one
  lightness out. This is the answer to 16 — and the setup for the next beat: *correct is not the same as good.* Five colours at one
  lightness is a flat palette.
- Divider: *Stop holding lightness still.*
- **Lightness gets a range** (19). Same three, same stretch, now in OKLCH.
  Third bar: lightness walks min → max across the anchors before stretching.
  Two sliders. The first thing that actually helps, and it arrives only after
  the audience knows why everything before it failed.
- **Chroma too** (20). Lightness has its range; give chroma one, and a coin
  flip for direction. Both axes walking, then stretch.

- **randomRamp in full** (21). Point at one line:
  `shuffle(ring).slice(0, count).sort()`. The shuffle *selects* a random
  subset; the sort puts it back in wheel order. Gaps, not an arc. Everything
  after it is two linear walks and a coin flip.
- **Takeaway — a palette is a path, and you own its endpoints.**

### 4 · Same path, different solid — 5 min · slides 22–24

- The identical numbers, HSL on the left, OKLCH on the right, with the step
  sizes printed under each ladder. One lurches, one climbs. In OKLCH your
  intent is one axis instead of three.
- Gamut in one slide: 48 equal chroma steps in, measured step sizes out. Past
  the mark the display has run out of green. *(Cuttable; Golan showed the
  gamut video.)*
- **Takeaway — work in the space where what you want is one axis.**

### 5 · The recipe — 2 min · slide 25 ← the slide they photograph

Ten lines of p5. `random`, `shuffle`, `lerp` are built-ins;
`scaleSpreadArray` is the stretch from slide 14 (its walkthrough is parked in `src/slides/_parked/`). It renders its own output on the slide, so it
cannot lie. Say the connection out loud:

> *For 3.6 you need three colours that interrelate, new on every click. That
> is the three anchors. Stretch only when you want a gradient.*

### 6 · Q&A — 10 min · slide 26

Vibecoding will come up. Colour is a domain where a model has no perception —
only numbers that look plausible, which is the failure mode the last half
hour was about learning to see.

---

## If you run long

Cut in this order: **24** (gamut) → section 0's tools montage. Never cut 13,
15, 16, 17, 19 or 25.

## Live slides — rehearse these with the pen open

02, 04, 07, 08, 12, 13, 14, 15, 16, 17, 19, 20, 23, 25.

## Exercise proposals for Golan

He asked twice, and offered credit. These fit the vocabulary of the talk, so
they double as the rubric for the feedback session a week later.

1. **Fix the vomit.** Five ugly HSL palettes. Reproduce each in OKLCH so all
   five share the same perceived lightness ramp. You may not change any hue.
2. **One knob.** A palette generator with exactly one slider. You choose what
   it controls. Defend the choice in two sentences.
3. **Steal a palette.** A painting you love; pull five colours; generate forty
   more that belong to the family. *(Plays to their painting background.)*
4. **Blind ramp.** A ten-step ramp that reads evenly spaced *after*
   desaturating. Grayscale is the grader.
