import { test, expect } from '@playwright/test';

test.describe('Online Boutique Navigation', () => {

  test('header and footer navigation links are present and reachable', async ({ page }) => {
    // Start from the storefront so the test is fully self-contained
    await page.goto('/');

    // The brand link in the header should point at the homepage
    const brandLink = page.locator('a.navbar-brand');
    await expect(brandLink).toBeVisible();
    await expect(brandLink).toHaveAttribute('href', '/');

    // The cart icon in the header should point at /cart
    const cartLink = page.locator('a.cart-link');
    await expect(cartLink).toBeVisible();
    await expect(cartLink).toHaveAttribute('href', '/cart');

    // The footer should be rendered and contain the demo disclaimer text
    const footer = page.locator('footer').first();
    await expect(footer).toBeVisible();
    await expect(footer).toContainText('demo purposes');

    // The footer's Source Code link should point at the public GoogleCloudPlatform repo
    const sourceLink = footer.getByRole('link', { name: 'Source Code' });
    await expect(sourceLink).toHaveAttribute(
      'href',
      'https://github.com/GoogleCloudPlatform/microservices-demo'
    );

    // Verify the cart link is reachable (no broken navigation) by clicking it
    // and confirming the cart page renders. The cart is empty for this test
    // (no add-to-cart was performed), so we expect the empty-cart heading.
    await cartLink.click();
    await expect(page).toHaveURL(/\/cart$/);
    await expect(
      page.getByRole('heading', { name: 'Your shopping cart is empty!' })
    ).toBeVisible();

    // And the brand link gets us back to the homepage
    await page.locator('a.navbar-brand').click();
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'Hot Products' })).toBeVisible();

    // Take a screenshot for the test report
    await page.screenshot({ path: 'screenshots/08-navigation.png', fullPage: true });
  });

});
