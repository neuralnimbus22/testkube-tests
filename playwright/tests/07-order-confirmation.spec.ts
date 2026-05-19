import { test, expect, Page } from '@playwright/test';

/**
 * Fill an input one character at a time to mimic a real user typing.
 */
async function slowFill(page: Page, selector: string, value: string): Promise<void> {
  const locator = page.locator(selector);
  await locator.click();
  await locator.fill('');
  await locator.pressSequentially(value, { delay: 30 });
}

test.describe('Online Boutique Order Confirmation', () => {

  test('order confirmation page appears after completing checkout', async ({ page }, testInfo) => {
    // Self-contained setup: browse, pick a product, add to cart
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    await page.locator('.hot-product-card').first().locator('a').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await expect(page).toHaveURL(/\/product\/[A-Z0-9]+/);

    await page.getByRole('button', { name: 'Add To Cart' }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await expect(page).toHaveURL(/\/cart$/);
    await page.screenshot({ path: testInfo.outputPath('cart-before-checkout.png'), fullPage: true });

    // Type the shipping + payment info with realistic typing delays so the
    // checkout span shows the user "filling out a form" rather than warping
    // through it instantly.
    await slowFill(page, '#email', 'demo-buyer@example.com');
    await slowFill(page, '#street_address', '500 Demo Street');
    await slowFill(page, '#zip_code', '94043');
    await slowFill(page, '#city', 'Mountain View');
    await slowFill(page, '#state', 'CA');
    await slowFill(page, '#country', 'United States');
    await slowFill(page, '#credit_card_number', '4432801561520454');
    await slowFill(page, '#credit_card_cvv', '672');

    // Place the order — this drives checkoutservice + paymentservice + shippingservice
    await page.getByRole('button', { name: 'Place Order' }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Verify the confirmation page rendered with the headline + identifiers
    await expect(page.getByRole('heading', { name: 'Your order is complete!' })).toBeVisible();
    await expect(page.getByText('Confirmation #')).toBeVisible();
    await expect(page.getByText('Tracking #')).toBeVisible();
    await expect(page.getByText('Total Paid')).toBeVisible();

    // After successful checkout the cart should be empty (badge gone)
    await expect(page.locator('.cart-size-circle')).toHaveCount(0);

    await page.screenshot({ path: testInfo.outputPath('confirmation.png'), fullPage: true });
  });

});
