import { test, expect } from '@playwright/test';

test('admin imports list renders', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('adminSecret', 'test-secret');
  });

  await page.route('**/admin/imports', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'run_1',
            status: 'SUCCEEDED',
            createdAt: new Date().toISOString(),
            startedAt: null,
            finishedAt: null,
            totalRows: 10,
            inserted: 8,
            updated: 2,
            deactivated: 0,
            errorCount: 0
          }
        ])
      });
      return;
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  await page.goto('/admin/imports');
  await expect(page.getByText('Import Runs')).toBeVisible();
  await expect(page.getByText('run_1')).toBeVisible();
});
