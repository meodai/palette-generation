/**
 * Token beam: whatever the inspector holds, beamed live to a design tool.
 *
 * The deck opens a source session on tokenbeam.dev as soon as it boots and
 * gets a short token (`beam://…`). Anyone who pastes that token into the
 * token-beam plugin — Figma, Sketch — becomes a peer, and from then on every
 * palette a slide registers with colorDebug() lands in their file as a set of
 * color variables: the current slide's colors, in registration order, resent
 * on every slider drag, reroll and slide change. It is the same list the cube
 * shows, so what the room sees in 3D is what the plugin gets.
 *
 * Nothing is sent while no peer is listening; a peer that joins mid-talk gets
 * the current palette at once.
 */
import { SourceSession, createCollection } from 'token-beam';
import { COLORS_EVENT, getColors } from './inspect-registry.js';

/** One collection, so the plugin updates the same variables in place. */
const COLLECTION = 'palette';

/** Sliders fire colorDebug() every frame; one sync per this many ms is plenty. */
const SETTLE = 150;

const hex = (rgb) => `#${rgb.map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('')}`;

export class Beam {
  #session;
  #slideId = null;
  #timer = null;
  #onChange;

  constructor({ onChange } = {}) {
    this.#onChange = onChange;
    this.#session = new SourceSession({
      clientType: 'web',
      origin: 'Palette Generation',
      icon: { type: 'unicode', value: '⊷' },
    });

    for (const name of ['state', 'paired', 'peer-connected', 'peer-disconnected', 'warning', 'error']) {
      this.#session.on(name, () => this.#onChange?.(this));
    }
    // A tool that joins mid-talk gets the current palette straight away.
    this.#session.on('peer-connected', () => this.#send());

    document.addEventListener(COLORS_EVENT, ({ detail }) => {
      if (detail.slideId === this.#slideId) this.#schedule();
    });
  }

  /** Open the session. Failures (offline, server down) show as state 'error'. */
  connect() {
    return this.#session.connect().catch(() => {});
  }

  /** Beam this slide's colors from now on. Called on every slide change. */
  follow(slideId) {
    this.#slideId = slideId;
    this.#schedule();
  }

  get token() { return this.#session.getSessionToken() ?? null; }
  get state() { return this.#session.getState(); }
  get peers() { return this.#session.getPeers(); }
  get live() { return this.#session.hasPeers(); }

  #schedule() {
    if (this.#timer) return;
    this.#timer = setTimeout(() => { this.#timer = null; this.#send(); }, SETTLE);
  }

  #send() {
    if (!this.#session.hasPeers()) return;
    const entry = getColors(this.#slideId);
    if (!entry?.colors.length) return;

    const width = String(entry.colors.length).length;
    const tokens = Object.fromEntries(
      entry.colors.map(({ rgb }, i) => [`color/${String(i + 1).padStart(width, '0')}`, hex(rgb)]),
    );
    this.#session.sync(createCollection(COLLECTION, tokens));
  }
}
