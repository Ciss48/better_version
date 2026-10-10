import { chromium } from '@playwright/test';
import type { FullConfig } from '@playwright/test';

/**
 * Walks every route once before the workers start.
 *
 * `next dev` compiles a route the first time it is asked for, and its client
 * bundle only when a browser actually fetches it. Without this, that cost lands
 * on the first four navigations — which run in parallel, in four browsers, on a
 * cold server — and the "the store is ready" wait times out on all of them. One
 * browser taking the compile on its own turns a 40-second cold run into a
 * 16-second one, and makes `pnpm e2e` behave the same cold as warm.
 *
 * No seed and no `?now=`: this is about compilation, not data.
 */
const ROUTES = [
  '/today',
  '/ritual',
  '/stats',
  '/history',
  '/goals',
  '/weekly',
  '/settings',
  '/more',
  '/onboarding',
  '/login',
];

export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use.baseURL ?? 'http://localhost:3000';
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    for (const route of ROUTES) {
      await page.goto(`${baseURL}${route}`, { waitUntil: 'load', timeout: 180_000 });
    }
  } finally {
    await browser.close();
  }
}
