import { getColors } from './inspect-registry.js';

/**
 * The distribution view: palette-shader maps a color space onto the canvas
 * and snaps every pixel to the nearest registered color, so each color's
 * region is the territory it claims. Same models as the 3D view; the distance
 * is rgb for the RGB-derived models and oklab for the OK ones.
 */
// axis z is the lightness (or value / blue) axis in every model here, and the
// slider slices along it; palette-shader counts it downwards, so it is inverted
// to read dark → light left to right.
// No gamut clipping: with the slice axis inverted, palette-shader clips the
// wrong slice and leaves a slanted sliver; out-of-gamut pixels clamp instead.
const VIEWS = {
  oklab: { colorModel: 'oklab', distanceMetric: 'oklab' },
  oklch: { colorModel: 'oklchPolar', distanceMetric: 'oklab' },
  rgb: { colorModel: 'rgb', distanceMetric: 'rgb' },
  hsl: { colorModel: 'hslPolar', distanceMetric: 'rgb' },
  hsv: { colorModel: 'hsvPolar', distanceMetric: 'rgb' },
};

export class Distribution {
  #body; #slice; #viz = null; #model = 'oklab'; #id = null; #side = 0;

  constructor({ body, slice }) {
    this.#body = body;
    this.#slice = slice;
    slice.addEventListener('input', () => { if (this.#viz) this.#viz.position = Number(slice.value); });

    // Sized by hand: the largest square that fits the body, only when it has
    // a size and only when that changed. palette-shader's own observeResize
    // fed back against CSS sizing and grew the texture past the GPU limit.
    new ResizeObserver(() => this.#fit()).observe(body);
  }

  #fit() {
    if (!this.#viz) return;
    const { clientWidth: w, clientHeight: h } = this.#body;
    const side = Math.floor(Math.min(w, h)) - 16;
    if (side <= 0 || side === this.#side) return;
    this.#side = side;
    this.#viz.resize(side);
    // resize() styles the canvas at backing size; keep the layout size in CSS px so it stays sharp and fits.
    this.#viz.canvas.style.width = `${side}px`;
    this.#viz.canvas.style.height = `${side}px`;
  }

  /** Draw slide `id` in `model`. Loads the shader on first use. */
  async show(id, model) {
    this.#id = id;
    this.#model = VIEWS[model] ? model : 'oklab';

    if (!this.#viz) {
      const { PaletteViz } = await import('palette-shader');
      this.#viz = new PaletteViz({
        container: this.#body,
        observeResize: false,
        width: 256,
        height: 256,
        axis: 'z',
        invertAxes: ['z'],
        position: Number(this.#slice.value),
        ...VIEWS[this.#model],
        palette: this.#palette(),
      });
      this.#fit();
      return;
    }

    const view = VIEWS[this.#model];
    this.#viz.colorModel = view.colorModel;
    this.#viz.distanceMetric = view.distanceMetric;
    this.#viz.palette = this.#palette();
  }

  /** Re-read the registry — a slider on the slide moved the colors. */
  refresh() {
    if (this.#viz) this.#viz.palette = this.#palette();
  }

  #palette() {
    const entry = getColors(this.#id);
    // palette-shader wants sRGB triples in 0–1; with nothing registered, show the bare space.
    const colors = entry?.colors.map(({ rgb }) => rgb) ?? [];
    if (this.#viz) this.#viz.showRaw = colors.length === 0;
    return colors.length ? colors : [[0.5, 0.5, 0.5]];
  }
}
