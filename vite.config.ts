/// <reference types="vitest" />
import path from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';

import pkg from './package.json';

// Calculate version based on commit count, fallback to package.json version
let version = pkg.version;
// Only try to get version from git if we're not in Vercel build environment
if (!process.env.VERCEL) {
  try {
    const commitCount = execSync('git rev-list --count HEAD').toString().trim();
    version = `1.${commitCount}`;
  } catch (e) {
    console.warn('Could not determine commit count from git, using version from package.json.');
  }
}

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
