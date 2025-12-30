import { test, expect } from '@playwright/test';
import type { Cookie } from '@playwright/test';

const parseCookies = (raw?: string): Cookie[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((cookie): cookie is Cookie =>
      Boolean(cookie && typeof cookie.name === 'string' && typeof cookie.value === 'string'),
    );
  } catch {
    return [];
  }
};

const adminCookies = parseCookies(process.env.E2E_ADMIN_COOKIES);

test.describe('admin imports', () => {
  test.skip(adminCookies.length === 0, 'E2E_ADMIN_COOKIES not set.');

  test.beforeEach(async ({ context }) => {
    if (adminCookies.length) {
      await context.addCookies(adminCookies);
    }
  });

  test('admin imports list renders', async ({ page }) => {
    await page.route('**/api/admin/imports', async (route) => {
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
              errorCount: 0,
            },
          ]),
        });
        return;
      }

      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });

    await page.goto('/admin/imports');
    await expect(page.getByText('Import Runs')).toBeVisible();
    await expect(page.getByText('run_1')).toBeVisible();
  });
});
