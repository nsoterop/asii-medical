import { test, expect } from '@playwright/test';

const seedCart = (items: unknown[]) =>
  JSON.stringify(items);

test('cart page shows items and summary totals', async ({ page }) => {
  await page.addInitScript((value) => {
    window.localStorage.setItem('cartItems', value);
  }, seedCart([
    {
      itemId: 101,
      quantity: 1,
      productId: 10,
      productName: 'Exam Gloves',
      manufacturerName: 'Acme',
      availabilityRaw: 'Stock Item',
      unitPrice: 10,
      ndcItemCode: 'NDC-101'
    },
    {
      itemId: 102,
      quantity: 2,
      productId: 11,
      productName: 'Face Shield',
      manufacturerName: 'Beta',
      availabilityRaw: '14-21 Days',
      unitPrice: 5,
      ndcItemCode: 'NDC-102'
    }
  ]));

  await page.goto('/cart');
  await expect(page.getByTestId('cart-list')).toBeVisible();
  await expect(page.getByText('ItemID')).toHaveCount(0);
  await expect(page.getByText('NDC Item Code: NDC-101')).toBeVisible();
  await expect(page.getByTestId('summary-subtotal')).toHaveText('$20.00');

  const firstCardTop = await page
    .getByTestId('cart-item-card')
    .first()
    .evaluate((el) => el.getBoundingClientRect().top);
  const summaryTop = await page
    .getByTestId('order-summary')
    .evaluate((el) => el.getBoundingClientRect().top);
  expect(Math.abs(firstCardTop - summaryTop)).toBeLessThanOrEqual(2);

  await page.getByTestId('cart-qty-101').fill('3');
  await expect(page.getByTestId('summary-subtotal')).toHaveText('$40.00');

  await page.getByTestId('cart-remove-102').click();
  await expect(page.getByTestId('summary-subtotal')).toHaveText('$30.00');
  await expect(page.getByText('Face Shield')).toHaveCount(0);
});

test('cart page shows empty state', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('cartItems', '[]');
  });
  await page.goto('/cart');
  await expect(page.getByText('Your cart is empty.')).toBeVisible();
  await expect(
    page.getByText('Your cart is empty.').locator('..').getByRole('link', { name: 'Continue shopping' })
  ).toBeVisible();
});
