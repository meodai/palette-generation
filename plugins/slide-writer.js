import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const SLIDES_DIR = 'src/slides';
const ROUTE = '/__slide';

/**
 * Dev-only middleware: the in-browser editor POSTs a slide's source here and we
 * write it straight back to src/slides/<file>.html, so an edit made during a
 * rehearsal is a real, git-diffable change.
 *
 * We suppress the HMR reload that our own write would trigger — the editor has
 * already re-rendered the slide in place, and a reload mid-lecture is jarring.
 * Edits made from outside (your text editor) still reload normally.
 */
export default function slideWriter() {
  let dir;
  const justWritten = new Map();

  return {
    name: 'slide-writer',
    apply: 'serve',

    configResolved(config) {
      dir = path.resolve(config.root, SLIDES_DIR);
    },

    configureServer(server) {
      server.middlewares.use(ROUTE, async (req, res) => {
        res.setHeader('content-type', 'application/json');

        if (req.method !== 'POST') {
          res.statusCode = 405;
          return res.end(JSON.stringify({ ok: false, error: 'POST only' }));
        }

        try {
          const { file, source } = JSON.parse(await readBody(req));

          if (typeof file !== 'string' || typeof source !== 'string') {
            throw new Error('expected { file, source }');
          }

          const target = path.join(dir, path.basename(file));
          if (path.dirname(target) !== dir || path.extname(target) !== '.html') {
            throw new Error(`refusing to write ${file}`);
          }

          await writeFile(target, source, 'utf8');
          justWritten.set(target, Date.now());

          res.end(JSON.stringify({ ok: true, file: path.basename(target) }));
        } catch (error) {
          res.statusCode = 400;
          res.end(JSON.stringify({ ok: false, error: error.message }));
        }
      });
    },

    handleHotUpdate({ file }) {
      const at = justWritten.get(file);
      if (at === undefined) return;

      justWritten.delete(file);
      if (Date.now() - at < 2000) return [];
    },
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e7) reject(new Error('slide too large'));
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}
