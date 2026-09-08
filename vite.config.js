import { defineConfig } from 'vite';
import slideWriter from './plugins/slide-writer.js';

export default defineConfig({
  // GitHub project page: github.io/palette-generation/
  base: '/palette-generation/',
  plugins: [slideWriter()],
  server: { open: true },
  build: { target: 'esnext' },
});
