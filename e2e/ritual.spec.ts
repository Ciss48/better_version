import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { EVENING, open, ready } from './helpers';

/** One ritual review row, matched by its task title. */
function reviewRow(page: Page, title: string) {
  return page.locator('[data-decided]').filter({ hasText: title });
}

test('ritual: decide everything, reflect, plan tomorrow, close the day', async ({ page }) => {
  await open(page, '/ritual', { seed: 'demo', now: EVENING });

  const next = page.getByRole('button', { name: 'Tiếp tục' });
  await expect(next).toHaveAttribute('aria-disabled', 'true');
  // The gate is `aria-disabled`, not `disabled`, so the click still reaches the
  // screen and it can explain itself — Playwright needs `force` to deliver it.
  await next.click({ force: true });
  await expect(page.getByText('Còn việc chưa xử lý — dời hoặc bỏ nhé')).toBeVisible();

  // The MIT goes to Monday so tomorrow keeps a free MIT slot for the new task.
  await reviewRow(page, 'Hoàn thiện slide demo').getByRole('radio', { name: /Thứ 2 tới/ }).click();
  await reviewRow(page, 'Đặt lịch khám răng').getByRole('radio', { name: 'Mai' }).click();
  await reviewRow(page, 'Atomic Habits').getByRole('radio', { name: /Thứ 2 tới/ }).click();
  await reviewRow(page, 'Mua quà sinh nhật Minh').getByRole('radio', { name: 'Bỏ' }).click();

  await expect(page.getByText('Đã xử lý hết — sẵn sàng khép ngày')).toBeVisible();
  await expect(next).toHaveAttribute('aria-disabled', 'false');
  await next.click();

  // Step 2 is entirely optional — the primary button says so while it is empty.
  await page.getByRole('button', { name: 'Bỏ qua' }).click();

  await expect(page.getByRole('heading', { name: /Plan cho/ })).toBeVisible();
  const tomorrowInput = page.getByRole('textbox').last();
  await tomorrowInput.fill('Chạy bộ 5km *');
  await tomorrowInput.press('Enter');

  await page.getByRole('button', { name: 'Hoàn tất & đóng ngày' }).click();
  await expect(page.getByText(/Đã khép lại/)).toBeVisible();
  await expect(page.getByRole('heading', { level: 2 })).toBeVisible();

  // Tomorrow, the moved task and the new MIT are both on the page.
  await open(page, '/today', { now: '2026-10-04T01:00:00Z' });
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Chủ Nhật, 4 tháng 10');
  await expect(page.getByText('Đặt lịch khám răng')).toBeVisible();

  const mitSection = page.locator('section', { hasText: 'Việc quan trọng nhất' }).first();
  await expect(mitSection.getByText('Chạy bộ 5km')).toBeVisible();
});

test('a ritual draft survives leaving with Esc', async ({ page }) => {
  await open(page, '/ritual', { seed: 'demo', now: EVENING });

  const row = reviewRow(page, 'Đặt lịch khám răng');
  await row.getByRole('radio', { name: 'Mai' }).click();
  await expect(row.getByRole('radio', { name: 'Mai' })).toHaveAttribute('aria-checked', 'true');

  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/\/today/);
  await ready(page);

  await page.goto('/ritual');
  await ready(page);
  await expect(
    reviewRow(page, 'Đặt lịch khám răng').getByRole('radio', { name: 'Mai' }),
  ).toHaveAttribute('aria-checked', 'true');
});
