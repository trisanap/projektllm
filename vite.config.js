import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.',
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:9000',
      '/agent': 'http://localhost:9000',
      '/transcribe': 'http://localhost:9000',
    },
  },
  build: {
    outDir: 'backend/static',
    emptyOutDir: true,
  },
});
