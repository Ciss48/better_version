import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // No React plugin: the tests need the JSX transform, not Fast Refresh, and
  // Vite's own transform already emits the automatic runtime.
  test: {
    // Component tests opt into jsdom with `// @vitest-environment jsdom`.
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test/setup-dom.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/domain/**'],
      exclude: ['src/domain/__tests__/**'],
      reporter: ['text', 'json-summary'],
    },
  },
});
