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
const VIEWS = {
  oklab: { colorModel: 'oklab', distanceMetric: 'oklab', gamutClip: true },
  oklch: { colorModel: 'oklchPolar', distanceMetric: 'oklab', gamutClip: true },
  rgb: { colorModel: 'rgb', distanceMetric: 'rgb', gamutClip: false },
  hsl: { colorModel: 'hslPolar', distanceMetric: 'rgb', gamutClip: false },
  hsv: { colorModel: 'hsvPolar', distanceMetric: 'rgb', gamutClip: false },
};

export class Distribution {
  #body; #slice; #viz = null; #model = 'oklab'; #id = null;

  constructor({ body, slice }) {
    this.#body = body;
    this.#slice = slice;
    slice.addEventListener('input', () => { if (this.#viz) this.#viz.position = Number(slice.value); });
  }

  /** Draw slide `id` in `model`. Loads the shader on first use. */
  async show(id, model) {
    this.#id = id;
    this.#model = VIEWS[model] ? model : 'oklab';

    if (!this.#viz) {
      const { PaletteViz } = await import('palette-shader');
      this.#viz = new PaletteViz({
        container: this.#body,
        observeResize: true,
        outlineWidth: 2,
        axis: 'z',
        invertAxes: ['z'],
        position: Number(this.#slice.value),
        ...VIEWS[this.#model],
        palette: this.#palette(),
      });
      return;
    }

    const view = VIEWS[this.#model];
    this.#viz.colorModel = view.colorModel;
    this.#viz.distanceMetric = view.distanceMetric;
    this.#viz.gamutClip = view.gamutClip;
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
