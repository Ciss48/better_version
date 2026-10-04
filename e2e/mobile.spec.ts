import { expect, test } from '@playwright/test';
import { LOCKED, open } from './helpers';

/** Below the 720px `app:` breakpoint the matrix swaps dragging for a sheet. */
test.use({ viewport: { width: 390, height: 844 } });

test('mobile matrix: tapping a chip opens the sheet and moves the task', async ({ page }) => {
  await open(page, '/today', { seed: 'demo', now: LOCKED });

  await page.getByRole('button', { name: 'Ma trận' }).click();
  await expect(page.getByText('Chạm vào một việc để chuyển sang ô khác.')).toBeVisible();

  // The chip's title is a button in tap mode; the checkbox beside it has the
  // same accessible name but no text, so `hasText` picks the right one.
  await page
    .locator('[data-quadrant] button')
    .filter({ hasText: 'Gửi báo cáo tuần' })
    .click();
  await expect(page.getByText('Chuyển sang ô…')).toBeVisible();

  await page.getByRole('dialog').getByRole('button', { name: /Lên lịch/ }).click();
  await expect(page.getByText('Đã chuyển sang “Lên lịch”')).toBeVisible();
  await expect(
    page.locator('[data-quadrant="q2"]').getByText('Gửi báo cáo tuần'),
  ).toBeVisible();
});
