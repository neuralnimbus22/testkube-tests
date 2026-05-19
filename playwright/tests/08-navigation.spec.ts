import { test, expect } from '@playwright/test';

test.describe('Online Boutique Navigation', () => {

  test('header and footer navigation links are present and reachable', async ({ page }, testInfo) => {
    // Open the storefront and let everything render
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // The brand link in the header should target the homepage
    const brandLink = page.locator('a.navbar-brand');
    await expect(brandLink).toBeVisible();
    await expect(brandLink).toHaveAttribute('href', '/');

    // The cart icon should target /cart
    const cartLink = page.locator('a.cart-link');
    await expect(cartLink).toBeVisible();
    await expect(cartLink).toHaveAttribute('href', '/cart');

    // The footer should be present with the demo disclaimer and source-code link
    const footer = page.locator('footer').first();
    await expect(footer).toBeVisible();
    await expect(footer).toContainText('demo purposes');
    const sourceLink = footer.getByRole('link', { name: 'Source Code' });
    await expect(sourceLink).toHaveAttribute(
      'href',
      'https://github.com/GoogleCloudPlatform/microservices-demo'
    );
    await page.screenshot({ path: testInfo.outputPath('home.png'), fullPage: true });

    // Tour: home → product → home → cart → home, verifying each hop is reachable
    await page.locator('.hot-product-card').first().locator('a').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await expect(page).toHaveURL(/\/product\/[A-Z0-9]+/);
    await page.screenshot({ path: testInfo.outputPath('product.png'), fullPage: true });

    await page.locator('a.navbar-brand').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await expect(page).toHaveURL('/');

    await page.locator('a.cart-link').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await expect(page).toHaveURL(/\/cart$/);
    // Cart is empty in this test — no add-to-cart was performed
    await expect(
      page.getByRole('heading', { name: 'Your shopping cart is empty!' })
    ).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('cart-empty.png'), fullPage: true });

    await page.locator('a.navbar-brand').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'Hot Products' })).toBeVisible();
  });

});
