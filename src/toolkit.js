import { okhslToRgb } from './okhsl.js';
import { registerColors } from './inspect-registry.js';

/**
 * One seed for the whole deck, living at module scope. Every slide resets the
 * stream to it on entry, so a sequence of slides that ask for the same thing
 * gets the same answer — the palette you meet on the "vomit" slide is the one
 * that is still there four slides later when the ramp finally fixes it.
 * `reseed()` moves every one of them at once.
 */
let seed = (Math.random() * 2 ** 32) >>> 0;

/** Deck-wide hue spacing, so a slider on one slide moves the whole chain. */
let maxSpacing = 60;

/** Deck-wide: does hues() take a random subset of the ring, or the first few? */
let pickShuffled = false;

/** mulberry32 — small, fast, and good enough to look random on a projector. */
const stream = (a) => () => {
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/**
 * Everything in here is in lexical scope inside every slide's <script>, so a
 * live demo can start at the interesting line. Names and argument orders follow
 * the farbvelo source — `lerp(t, a, b)`, colors as normalised `{ h, c, l }` —
 * so what is typed on stage matches what is in the repo.
 */
export function toolkit(slide) {
  // -- randomness ---------------------------------------------------------

  // Rewound on every slide entry, so slides that draw in the same order agree.
  let random = stream(seed);

  /** rnd() → 0–1 · rnd(n) → 0–n · rnd(a, b) → a–b */
  const rnd = (a, b) => {
    if (a === undefined) return random();
    if (b === undefined) return random() * a;
    return a + random() * (b - a);
  };

  /** New seed for the entire deck. What every "reroll" button should call. */
  const reseed = (next = (Math.random() * 2 ** 32) >>> 0) => {
    seed = next >>> 0;
    random = stream(seed);
    return seed;
  };

  /** Rewind the stream to the current seed — re-pick without re-rolling. */
  const rewind = () => {
    random = stream(seed);
  };

  const rndInt = (a, b) => Math.floor(rnd(a, b));

  const pick = (list) => list[rndInt(list.length)];

  const shuffle = (list) => {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = rndInt(i + 1);
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };

  // -- maths --------------------------------------------------------------

  const lerp = (t, a, b) => a + t * (b - a);
  const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));

  // -- color -------------------------------------------------------------

  /** The same normalised color, written into two different solids. */
  const oklch = ({ h, c, l }) => `oklch(${(l * 100).toFixed(1)}% ${(c * 0.4).toFixed(4)} ${h.toFixed(1)})`;
  const hsl = ({ h, c, l }) => `hsl(${h.toFixed(1)} ${(c * 100).toFixed(1)}% ${(l * 100).toFixed(1)}%)`;
  /** …and a third solid for the same triple. Ottosson's OKHSL, via okhsl.js. */
  const okhsl = ({ h, c, l }) => `rgb(${okhslToRgb(h, c, l).join(' ')})`;

  /** Blend two CSS colors in any space color-mix() knows. */
  const mix = (a, b, t, space = 'oklab') =>
    `color-mix(in ${space}, ${b} ${(t * 100).toFixed(2)}%, ${a})`;

  /**
   * Itten's RYB wheel and the RGB cube put the same color names at different
   * angles. Piecewise-linear through the twelve positions everyone agrees on,
   * so an RYB angle can be drawn on a screen at all.
   */
  const RYB_ANCHORS = [
    [0, 0],     // red
    [60, 30],   // orange
    [120, 60],  // yellow
    [180, 120], // green
    [240, 240], // blue
    [300, 275], // violet
    [360, 360],
  ];

  const rybHue = (angle) => {
    const a = ((angle % 360) + 360) % 360;

    let i = 0;
    while (i < RYB_ANCHORS.length - 2 && a >= RYB_ANCHORS[i + 1][0]) i += 1;

    const [from, mapped] = RYB_ANCHORS[i];
    const [to, mappedTo] = RYB_ANCHORS[i + 1];

    return lerp((a - from) / (to - from), mapped, mappedTo);
  };

  /**
   * A random SUBSET of an evenly spaced ring, handed back in wheel order. The
   * shuffle is how the subset gets picked, not how the result is ordered — so
   * you get gaps round the wheel instead of one contiguous arc.
   */
  /** spacing() reads the deck-wide max hue spacing; spacing(deg) sets it. */
  const spacing = (deg) => (deg === undefined ? maxSpacing : (maxSpacing = deg));

  /** shuffled() reads the deck-wide pick mode; shuffled(true/false) sets it. */
  const shuffled = (on) => (on === undefined ? pickShuffled : (pickShuffled = Boolean(on)));

  const hues = (count, max = maxSpacing) => {
    const spacing = Math.min(max, 360 / count);
    const start = rnd(360);

    const ring = Array.from(
      { length: Math.round(360 / spacing) },
      (_, i) => (start + i * spacing) % 360,
    );

    // In order: the first few candidates — an arc. Shuffled: a random subset,
    // put back in wheel order — gaps round the ring.
    const picked = pickShuffled
      ? shuffle(ring).slice(0, count).sort((a, b) => a - b)
      : ring.slice(0, count);

    picked.ring = ring; // the candidates it was chosen from, for drawing
    return picked;
  };

  /** farbvelo's rmp(): walk a lightness range and a chroma range across the hues. */
  const ramp = (hueList, options = {}) => {
    const {
      lightness = [rnd(0.05, 0.25), rnd(0.85, 1)],
      chroma = [rnd(0.005, 0.255), rnd(0, 1)],
      flip = rnd() < 0.5,
    } = options;

    const [l0, l1] = lightness;
    const [c0, c1] = chroma;
    const lSpan = Math.max(l1 - l0, 0.1);
    const cSpan = Math.max(c1 - c0, 0.1);

    return hueList.map((h, i) => {
      const t = hueList.length < 2 ? 0 : i / (hueList.length - 1);
      return { h, l: l0 + t * lSpan, c: c0 + (flip ? 1 - t : t) * cSpan };
    });
  };

  /** hues() and ramp() in one call — farbvelo's rmp(), as you would type it. */
  const randomRamp = (count, maxSpacing = 60) => ramp(hues(count, maxSpacing));

  /** farbvelo's scale(): grow a list of anchors into `n` entries. */
  const stretch = (list, n, blend = lerp) => {
    if (list.length < 2 || n <= list.length) return [...list];

    const groups = list.map((value) => [value]);
    for (let i = 0; i < n - list.length; i += 1) groups[i % (list.length - 1)].push(null);

    for (let g = 0; g < groups.length - 1; g += 1) {
      for (let i = 1; i < groups[g].length; i += 1) {
        groups[g][i] = blend(i / groups[g].length, groups[g][0], groups[g + 1][0]);
      }
    }

    return groups.flat();
  };

  // -- measuring ----------------------------------------------------------

  const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  probe.canvas.width = probe.canvas.height = 1;

  /** Any CSS color — oklch() included — resolved to [r, g, b] 0–255. */
  const rgb = (color) => {
    probe.clearRect(0, 0, 1, 1);
    probe.fillStyle = '#000';
    probe.fillStyle = color;
    probe.fillRect(0, 0, 1, 1);
    return [...probe.getImageData(0, 0, 1, 1).data].slice(0, 3);
  };

  /** Relative luminance, 0–1. What the eye gets, as opposed to what you typed. */
  const luma = (color) => {
    const [r, g, b] = rgb(color).map((v) => {
      const s = v / 255;
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  /** Any CSS color → its OKLCH triple in the toolkit's normalised form. */
  const toOklch = (color) => {
    const [r, g, b] = rgb(color).map((v) => {
      const s = v / 255;
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
    const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
    const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
    const h = ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360;
    return { h, c: Math.hypot(A, B) / 0.4, l: L };
  };

  /** OKLab lightness, 0–1 — the perceptual quantity, not photometric luma. */
  const lightness = (color) => toOklch(color).l;

  /**
   * Desaturate the perceptual way: chroma to zero, lightness kept. A grey made
   * from luma() instead would bump by a few percent across hues at equal L —
   * luminance and perceived lightness are different quantities.
   */
  const grey = (color) => `oklch(${(lightness(color) * 100).toFixed(2)}% 0 0)`;

  // -- output -------------------------------------------------------------

  const toCss = (color) => (typeof color === 'string' ? color : oklch(color));

  const stage = (name = 'strip') =>
    slide.querySelector(`[data-${name}]`) ??
    slide.appendChild(Object.assign(document.createElement('div'), { dataset: { [name]: '' } }));

  /** Paint an array of colors into the slide's strip. The live-coding workhorse. */
  const swatches = (colors, target = stage()) => {
    // Flex cells land on fractional pixels and leave hairlines between them;
    // a same-color ring of half a pixel closes the seam without moving anything.
    const flush = target.hasAttribute('data-flush');

    target.replaceChildren(
      ...colors.map((color) => {
        const cell = document.createElement('div');
        const value = toCss(color);
        cell.style.background = value;
        if (flush) cell.style.boxShadow = `0 0 0 0.5px ${value}`;
        return cell;
      }),
    );
    return target;
  };

  /**
   * Where the hues actually sit. A bare outline circle with one dot per hue,
   * 0° at twelve o'clock running clockwise — same convention as the wheels on
   * slide 7. Accepts hue angles or full { h, c, l } colors.
   */
  const wheel = (items, target = stage('wheel')) => {
    const RADIUS = 42;

    // { h, hollow: true } draws an empty ring — a candidate that was not picked.
    const dots = items
      .map((item) => {
        const h = typeof item === 'number' ? item : item.h;
        const angle = ((h - 90) * Math.PI) / 180;
        const cx = (50 + RADIUS * Math.cos(angle)).toFixed(2);
        const cy = (50 + RADIUS * Math.sin(angle)).toFixed(2);

        if (item.hollow) return `<circle class="wheel-hollow" r="3.2" cx="${cx}" cy="${cy}" />`;

        const color = typeof item === 'number' ? hsl({ h, c: 0.85, l: 0.5 }) : toCss(item);
        return `<circle class="wheel-dot" r="5.5" fill="${color}" cx="${cx}" cy="${cy}" />`;
      })
      .join('');

    target.innerHTML =
      `<svg viewBox="0 0 100 100" aria-hidden="true">` +
      `<circle class="wheel-ring" cx="50" cy="50" r="${RADIUS}" />${dots}</svg>`;

    return target;
  };

  /** Same colors, as one continuous gradient — farbvelo's actual output. */
  const gradient = (colors, { angle = 90, target = stage(), space = 'oklab' } = {}) => {
    target.replaceChildren();
    target.style.background =
      `linear-gradient(${angle}deg in ${space}, ${colors.map(toCss).join(', ')})`;
    return target;
  };

  /**
   * Hand the inspector this slide's colors. `model` is the solid it opens in —
   * oklab, oklch, rgb, hsl or hsv — and defaults to oklab. Returns the colors
   * untouched, so it can sit inline in a chain.
   */
  const colorDebug = (colors, { model = 'oklab' } = {}) => {
    const resolved = colors.map((color) => {
      const css = toCss(color);
      const [r, g, b] = rgb(css);
      return { css, rgb: [r / 255, g / 255, b / 255] };
    });
    registerColors(slide.id, resolved, model);
    return colors;
  };

  return {
    rnd, rndInt, pick, shuffle, reseed, rewind,
    colorDebug,
    lerp, clamp,
    oklch, hsl, okhsl, mix, rybHue, spacing, shuffled, hues, ramp, randomRamp, stretch,
    rgb, luma, lightness, grey, toOklch,
    stage, swatches, gradient, wheel,
  };
}
