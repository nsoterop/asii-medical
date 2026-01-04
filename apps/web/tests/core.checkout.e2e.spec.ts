import { test, expect } from '@playwright/test';

test('cart to checkout with mock payments', async ({ page }) => {
  const orderId = 'order_e2e_1';
  const cartId = 'cart_e2e_1';

  await page.route('**/api/cart', async (route) => {
    await route.fulfill({
      json: {
        items: [
          {
            itemId: 2001,
            productId: 1001,
            productName: 'Test Gloves',
            itemDescription: 'Test Gloves',
            quantity: 2,
            unitPrice: 12.5,
            currency: 'USD',
          },
        ],
        totals: {
          subtotal: 25,
          totalQuantity: 2,
        },
      },
    });
  });

  await page.route('**/api/locations**', async (route) => {
    await route.fulfill({ json: [] });
  });

  await page.route('**/api/checkout/create', async (route) => {
    await route.fulfill({
      json: {
        cartId,
        subtotalCents: 2500,
        taxCents: 0,
        amountCents: 2500,
        currency: 'USD',
      },
    });
  });

  await page.route('**/api/checkout/pay', async (route) => {
    await route.fulfill({
      json: {
        status: 'PAID',
        orderId,
        squarePaymentId: 'mock_payment_1',
      },
    });
  });

  await page.route(/\/api\/checkout\/.+\/status/, async (route) => {
    await route.fulfill({
      json: {
        orderId,
        status: 'PAID',
      },
    });
  });

  await page.goto('/checkout');
  await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible();

  await page.fill('#checkout-shipping-address', '123 Main St, Raleigh, NC 27601');

  const payButton = page.getByRole('button', { name: 'Mock Pay' });
  await expect(payButton).toBeEnabled();

  await Promise.all([page.waitForURL('**/order/success**'), payButton.click()]);
  await expect(page.getByRole('heading', { name: 'Payment complete' })).toBeVisible();
});
