import { test, expect } from '@playwright/test';

test('logged-out users can access auth routes', async ({ page }) => {
  await page.goto('/login');
  await expect(page).toHaveURL('/login');
  await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();

  await page.goto('/signup');
  await expect(page).toHaveURL('/signup');
  await expect(page.getByRole('heading', { name: 'Sign up' })).toBeVisible();
});

test('logged-out users are redirected away from protected routes', async ({ page }) => {
  await page.goto('/search');
  await expect(page).toHaveURL('/');

  await page.goto('/cart');
  await expect(page).toHaveURL('/');
});

test('logged-out users can access public routes', async ({ page }) => {
  await page.goto('/about');
  await expect(page.getByRole('heading', { name: 'ASii Medical Solutions LLC' })).toBeVisible();

  await page.goto('/terms');
  await expect(page.getByRole('heading', { name: 'Terms & Conditions' })).toBeVisible();
});
