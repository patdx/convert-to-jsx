import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: 'apps/website',
  plugins: [react()],
  resolve: {
    alias: {
      acorn: path.resolve(__dirname, 'node_modules/acorn/src/index.js'),
      '@ctj/angular-to-jsx': path.resolve(
        __dirname,
        'libs/angular-to-jsx/src/index.ts'
      ),
    },
  },
  build: {
    outDir: '../../dist',
    emptyOutDir: true,
  },
});
