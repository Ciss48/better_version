import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/** Seed names from src/dev/seeds.ts. */
export type Seed =
  | 'new'
  | 'demo'
  | 'empty'
  | 'missed'
  | 'complete'
  | 'latenight'
  | 'sparse';

/** 14:10 Saturday 2026-10-03 in Asia/Ho_Chi_Minh — the plan is locked. */
export const LOCKED = '2026-10-03T07:10:00Z';
/** 08:15 Saturday — the planning window is still open. */
export const OPEN = '2026-10-03T01:15:00Z';
/** 21:30 Saturday — ritual time. */
export const EVENING = '2026-10-03T14:30:00Z';

/**
 * Opens a screen with a seed and a frozen clock, and waits for the store.
 * Both params are consumed and stripped by `src/dev/DevParams.tsx`, so a later
 * `page.reload()` keeps the data instead of re-seeding it.
 */
export async function open(
  page: Page,
  path: string,
  options: { seed?: Seed; now?: string } = {},
): Promise<void> {
  const params = new URLSearchParams();
  if (options.seed !== undefined) params.set('seed', options.seed);
  if (options.now !== undefined) params.set('now', options.now);
  const query = params.toString();
  await page.goto(query === '' ? path : `${path}?${query}`);
  await ready(page);
}

/** Waits for the screen root the store marks once it has loaded. */
export async function ready(page: Page): Promise<void> {
  await expect(page.locator('[data-ready="true"]')).toBeVisible({ timeout: 20_000 });
}

/** The quick-add field of Today or ritual step 3. */
export function quickAdd(page: Page) {
  return page.getByRole('textbox').first();
}

/** One task row, matched by its title. */
export function taskRow(page: Page, title: string) {
  return page.locator('[data-status]').filter({ hasText: title });
}

export async function addTask(page: Page, text: string): Promise<void> {
  await quickAdd(page).fill(text);
  await quickAdd(page).press('Enter');
}
