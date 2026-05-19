import { test, expect } from '@playwright/test';

test.describe('Online Boutique Currency Switcher', () => {

  test('switching currency updates displayed prices', async ({ page }, testInfo) => {
    // Land on the storefront and let the grid + initial USD prices render
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verify the dropdown is parked on USD and prices reflect that
    const currencyDropdown = page.locator('select').first();
    await expect(currencyDropdown).toHaveValue('USD');
    await expect(page.locator('.hot-product-card-price').first()).toContainText('$');
    await page.screenshot({ path: testInfo.outputPath('prices-usd.png'), fullPage: true });

    // Walk through three currencies, asserting on the symbol each time.
    // Each switch posts to /setCurrency and reloads, so it's a real round-trip
    // through the currencyservice — not just a client-side relabel.
    const steps: Array<{ code: string; symbol: string; notSymbol: string }> = [
      { code: 'EUR', symbol: '€', notSymbol: '$' },
      { code: 'JPY', symbol: '¥', notSymbol: '€' },
      { code: 'GBP', symbol: '£', notSymbol: '¥' },
      { code: 'USD', symbol: '$', notSymbol: '£' },
    ];

    for (const step of steps) {
      await page.locator('select').first().selectOption(step.code);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      await expect(page.locator('select').first()).toHaveValue(step.code);
      const firstPrice = page.locator('.hot-product-card-price').first();
      await expect(firstPrice).toContainText(step.symbol);
      await expect(firstPrice).not.toContainText(step.notSymbol);

      await page.screenshot({
        path: testInfo.outputPath(`prices-${step.code.toLowerCase()}.png`),
        fullPage: true,
      });
    }
  });

});
