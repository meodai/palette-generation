import { toolkit } from './toolkit.js';

const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;

/**
 * At-rules that mean nothing when trapped inside a slide's @scope block, so
 * they get hoisted back out to the top level.
 */
const GLOBAL_AT_RULE = /^@(-\w+-)?(keyframes|font-face|property|import|charset|counter-style|font-feature-values)\b/i;

/**
 * The deck holds every slide in the DOM at once — that is what makes `$slides`
 * a real array of elements — and shows one at a time. A slide's CSS is scoped
 * to it so it cannot leak; its JS runs on enter and is torn down on leave.
 */
export class Deck {
  #root;
  #entries;
  #index = -1;
  #onChange;

  constructor(root, definitions, { onChange } = {}) {
    this.#root = root;
    this.#onChange = onChange;
    this.#entries = definitions.map((definition) => this.#build(definition));

    /** Live array handed to slide scripts as `$slides`; mutated in place on edit. */
    this.slides = this.#entries.map((entry) => entry.el);

    for (const entry of this.#entries) {
      entry.el.hidden = true;
      this.#root.append(entry.el);
      document.head.append(entry.styleEl);
    }
  }

  get count() {
    return this.#entries.length;
  }

  get index() {
    return this.#index;
  }

  get current() {
    return this.#entries[this.#index];
  }

  at(index) {
    return this.#entries[index] ?? null;
  }

  go(next) {
    const target = Math.max(0, Math.min(this.count - 1, next));
    if (target === this.#index) return;

    if (this.#index >= 0) this.#leave(this.#entries[this.#index]);
    this.#index = target;
    this.#enter(this.#entries[target]);
    this.#onChange?.(this);
  }

  next() {
    this.go(this.#index + 1);
  }

  previous() {
    this.go(this.#index - 1);
  }

  /** Swap in freshly edited source without disturbing the rest of the deck. */
  replace(index, source) {
    const old = this.#entries[index];
    const isCurrent = index === this.#index;

    if (isCurrent) this.#leave(old);

    const entry = this.#build({ file: old.file, name: old.name, id: old.id, source });
    old.el.replaceWith(entry.el);
    old.styleEl.replaceWith(entry.styleEl);

    this.#entries[index] = entry;
    this.slides[index] = entry.el;

    entry.el.hidden = !isCurrent;
    if (isCurrent) this.#enter(entry);

    return entry;
  }

  // -- internals ----------------------------------------------------------

  #build({ file, name, id, source }) {
    const template = document.createElement('template');
    template.innerHTML = source;

    let el = template.content.querySelector('main[data-slide]');

    if (!el) {
      // Tolerate a bare fragment so a half-typed slide still renders.
      el = document.createElement('main');
      el.setAttribute('data-slide', '');
      el.append(template.content);
    }

    el.id = id;

    const css = take(el, 'style');
    const js = take(el, 'script');

    const styleEl = document.createElement('style');
    styleEl.dataset.slideStyle = name;
    styleEl.textContent = scopeCss(css, id);

    return { file, name, id, source, el, js, styleEl, pristine: el.innerHTML, cleanup: null };
  }

  #enter(entry) {
    entry.el.hidden = false;
    entry.el.dispatchEvent(new CustomEvent('slide:enter', { detail: { deck: this } }));

    if (!entry.js.trim()) return;

    // Re-entering a slide should look exactly like entering it the first time.
    entry.el.innerHTML = entry.pristine;
    this.#run(entry);
  }

  #leave(entry) {
    try {
      entry.cleanup?.();
    } catch (error) {
      console.error(`[${entry.file}] cleanup failed`, error);
    }

    entry.cleanup = null;
    entry.el.dispatchEvent(new CustomEvent('slide:leave', { detail: { deck: this } }));
    entry.el.hidden = true;
  }

  #run(entry) {
    const deck = this;
    const $deck = {
      get index() {
        return deck.index;
      },
      get count() {
        return deck.count;
      },
      go: (n) => deck.go(n),
      next: () => deck.next(),
      previous: () => deck.previous(),
    };

    // The toolkit lands in lexical scope, so a live demo starts at the idea.
    const tools = toolkit(entry.el);
    const names = Object.keys(tools);

    let body;

    try {
      body = new AsyncFunction(
        '$slide', '$slides', '$deck', ...names,
        `"use strict";\n${entry.js}\n`,
      );
    } catch (error) {
      return this.#reportError(entry, error);
    }

    // Mirrored on window so the same names work from the console mid-lecture.
    Object.assign(window, tools, { $slide: entry.el, $slides: this.slides, $deck });

    body(entry.el, this.slides, $deck, ...names.map((name) => tools[name]))
      .then((cleanup) => {
        // A slide left in the meantime must not register a stale teardown.
        if (typeof cleanup === 'function' && this.current === entry) entry.cleanup = cleanup;
      })
      .catch((error) => this.#reportError(entry, error));
  }

  #reportError(entry, error) {
    console.error(`[${entry.file}]`, error);

    const box = document.createElement('div');
    box.className = 'slide-error';
    box.textContent = `${entry.file} — ${error.message}`;
    entry.el.append(box);
  }
}

/** Pull every matching tag out of the slide and return their joined text. */
function take(el, selector) {
  return [...el.querySelectorAll(selector)]
    .map((node) => {
      node.remove();
      return node.textContent;
    })
    .join('\n');
}

/**
 * Wrap a slide's CSS in `@scope` so bare selectors can never reach another
 * slide. Global-by-nature at-rules are hoisted out, and `:root` is rewritten to
 * `:scope` — in a slide, "the root" is the slide.
 */
export function scopeCss(css, id) {
  if (!css.trim()) return '';

  const global = [];
  const scoped = [];

  for (const chunk of splitTopLevel(css)) {
    (GLOBAL_AT_RULE.test(chunk.trim()) ? global : scoped).push(chunk);
  }

  const inner = scoped.join('\n').replace(/:root\b/g, ':scope');

  return [
    global.join('\n'),
    inner.trim() && `@scope (#${CSS.escape(id)}) {\n${inner}\n}`,
  ]
    .filter(Boolean)
    .join('\n');
}

/** Split a stylesheet into its top-level rules, ignoring braces in strings and comments. */
function splitTopLevel(css) {
  const chunks = [];
  let depth = 0;
  let start = 0;
  let quote = null;
  let comment = false;

  for (let i = 0; i < css.length; i += 1) {
    const char = css[i];

    if (comment) {
      if (char === '*' && css[i + 1] === '/') {
        comment = false;
        i += 1;
      }
      continue;
    }

    if (quote) {
      if (char === '\\') i += 1;
      else if (char === quote) quote = null;
      continue;
    }

    if (char === '/' && css[i + 1] === '*') {
      comment = true;
      i += 1;
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth <= 0) {
        depth = 0;
        chunks.push(css.slice(start, i + 1));
        start = i + 1;
      }
    } else if (char === ';' && depth === 0) {
      chunks.push(css.slice(start, i + 1));
      start = i + 1;
    }
  }

  const tail = css.slice(start);
  if (tail.trim()) chunks.push(tail);

  return chunks.filter((chunk) => chunk.trim());
}
