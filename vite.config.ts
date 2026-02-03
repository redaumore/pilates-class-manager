/// <reference types="vitest" />
import path from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';

// Calculate version based on commit count
let version = '1.0.0';
try {
  const commitCount = execSync('git rev-list --count HEAD').toString().trim();
  version = `1.${commitCount}`;
} catch (e) {
  console.warn('Could not determine commit count from git, using default version.');
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
