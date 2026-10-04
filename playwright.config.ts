import { defineConfig, devices } from '@playwright/test';

/**
 * The e2e suite drives the real app on the localStorage repository, with the
 * dev-only `?seed=` and `?now=` params pinning the data and the clock — the
 * same mechanism `pnpm shots:screens` uses.
 *
 * It therefore needs `next dev`, not a production build: the params only exist
 * outside production.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: process.env.CI !== undefined,
  retries: process.env.CI !== undefined ? 1 : 0,
  reporter: process.env.CI !== undefined ? 'line' : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000/today',
    reuseExistingServer: process.env.CI === undefined,
    timeout: 120_000,
  },
});
