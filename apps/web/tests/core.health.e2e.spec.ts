import { test, expect } from '@playwright/test';

test('health endpoint responds', async ({ page }) => {
  await page.goto('/health');
  await expect(page.locator('body')).toContainText('ok');
});
