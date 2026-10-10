import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * The Supabase contract run — `pnpm test:supabase`, deliberately separate from
 * `pnpm test`. It talks to the real project over the network (no mocks), needs
 * the service-role key (only ever read here, in Node, never in `src/`), and
 * creates/tears down two throwaway auth users per run.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['supabase/tests/**/*.test.ts'],
    globalSetup: ['./supabase/tests/global-setup.ts'],
    // One throwaway-user auth round trip plus a 1,050-row commit; slower than
    // the jsdom unit suite's 15s default.
    testTimeout: 60_000,
    hookTimeout: 60_000,
    // The contract suite resets the same two accounts between cases — running
    // them concurrently would have one case's reset race another's writes.
    fileParallelism: false,
  },
});
