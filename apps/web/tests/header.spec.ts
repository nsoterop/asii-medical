import { test, expect } from '@playwright/test';

test('header search shows suggestions and links', async ({ page }) => {
  await page.route('**/api/catalog/search**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        hits: [
          {
            skuItemId: 1,
            productId: 101,
            productName: 'Glove A',
            productDescription: null,
            itemDescription: 'Latex gloves',
            manufacturerName: 'Acme',
            manufacturerItemCode: null,
            ndcItemCode: null,
            nationalDrugCode: null,
            categoryPathName: null,
            unitPrice: 12,
            availabilityRaw: 'In Stock',
            pkg: 'Box',
            imageUrl: null,
            isActive: true
          },
          {
            skuItemId: 2,
            productId: 102,
            productName: 'Glove B',
            productDescription: null,
            itemDescription: 'Nitrile gloves',
            manufacturerName: 'Acme',
            manufacturerItemCode: null,
            ndcItemCode: null,
            nationalDrugCode: null,
            categoryPathName: null,
            unitPrice: 15,
            availabilityRaw: 'In Stock',
            pkg: 'Box',
            imageUrl: null,
            isActive: true
          },
          {
            skuItemId: 3,
            productId: 103,
            productName: 'Glove C',
            productDescription: null,
            itemDescription: 'Vinyl gloves',
            manufacturerName: 'MedCo',
            manufacturerItemCode: null,
            ndcItemCode: null,
            nationalDrugCode: null,
            categoryPathName: null,
            unitPrice: 9,
            availabilityRaw: 'In Stock',
            pkg: 'Box',
            imageUrl: null,
            isActive: true
          },
          {
            skuItemId: 4,
            productId: 104,
            productName: 'Glove D',
            productDescription: null,
            itemDescription: 'Exam gloves',
            manufacturerName: 'MedCo',
            manufacturerItemCode: null,
            ndcItemCode: null,
            nationalDrugCode: null,
            categoryPathName: null,
            unitPrice: 11,
            availabilityRaw: 'In Stock',
            pkg: 'Box',
            imageUrl: null,
            isActive: true
          },
          {
            skuItemId: 5,
            productId: 105,
            productName: 'Glove E',
            productDescription: null,
            itemDescription: 'Surgical gloves',
            manufacturerName: 'MedCo',
            manufacturerItemCode: null,
            ndcItemCode: null,
            nationalDrugCode: null,
            categoryPathName: null,
            unitPrice: 18,
            availabilityRaw: 'In Stock',
            pkg: 'Box',
            imageUrl: null,
            isActive: true
          },
          {
            skuItemId: 6,
            productId: 106,
            productName: 'Glove F',
            productDescription: null,
            itemDescription: 'Powder-free gloves',
            manufacturerName: 'MedCo',
            manufacturerItemCode: null,
            ndcItemCode: null,
            nationalDrugCode: null,
            categoryPathName: null,
            unitPrice: 20,
            availabilityRaw: 'In Stock',
            pkg: 'Box',
            imageUrl: null,
            isActive: true
          }
        ],
        total: 6,
        page: 1,
        pageSize: 5,
        facets: {}
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

  await page.goto('/');
  const searchInput = page.getByPlaceholder('Search');
  await expect(searchInput).toBeVisible();
  await searchInput.fill('glove');
  await expect(page.locator('[data-testid=\"search-suggestions\"]')).toBeVisible();
  await expect(page.locator('[data-testid=\"search-suggestion\"]')).toHaveCount(5);
  await expect(page.locator('[data-testid=\"search-show-all\"]')).toBeVisible();

  await page.locator('[data-testid=\"search-show-all\"]').click();
  await expect(page).toHaveURL(/\/search\?q=glove/);

  await page.goBack();
  const searchInputAfter = page.getByPlaceholder('Search');
  await expect(searchInputAfter).toBeVisible();
  await searchInputAfter.fill('glove');
  await expect(page.locator('[data-testid=\"search-suggestions\"]')).toBeVisible();
  await page.locator('[data-testid=\"search-suggestion\"]').first().click();
  await expect(page).toHaveURL(/\/product\/101/);

  await page.goto('/search?q=glove');
  await expect(page.getByPlaceholder('Search products...')).toHaveCount(0);
});
