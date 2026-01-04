import type { Page } from '@playwright/test';

type Credentials = {
  email: string;
  password: string;
};

export const getE2ECredentials = (): Credentials => {
  return {
    email: process.env.E2E_USER_EMAIL ?? process.env.SEED_USER_EMAIL ?? 'user@example.com',
    password: process.env.E2E_USER_PASSWORD ?? 'Password123!',
  };
};

export const signIn = async (page: Page) => {
  const { email, password } = getE2ECredentials();
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  try {
    await page.waitForURL('**/search', { timeout: 10000 });
  } catch {
    const errorLocator = page
      .locator('text=/Invalid login credentials|confirm your email/i')
      .first();
    const errorText = (await errorLocator.textContent())?.trim();
    const detail = errorText ? `: ${errorText}` : '';
    throw new Error(`Sign in failed${detail}`);
  }
};
