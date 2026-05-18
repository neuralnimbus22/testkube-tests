import { test, expect } from '@playwright/test';

// Base URL is configurable — defaults to local port-forward when not set.
// In Testkube workflows, BASE_URL gets injected to point at cluster DNS.
const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test.describe('Online Boutique Product Detail', () => {

  test('product detail page loads when clicking a product', async ({ page }) => {
    // Start from the storefront so the test is fully self-contained
    await page.goto(BASE_URL);

    // Grab the name of the first product card so we can assert on it after navigation
    const firstCard = page.locator('.hot-product-card').first();
    await expect(firstCard).toBeVisible();
    const productName = (await firstCard.locator('.hot-product-card-name').innerText()).trim();

    // Click the first product's image link to navigate to the detail page
    // (productcatalogservice has to respond for the detail page to render)
    await firstCard.locator('a').click();

    // URL should now be the product detail route
    await expect(page).toHaveURL(/\/product\/[A-Z0-9]+/);

    // Verify the product name heading is rendered
    await expect(page.getByRole('heading', { name: productName })).toBeVisible();

    // Verify the Add To Cart button is present on the detail page
    await expect(page.getByRole('button', { name: 'Add To Cart' })).toBeVisible();

    // Take a screenshot for the test report
    await page.screenshot({ path: 'screenshots/02-product-detail.png', fullPage: true });
  });

});
