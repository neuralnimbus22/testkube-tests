import { test, expect } from '@playwright/test';

// Base URL is configurable — defaults to local port-forward when not set.
// In Testkube workflows, BASE_URL gets injected to point at cluster DNS.
const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test.describe('Online Boutique Order Confirmation', () => {

  test('order confirmation page appears after completing checkout', async ({ page }) => {
    // Self-contained setup: drive the full happy path from homepage → confirmation
    await page.goto(BASE_URL);
    await page.locator('.hot-product-card').first().locator('a').click();
    await expect(page).toHaveURL(/\/product\/[A-Z0-9]+/);
    await page.getByRole('button', { name: 'Add To Cart' }).click();
    await expect(page).toHaveURL(/\/cart$/);

    // The checkout form on /cart is pre-filled with valid demo data,
    // so submitting it directly exercises the full checkout pipeline.
    // (checkoutservice + paymentservice + shippingservice + emailservice all respond)
    await page.getByRole('button', { name: 'Place Order' }).click();

    // Verify the confirmation heading is rendered
    await expect(page.getByRole('heading', { name: 'Your order is complete!' })).toBeVisible();

    // Verify the confirmation page shows a confirmation number and total paid
    await expect(page.getByText('Confirmation #')).toBeVisible();
    await expect(page.getByText('Tracking #')).toBeVisible();
    await expect(page.getByText('Total Paid')).toBeVisible();

    // Verify the cart-size badge in the header is gone (cart emptied after checkout)
    await expect(page.locator('.cart-size-circle')).toHaveCount(0);

    // Take a screenshot for the test report
    await page.screenshot({ path: 'screenshots/07-order-confirmation.png', fullPage: true });
  });

});
