import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    exclude: [
      'tests/e2e/**',
      'tests/rls.integration.test.ts',
      'node_modules/**',
      '.next/**',
    ],
  },
});
