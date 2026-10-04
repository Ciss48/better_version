import { expect, test } from '@playwright/test';
import { EVENING, LOCKED, open } from './helpers';

/** The six labels of design/handoff/screens.md §3, in the order of the screenshot. */
const CARD_LABELS = [
  'Hoàn thành TB · 7 ngày',
  'Hoàn thành TB · 30 ngày',
  'Điểm nhất quán',
  'Quan trọng nhưng không gấp',
  'Việc phát sinh',
  'Việc bị dời',
];

test('Journey shows six cards, four insights and nothing after today', async ({ page }) => {
  await open(page, '/stats', { seed: 'demo', now: LOCKED });

  for (const label of CARD_LABELS) {
    await expect(page.getByText(label, { exact: true })).toBeVisible();
  }

  const insights = page
    .locator('section')
    .filter({ hasText: 'Điều dữ liệu nói với bạn' })
    .locator('p');
  await expect(insights).toHaveCount(4);

  // The heat map stops at today: tomorrow has no cell to click.
  await expect(page.getByRole('button', { name: /Thứ Bảy, 3 tháng 10/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Chủ Nhật, 4 tháng 10/ })).toHaveCount(0);
});

test('a new user sees the sparse card and no figures', async ({ page }) => {
  await open(page, '/stats', { seed: 'sparse', now: LOCKED });

  await expect(page.getByText(/Bạn đã có 4\/7/)).toBeVisible();
  await expect(page.getByText(/Insight sẽ xuất hiện sau khoảng hai tuần/)).toBeVisible();

  // Every card but the consistency score holds its figure back.
  for (const label of ['Hoàn thành TB · 7 ngày', 'Việc phát sinh', 'Việc bị dời']) {
    const card = page.locator('div').filter({ hasText: label }).last();
    await expect(card.getByText('—', { exact: true })).toBeVisible();
  }
  await expect(page.getByText('4/30', { exact: true }).first()).toBeVisible();
});

test('closing a day shows up on the Journey screen the next morning', async ({ page }) => {
  await open(page, '/stats', { seed: 'demo', now: EVENING });
  const before = await page.getByText(/^\d+\/30$/).first().textContent();
  expect(before).toMatch(/^\d+\/30$/);

  // Run the whole ritual on the seeded day.
  await open(page, '/ritual', { now: EVENING });
  const row = (title: string) => page.locator('[data-decided]').filter({ hasText: title });
  await row('Hoàn thiện slide demo').getByRole('radio', { name: 'Mai' }).click();
  await row('Đặt lịch khám răng').getByRole('radio', { name: 'Mai' }).click();
  await row('Atomic Habits').getByRole('radio', { name: 'Mai' }).click();
  await row('Mua quà sinh nhật Minh').getByRole('radio', { name: 'Bỏ' }).click();
  await page.getByRole('button', { name: 'Tiếp tục' }).click();
  await page.getByRole('button', { name: 'Bỏ qua' }).click();
  await page.getByRole('button', { name: 'Hoàn tất & đóng ngày' }).click();
  await expect(page.getByText(/Đã khép lại/)).toBeVisible();

  // The next logical day: yesterday is now a finished day on the map.
  await open(page, '/stats', { now: '2026-10-04T01:00:00Z' });
  await expect(page.getByText(/^\d+\/30$/).first()).toBeVisible();
  await expect(
    page.getByRole('button', { name: /Thứ Bảy, 3 tháng 10 · \d+%/ }),
  ).toBeVisible();
});
