import { test, expect } from '@playwright/test';

const rawCookies = process.env.E2E_SUPABASE_COOKIES;
let authCookies: Array<Record<string, any>> = [];
if (rawCookies) {
  try {
    authCookies = JSON.parse(rawCookies) as Array<Record<string, any>>;
  } catch {
    authCookies = [];
  }
}

test.describe('checkout', () => {
  test.skip(authCookies.length === 0, 'E2E_SUPABASE_COOKIES not set.');

  test.beforeEach(async ({ context }) => {
    if (authCookies.length) {
      await context.addCookies(authCookies);
    }
  });

  test('checkout renders and pay triggers payment call', async ({ page }) => {
    await page.route('**/square.js', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: `window.Square = {
          payments: () => ({
            card: async () => ({
              attach: async () => {},
              tokenize: async () => ({ status: 'OK', token: 'tok_test' })
            })
          })
        };`
      });
    });

    await page.route('**/api/cart', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              itemId: 101,
              quantity: 1,
              productId: 10,
              productName: 'Exam Gloves',
              unitPrice: 10
            }
          ],
          totals: { subtotal: 10, totalQuantity: 1 },
          shipping: 'Calculated at checkout',
          tax: 0
        })
      });
    });

    await page.route('**/api/checkout/create', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          cartId: 'cart_1',
          subtotalCents: 1000,
          taxCents: 80,
          amountCents: 1080,
          currency: 'USD'
        })
      });
    });

    await page.route('**/api/checkout/pay', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'PAID',
          orderId: 'order_1',
          squarePaymentId: 'pay_1'
        })
      });
    });

    await page.goto('/checkout');
    await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible();
    await page.fill('#checkout-shipping-address', '123 Main St, Austin, TX 78701');
    await page.waitForRequest('**/api/checkout/create');
    const payButton = page.getByRole('button', { name: 'Pay now' });
    await expect(payButton).toBeEnabled();

    const [request] = await Promise.all([
      page.waitForRequest('**/api/checkout/pay'),
      payButton.click()
    ]);

    const payload = request.postDataJSON() as {
      cartId: string;
      sourceId: string;
      shippingAddress: string;
    };
    expect(payload.cartId).toBe('cart_1');
    expect(payload.sourceId).toBe('tok_test');
    expect(payload.shippingAddress).toBe('123 Main St, Austin, TX 78701');
  });
});
