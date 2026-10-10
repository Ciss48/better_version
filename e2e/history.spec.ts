import { expect, test } from '@playwright/test';
import { LOCKED, open, ready } from './helpers';

test('a heat-map cell opens that day in History', async ({ page }) => {
  await open(page, '/stats', { seed: 'demo', now: LOCKED });

  await page.getByRole('button', { name: /Thứ Năm, 1 tháng 10/ }).click();
  await expect(page).toHaveURL(/\/history\?date=2026-10-01/);
  await ready(page);

  await expect(page.getByText('Thứ Năm, 1/10', { exact: true })).toBeVisible();
  await expect(page.getByText('Chỉ đọc')).toBeVisible();
});

test('History walks back a month and stops at the current one', async ({ page }) => {
  await open(page, '/history', { seed: 'demo', now: LOCKED });

  await expect(page.getByText('Tháng 10, 2026')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tháng sau' })).toBeDisabled();

  await page.getByRole('button', { name: 'Tháng trước' }).click();
  await expect(page.getByText('Tháng 9, 2026')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tháng sau' })).toBeEnabled();

  // 2026-09-15 is a day with a plan in the `demo` seed.
  await page.getByRole('button', { name: /Thứ Ba, 15 tháng 9/ }).click();
  await expect(page.getByText('Thứ Ba, 15/9', { exact: true })).toBeVisible();
  await expect(page.getByText('Học 1 chương Databricks')).toBeVisible();
  await expect(page.getByText(/việc đã định/)).toBeVisible();
});
