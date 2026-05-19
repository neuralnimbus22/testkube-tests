import { test, expect } from '@playwright/test';

test.describe('Online Boutique Homepage', () => {

  test('homepage loads and shows the Hot Products grid', async ({ page }, testInfo) => {
    // Open the storefront and let the front + product catalog finish painting
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Capture initial state
    await page.screenshot({ path: testInfo.outputPath('home-initial.png'), fullPage: true });

    // Verify the basics on the first load
    await expect(page).toHaveTitle(/Online Boutique/i);
    await expect(page.getByRole('heading', { name: 'Hot Products' })).toBeVisible();

    // Bounce into the first product to exercise the product catalog service
    const firstCard = page.locator('.hot-product-card').first();
    await firstCard.locator('a').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Take a look at the detail page, then return home
    await expect(page.getByRole('button', { name: 'Add To Cart' })).toBeVisible();
    await page.locator('a.navbar-brand').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Take a second pass through a different product so the test feels like a
    // real shopper browsing the storefront, not just one round-trip.
    await page.locator('.hot-product-card').nth(1).locator('a').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await expect(page.getByRole('button', { name: 'Add To Cart' })).toBeVisible();
    await page.locator('a.navbar-brand').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // The homepage should still show the full product grid after the round-trip
    const productCards = page.locator('.hot-product-card');
    await expect(productCards.first()).toBeVisible();
    const count = await productCards.count();
    expect(count).toBeGreaterThanOrEqual(3);

    // Final screenshot for the report
    await page.screenshot({ path: testInfo.outputPath('home-final.png'), fullPage: true });
  });

});
