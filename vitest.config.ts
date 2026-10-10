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
    // Every file gets its own jsdom worker, and spinning ~40 of them up at once
    // leaves the heaviest user-event tests (the matrix sheet, the ritual
    // playground) close to the 5s default. 15s is still short enough to catch a
    // genuinely hung test.
    testTimeout: 15_000,
    // Each file still gets a clean worker (module-level state such as the
    // clock override must not leak between files), but spawning one per file
    // all at once thrashes the machine and makes interaction tests flake.
    maxWorkers: 4,
    include: ['src/**/*.test.{ts,tsx}'],
    // `src/lib/env.ts` throws at import when supabase mode has no credentials.
    // The unit suite runs on the local backend; the few tests that care about
    // the switch stub these and re-import the module.
    env: {
      NEXT_PUBLIC_DATA_BACKEND: 'local',
      NEXT_PUBLIC_SUPABASE_URL: 'https://stub.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'stub-anon-key',
    },
    setupFiles: ['./src/test/setup-dom.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/domain/**', 'src/stats/**'],
      exclude: ['src/domain/__tests__/**', 'src/stats/__tests__/**'],
      reporter: ['text', 'json-summary'],
    },
  },
});
