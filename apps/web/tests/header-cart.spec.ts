import { test, expect } from '@playwright/test';

test('cart popover shows items and closes on outside click', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'cartItems',
      JSON.stringify([
        {
          itemId: 101,
          quantity: 2,
          productName: 'Test Gloves',
          unitPrice: 12.5
        }
      ])
    );
  });

  await page.goto('/');

  const cartButton = page.getByTestId('cart-button');
  await cartButton.click();

  const popover = page.getByTestId('cart-popover');
  await expect(popover).toBeVisible();
  await expect(popover).toContainText('Test Gloves');
  await expect(popover).toContainText('Qty: 2');
  await expect(popover).toContainText('Subtotal');
  await expect(popover).toContainText('$25.00');

  await page.mouse.click(5, 5);
  await expect(popover).toHaveCount(0);
});

test('header search and cart do not overlap', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  const searchInput = page.getByTestId('header-search-input');
  const cartButton = page.getByTestId('cart-button');

  await expect(searchInput).toBeVisible();
  await expect(cartButton).toBeVisible();

  const searchBox = await searchInput.boundingBox();
  const cartBox = await cartButton.boundingBox();

  expect(searchBox).not.toBeNull();
  expect(cartBox).not.toBeNull();

  if (searchBox && cartBox) {
    expect(searchBox.x + searchBox.width).toBeLessThan(cartBox.x);
  }
});
