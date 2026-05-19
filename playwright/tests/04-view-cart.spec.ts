import { test, expect } from '@playwright/test';

test.describe('Online Boutique View Cart', () => {

  test('view cart page shows the added items', async ({ page }, testInfo) => {
    // Open the storefront and let the grid finish loading
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Add the first two products to the cart one at a time so the assertion
    // reflects multiple round-trips through the cartservice, not just one.
    const ITEMS_TO_ADD = 2;
    const addedNames: string[] = [];

    for (let i = 0; i < ITEMS_TO_ADD; i++) {
      // Bounce back to the homepage between adds (the storefront redirects to
      // /cart after a successful POST, so we need to navigate fresh each loop).
      if (i > 0) {
        await page.locator('a.navbar-brand').click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1500);
      }

      const card = page.locator('.hot-product-card').nth(i);
      const name = (await card.locator('.hot-product-card-name').innerText()).trim();
      addedNames.push(name);

      await card.locator('a').click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);
      await page.getByRole('button', { name: 'Add To Cart' }).click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);
    }

    // Navigate explicitly to the cart and verify the heading reflects the count
    await page.goto('/cart');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await expect(page.getByRole('heading', { name: `Cart (${ITEMS_TO_ADD})` })).toBeVisible();

    // Every product we added should appear as its own row in the cart summary
    for (const name of addedNames) {
      await expect(
        page.locator('.cart-summary-item-row').filter({ hasText: name })
      ).toBeVisible();
    }

    // The cart total row should be rendered (shipping + currency round-trip)
    await expect(page.locator('.cart-summary-total-row')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('cart.png'), fullPage: true });
  });

});
