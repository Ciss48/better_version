import { expect, test } from '@playwright/test';
import { addTask, LOCKED, open, OPEN, quickAdd, ready, taskRow } from './helpers';

test('first run: skip onboarding, plan, tick, reload', async ({ page }) => {
  await open(page, '/today', { seed: 'new', now: OPEN });

  // A user with no history ever gets the welcome banner.
  const welcome = page.locator('[data-variant="welcome"]');
  await expect(welcome).toBeVisible();

  await welcome.getByRole('button', { name: 'Thiết lập trong 1 phút' }).click();
  await expect(page).toHaveURL(/\/onboarding/);
  await ready(page);

  await page.getByRole('button', { name: 'Bỏ qua, dùng mặc định' }).click();
  await expect(page).toHaveURL(/\/today/);
  await expect(page.getByText('Bắt đầu thôi — viết việc đầu tiên nhé')).toBeVisible();
  await ready(page);

  await addTask(page, 'Học Databricks * ~L');

  // `*` makes it a MIT, so it lands inside the MIT card, not "Các việc khác".
  const mitSection = page.locator('section', { hasText: 'Việc quan trọng nhất' }).first();
  await expect(mitSection.getByText('Học Databricks')).toBeVisible();
  await expect(page.getByRole('progressbar')).toContainText('0%');

  await taskRow(page, 'Học Databricks').getByRole('checkbox').click();
  await expect(page.getByRole('progressbar')).toContainText('100%');
  await expect(page.locator('[data-variant="complete"]')).toBeVisible();

  await page.reload();
  await ready(page);
  await expect(page.getByRole('progressbar')).toContainText('100%');
  await expect(taskRow(page, 'Học Databricks').getByRole('checkbox')).toBeChecked();
});

test('adding after the lock lands in Phát sinh and does not move the %', async ({ page }) => {
  await open(page, '/today', { seed: 'demo', now: LOCKED });

  const before = await page.getByRole('progressbar').textContent();
  await addTask(page, 'Việc gấp ngoài kế hoạch');

  await expect(page.getByText('Đã thêm vào nhóm Phát sinh')).toBeVisible();
  const adhocGroup = page.locator('section', { hasText: 'Thêm sau giờ khóa' }).first();
  await expect(adhocGroup.getByText('Việc gấp ngoài kế hoạch')).toBeVisible();
  await expect(page.getByRole('progressbar')).toHaveText(before ?? '');
});

test('move a task to tomorrow, then restore it', async ({ page }) => {
  await open(page, '/today', { seed: 'demo', now: OPEN });

  const row = taskRow(page, 'Đặt lịch khám răng');
  await row.getByRole('button', { expanded: false }).click();
  await row.getByRole('button', { name: 'Dời sang mai' }).click();

  await expect(row.getByText(/Đã dời →/)).toBeVisible();

  await row.getByRole('button', { expanded: false }).click();
  await row.getByRole('button', { name: 'Khôi phục' }).click();
  await expect(row.getByText(/Đã dời →/)).toHaveCount(0);
  await expect(row).toHaveAttribute('data-status', 'todo');
});

test('matrix: drag a chip to another quadrant and it survives a reload', async ({ page }) => {
  await open(page, '/today', { seed: 'demo', now: LOCKED });

  await page.keyboard.press('m');
  await expect(page.getByText('Kéo thả việc giữa các ô')).toBeVisible();

  const chip = page
    .locator('[data-quadrant="q1"] [role="button"]')
    .filter({ hasText: 'Hoàn thiện slide demo' });
  const schedule = page.locator('[data-quadrant="q2"]');
  await expect(chip).toBeVisible();

  const from = await chip.boundingBox();
  const to = await schedule.boundingBox();
  if (from === null || to === null) throw new Error('matrix chips are not laid out');

  // dnd-kit's PointerSensor only starts after 4px of movement.
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2 + 12, from.y + from.height / 2 + 12, { steps: 5 });
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
  await page.mouse.up();

  await expect(schedule.getByText('Hoàn thiện slide demo')).toBeVisible();

  await page.reload();
  await ready(page);
  await expect(
    page.locator('[data-quadrant="q2"]').getByText('Hoàn thiện slide demo'),
  ).toBeVisible();
});

test('late night still shows yesterday and says when the day ends', async ({ page }) => {
  await open(page, '/today', { seed: 'latenight', now: '2026-10-03T18:00:00Z' });

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Thứ Bảy, 3 tháng 10');
  await expect(page.getByText('Ngày của bạn kết thúc lúc 3:00')).toBeVisible();
});

test('a new lock time in Settings shows up on Today immediately', async ({ page }) => {
  await open(page, '/settings', { seed: 'demo', now: OPEN });

  await page.getByRole('combobox', { name: 'Khóa plan lúc' }).click();
  await page.getByRole('option', { name: '12:00 ngày D' }).click();

  await page.goto('/today');
  await ready(page);
  await expect(page.getByText('khóa lúc 12:00')).toBeVisible();
  await expect(quickAdd(page)).toBeVisible();
});
