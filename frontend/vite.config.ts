import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const frontendRoot = __dirname;
const outputDirectory = path.resolve(frontendRoot, '../dist/public');
const sourceDirectory = path.resolve(frontendRoot, 'src');

export default defineConfig({
  root: frontendRoot,
  plugins: [react()],
  resolve: {
    alias: {
      '@': sourceDirectory,
    },
  },
  server: {
    port: 5173,
    host: 'localhost',
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4173,
    host: 'localhost',
  },
  build: {
    outDir: outputDirectory,
    emptyOutDir: true,
    assetsDir: 'assets',
    sourcemap: true,
    manifest: true,
    rollupOptions: {
      input: path.resolve(frontendRoot, 'index.html'),
    },
  },
});
