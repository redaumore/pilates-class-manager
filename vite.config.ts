/// <reference types="vitest" />
import path from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';

// Calculate version based on commit count
const commitCount = execSync('git rev-list --count HEAD').toString().trim();
const version = `1.${commitCount}`;

export default defineConfig({
  // Base path for Vercel (root)
  base: '/',
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './vitest.setup.ts',
  },
});
