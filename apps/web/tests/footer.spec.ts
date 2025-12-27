import { test, expect } from '@playwright/test';

test('footer appears at bottom and links are correct', async ({ page }) => {
  await page.goto('/');
  const footer = page.getByTestId('site-footer');
  await expect(footer).not.toBeInViewport();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(footer).toBeInViewport();
  await expect(page.getByText('ASii Medical Solutions llc')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Overview' })).toHaveAttribute(
    'href',
    'https://www.linkedin.com/posts/asii-medical-solutions-llc_asiimedicalcom-let-us-know-how-we-can-activity-7271024271236206592-fAxI/?utm_source=share&utm_medium=member_android&rcm=ACoAAD2pSYQBQhP_Qtk7ozcYpeiLQY_kPWaSDOU'
  );
  await expect(page.getByRole('link', { name: 'Overview' })).toHaveAttribute('target', '_blank');
  await expect(page.getByRole('link', { name: 'Overview' })).toHaveAttribute('rel', /noopener/);
  await expect(page.getByRole('link', { name: 'Facebook' })).toHaveAttribute(
    'href',
    'https://www.facebook.com/ASIIMedical/'
  );
  await expect(page.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute(
    'href',
    'https://www.linkedin.com/company/asii-medical-solutions-llc/'
  );

  await page.getByRole('link', { name: 'About' }).click();
  await expect(page).toHaveURL(/\/about$/);
  await page.goto('/');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.getByRole('link', { name: 'Terms & Conditions' }).click();
  await expect(page).toHaveURL(/\/terms$/);
});
