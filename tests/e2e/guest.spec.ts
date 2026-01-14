import { test, expect } from "@playwright/test";
import { CartPage } from "./pages/cart.page";
import { CatalogPage } from "./pages/catalog.page";
import { HomePage } from "./pages/home.page";
import { ProductPage } from "./pages/product.page";

test.describe("Guest critical flows", () => {
  test("can browse catalog and open product", async ({ page }) => {
    const home = new HomePage(page);
    await home.gotoHome();
    await home.assertHeroVisible();

    const catalog = new CatalogPage(page);
    await catalog.gotoCatalog();
    await catalog.openFirstProduct();

    await expect(page).toHaveURL(/\/[a-z]{2}\/catalog\//);
  });

  test("can add products with different parameters to cart", async ({
    page,
  }) => {
    const catalog = new CatalogPage(page);
    await catalog.gotoCatalog();

    // Test 1: Product with size (mini-sets)
    await catalog.gotoCatalog();
    await page.goto("/catalog?categoryGroup=mini-sets", {
      waitUntil: "networkidle",
    });
    await page.waitForTimeout(1000);

    const productCards = page.locator('[data-testid="product-card"]');
    const count = await productCards.count();
    if (count > 0) {
      // Get href and navigate directly (more reliable, especially for Firefox)
      const firstCard = productCards.first();
      await firstCard.waitFor({ state: "visible", timeout: 5000 });
      const href = await firstCard.getAttribute("href");

      if (href) {
        await page.goto(href, { waitUntil: "networkidle", timeout: 30000 });
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(1000);
      } else {
        await firstCard.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        await firstCard.click({ timeout: 15000, force: true });
        await page.waitForURL(/\/catalog\//, { timeout: 10000 });
      }

      const product = new ProductPage(page);
      await product.fillRequiredPersonalization();
      await product.addToCart();

      await page.waitForTimeout(2500);
      const cart = new CartPage(page);
      await cart.gotoCart();
      const items1 = await cart.getItemsCount();
      expect(items1).toBeGreaterThan(0);
    }

    // Test 2: Product with required number
    await catalog.gotoCatalog();
    await page.waitForTimeout(1000);

    const cards = page.locator('[data-testid="product-card"]');
    const cardCount = await cards.count();
    if (cardCount > 1) {
      await cards.nth(1).click();
      await page.waitForURL(/\/catalog\//, { timeout: 10000 });

      const product2 = new ProductPage(page);
      await product2.fillRequiredPersonalization();
      await product2.addToCart();

      await page.waitForTimeout(2500);
      const cart2 = new CartPage(page);
      await cart2.gotoCart();
      const items2 = await cart2.getItemsCount();
      expect(items2).toBeGreaterThan(0);
    }

    // Test 3: Product with colors (balloons or bouquets)
    await catalog.gotoCatalog();
    await page.goto("/catalog?categoryGroup=balloons", {
      waitUntil: "networkidle",
    });
    await page.waitForTimeout(1000);

    const balloonCards = page.locator('[data-testid="product-card"]');
    const balloonCount = await balloonCards.count();
    if (balloonCount > 0) {
      // Get href and navigate directly (more reliable, especially for Firefox)
      const firstCard = balloonCards.first();
      await firstCard.waitFor({ state: "visible", timeout: 5000 });
      const href = await firstCard.getAttribute("href");

      if (href) {
        await page.goto(href, { waitUntil: "networkidle", timeout: 30000 });
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(1000);
      } else {
        await firstCard.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        await firstCard.click({ timeout: 15000, force: true });
        await page.waitForURL(/\/catalog\//, { timeout: 10000 });
      }

      const product3 = new ProductPage(page);
      await product3.fillRequiredPersonalization();
      await product3.addToCart();

      await page.waitForTimeout(2500);
      const cart3 = new CartPage(page);
      await cart3.gotoCart();
      const items3 = await cart3.getItemsCount();
      expect(items3).toBeGreaterThan(0);
    }
  });

});
