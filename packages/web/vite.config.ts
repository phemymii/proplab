import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api': 'http://localhost:4591',
      '/ws': { target: 'ws://localhost:4591', ws: true },
      '/__proplab_preview__': 'http://localhost:4591',
      '/__proplab_entry__': 'http://localhost:4591',
      '/@fs': 'http://localhost:4591',
      '/@id': 'http://localhost:4591',
      '/@vite': 'http://localhost:4591',
      '/node_modules': 'http://localhost:4591',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
