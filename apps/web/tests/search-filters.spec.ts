import { test, expect } from '@playwright/test';

test('manufacturer filter shows view more and modal selection', async ({ page }) => {
  await page.route('**/api/catalog/search**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        hits: [],
        total: 0,
        page: 1,
        pageSize: 12,
        facets: {
          manufacturerName: {
            'Maker 1': 10,
            'Maker 2': 9,
            'Maker 3': 8,
            'Maker 4': 7,
            'Maker 5': 6,
            'Maker 6': 5,
            'Maker 7': 4,
            'Maker 8': 3,
            'Maker 9': 2,
            'Maker 10': 2,
            'Maker 11': 1,
            'Maker 12': 1
          }
        }
      })
    });
  });
  await page.route('**/api/catalog/categories/tree**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { name: 'Consumables', path: 'Consumables', depth: 1, children: [] }
      ])
    });
  });

  await page.goto('/search?q=glove');

  await expect(page.locator('[data-testid="manufacturer-option"]')).toHaveCount(8);
  await expect(page.locator('[data-testid="manufacturer-view-more"]')).toBeVisible();

  await page.locator('[data-testid="manufacturer-view-more"]').click();
  const modal = page.locator('[data-testid="manufacturer-modal"]');
  await expect(modal).toBeVisible();

  await modal.locator('[data-testid="manufacturer-search"]').fill('Maker 12');
  await expect(modal.getByText('Maker 12')).toBeVisible();
  await modal.getByText('Maker 12').click();

  await modal.getByLabel('Close').click();
  await expect(modal).toHaveCount(0);

  const selectedRow = page
    .locator('[data-testid="manufacturer-option"]')
    .filter({ hasText: 'Maker 12' });
  await expect(selectedRow).toBeVisible();
  await expect(selectedRow.locator('input[type="checkbox"]')).toBeChecked();

  const secondRow = page
    .locator('[data-testid="manufacturer-option"]')
    .filter({ hasText: 'Maker 11' });
  await secondRow.locator('input[type="checkbox"]').check();

  await expect(page).toHaveURL(/manufacturer=Maker%2012/);
  await expect(page).toHaveURL(/manufacturer=Maker%2011/);
});
