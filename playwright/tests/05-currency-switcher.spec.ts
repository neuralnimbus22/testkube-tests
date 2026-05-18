import { test, expect } from '@playwright/test';

test.describe('Online Boutique Currency Switcher', () => {

  test('switching from USD to EUR updates displayed prices', async ({ page }) => {
    // Start from the storefront so the test is fully self-contained
    await page.goto('/');

    // The header currency dropdown is the first <select> on the page,
    // matching the pattern used by the existing storefront spec.
    const currencyDropdown = page.locator('select').first();
    await expect(currencyDropdown).toHaveValue('USD');

    // Prices on the homepage should be in USD ($) before switching
    const firstPrice = page.locator('.hot-product-card-price').first();
    await expect(firstPrice).toContainText('$');

    // Switching the dropdown auto-submits the currency form and reloads the page
    // (currencyservice has to respond for the new prices to render)
    await currencyDropdown.selectOption('EUR');

    // After the reload, the dropdown should reflect the new selection
    await expect(page.locator('select').first()).toHaveValue('EUR');

    // And prices on the homepage should now use the Euro symbol instead of the dollar sign
    const newFirstPrice = page.locator('.hot-product-card-price').first();
    await expect(newFirstPrice).toContainText('€');
    await expect(newFirstPrice).not.toContainText('$');

    // Take a screenshot for the test report
    await page.screenshot({ path: 'screenshots/05-currency-switcher.png', fullPage: true });
  });

});
