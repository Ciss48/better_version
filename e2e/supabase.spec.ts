import { expect, test } from '@playwright/test';

/**
 * Spec 15 — the `supabase` project (port 3001, `NEXT_PUBLIC_DATA_BACKEND=supabase`).
 * Route protection only: no real sign-in happens here, so no email is ever
 * sent. The manual login check (task file §Steps, step 8) covers the real flow.
 */

test('GET /today redirects an unauthenticated request to /login', async ({ request }) => {
  const response = await request.get('/today', { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(response.headers().location).toBe('/login?next=%2Ftoday');
});

test('/login renders the email sign-in form', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Gửi link đăng nhập' })).toBeVisible();
});
