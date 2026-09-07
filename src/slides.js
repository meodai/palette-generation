/**
 * Every file in src/slides/ is a slide, ordered by filename. Each one is a
 * standalone document fragment rooted in <main data-slide>, free to bring its
 * own <style> and <script>.
 */
const modules = import.meta.glob('./slides/*.html', {
  query: '?raw',
  import: 'default',
  eager: true,
});

export const STORAGE_PREFIX = 'slide:';

export function loadSlides() {
  return Object.keys(modules)
    .sort()
    .map((filePath) => {
      const file = filePath.split('/').pop();
      const name = file.replace(/\.html$/, '');

      return {
        file,
        name,
        id: `slide-${name}`,
        source: overlay(file, modules[filePath]),
      };
    });
}

/**
 * In dev, edits go back to disk and the glob above is the truth. A built deck
 * has no server to write to, so edits made on the road live in localStorage
 * and are layered back over the bundled source here.
 */
function overlay(file, source) {
  if (import.meta.env.DEV) return source;

  try {
    return localStorage.getItem(STORAGE_PREFIX + file) ?? source;
  } catch {
    return source;
  }
}
