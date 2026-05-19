import { test, expect } from '@playwright/test';

test.describe('Online Boutique Product Detail', () => {

  test('product detail page loads when clicking a product', async ({ page }, testInfo) => {
    // Start at the storefront and let the catalog render
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Capture the first card's name so we can assert on it after navigation
    const firstCard = page.locator('.hot-product-card').first();
    await expect(firstCard).toBeVisible();
    const firstName = (await firstCard.locator('.hot-product-card-name').innerText()).trim();

    // Visit the first product's detail page
    await firstCard.locator('a').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/\/product\/[A-Z0-9]+/);
    await expect(page.getByRole('heading', { name: firstName })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('product-1.png'), fullPage: true });

    // Hop through a second product to exercise multiple catalog round-trips
    await page.locator('a.navbar-brand').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const secondCard = page.locator('.hot-product-card').nth(1);
    const secondName = (await secondCard.locator('.hot-product-card-name').innerText()).trim();
    await secondCard.locator('a').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await expect(page.getByRole('heading', { name: secondName })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('product-2.png'), fullPage: true });

    // The detail page should always expose the Add To Cart affordance
    await expect(page.getByRole('button', { name: 'Add To Cart' })).toBeVisible();
  });

});
