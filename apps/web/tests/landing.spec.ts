import { test, expect } from '@playwright/test';

test('landing page renders hero', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'ASii Medical' })).toBeVisible();
  const heroImg = page.getByRole('img', { name: 'Operating room' });
  await expect(heroImg).toBeVisible();
  await expect(heroImg).toHaveAttribute('src', /hero-medical\.png/);
  await expect(
    page.getByRole('heading', { name: 'Built for reliable healthcare supply relationships.' })
  ).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Browse products' })).toHaveCount(0);
});

test('learn more navigates to about', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Learn more' }).click();
  await expect(page).toHaveURL('/about');
  await expect(page.getByRole('heading', { name: 'ASii Medical Solutions LLC' })).toBeVisible();
});

test('get started cta routes to auth pages', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Create account' }).click();
  await expect(page).toHaveURL('/signup');
  await page.goBack();
  await page.getByRole('link', { name: 'Log in' }).click();
  await expect(page).toHaveURL('/login');
});
