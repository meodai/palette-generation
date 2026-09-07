import { EditorView, keymap } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { basicSetup } from 'codemirror';
import { html } from '@codemirror/lang-html';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { STORAGE_PREFIX } from './slides.js';

/** Monochrome, with tomato reserved for the things that carry the meaning. */
const theme = EditorView.theme({
  '&': {
    height: '100%',
    color: 'var(--onBg)',
    backgroundColor: 'transparent',
    fontSize: '0.82rem',
  },
  '.cm-scroller': {
    fontFamily: 'var(--font-mono)',
    lineHeight: '1.65',
    padding: '0.75rem 0',
  },
  '.cm-content': { caretColor: 'var(--highlight)' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--highlight)', borderLeftWidth: '2px' },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    color: 'var(--faint)',
    border: 'none',
    paddingRight: '0.5rem',
  },
  '.cm-activeLine': { backgroundColor: 'color-mix(in oklab, var(--onBg) 4%, transparent)' },
  '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--muted)' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
    backgroundColor: 'color-mix(in oklab, var(--highlight) 26%, transparent)',
  },
  '.cm-matchingBracket, &.cm-focused .cm-matchingBracket': {
    backgroundColor: 'transparent',
    color: 'var(--highlight)',
    outline: 'none',
    fontWeight: '600',
  },
  '.cm-tooltip': {
    border: '1px solid var(--hairline)',
    backgroundColor: 'var(--bg)',
    color: 'var(--onBg)',
    fontFamily: 'var(--font-mono)',
  },
  '.cm-tooltip-autocomplete ul li[aria-selected]': {
    backgroundColor: 'var(--faint)',
    color: 'var(--highlight)',
  },
  '.cm-panels': { backgroundColor: 'var(--bg)', color: 'var(--onBg)' },
});

const highlight = HighlightStyle.define([
  { tag: [tags.comment], color: 'var(--muted)', fontStyle: 'italic' },
  { tag: [tags.tagName, tags.angleBracket], color: 'var(--onBg)', fontWeight: '500' },
  { tag: [tags.attributeName, tags.propertyName], color: 'var(--muted)' },
  { tag: [tags.attributeValue, tags.string, tags.special(tags.string)], color: 'var(--highlight)' },
  { tag: [tags.number, tags.bool, tags.null, tags.atom, tags.unit], color: 'var(--highlight)' },
  { tag: [tags.keyword, tags.controlKeyword, tags.definitionKeyword, tags.moduleKeyword], fontWeight: '600' },
  { tag: [tags.operator, tags.punctuation, tags.separator], color: 'var(--muted)' },
  { tag: [tags.function(tags.variableName), tags.definition(tags.variableName)], color: 'var(--onBg)', fontWeight: '600' },
  { tag: [tags.variableName, tags.className, tags.typeName], color: 'var(--onBg)' },
  { tag: [tags.invalid], color: 'var(--highlight)', textDecoration: 'underline wavy' },
]);

/**
 * The pen. Holds one slide's raw source; ⌘S renders it into the deck and, in
 * dev, writes it back to src/slides/ so the edit survives the lecture.
 */
export class Editor {
  #deck;
  #panel;
  #fileLabel;
  #statusLabel;
  #view;
  #extensions;
  #index = -1;
  #statusTimer;

  constructor(deck, { panel, body, fileLabel, statusLabel, closeButton }) {
    this.#deck = deck;
    this.#panel = panel;
    this.#fileLabel = fileLabel;
    this.#statusLabel = statusLabel;

    this.#extensions = [
      keymap.of([
        { key: 'Mod-s', preventDefault: true, run: () => (this.save(), true) },
        { key: 'Escape', preventDefault: true, run: () => (this.close(), true) },
      ]),
      basicSetup,
      html(),
      theme,
      syntaxHighlighting(highlight),
      EditorView.lineWrapping,
    ];

    this.#view = new EditorView({ parent: body, extensions: this.#extensions });

    closeButton.addEventListener('click', () => this.close());
  }

  get isOpen() {
    return !this.#panel.hidden;
  }

  toggle() {
    this.isOpen ? this.close() : this.open();
  }

  open(index = this.#deck.index) {
    const entry = this.#deck.current;
    if (!entry) return;

    this.#index = index;
    this.#fileLabel.textContent = `src/slides/${entry.file}`;
    this.#status('');

    // Fresh state per slide, so undo history never crosses a slide boundary.
    this.#view.setState(EditorState.create({ doc: entry.source, extensions: this.#extensions }));

    this.#panel.hidden = false;
    document.documentElement.dataset.editing = '';
    this.#view.requestMeasure();
    this.#view.focus();
  }

  close() {
    this.#panel.hidden = true;
    delete document.documentElement.dataset.editing;
    this.#index = -1;
    document.activeElement?.blur?.();
  }

  async save() {
    if (this.#index < 0) return;

    const source = this.#view.state.doc.toString();
    const entry = this.#deck.replace(this.#index, source);

    if (!import.meta.env.DEV) return this.#saveLocally(entry, source);

    try {
      const response = await fetch('/__slide', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ file: entry.file, source }),
      });

      const result = await response.json();
      if (!result.ok) throw new Error(result.error);

      this.#status(`written to src/slides/${entry.file}`);
    } catch (error) {
      this.#status(`not written — ${error.message}`, 'error');
    }
  }

  #saveLocally(entry, source) {
    try {
      localStorage.setItem(STORAGE_PREFIX + entry.file, source);
      this.#status('saved in this browser (no dev server)');
    } catch (error) {
      this.#status(`not saved — ${error.message}`, 'error');
    }
  }

  #status(message, state = '') {
    clearTimeout(this.#statusTimer);
    this.#statusLabel.textContent = message;
    this.#statusLabel.dataset.state = state;

    if (message && state !== 'error') {
      this.#statusTimer = setTimeout(() => {
        this.#statusLabel.textContent = '';
      }, 2400);
    }
  }
}
