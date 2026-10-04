/**
 * Screenshots every screen state of design/handoff/screens.md into
 * artifacts/screens/<design-name>_<theme>_<desktop|mobile>.png, so each one can
 * be put next to design/handoff/screenshots/<desktop|mobile>/<name>_<theme>.png.
 *
 * Expects `pnpm dev` to be running on :3000 — this script starts nothing.
 *   pnpm dev          # in one terminal
 *   pnpm shots:screens
 *
 * Every row is a fresh browser context: `?seed=` wipes the repository, and the
 * `?now=` override lives in sessionStorage, so rows must not share a session.
 */
import { mkdir, rm } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import type { Browser } from '@playwright/test';

const BASE = process.env.SHOTS_BASE ?? 'http://localhost:3000';
const OUT = 'artifacts/screens';

interface Row {
  /** Matches the design screenshot's file name. */
  name: string;
  path: string;
  seed: string;
  now: string;
  /** Preset localStorage keys, applied before the first paint. */
  storage?: Record<string, string>;
}

const ROWS: Row[] = [
  { name: 'today_locked-adhoc', path: '/today', seed: 'demo', now: '2026-10-03T07:10:00Z' },
  { name: 'today_window-open', path: '/today', seed: 'demo', now: '2026-10-03T01:15:00Z' },
  { name: 'today_empty', path: '/today', seed: 'empty', now: '2026-10-03T01:15:00Z' },
  { name: 'today_missed-day', path: '/today', seed: 'missed', now: '2026-10-03T01:15:00Z' },
  { name: 'today_complete-100', path: '/today', seed: 'complete', now: '2026-10-03T07:10:00Z' },
  { name: 'today_new-user', path: '/today', seed: 'new', now: '2026-10-03T01:15:00Z' },
  { name: 'today_after-midnight', path: '/today', seed: 'latenight', now: '2026-10-03T18:00:00Z' },
  { name: 'today_plan-reminder', path: '/today', seed: 'demo', now: '2026-10-03T14:40:00Z' },
  {
    name: 'today_matrix',
    path: '/today',
    seed: 'demo',
    now: '2026-10-03T07:10:00Z',
    storage: {
      'bed:v1:ui': JSON.stringify({ todayView: 'matrix', planReminderDismissedOn: null }),
    },
  },
  { name: 'ritual_step1-review', path: '/ritual', seed: 'demo', now: '2026-10-03T14:30:00Z' },
  { name: 'settings_default', path: '/settings', seed: 'demo', now: '2026-10-03T07:10:00Z' },
  { name: 'onboarding_step1', path: '/onboarding', seed: 'new', now: '2026-10-03T01:15:00Z' },
];

const THEMES = ['light', 'dark'] as const;
const VIEWPORTS = {
  desktop: { width: 1280, height: 1000 },
  mobile: { width: 390, height: 844 },
} as const;

async function shoot(
  browser: Browser,
  row: Row,
  theme: (typeof THEMES)[number],
  size: keyof typeof VIEWPORTS,
): Promise<void> {
  const context = await browser.newContext({
    viewport: VIEWPORTS[size],
    deviceScaleFactor: 2,
    colorScheme: theme,
    reducedMotion: 'reduce',
  });

  const storage: Record<string, string> = { 'bed-theme': theme, ...row.storage };
  // next-themes reads its key before the first paint, so no flash of the wrong
  // theme ends up in the screenshot.
  await context.addInitScript((entries: Record<string, string>) => {
    for (const [key, value] of Object.entries(entries)) {
      window.localStorage.setItem(key, value);
    }
  }, storage);

  const page = await context.newPage();
  const url = `${BASE}${row.path}?seed=${row.seed}&now=${encodeURIComponent(row.now)}`;
  const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
  if (response === null || !response.ok()) {
    throw new Error(`${url} responded ${response?.status() ?? 'nothing'}`);
  }

  await page.waitForSelector('[data-ready="true"]', { timeout: 20_000 });
  await page.evaluate(() => document.fonts.ready);
  // The progress fill and the stepper bars transition over 600ms / 300ms.
  await page.waitForTimeout(700);

  await page.screenshot({
    path: `${OUT}/${row.name}_${theme}_${size}.png`,
    // screens.md: desktop shots are 1280 wide at full content height; mobile
    // ones are 390x844. A full-page mobile capture would also stitch the fixed
    // tab bar into the middle of the image.
    fullPage: size === 'desktop',
  });
  await context.close();
}

async function main(): Promise<void> {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch();
  let written = 0;
  try {
    for (const row of ROWS) {
      for (const theme of THEMES) {
        for (const size of ['desktop', 'mobile'] as const) {
          await shoot(browser, row, theme, size);
          written += 1;
        }
      }
      console.log(`${row.name} ✓`);
    }
  } finally {
    await browser.close();
  }

  const expected = ROWS.length * THEMES.length * 2;
  console.log(`${written}/${expected} screenshots written to ${OUT}/`);
  if (written !== expected) {
    throw new Error(`expected ${expected} screenshots, wrote ${written}`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
