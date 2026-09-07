import '@fontsource/aboreto/400.css';
import '@fontsource/work-sans/300.css';
import '@fontsource/work-sans/400.css';
import '@fontsource/work-sans/500.css';
import './style.css';

import { Deck } from './deck.js';
import { loadSlides } from './slides.js';

const el = {
  deck: document.getElementById('deck'),
  current: document.getElementById('chromeCurrent'),
  total: document.getElementById('chromeTotal'),
  bar: document.getElementById('progressBar'),
  pen: document.getElementById('pen'),
  previous: document.getElementById('previous'),
  next: document.getElementById('next'),
  help: document.getElementById('help'),
  editor: document.getElementById('editor'),
};

const deck = new Deck(el.deck, loadSlides(), { onChange: render });

/**
 * CodeMirror is by far the heaviest thing here and most of a lecture is spent
 * not editing, so the pen loads on first use. The deck itself boots in a few kB.
 */
let editor = null;

async function openEditor() {
  if (!editor) {
    const { Editor } = await import('./editor.js');

    editor = new Editor(deck, {
      panel: el.editor,
      body: document.getElementById('editorBody'),
      fileLabel: document.getElementById('editorFile'),
      statusLabel: document.getElementById('editorStatus'),
      closeButton: document.getElementById('editorClose'),
    });
  }

  editor.open();
  render();
}

function closeEditor() {
  editor?.close();
  render();
}

const editorIsOpen = () => Boolean(editor?.isOpen);

el.total.textContent = String(deck.count);
deck.go(indexFromHash());
render();

// ------------------------------------------------------------------ chrome -

function render() {
  const human = deck.index + 1;

  el.current.textContent = String(human);
  el.bar.style.width = `${(human / deck.count) * 100}%`;
  el.pen.setAttribute('aria-pressed', String(editorIsOpen()));
  el.previous.disabled = deck.index === 0;
  el.next.disabled = deck.index === deck.count - 1;

  const hash = `#${human}`;
  if (location.hash !== hash) history.replaceState(null, '', hash);
}

el.pen.addEventListener('click', () => {
  editorIsOpen() ? closeEditor() : openEditor();
});

// -------------------------------------------------------------- navigation -

function indexFromHash() {
  const n = Number.parseInt(location.hash.slice(1), 10);
  return Number.isFinite(n) ? n - 1 : 0;
}

addEventListener('hashchange', () => deck.go(indexFromHash()));

el.previous.addEventListener('click', () => deck.previous());
el.next.addEventListener('click', () => deck.next());

/**
 * True whenever the keystroke belongs to something the user is typing into —
 * the code editor above all. Nothing here may steal a key from the pen.
 */
function isTyping(target) {
  if (!(target instanceof Element)) return false;

  return Boolean(
    target.isContentEditable ||
      target.closest('.cm-editor, .editor') ||
      /^(input|textarea|select)$/i.test(target.tagName),
  );
}

const NEXT = new Set(['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'j', 'n']);
const PREVIOUS = new Set(['ArrowLeft', 'ArrowUp', 'PageUp', 'k', 'p']);

addEventListener('keydown', (event) => {
  // Escape is the one key that reaches us from inside the editor.
  if (event.key === 'Escape') {
    if (editorIsOpen()) closeEditor();
    else el.help.hidden = true;
    render();
    return;
  }

  if (isTyping(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;

  if (NEXT.has(event.key)) deck.next();
  else if (PREVIOUS.has(event.key)) deck.previous();
  else if (event.key === 'Home') deck.go(0);
  else if (event.key === 'End') deck.go(deck.count - 1);
  else if (event.key === 'e') openEditor();
  else if (event.key === 'i') document.documentElement.toggleAttribute('data-invert');
  else if (event.key === '?') el.help.hidden = !el.help.hidden;
  else return;

  event.preventDefault();
  render();
});

el.help.addEventListener('click', () => {
  el.help.hidden = true;
});
