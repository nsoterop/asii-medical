import { test, expect } from '@playwright/test';

test('search page renders results', async ({ page }) => {
  await page.route('**/api/catalog/search**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        hits: [
          {
            skuItemId: 1,
            productId: 2,
            productName: 'Test Mask',
            productDescription: 'Desc',
            itemDescription: 'Test Mask',
            manufacturerName: 'Acme',
            manufacturerItemCode: 'ACM-1',
            ndcItemCode: '123',
            nationalDrugCode: 'ND123',
            categoryPathName: 'PPE',
            unitPrice: 12.5,
            availabilityRaw: 'In Stock',
            pkg: '1 each',
            imageUrl: 'http://example.com/a.jpg',
            isActive: true
          }
        ],
        total: 1,
        page: 1,
        pageSize: 12,
        facets: {
          manufacturerName: { Acme: 1 },
          categoryPathName: { PPE: 1 },
          availabilityRaw: { 'In Stock': 1 }
        }
      })
    });
  });
  await page.route('**/api/catalog/categories/tree**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ name: 'PPE', path: 'PPE', depth: 1, children: [] }])
    });
  });

  await page.goto('/search?q=mask');
  await expect(page.getByText('Test Mask')).toBeVisible();
  await expect(page.getByText('Acme')).toBeVisible();
});
