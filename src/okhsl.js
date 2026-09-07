/**
 * OKHSL → sRGB, ported from Björn Ottosson's reference implementation
 * (https://bottosson.github.io/posts/colorpicker/, MIT). CSS has no okhsl(),
 * so this is what lets a slide say "the same numbers, in OKHSL" honestly.
 */

const K1 = 0.206;
const K2 = 0.03;
const K3 = (1 + K1) / (1 + K2);

const toeInv = (x) => (x * x + K1 * x) / (K3 * (x + K2));

const cbrt = Math.cbrt;

function oklabToLinearSrgb(L, a, b) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

function computeMaxSaturation(a, b) {
  let k0, k1, k2, k3, k4, wl, wm, ws;

  if (-1.88170328 * a - 0.80936493 * b > 1) {
    k0 = 1.19086277; k1 = 1.76576728; k2 = 0.59662641; k3 = 0.75515197; k4 = 0.56771245;
    wl = 4.0767416621; wm = -3.3077115913; ws = 0.2309699292;
  } else if (1.81444104 * a - 1.19445276 * b > 1) {
    k0 = 0.73956515; k1 = -0.45954404; k2 = 0.08285427; k3 = 0.1254107; k4 = 0.14503204;
    wl = -1.2684380046; wm = 2.6097574011; ws = -0.3413193965;
  } else {
    k0 = 1.35733652; k1 = -0.00915799; k2 = -1.1513021; k3 = -0.50559606; k4 = 0.00692167;
    wl = -0.0041960863; wm = -0.7034186147; ws = 1.707614701;
  }

  let S = k0 + k1 * a + k2 * b + k3 * a * a + k4 * a * b;

  const kl = 0.3963377774 * a + 0.2158037573 * b;
  const km = -0.1055613458 * a - 0.0638541728 * b;
  const ks = -0.0894841775 * a - 1.291485548 * b;

  const l_ = 1 + S * kl;
  const m_ = 1 + S * km;
  const s_ = 1 + S * ks;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  const ldS = 3 * kl * l_ * l_, mdS = 3 * km * m_ * m_, sdS = 3 * ks * s_ * s_;
  const ldS2 = 6 * kl * kl * l_, mdS2 = 6 * km * km * m_, sdS2 = 6 * ks * ks * s_;

  const f = wl * l + wm * m + ws * s;
  const f1 = wl * ldS + wm * mdS + ws * sdS;
  const f2 = wl * ldS2 + wm * mdS2 + ws * sdS2;

  return S - (f * f1) / (f1 * f1 - 0.5 * f * f2);
}

function findCusp(a, b) {
  const sCusp = computeMaxSaturation(a, b);
  const rgb = oklabToLinearSrgb(1, sCusp * a, sCusp * b);
  const lCusp = cbrt(1 / Math.max(rgb[0], rgb[1], rgb[2]));
  return [lCusp, lCusp * sCusp];
}

function findGamutIntersection(a, b, L1, C1, L0, cusp) {
  let t;

  if ((L1 - L0) * cusp[1] - (cusp[0] - L0) * C1 <= 0) {
    return (cusp[1] * L0) / (C1 * cusp[0] + cusp[1] * (L0 - L1));
  }

  t = (cusp[1] * (L0 - 1)) / (C1 * (cusp[0] - 1) + cusp[1] * (L0 - L1));

  const dL = L1 - L0;
  const dC = C1;
  const kl = 0.3963377774 * a + 0.2158037573 * b;
  const km = -0.1055613458 * a - 0.0638541728 * b;
  const ks = -0.0894841775 * a - 1.291485548 * b;
  const ldt = dL + dC * kl, mdt = dL + dC * km, sdt = dL + dC * ks;

  const L = L0 * (1 - t) + t * L1;
  const C = t * C1;
  const l_ = L + C * kl, m_ = L + C * km, s_ = L + C * ks;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  const ldt1 = 3 * ldt * l_ * l_, mdt1 = 3 * mdt * m_ * m_, sdt1 = 3 * sdt * s_ * s_;
  const ldt2 = 6 * ldt * ldt * l_, mdt2 = 6 * mdt * mdt * m_, sdt2 = 6 * sdt * sdt * s_;

  const step = (w0, w1, w2) => {
    const v = w0 * l + w1 * m + w2 * s - 1;
    const v1 = w0 * ldt1 + w1 * mdt1 + w2 * sdt1;
    const v2 = w0 * ldt2 + w1 * mdt2 + w2 * sdt2;
    const u = v1 / (v1 * v1 - 0.5 * v * v2);
    return u >= 0 ? -v * u : 1e5;
  };

  const tr = step(4.0767416621, -3.3077115913, 0.2309699292);
  const tg = step(-1.2684380046, 2.6097574011, -0.3413193965);
  const tb = step(-0.0041960863, -0.7034186147, 1.707614701);

  return t + Math.min(tr, tg, tb);
}

function getStMid(a, b) {
  const S = 0.11516993 + 1 / (7.4477897 + 4.1590124 * b + a * (-2.19557347 + 1.75198401 * b + a * (-2.13704948 - 10.02301043 * b + a * (-4.24894561 + 5.38770819 * b + 4.69891013 * a))));
  const T = 0.11239642 + 1 / (1.6132032 - 0.68124379 * b + a * (0.40370612 + 0.90148123 * b + a * (-0.27087943 + 0.6122399 * b + a * (0.00299215 - 0.45399568 * b - 0.14661872 * a))));
  return [S, T];
}

function getCs(L, a, b) {
  const cusp = findCusp(a, b);
  const cMax = findGamutIntersection(a, b, L, 1, L, cusp);
  const stMax = [cusp[1] / cusp[0], cusp[1] / (1 - cusp[0])];
  const [sMid, tMid] = getStMid(a, b);

  const k = cMax / Math.min(L * stMax[0], (1 - L) * stMax[1]);

  const ca = L * sMid;
  const cb = (1 - L) * tMid;
  const cMid = 0.9 * k * Math.sqrt(Math.sqrt(1 / (1 / ca ** 4 + 1 / cb ** 4)));

  const ca0 = L * 0.4;
  const cb0 = (1 - L) * 0.8;
  const c0 = Math.sqrt(1 / (1 / ca0 ** 2 + 1 / cb0 ** 2));

  return [c0, cMid, cMax];
}

const transfer = (x) => (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055);

/** h in degrees, s and l 0–1 → [r, g, b] 0–255, clamped. */
export function okhslToRgb(h, s, l) {
  if (l >= 1) return [255, 255, 255];
  if (l <= 0) return [0, 0, 0];

  const a = Math.cos((h / 360) * 2 * Math.PI);
  const b = Math.sin((h / 360) * 2 * Math.PI);
  const L = toeInv(l);
  const [c0, cMid, cMax] = getCs(L, a, b);

  const mid = 0.8;
  const midInv = 1.25;
  let C;

  if (s < mid) {
    const t = midInv * s;
    const k1 = mid * c0;
    const k2 = 1 - k1 / cMid;
    C = (t * k1) / (1 - k2 * t);
  } else {
    const t = (s - mid) / (1 - mid);
    const k1 = ((1 - mid) * cMid * cMid * midInv * midInv) / c0;
    const k2 = 1 - k1 / (cMax - cMid);
    C = cMid + (t * k1) / (1 - k2 * t);
  }

  return oklabToLinearSrgb(L, C * a, C * b).map((v) =>
    Math.round(Math.min(1, Math.max(0, transfer(v))) * 255),
  );
}
