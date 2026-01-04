import { test, expect } from '@playwright/test';

test('auth pages render', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();

  await page.goto('/signup');
  await expect(page.getByRole('heading', { name: 'Sign up' })).toBeVisible();
});
