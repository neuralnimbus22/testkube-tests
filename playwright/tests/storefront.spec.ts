import { test, expect } from '@playwright/test';

// Base URL is configurable — defaults to local port-forward when not set.
// In Testkube workflows, BASE_URL gets injected to point at cluster DNS.
const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test.describe('Online Boutique Storefront', () => {

  test('homepage loads with key elements', async ({ page }) => {
    // Navigate to the storefront
    await page.goto(BASE_URL);

    // Verify browser tab title
    await expect(page).toHaveTitle(/Online Boutique/i);

    // Verify the "Hot Products" section heading is visible
    await expect(page.getByRole('heading', { name: 'Hot Products' })).toBeVisible();

    // Verify at least 3 products are visible on the homepage
    // (productcatalogservice has to respond for products to render)
    const productCards = page.locator('.hot-product-card');
    await expect(productCards.first()).toBeVisible();
    const count = await productCards.count();
    expect(count).toBeGreaterThanOrEqual(3);

    // Verify currency selector has USD selected as default
// (currencyservice has to respond for currencies to populate)
const currencyDropdown = page.locator('select').first();
await expect(currencyDropdown).toHaveValue('USD');

    // Take a screenshot for the test report
    await page.screenshot({ path: 'screenshots/homepage.png', fullPage: true });
  });

});