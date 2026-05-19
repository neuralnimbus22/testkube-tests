import { test, expect, Page } from '@playwright/test';

/**
 * Fill an input one character at a time to mimic a real user typing.
 * Playwright's Locator.pressSequentially is the supported way to do this
 * (page.keyboard.type would target whatever has focus, which is fragile).
 */
async function slowFill(page: Page, selector: string, value: string): Promise<void> {
  const locator = page.locator(selector);
  await locator.click();
  await locator.fill('');
  await locator.pressSequentially(value, { delay: 30 });
}

test.describe('Online Boutique Checkout Form', () => {

  test('checkout form accepts valid input and proceeds', async ({ page }, testInfo) => {
    // Self-contained setup: open the homepage, browse a product, add to cart
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

    // Verify the checkout form is rendered before we start typing
    const checkoutForm = page.locator('form.cart-checkout-form');
    await expect(checkoutForm).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('form-empty.png'), fullPage: true });

    // Type each text field character-by-character to feel like a real shopper.
    // Dropdowns stay as direct selectOption — no point slow-typing those.
    await slowFill(page, '#email', 'playwright@example.com');
    await slowFill(page, '#street_address', '1 Test Lane');
    await slowFill(page, '#zip_code', '94043');
    await slowFill(page, '#city', 'Mountain View');
    await slowFill(page, '#state', 'CA');
    await slowFill(page, '#country', 'United States');
    await slowFill(page, '#credit_card_number', '4432801561520454');
    await page.locator('#credit_card_expiration_month').selectOption('6');
    await page.locator('#credit_card_expiration_year').selectOption('2029');
    await slowFill(page, '#credit_card_cvv', '672');

    await page.screenshot({ path: testInfo.outputPath('form-filled.png'), fullPage: true });

    // Submit and verify the form was accepted by the checkout service
    await page.getByRole('button', { name: 'Place Order' }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    await expect(page).not.toHaveURL(/\/cart$/);
    await expect(page.locator('main.order')).toBeVisible();
  });

});
