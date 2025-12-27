import { test, expect } from '@playwright/test';

test('product page shows variants and selection', async ({ page }) => {
  await page.route('**/api/catalog/product/2001', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        productId: 2001,
        productName: 'Widget A',
        productDescription: 'Long description that should be truncated on first render.',
        manufacturerName: 'Acme',
        categoryPathName: 'Consumables',
        skus: [
          {
            itemId: 1001,
            pkg: '1 each',
            unitPrice: 12.5,
            availabilityRaw: 'In Stock',
            itemDescription: 'Widget A - Small detailed description',
            manufacturerItemCode: 'ACM-1',
            ndcItemCode: '111',
            itemImageUrl: 'http://example.com/sku-1.jpg'
          },
          {
            itemId: 1002,
            pkg: '5 pack',
            unitPrice: 40,
            availabilityRaw: 'Backorder',
            itemDescription: 'Widget A - Large',
            manufacturerItemCode: 'ACM-2',
            ndcItemCode: '222',
            itemImageUrl: null
          },
          {
            itemId: 1003,
            pkg: '10 pack',
            unitPrice: null,
            availabilityRaw: 'Limited',
            itemDescription: 'Widget A - XL',
            manufacturerItemCode: 'ACM-3',
            itemImageUrl: null
          },
          {
            itemId: 1004,
            pkg: '12 pack',
            unitPrice: 22,
            availabilityRaw: 'In Stock',
            itemDescription: 'Widget A - XXL',
            manufacturerItemCode: 'ACM-4',
            itemImageUrl: null
          },
          {
            itemId: 1005,
            pkg: '20 pack',
            unitPrice: 18,
            availabilityRaw: 'In Stock',
            itemDescription: 'Widget A - Mega',
            manufacturerItemCode: 'ACM-5',
            itemImageUrl: null
          },
          {
            itemId: 1006,
            pkg: '30 pack',
            unitPrice: 60,
            availabilityRaw: 'Backorder',
            itemDescription: 'Widget A - Ultra',
            manufacturerItemCode: 'ACM-6',
            itemImageUrl: null
          },
          {
            itemId: 1007,
            pkg: '50 pack',
            unitPrice: 70,
            availabilityRaw: 'In Stock',
            itemDescription: 'Widget A - Mega XL',
            manufacturerItemCode: 'ACM-7',
            itemImageUrl: null
          }
        ]
      })
    });
  });

  await page.goto('/product/2001');
  await expect(page.locator('[data-testid=\"product-image\"]')).toBeVisible();
  await expect(page.locator('[data-testid=\"product-options-table\"]')).toBeVisible();
  const heroImageTop = await page
    .locator('[data-testid=\"product-hero-image\"]')
    .evaluate((el) => el.getBoundingClientRect().top);
  const heroInfoTop = await page
    .locator('[data-testid=\"product-hero-info\"]')
    .evaluate((el) => el.getBoundingClientRect().top);
  const heroCartTop = await page
    .locator('[data-testid=\"product-hero-cart\"]')
    .evaluate((el) => el.getBoundingClientRect().top);
  expect(Math.abs(heroImageTop - heroInfoTop)).toBeLessThanOrEqual(1);
  expect(Math.abs(heroImageTop - heroCartTop)).toBeLessThanOrEqual(1);
  const imageBoxStyles = await page
    .locator('[data-testid=\"product-image\"]')
    .evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        display: styles.display,
        alignItems: styles.alignItems,
        justifyContent: styles.justifyContent,
        height: styles.height,
        paddingTop: styles.paddingTop,
        paddingBottom: styles.paddingBottom
      };
    });
  expect(imageBoxStyles.display).toBe('flex');
  expect(imageBoxStyles.alignItems).toBe('center');
  expect(imageBoxStyles.justifyContent).toBe('center');
  expect(imageBoxStyles.height).not.toBe('auto');
  expect(imageBoxStyles.paddingTop).toBe('0px');
  expect(imageBoxStyles.paddingBottom).toBe('0px');
  const frameStyles = await page
    .locator('[data-testid=\"product-image\"] > div')
    .evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        height: styles.height,
        maxWidth: styles.maxWidth
      };
    });
  expect(frameStyles.height).not.toBe('auto');
  expect(frameStyles.maxWidth).toBe('82%');
  const imageFit = await page.locator('[data-testid=\"product-image\"] img').evaluate((el) => {
    return window.getComputedStyle(el).objectFit;
  });
  expect(imageFit).toBe('contain');
  await expect(page.locator('[data-testid=\"options-table\"]')).toBeVisible();
  await expect(page.locator('[data-testid=\"buy-box\"]')).toBeVisible();
  await expect(page.locator('[data-testid=\"details-block\"]')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Widget A', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Widget A - Small detailed description' })).toBeVisible();
  await expect(page.getByText('Product description')).toBeVisible();
  await expect(page.getByText('Options')).toBeVisible();
  await expect(page.getByText('Details')).toBeVisible();
  await expect(page.getByText('Variant options')).toHaveCount(0);
  await expect(page.locator('[data-testid=\"options-table\"] tr[role=\"button\"]')).toHaveCount(6);
  await expect(page.getByText('Item details')).toHaveCount(0);
  await expect(page.getByText('SKUs:')).toHaveCount(0);
  const buyBoxBounds = await page.locator('[data-testid=\"buy-box\"]').boundingBox();
  expect(buyBoxBounds).not.toBeNull();
  expect(buyBoxBounds?.width ?? 0).toBeGreaterThan(350);
  const readMoreButton = page.getByText('Read more');
  const readMoreCount = await readMoreButton.count();
  if (readMoreCount > 0) {
    await expect(readMoreButton).toBeVisible();
  }
  const titleBounds = await page.getByRole('heading', { name: 'Widget A', exact: true }).boundingBox();
  const buyBoxTopBefore = await page.locator('[data-testid=\"buy-box\"]').boundingBox();
  expect(titleBounds).not.toBeNull();
  expect(buyBoxTopBefore).not.toBeNull();
  if (readMoreCount > 0) {
    await readMoreButton.click();
    await expect(page.getByText('Read less')).toBeVisible();
    const titleBoundsAfter = await page
      .getByRole('heading', { name: 'Widget A', exact: true })
      .boundingBox();
    const buyBoxTopAfter = await page.locator('[data-testid=\"buy-box\"]').boundingBox();
    expect(titleBoundsAfter).not.toBeNull();
    expect(buyBoxTopAfter).not.toBeNull();
    expect(titleBoundsAfter?.y ?? 0).toBeGreaterThan(0);
    expect(buyBoxTopAfter?.y ?? 0).toBeGreaterThan(0);
    expect(Math.abs((titleBoundsAfter?.y ?? 0) - (titleBounds?.y ?? 0))).toBeLessThan(3);
    expect(Math.abs((buyBoxTopAfter?.y ?? 0) - (buyBoxTopBefore?.y ?? 0))).toBeLessThan(3);
  }
  await expect(page.getByText('Widget A - Small').first()).toBeVisible();
  await expect(page.getByText('Widget A - Large')).toBeVisible();
  await expect(page.getByText('Widget A - XL')).toHaveCount(0);
  await expect(page.getByText('See 1 more option')).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'DESCRIPTION' })).toBeVisible();
  const optionsCardTop = await page.locator('[data-testid=\"options-table-card\"]').boundingBox();
  const detailsTop = await page.locator('[data-testid=\"details-block\"]').boundingBox();
  expect(optionsCardTop).not.toBeNull();
  expect(detailsTop).not.toBeNull();
  expect(Math.abs((optionsCardTop?.y ?? 0) - (detailsTop?.y ?? 0))).toBeLessThan(5);

  await expect(page.locator('[data-testid=\"product-image\"]')).toBeVisible();

  await expect(page.getByTestId('buy-box').getByText('$12.50')).toBeVisible();

  await expect(page.locator('[data-testid=\"details-block\"]')).toContainText('111');

  await page.getByText('Widget A - Large').click();
  await expect(page.getByTestId('no-image')).toBeVisible();
  await expect(page.getByTestId('buy-box').getByText('$40.00')).toBeVisible();
  await expect(page).toHaveURL(/itemId=1002/);
  await expect(page.locator('[data-testid=\"details-block\"]')).toContainText('222');

  await page.getByText('See 1 more option').click();
  await expect(page).toHaveURL(/\/product\/2001\/options/);
  await expect(page.getByText('Widget A - Mega XL')).toBeVisible();
  await expect(page.locator('img')).toHaveCount(1);
  await expect(page.getByText('No image').first()).toBeVisible();

  await page.getByText('Widget A - Mega XL').click();
  await expect(page).toHaveURL(/itemId=1007/);
});
