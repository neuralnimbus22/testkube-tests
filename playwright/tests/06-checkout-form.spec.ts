import { test, expect } from '@playwright/test';

// Base URL is configurable — defaults to local port-forward when not set.
// In Testkube workflows, BASE_URL gets injected to point at cluster DNS.
const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

test.describe('Online Boutique Checkout Form', () => {

  test('checkout form accepts valid input and proceeds', async ({ page }) => {
    // Self-contained setup: put an item in the cart so the checkout form is rendered
    await page.goto(BASE_URL);
    await page.locator('.hot-product-card').first().locator('a').click();
    await expect(page).toHaveURL(/\/product\/[A-Z0-9]+/);
    await page.getByRole('button', { name: 'Add To Cart' }).click();
    await expect(page).toHaveURL(/\/cart$/);

    // The cart page renders the shipping + payment form alongside the cart summary.
    // Verify the form is visible before we touch any inputs.
    const checkoutForm = page.locator('form.cart-checkout-form');
    await expect(checkoutForm).toBeVisible();

    // Overwrite the pre-filled values with our own valid inputs to prove
    // the form accepts user-supplied data (not just the server defaults).
    await page.locator('#email').fill('playwright@example.com');
    await page.locator('#street_address').fill('1 Test Lane');
    await page.locator('#zip_code').fill('94043');
    await page.locator('#city').fill('Mountain View');
    await page.locator('#state').fill('CA');
    await page.locator('#country').fill('United States');
    await page.locator('#credit_card_number').fill('4432801561520454');
    await page.locator('#credit_card_expiration_month').selectOption('6');
    await page.locator('#credit_card_expiration_year').selectOption('2029');
    await page.locator('#credit_card_cvv').fill('672');

    // Submit the form by clicking Place Order
    // (checkoutservice has to accept the order for navigation to proceed)
    await page.getByRole('button', { name: 'Place Order' }).click();

    // The form action is /cart/checkout — verify we leave the cart page
    await expect(page).not.toHaveURL(/\/cart$/);

    // And the order confirmation main element is rendered
    await expect(page.locator('main.order')).toBeVisible();

    // Take a screenshot for the test report
    await page.screenshot({ path: 'screenshots/06-checkout-form.png', fullPage: true });
  });

});
