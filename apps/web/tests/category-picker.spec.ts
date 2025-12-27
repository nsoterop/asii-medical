import { test, expect } from '@playwright/test';

test('category picker supports search and drilldown', async ({ page }) => {
  await page.route('**/api/catalog/search**', async (route) => {
    const url = new URL(route.request().url());
    const category = url.searchParams.getAll('categoryPathName').join(',');
    const hits =
      category && category.includes('Dental Merchandise>Anesthetics')
        ? [
            {
              skuItemId: 1,
              productId: 2001,
              productName: 'Topical Gel',
              productDescription: null,
              itemDescription: null,
              manufacturerName: 'Acme',
              manufacturerItemCode: null,
              ndcItemCode: null,
              nationalDrugCode: null,
              categoryPathName: 'Dental Merchandise>Anesthetics>Topicals',
              unitPrice: 12,
              availabilityRaw: 'In Stock',
              pkg: 'Box',
              imageUrl: null,
              isActive: true
            }
          ]
        : [];
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        hits,
        total: hits.length,
        page: 1,
        pageSize: 12,
        facets: {
          categoryPathName: {
            'Dental Merchandise>Anesthetics>Topicals': 3,
            'Dental Merchandise>Anesthetics>Injectables': 2,
            'Dental Merchandise>Infection Control': 5,
            'Medical Devices>Respiratory': 4,
            'Medical Devices>Monitoring': 2,
            'Medical Devices>Mobility': 1,
            'Medical Devices>Orthopedics': 1,
            'Personal Care>Skin Care': 2,
            'Personal Care>Oral Care': 3,
            'Personal Care>Hair Care': 1,
            'Personal Care>Bath': 1,
            'Personal Care>Accessories': 1
          },
          manufacturerName: {}
        }
      })
    });
  });
  await page.route('**/api/catalog/categories/tree**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          name: 'Dental Merchandise',
          path: 'Dental Merchandise',
          depth: 1,
          children: [
            {
              name: 'Anesthetics',
              path: 'Dental Merchandise>Anesthetics',
              depth: 2,
              children: [
                {
                  name: 'Topicals',
                  path: 'Dental Merchandise>Anesthetics>Topicals',
                  depth: 3,
                  children: []
                },
                {
                  name: 'Injectables',
                  path: 'Dental Merchandise>Anesthetics>Injectables',
                  depth: 3,
                  children: []
                }
              ]
            },
            {
              name: 'Infection Control',
              path: 'Dental Merchandise>Infection Control',
              depth: 2,
              children: []
            }
          ]
        },
        {
          name: 'Medical Devices',
          path: 'Medical Devices',
          depth: 1,
          children: [
            {
              name: 'Respiratory',
              path: 'Medical Devices>Respiratory',
              depth: 2,
              children: []
            },
            {
              name: 'Monitoring',
              path: 'Medical Devices>Monitoring',
              depth: 2,
              children: []
            },
            {
              name: 'Mobility',
              path: 'Medical Devices>Mobility',
              depth: 2,
              children: []
            },
            {
              name: 'Orthopedics',
              path: 'Medical Devices>Orthopedics',
              depth: 2,
              children: []
            }
          ]
        },
        {
          name: 'Personal Care',
          path: 'Personal Care',
          depth: 1,
          children: [
            {
              name: 'Skin Care',
              path: 'Personal Care>Skin Care',
              depth: 2,
              children: []
            },
            {
              name: 'Oral Care',
              path: 'Personal Care>Oral Care',
              depth: 2,
              children: []
            },
            {
              name: 'Hair Care',
              path: 'Personal Care>Hair Care',
              depth: 2,
              children: []
            },
            {
              name: 'Bath',
              path: 'Personal Care>Bath',
              depth: 2,
              children: []
            },
            {
              name: 'Accessories',
              path: 'Personal Care>Accessories',
              depth: 2,
              children: []
            }
          ]
        },
        { name: 'Supplies', path: 'Supplies', depth: 1, children: [] },
        { name: 'Equipment', path: 'Equipment', depth: 1, children: [] },
        { name: 'Lab', path: 'Lab', depth: 1, children: [] },
        { name: 'Diagnostics', path: 'Diagnostics', depth: 1, children: [] },
        { name: 'Sterilization', path: 'Sterilization', depth: 1, children: [] },
        { name: 'Consumables', path: 'Consumables', depth: 1, children: [] }
      ])
    });
  });

  await page.goto('/search?q=gel');
  await expect(page.locator('[data-testid="category-option"]')).toHaveCount(8);
  await expect(page.locator('[data-testid="category-view-more"]')).toBeVisible();
  await expect(page.locator('[data-testid="category-option"]').filter({ hasText: 'Anesthetics' })).toHaveCount(0);

  await page.locator('[data-testid="category-view-more"]').click();
  const modal = page.locator('[data-testid="category-modal"]');
  await expect(modal).toBeVisible();

  await modal.locator('[data-testid="category-search"]').fill('Topicals');
  const topicalsRow = modal.locator(
    '[data-category-path="Dental Merchandise>Anesthetics>Topicals"]'
  );
  await expect(topicalsRow).toBeVisible();
  await topicalsRow
    .locator(':scope > div')
    .first()
    .getByRole('checkbox')
    .click();
  await expect(page.locator('[data-testid="category-option"]').filter({ hasText: 'Topicals' })).toBeVisible();
  await expect(page).toHaveURL(
    /category=Dental\+Merchandise%3EAnesthetics%3ETopicals|category=Dental%20Merchandise%3EAnesthetics%3ETopicals/
  );
  await expect(page.getByText('Topical Gel')).toBeVisible();
  await modal.getByRole('button', { name: 'Done' }).click();
  await expect(modal).toHaveCount(0);
  const selectedSidebarRow = page
    .locator('[data-testid="category-option"]')
    .filter({ hasText: 'Topicals' })
    .first();
  await expect(selectedSidebarRow).toBeVisible();
  await expect(selectedSidebarRow).toContainText('Dental Merchandise');

  await page.locator('[data-testid="category-view-more"]').click();
  const modal2 = page.locator('[data-testid="category-modal"]');
  await expect(modal2.getByText('Dental Merchandise')).toBeVisible();
  const dentalRow = modal2.locator('[data-category-path="Dental Merchandise"]');
  const chevron = dentalRow.locator('[data-testid="category-tree-chevron"]').first();
  const anestheticsRow = modal2.locator('[data-category-path="Dental Merchandise>Anesthetics"]');
  const chevronClass = (await chevron.getAttribute('class')) || '';
  if (!chevronClass.includes('treeChevronExpanded')) {
    await dentalRow.locator(':scope > div').first().click();
  }
  await expect(anestheticsRow).toBeVisible();
  await expect(chevron).toHaveClass(/treeChevronExpanded/);

  await dentalRow.locator(':scope > div').first().click();
  await expect(anestheticsRow).toHaveCount(0);
  await expect(chevron).not.toHaveClass(/treeChevronExpanded/);
  await dentalRow.locator(':scope > div').first().click();
  await expect(anestheticsRow).toBeVisible();

  const anestheticsChevron = anestheticsRow
    .locator('[data-testid="category-tree-chevron"]')
    .first();
  const anestheticsChevronClass = (await anestheticsChevron.getAttribute('class')) || '';
  if (!anestheticsChevronClass.includes('treeChevronExpanded')) {
    await anestheticsRow.locator(':scope > div').first().click();
  }
  await expect(modal2.getByText('Topicals')).toBeVisible();

  await anestheticsRow
    .locator(':scope > div')
    .first()
    .getByRole('checkbox')
    .click();
  await expect(page).toHaveURL(
    /category=Dental\+Merchandise%3EAnesthetics|category=Dental%20Merchandise%3EAnesthetics/
  );
  await expect(page).toHaveURL(
    /category=Dental\+Merchandise%3EAnesthetics%3ETopicals|category=Dental%20Merchandise%3EAnesthetics%3ETopicals/
  );
  await expect(modal2.getByText('Topicals')).toBeVisible();

  const rowBox = await modal2
    .locator('[data-testid="category-tree-row"]')
    .first()
    .locator(':scope > div')
    .first()
    .boundingBox();
  expect(rowBox).not.toBeNull();
  expect(rowBox?.height ?? 0).toBeLessThan(48);
});
