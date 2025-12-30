import { test, expect } from '@playwright/test';

const rawCookies = process.env.E2E_ADMIN_COOKIES;
let adminCookies: Array<Record<string, any>> = [];
if (rawCookies) {
  try {
    adminCookies = JSON.parse(rawCookies) as Array<Record<string, any>>;
  } catch {
    adminCookies = [];
  }
}

test.describe('admin product updates', () => {
  test.skip(adminCookies.length === 0, 'E2E_ADMIN_COOKIES not set.');

  test.beforeEach(async ({ context }) => {
    if (adminCookies.length) {
      await context.addCookies(adminCookies);
    }
  });

  test('admin product updates search and save', async ({ page }) => {

  await page.route('**/api/admin/products/by-item/123', async (route) => {
    const request = route.request();
    if (request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          itemId: 123,
          skuId: 123,
          productId: 456,
          productName: 'Test Product',
          itemName: 'Test Item',
          manufacturerName: 'Acme',
          ndcItemCode: 'NDC123',
          categoryPathName: 'Supplies',
          imageUrl: 'https://example.com/old.png',
          price: 12.5,
          currency: 'USD'
        })
      });
      return;
    }

    if (request.method() === 'PATCH') {
      const payload = request.postDataJSON() as { price: number; imageUrl: string | null };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          itemId: 123,
          skuId: 123,
          productId: 456,
          productName: 'Test Product',
          itemName: 'Test Item',
          manufacturerName: 'Acme',
          ndcItemCode: 'NDC123',
          categoryPathName: 'Supplies',
          imageUrl: payload.imageUrl,
          price: payload.price,
          currency: 'USD'
        })
      });
    }
  });

    await page.goto('/admin/products');

    await expect(page.getByRole('heading', { name: 'Product Updates' })).toBeVisible();
    await page.getByTestId('product-search-input').fill('123');
    await page.getByTestId('product-search-button').click();

    await expect(page.getByTestId('product-name')).toHaveValue('Test Product');
    await expect(page.getByTestId('product-name')).toHaveJSProperty('readOnly', true);

    const priceInput = page.getByTestId('price-input');
    const imageInput = page.getByTestId('image-url-input');
    await priceInput.fill('15.25');
    await imageInput.fill('https://example.com/new.png');

    const saveButton = page.getByTestId('save-button');
    await expect(saveButton).toBeEnabled();

    const [request] = await Promise.all([
      page.waitForRequest(
        (req) =>
          req.url().includes('/api/admin/products/by-item/123') && req.method() === 'PATCH'
      ),
      saveButton.click()
    ]);

    const payload = request.postDataJSON() as { price: number; imageUrl: string | null };
    expect(payload.price).toBe(15.25);
    expect(payload.imageUrl).toBe('https://example.com/new.png');

    await expect(page.getByText('Saved')).toBeVisible();
  });
});
