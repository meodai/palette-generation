/**
 * Where a colour sits in each solid the inspector can show. Every model maps
 * an sRGB triple (0–1) to a point in a unit cube centred on the origin, y up,
 * so the same scene code draws all of them. Polar models put lightness on y
 * and hue round it.
 */

const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

export function srgbToOklab([r, g, b]) {
  const [R, G, B] = [r, g, b].map(toLinear);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

export function rgbToHsl([r, g, b]) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return [hue(r, g, b, max, d), s, l];
}

export function rgbToHsv([r, g, b]) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  return [hue(r, g, b, max, d), max === 0 ? 0 : d / max, max];
}

function hue(r, g, b, max, d) {
  if (d === 0) return 0;
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  return h < 0 ? h + 360 : h;
}

const polar = (radius, degrees, y) => {
  const t = (degrees * Math.PI) / 180;
  return [radius * Math.cos(t), y, radius * Math.sin(t)];
};

/** OKLab's a/b reach about ±0.32 inside sRGB; this puts that at the cube walls. */
const AB = 0.32;

/** The most chroma sRGB holds (blue's cusp); this puts it at the top of the box. */
const CMAX = 0.33;

export const MODELS = {
  oklab: {
    label: 'oklab',
    place: (rgb) => { const [L, a, b] = srgbToOklab(rgb); return [a / AB / 2, L - 0.5, b / AB / 2]; },
  },
  oklch: {
    label: 'oklch',
    // Looked at from high up, so it reads as a disc with peaks, not a bowl.
    view: [0.5, 1.9, 1.0],
    // A terrain: hue round the circle, lightness outward from black at the
    // centre to white at the rim, and chroma as height — so every hue's cusp
    // is a peak, and the sRGB gamut is a mountain range.
    place: (rgb) => {
      const [L, a, b] = srgbToOklab(rgb);
      return polar(L * 0.5, (Math.atan2(b, a) * 180) / Math.PI, Math.hypot(a, b) / CMAX - 0.5);
    },
    // The rim of the floor — white, all the way round — since no cube edge draws it.
    guides: () => [Array.from({ length: 96 }, (_, i) => polar(0.5, (i / 96) * 360, -0.5))],
  },
  rgb: {
    label: 'rgb',
    place: ([r, g, b]) => [r - 0.5, g - 0.5, b - 0.5],
  },
  hsl: {
    label: 'hsl',
    // Bicone: full radius only at l = 0.5.
    place: (rgb) => { const [h, s, l] = rgbToHsl(rgb); return polar(s * (l < 0.5 ? l : 1 - l), h, l - 0.5); },
  },
  hsv: {
    label: 'hsv',
    // Cone: radius grows with value, apex at black.
    place: (rgb) => { const [h, s, v] = rgbToHsv(rgb); return polar(s * v * 0.5, h, v - 0.5); },
  },
};
