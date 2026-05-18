import { test, expect } from '@playwright/test';

test.describe('Online Boutique Homepage', () => {

  test('homepage loads and shows the Hot Products grid', async ({ page }) => {
    // Navigate to the storefront (baseURL comes from playwright.config.ts)
    await page.goto('/');

    // Verify browser tab title
    await expect(page).toHaveTitle(/Online Boutique/i);

    // Verify the "Hot Products" section heading is visible
    // (productcatalogservice has to respond for this section to render)
    await expect(page.getByRole('heading', { name: 'Hot Products' })).toBeVisible();

    // Verify at least 3 product cards are visible on the homepage
    const productCards = page.locator('.hot-product-card');
    await expect(productCards.first()).toBeVisible();
    const count = await productCards.count();
    expect(count).toBeGreaterThanOrEqual(3);

    // Take a screenshot for the test report
    await page.screenshot({ path: 'screenshots/01-homepage.png', fullPage: true });
  });

});
