import { test, expect } from '@playwright/test';

test.describe('Online Boutique Add To Cart', () => {

  test('add to cart updates cart count in header', async ({ page }, testInfo) => {
    // Land on the storefront and let everything settle
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Window-shop a product before committing to "the one"
    await page.locator('.hot-product-card').nth(1).locator('a').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: testInfo.outputPath('browse.png'), fullPage: true });

    // Head back to the storefront, then pick the first product to actually buy
    await page.locator('a.navbar-brand').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    await page.locator('.hot-product-card').first().locator('a').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await expect(page).toHaveURL(/\/product\/[A-Z0-9]+/);

    // Submit the add-to-cart form — cartservice has to respond for the badge to update
    await page.getByRole('button', { name: 'Add To Cart' }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await expect(page).toHaveURL(/\/cart$/);

    // The cart badge in the header should reflect a single item
    const cartBadge = page.locator('.cart-size-circle');
    await expect(cartBadge).toBeVisible();
    await expect(cartBadge).toHaveText('1');
    await page.screenshot({ path: testInfo.outputPath('cart-badge.png'), fullPage: true });
  });

});
