import { defineConfig } from 'vite';
import slideWriter from './plugins/slide-writer.js';

export default defineConfig({
  plugins: [slideWriter()],
  server: { open: true },
  build: { target: 'esnext' },
});
