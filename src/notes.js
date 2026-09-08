import '@fontsource/aboreto/400.css';
import '@fontsource/work-sans/300.css';
import '@fontsource/work-sans/400.css';
import '@fontsource/work-sans/500.css';
import './style.css';

/**
 * The speaker's screen. Listens to the deck over a BroadcastChannel, shows the
 * current slide's notes in large type, and can drive the deck from here. It
 * heartbeats once a second; while the deck hears it, the deck hides its notes.
 */
const channel = new BroadcastChannel('palette-generation');

const el = {
  count: document.getElementById('count'),
  title: document.getElementById('title'),
  body: document.getElementById('body'),
  next: document.getElementById('next'),
  timer: document.getElementById('timer'),
  previous: document.getElementById('previous'),
  nextButton: document.getElementById('next-button'),
};

channel.addEventListener('message', ({ data }) => {
  if (data.type !== 'slide') return;
  el.count.textContent = `${data.index + 1} / ${data.count}`;
  el.title.textContent = data.title;
  el.body.innerHTML = data.notes || '<p class="notes__empty">no notes on this slide</p>';
  el.next.textContent = data.next || '—';
  document.title = `${data.index + 1} · ${data.title} — notes`;
});

const send = (type, extra = {}) => channel.postMessage({ type, ...extra });

send('hello');
const beat = setInterval(() => send('beat'), 1000);
addEventListener('pagehide', () => { clearInterval(beat); send('bye'); });

el.previous.addEventListener('click', () => send('previous'));
el.nextButton.addEventListener('click', () => send('next'));

addEventListener('keydown', (event) => {
  if (['ArrowRight', ' ', 'j', 'n', 'PageDown'].includes(event.key)) send('next');
  else if (['ArrowLeft', 'k', 'p', 'PageUp'].includes(event.key)) send('previous');
  else if (event.key === 'Home') send('go', { index: 0 });
  else return;
  event.preventDefault();
});

// A talk timer: starts when this window opens, click to restart.
let started = Date.now();
const tick = () => {
  const s = Math.floor((Date.now() - started) / 1000);
  el.timer.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
setInterval(tick, 1000);
el.timer.addEventListener('click', () => { started = Date.now(); tick(); });
