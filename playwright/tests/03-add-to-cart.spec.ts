import { test, expect } from '@playwright/test';

test.describe('Online Boutique Add To Cart', () => {

  test('add to cart updates cart count in header', async ({ page }) => {
    // Start from the storefront so the test is fully self-contained
    await page.goto('/');

    // Pick the first hot product and navigate to its detail page
    await page.locator('.hot-product-card').first().locator('a').click();
    await expect(page).toHaveURL(/\/product\/[A-Z0-9]+/);

    // Submit the add-to-cart form
    // (cartservice has to respond for the badge to update)
    await page.getByRole('button', { name: 'Add To Cart' }).click();

    // The frontend redirects to /cart after a successful add
    await expect(page).toHaveURL(/\/cart$/);

    // Verify the cart-size badge in the header reads "1"
    const cartBadge = page.locator('.cart-size-circle');
    await expect(cartBadge).toBeVisible();
    await expect(cartBadge).toHaveText('1');

    // Take a screenshot for the test report
    await page.screenshot({ path: 'screenshots/03-add-to-cart.png', fullPage: true });
  });

});
