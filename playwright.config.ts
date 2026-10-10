import { defineConfig, devices } from '@playwright/test';

/**
 * Two dev servers, two projects:
 *
 * - `desktop` (port 3000, `NEXT_PUBLIC_DATA_BACKEND=local`) runs the 14 data
 *   specs against the localStorage repository, with the dev-only `?seed=` and
 *   `?now=` params pinning the data and the clock — the same mechanism
 *   `pnpm shots:screens` uses. It needs `next dev`, not a production build:
 *   the params only exist outside production.
 * - `supabase` (port 3001, `NEXT_PUBLIC_DATA_BACKEND=supabase`) runs spec 15
 *   only — route protection — against an unauthenticated session. No real
 *   Supabase account is touched: the one assertion that needs a session is
 *   the proxy's redirect, which never gets that far.
 */
export default defineConfig({
  testDir: './e2e',
  // Compiles every route of the local-backend server before its workers
  // start — see e2e/global-setup.ts. The supabase-backend server only ever
  // serves /today (redirected) and /login, so it needs no equivalent.
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: process.env.CI !== undefined,
  retries: process.env.CI !== undefined ? 1 : 0,
  reporter: process.env.CI !== undefined ? 'line' : 'list',
  use: {
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      testIgnore: /supabase\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 900 },
        baseURL: 'http://localhost:3000',
      },
    },
    {
      name: 'supabase',
      testMatch: /supabase\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3001',
      },
    },
  ],
  webServer: [
    {
      command: 'pnpm dev',
      url: 'http://localhost:3000/today',
      reuseExistingServer: process.env.CI === undefined,
      timeout: 120_000,
      // The 14 data specs run on the localStorage repository; `supabase` (the
      // default) would redirect every one of them to /login.
      env: { NEXT_PUBLIC_DATA_BACKEND: 'local' },
    },
    {
      command: 'pnpm dev -p 3001',
      url: 'http://localhost:3001/login',
      reuseExistingServer: process.env.CI === undefined,
      timeout: 120_000,
      env: {
        NEXT_PUBLIC_DATA_BACKEND: 'supabase',
        // A distinct distDir, or this server's dev-server lockfile collides
        // with the `desktop` project's — see next.config.ts.
        NEXT_DIST_DIR: '.next-e2e-supabase',
      },
    },
  ],
});
