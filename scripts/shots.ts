/**
 * Screenshots every /dev/components section, in both themes and at both
 * layout widths, into artifacts/shots/<id>_<theme>_<width>.png.
 *
 * Expects `pnpm dev` to be running on :3000 — this script starts nothing.
 *   pnpm dev   # in one terminal
 *   pnpm shots
 */
import { mkdir, rm } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const URL = process.env.SHOTS_URL ?? 'http://localhost:3000/dev/components';
const OUT = 'artifacts/shots';

/** Must stay in sync with the section ids of src/app/dev/components/page.tsx. */
const SECTIONS = [
  'tags',
  'banners',
  'plan-status',
  'progress',
  'task-input',
  'task-item',
  'mit-section',
  'task-group',
  'view-toggle',
  'matrix',
  'date-chips',
  'date-picker',
  'empty-state',
  'toast',
  'playground',
];

const THEMES = ['light', 'dark'] as const;
const WIDTHS = [1280, 390] as const;

async function main(): Promise<void> {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch();
  let written = 0;

  try {
    for (const theme of THEMES) {
      for (const width of WIDTHS) {
        const context = await browser.newContext({
          viewport: { width, height: 1000 },
          deviceScaleFactor: 2,
          colorScheme: theme,
          reducedMotion: 'reduce',
        });
        // next-themes reads this before the first paint, so no flash of the
        // wrong theme ends up in the screenshots.
        await context.addInitScript(
          ([key, value]) => window.localStorage.setItem(key, value),
          ['bed-theme', theme],
        );

        const page = await context.newPage();
        const response = await page.goto(URL, { waitUntil: 'networkidle' });
        if (response === null || !response.ok()) {
          throw new Error(`${URL} responded ${response?.status() ?? 'nothing'}`);
        }
        await page.waitForSelector('#playground');
        // Let the web fonts settle before capturing type.
        await page.evaluate(() => document.fonts.ready);

        for (const id of SECTIONS) {
          const section = page.locator(`#${id}`);
          await section.waitFor({ state: 'visible' });
          await section.scrollIntoViewIfNeeded();
          await section.screenshot({ path: `${OUT}/${id}_${theme}_${width}.png` });
          written += 1;
        }

        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  const expected = SECTIONS.length * THEMES.length * WIDTHS.length;
  console.log(`${written}/${expected} screenshots written to ${OUT}/`);
  if (written !== expected) {
    throw new Error(`expected ${expected} screenshots, wrote ${written}`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
