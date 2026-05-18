import { test, expect } from '@playwright/test';

test.describe('Online Boutique View Cart', () => {

  test('view cart page shows the added item', async ({ page }) => {
    // Self-contained setup: open a product detail page and add the item
    await page.goto('/');
    const firstCard = page.locator('.hot-product-card').first();
    const productName = (await firstCard.locator('.hot-product-card-name').innerText()).trim();
    await firstCard.locator('a').click();
    await expect(page).toHaveURL(/\/product\/[A-Z0-9]+/);
    await page.getByRole('button', { name: 'Add To Cart' }).click();

    // The add-to-cart form posts to /cart, so we should land on the cart page
    await expect(page).toHaveURL(/\/cart$/);

    // Verify the cart heading reflects 1 item
    // (cartservice has to respond for the cart contents to render)
    await expect(page.getByRole('heading', { name: 'Cart (1)' })).toBeVisible();

    // Verify the added item appears in the cart summary by SKU + product name
    const itemRow = page.locator('.cart-summary-item-row').first();
    await expect(itemRow).toBeVisible();
    await expect(itemRow.getByRole('heading', { name: productName })).toBeVisible();

    // Verify the cart shows a Total row (shippingservice + currencyservice round-trip)
    await expect(page.locator('.cart-summary-total-row')).toBeVisible();

    // Take a screenshot for the test report
    await page.screenshot({ path: 'screenshots/04-view-cart.png', fullPage: true });
  });

});
