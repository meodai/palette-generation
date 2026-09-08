import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import slideWriter from './plugins/slide-writer.js';

export default defineConfig({
  // GitHub project page: github.io/palette-generation/
  base: '/palette-generation/',
  // two pages: the deck, and the speaker's notes window
  input: {
    main: resolve(import.meta.dirname, 'index.html'),
    notes: resolve(import.meta.dirname, 'notes.html'),
  },
  plugins: [slideWriter()],
  server: { open: true },
  build: { target: 'esnext' },
});
