import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MODELS } from './spaces.js';
import { getColors, COLORS_EVENT } from './inspect-registry.js';
import { Distribution } from './distribution.js';

const SIZE = 100;
const STEPS = 32;  // samples along each edge — the curve is in the model, not the cube

/**
 * The color inspector: the current slide's registered colors as spheres
 * inside a wireframe of the sRGB gamut, in whichever solid is selected. The
 * wireframe is the same in every model — a grid drawn on the six faces of the
 * RGB cube — it is the model's transform that bends it into a bicone, a cone,
 * or the OKLab blob. The palette is also drawn as a path, in registration
 * order, because that is what a palette is.
 */
export class Inspector {
  #panel; #body; #select; #title; #empty;
  #renderer; #scene; #camera; #controls;
  #group = null; #id = null; #running = false; #shown = null;
  #labels = []; #proj = new THREE.Vector3();
  #preview = false; #model = 'oklab';
  #tabs; #dist = null; #distBody; #sliceLabel; #status; #view = '3d';

  /**
   * `preview: true` mounts a small self-contained view into `body` — no panel
   * chrome, no deck shrink — for a slide that wants to show the inspector inline.
   */
  constructor({ panel, body, select, title, empty, closeButton, tabs, dist, slice, sliceLabel, status, preview = false, model = 'oklab' }) {
    this.#panel = panel ?? body; this.#body = body; this.#select = select; this.#title = title; this.#empty = empty;
    this.#preview = preview; this.#model = model;
    this.#tabs = tabs; this.#distBody = dist; this.#sliceLabel = sliceLabel; this.#status = status;
    if (dist && slice) this.#dist = new Distribution({ body: dist, slice });

    // 3d | distribution — two readings of the same registered colors.
    tabs?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-view]');
      if (button) this.view = button.dataset.view;
    });

    this.#renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.#renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    body.append(this.#renderer.domElement);

    this.#scene = new THREE.Scene();
    this.#camera = new THREE.PerspectiveCamera(38, 1, 1, 2000);
    this.#camera.position.set(SIZE * 1.3, SIZE * 0.9, SIZE * 1.6);

    this.#controls = new OrbitControls(this.#camera, this.#renderer.domElement);
    this.#controls.enableDamping = true;
    this.#controls.dampingFactor = 0.08;
    this.#controls.enablePan = false;
    this.#controls.autoRotate = true;
    this.#controls.autoRotateSpeed = 0.7;
    this.#controls.minDistance = SIZE * 0.8;
    this.#controls.maxDistance = SIZE * 4;

    new ResizeObserver(() => this.#resize()).observe(body);

    select?.addEventListener('input', () => this.#build());
    closeButton?.addEventListener('click', () => this.close());

    // A slide that calls colorDebug() again (a slider, a reroll) redraws the
    // view live. Coalesced to one rebuild per frame, so dragging stays smooth.
    let queued = false;
    document.addEventListener(COLORS_EVENT, ({ detail }) => {
      if (!this.isOpen || detail.slideId !== this.#id || queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; if (this.isOpen) { this.#build(); this.#dist?.refresh(); } });
    });
  }

  get isOpen() { return !this.#panel.hidden; }

  open(id, file) {
    this.#panel.hidden = false;
    if (!this.#preview) document.documentElement.dataset.inspecting = '';
    this.show(id, file);
    this.#resize();
    this.#running = true;
    this.#loop();
  }

  /** Point the inspector at a slide; adopts that slide's default model. */
  show(id, file) {
    this.#id = id;
    if (this.#title) this.#title.textContent = file;
    const entry = getColors(id);
    if (entry?.model && MODELS[entry.model]) {
      if (this.#select) this.#select.value = entry.model;
      else this.#model = entry.model;
    }
    this.#build();
  }

  close() {
    this.#panel.hidden = true;
    if (!this.#preview) delete document.documentElement.dataset.inspecting;
    this.#running = false;
  }

  /** Switch between the 3D solid and the distribution map. */
  set view(name) {
    this.#view = name === 'distribution' && this.#dist ? 'distribution' : '3d';
    const dist = this.#view === 'distribution';
    this.#tabs?.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.view === this.#view)));
    this.#body.hidden = dist;
    if (this.#distBody) this.#distBody.hidden = !dist;
    if (this.#sliceLabel) this.#sliceLabel.hidden = !dist;
    if (this.#status) this.#status.textContent = dist ? 'each pixel snaps to its nearest color' : 'drag to orbit · scroll to zoom';
    if (dist) this.#dist.show(this.#id, this.#select?.value ?? this.#model);
    else this.#resize();
  }

  get view() { return this.#view; }

  /** Pick the model by name — what the dropdown does, for a view without one. */
  set model(name) {
    if (this.#select) this.#select.value = name; else this.#model = name;
    this.#build();
  }

  /** Tear a preview down for good: stop rendering, free the GPU context. */
  dispose() {
    this.close();
    this.#controls.dispose();
    this.#renderer.dispose();
    this.#renderer.domElement.remove();
  }

  #build() {
    const model = MODELS[this.#select?.value ?? this.#model] ?? MODELS.oklab;

    // A model can ask for its own viewpoint; honour it when the model changes,
    // but leave the camera alone when only the slide does.
    if (model !== this.#shown) {
      const [x, y, z] = model.view ?? [1.3, 0.9, 1.6];
      // a preview box is small and nearly square — stand further back so the solid fits
      const back = this.#preview ? 0.8 : 1;
      this.#camera.position.set(x * SIZE * back, y * SIZE * back, z * SIZE * back);
      this.#controls.update();
      this.#shown = model;
    }
    const entry = getColors(this.#id);
    const ink = new THREE.Color(cssVar('--onBg'));
    if (this.#view === 'distribution') this.#dist?.show(this.#id, this.#select?.value ?? this.#model);

    if (this.#group) {
      this.#group.traverse((o) => { o.geometry?.dispose(); o.material?.dispose?.(); });
      this.#scene.remove(this.#group);
    }

    const group = new THREE.Group();
    group.add(gamut(model, ink));
    group.add(axes(model, ink));
    this.#label(model);

    if (this.#empty) this.#empty.hidden = Boolean(entry?.colors.length);

    if (entry) {
      const points = entry.colors.map(({ rgb }) => new THREE.Vector3(...model.place(rgb)).multiplyScalar(SIZE));
      const sphere = new THREE.SphereGeometry(SIZE * 0.022, 20, 14);

      // Build the material from the resolved sRGB triple, not the CSS string:
      // three only parses legacy comma syntax, so oklch()/color-mix() strings
      // silently become white. Tag it sRGB so color management keeps it so.
      entry.colors.forEach(({ rgb }, i) => {
        const color = new THREE.Color().setRGB(rgb[0], rgb[1], rgb[2], THREE.SRGBColorSpace);
        const dot = new THREE.Mesh(sphere, new THREE.MeshBasicMaterial({ color }));
        dot.position.copy(points[i]);
        group.add(dot);
      });

      // The path is for palettes; a sampled grid is clearer as dots alone.
      if (points.length > 1 && points.length <= 16) {
        group.add(new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(points),
          new THREE.LineBasicMaterial({ color: ink, transparent: true, opacity: 0.45 }),
        ));
      }
    }

    this.#group = group;
    this.#scene.add(group);
  }

  /** One HTML label per axis, placed over the canvas by #place() each frame. */
  #label(model) {
    for (const { el } of this.#labels) el.remove();
    this.#labels = (model.axes ?? []).map(({ label, line }) => {
      const el = document.createElement('span');
      el.className = 'inspector__axis';
      el.textContent = label;
      this.#body.append(el);
      return { el, at: new THREE.Vector3(...line.at(-1)).multiplyScalar(SIZE) };
    });
  }

  #place() {
    if (!this.#labels.length) return;
    const { clientWidth: w, clientHeight: h } = this.#body;
    for (const { el, at } of this.#labels) {
      const p = this.#proj.copy(at).project(this.#camera);
      const behind = p.z > 1;
      el.hidden = behind;
      if (!behind) el.style.transform = `translate(-50%, -50%) translate(${(((p.x + 1) / 2) * w).toFixed(1)}px, ${(((1 - p.y) / 2) * h).toFixed(1)}px)`;
    }
  }

  #resize() {
    const { clientWidth: w, clientHeight: h } = this.#body;
    if (!w || !h) return;
    this.#camera.aspect = w / h;
    this.#camera.updateProjectionMatrix();
    this.#renderer.setSize(w, h, false);
    this.#renderer.domElement.style.width = '100%';
    this.#renderer.domElement.style.height = '100%';
  }

  #loop = () => {
    if (!this.#running) return;
    this.#controls.update();
    this.#renderer.render(this.#scene, this.#camera);
    this.#place();
    requestAnimationFrame(this.#loop);
  };
}

/** The model's axes as dashed guide lines; the names are HTML, see #label(). */
function axes(model, ink) {
  const group = new THREE.Group();
  for (const { line } of model.axes ?? []) {
    const guide = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(line.map((p) => new THREE.Vector3(...p).multiplyScalar(SIZE))),
      new THREE.LineDashedMaterial({ color: ink, dashSize: SIZE * 0.02, gapSize: SIZE * 0.015, transparent: true, opacity: 0.55 }),
    );
    guide.computeLineDistances();
    group.add(guide);
  }
  return group;
}

function cssVar(name) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value.startsWith('var(') ? cssVar(value.slice(4, -1)) : value || '#202126';
}

/**
 * The sRGB gamut as a wire skeleton: the twelve edges of the RGB cube, each
 * sampled along its length and pushed through the model. In the terrain that
 * is the ridge ring between the primaries plus the spokes down to black and
 * white; in OKLab it is the blob's silhouette. A model can add its own guide
 * lines — the terrain draws the rim of its floor.
 */
function gamut(model, ink) {
  const pts = [];
  const push = (rgb) => pts.push(new THREE.Vector3(...model.place(rgb)).multiplyScalar(SIZE));

  // An edge fixes two channels at 0 or 1 and sweeps the third.
  for (const sweep of [0, 1, 2]) {
    const [a, b] = [0, 1, 2].filter((axis) => axis !== sweep);
    for (const va of [0, 1]) for (const vb of [0, 1]) {
      // Stop a hair short of the corners. At exact black and white chroma is
      // zero and hue is undefined, so a polar model would snap those ends to
      // hue 0 — three edges converging on one point of the rim. Elsewhere the
      // gap is a thousandth of an edge and invisible.
      const EPS = 0.001;
      for (let j = 0; j < STEPS; j += 1) {
        for (const t of [EPS + (j / STEPS) * (1 - 2 * EPS), EPS + ((j + 1) / STEPS) * (1 - 2 * EPS)]) {
          const rgb = [0, 0, 0];
          rgb[a] = va; rgb[b] = vb; rgb[sweep] = t;
          push(rgb);
        }
      }
    }
  }

  for (const loop of model.guides?.() ?? []) {
    for (let i = 0; i < loop.length; i += 1) {
      pts.push(new THREE.Vector3(...loop[i]).multiplyScalar(SIZE));
      pts.push(new THREE.Vector3(...loop[(i + 1) % loop.length]).multiplyScalar(SIZE));
    }
  }

  return new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color: ink, transparent: true, opacity: 0.8 }),
  );
}
