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
  cube: document.getElementById('cube'),
  notes: document.getElementById('notes'),
  peek: document.getElementById('peek'),
  peekBody: document.getElementById('peekBody'),
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
  if (inspectorIsOpen()) inspector.close();

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

/** The color inspector — three.js, so it loads on first use like the pen. */
let inspector = null;

async function openInspector() {
  if (editorIsOpen()) editor.close();
  if (peek) closePeek();

  if (!inspector) {
    const { Inspector } = await import('./inspector.js');

    inspector = new Inspector({
      panel: document.getElementById('inspector'),
      body: document.getElementById('inspectorBody'),
      select: document.getElementById('inspectorModel'),
      title: document.getElementById('inspectorSlide'),
      empty: document.getElementById('inspectorEmpty'),
      closeButton: document.getElementById('inspectorClose'),
    });
  }

  inspector.open(deck.current.id, `src/slides/${deck.current.file}`);
  render();
}

function closeInspector() {
  inspector?.close();
  render();
}

const inspectorIsOpen = () => Boolean(inspector?.isOpen);

/**
 * Hovering the cube peeks: a small inspector drops in above it with the
 * current slide's colors, in the slide's own model. Same class, preview mode.
 */
let peek = null;
let peeking = false;

async function peekView() {
  if (!peek) {
    const { Inspector } = await import('./inspector.js');
    peek = new Inspector({ body: el.peekBody, preview: true });
  }
  return peek;
}

async function openPeek() {
  if (inspectorIsOpen()) return;
  peeking = true;
  const view = await peekView();
  if (!peeking || inspectorIsOpen()) return;
  view.open(deck.current.id, '');
  el.peek.dataset.open = '';
}

async function closePeek() {
  peeking = false;
  delete el.peek.dataset.open;
  (await peekView()).close();
}

el.cube.addEventListener('pointerenter', openPeek);
el.cube.addEventListener('pointerleave', closePeek);

// ------------------------------------------------------------ speaker notes -

/**
 * Speaker notes live in each slide as <section data-notes>. `s` opens
 * notes.html in a second window for the other screen; the two tabs talk over a
 * BroadcastChannel — same origin, no server. While a notes window is alive
 * (it heartbeats), the deck hides its notes so the room sees only the slide.
 */
const channel = new BroadcastChannel('palette-generation');
let notesAlive = null;

const slideTitle = (entry) => entry?.el.querySelector('h1, h2')?.textContent.replace(/\s+/g, ' ').trim() ?? '';

function broadcast() {
  const entry = deck.current;
  channel.postMessage({
    type: 'slide',
    index: deck.index,
    count: deck.count,
    title: slideTitle(entry),
    notes: entry.el.querySelector('[data-notes]')?.innerHTML ?? '',
    next: slideTitle(deck.at(deck.index + 1)),
  });
}

function notesSeen() {
  document.documentElement.dataset.notesAway = '';
  clearTimeout(notesAlive);
  notesAlive = setTimeout(notesGone, 2500);
}

function notesGone() {
  clearTimeout(notesAlive);
  delete document.documentElement.dataset.notesAway;
}

channel.addEventListener('message', ({ data }) => {
  if (data.type === 'hello') { notesSeen(); broadcast(); }
  else if (data.type === 'beat') notesSeen();
  else if (data.type === 'bye') notesGone();
  else if (data.type === 'next') { deck.next(); render(); }
  else if (data.type === 'previous') { deck.previous(); render(); }
  else if (data.type === 'go') { deck.go(data.index); render(); }
});

// Notes that a script fills in (measured numbers) reach the other screen too.
const notesWatcher = new MutationObserver(() => broadcast());

function openNotes() {
  const url = new URL('notes.html', document.baseURI);
  window.open(url, 'palette-generation-notes');
}

el.notes.addEventListener('click', openNotes);

el.total.textContent = String(deck.count);
deck.go(indexFromHash());
render();

// ------------------------------------------------------------------ chrome -

function render() {
  const human = deck.index + 1;

  broadcast();
  notesWatcher.disconnect();
  const notes = deck.current.el.querySelector('[data-notes]');
  if (notes) notesWatcher.observe(notes, { subtree: true, childList: true, characterData: true });

  el.current.textContent = String(human);
  el.bar.style.width = `${(human / deck.count) * 100}%`;
  el.pen.setAttribute('aria-pressed', String(editorIsOpen()));
  el.cube.setAttribute('aria-pressed', String(inspectorIsOpen()));
  if (inspectorIsOpen()) inspector.show(deck.current.id, `src/slides/${deck.current.file}`);
  el.previous.disabled = deck.index === 0;
  el.next.disabled = deck.index === deck.count - 1;

  const hash = `#${human}`;
  if (location.hash !== hash) history.replaceState(null, '', hash);
}

el.pen.addEventListener('click', () => {
  editorIsOpen() ? closeEditor() : openEditor();
});

el.cube.addEventListener('click', () => {
  inspectorIsOpen() ? closeInspector() : openInspector();
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
    else if (inspectorIsOpen()) closeInspector();
    else el.help.hidden = true;
    render();
    return;
  }

  // ⌘I / Ctrl+I toggles the color inspector from anywhere, editor included.
  if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === 'i') {
    event.preventDefault();
    inspectorIsOpen() ? closeInspector() : openInspector();
    return;
  }

  if (isTyping(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;

  if (NEXT.has(event.key)) deck.next();
  else if (PREVIOUS.has(event.key)) deck.previous();
  else if (event.key === 'Home') deck.go(0);
  else if (event.key === 'End') deck.go(deck.count - 1);
  else if (event.key === 'e') openEditor();
  else if (event.key === 'c') inspectorIsOpen() ? closeInspector() : openInspector();
  else if (event.key === 's') openNotes();
  else if (event.key === 'i') document.documentElement.toggleAttribute('data-invert');
  else if (event.key === '?') el.help.hidden = !el.help.hidden;
  else return;

  event.preventDefault();
  render();
});

el.help.addEventListener('click', () => {
  el.help.hidden = true;
});
