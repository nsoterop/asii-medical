import { test, expect } from '@playwright/test';

test('about page renders content', async ({ page }) => {
  await page.goto('/about');
  await expect(page.getByRole('heading', { name: 'ASii Medical Solutions LLC' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Company Background' })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(page.getByTestId('site-footer')).toBeVisible();
  await expect(
    page.getByTestId('site-footer').getByText('ASii Medical Solutions llc')
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Facebook' })).toHaveAttribute(
    'href',
    'https://www.facebook.com/ASIIMedical/'
  );
  await expect(page.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute(
    'href',
    'https://www.linkedin.com/company/asii-medical-solutions-llc/'
  );
});
