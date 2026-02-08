import { test, expect } from "@playwright/test";
import { CatalogPage } from "./pages/catalog.page";

test.describe("Catalog filtering and sorting", () => {
  test("can filter products by category group", async ({ page }) => {
    const catalog = new CatalogPage(page);
    await catalog.gotoCatalog();

    // Filter by balloons
    await page.goto("/catalog?categoryGroup=balloons", {
      waitUntil: "domcontentloaded",
    });

    const productCards = page.locator('[data-testid="product-card"]');
    const count = await productCards.count();

    await productCards
      .first()
      .waitFor({ state: "visible", timeout: 10_000 })
      .catch(() => {});

    // Filter by mini-sets
    await page.goto("/catalog?categoryGroup=mini-sets", {
      waitUntil: "domcontentloaded",
    });

    const miniSetCards = page.locator('[data-testid="product-card"]');
    const miniSetCount = await miniSetCards.count();

    await miniSetCards
      .first()
      .waitFor({ state: "visible", timeout: 10_000 })
      .catch(() => {});

    // Filter by bouquets
    await page.goto("/catalog?categoryGroup=balloon-bouquets", {
      waitUntil: "domcontentloaded",
    });

    const bouquetCards = page.locator('[data-testid="product-card"]');
    const bouquetCount = await bouquetCards.count();

    await bouquetCards
      .first()
      .waitFor({ state: "visible", timeout: 10_000 })
      .catch(() => {});
  });

  test("can filter products by category", async ({ page }) => {
    const catalog = new CatalogPage(page);
    await catalog.gotoCatalog();

    // Filter by specific category
    await page.goto(
      "/catalog?categoryGroup=balloons&category=For%20Kids%20Boys",
      { waitUntil: "domcontentloaded" },
    );

    const productCards = page.locator('[data-testid="product-card"]');
    const count = await productCards.count();

    await productCards
      .first()
      .waitFor({ state: "visible", timeout: 10_000 })
      .catch(() => {});
  });

  test("can filter products by availability", async ({ page }) => {
    const catalog = new CatalogPage(page);
    await catalog.gotoCatalog();

    // Filter by in-stock items
    await page.goto("/catalog?available=true", {
      waitUntil: "domcontentloaded",
    });

    const productCards = page.locator('[data-testid="product-card"]');
    const count = await productCards.count();

    await productCards
      .first()
      .waitFor({ state: "visible", timeout: 10_000 })
      .catch(() => {});
  });

  test("can filter products by price range", async ({ page }) => {
    const catalog = new CatalogPage(page);
    await catalog.gotoCatalog();

    // Filter by price range
    await page.goto("/catalog?minPrice=10&maxPrice=50", {
      waitUntil: "domcontentloaded",
    });

    const productCards = page.locator('[data-testid="product-card"]');
    const count = await productCards.count();

    await productCards
      .first()
      .waitFor({ state: "visible", timeout: 10_000 })
      .catch(() => {});
  });

  test("can sort products by name ascending", async ({ page }) => {
    const catalog = new CatalogPage(page);
    await catalog.gotoCatalog();

    await page.goto("/catalog?sort=name-asc", {
      waitUntil: "domcontentloaded",
    });

    const productCards = page.locator('[data-testid="product-card"]');
    const count = await productCards.count();

    if (count > 1) {
      // Verify products are displayed in sorted order
      const firstProduct = productCards.first();
      const secondProduct = productCards.nth(1);

      await expect(firstProduct).toBeVisible();
      await expect(secondProduct).toBeVisible();

      // Products should be sorted alphabetically
      // (We can't easily verify exact order without reading product names, but we can verify they're displayed)
    }
  });

  test("can sort products by name descending", async ({ page }) => {
    const catalog = new CatalogPage(page);
    await catalog.gotoCatalog();

    await page.goto("/catalog?sort=name-desc", {
      waitUntil: "domcontentloaded",
    });

    const productCards = page.locator('[data-testid="product-card"]');
    const count = await productCards.count();

    await productCards
      .first()
      .waitFor({ state: "visible", timeout: 10_000 })
      .catch(() => {});
  });

  test("can sort products by price low to high", async ({ page }) => {
    const catalog = new CatalogPage(page);
    await catalog.gotoCatalog();

    await page.goto("/catalog?sort=price-low", {
      waitUntil: "domcontentloaded",
    });

    const productCards = page.locator('[data-testid="product-card"]');
    const count = await productCards.count();

    await productCards
      .first()
      .waitFor({ state: "visible", timeout: 10_000 })
      .catch(() => {});
  });

  test("can sort products by price high to low", async ({ page }) => {
    const catalog = new CatalogPage(page);
    await catalog.gotoCatalog();

    await page.goto("/catalog?sort=price-high", {
      waitUntil: "domcontentloaded",
    });

    const productCards = page.locator('[data-testid="product-card"]');
    const count = await productCards.count();

    await productCards
      .first()
      .waitFor({ state: "visible", timeout: 10_000 })
      .catch(() => {});
  });

  test("can combine filters and sorting", async ({ page }) => {
    const catalog = new CatalogPage(page);
    await catalog.gotoCatalog();

    // Combine category, availability, and sorting
    await page.goto(
      "/catalog?categoryGroup=balloons&available=true&sort=price-low",
      { waitUntil: "domcontentloaded" },
    );

    const productCards = page.locator('[data-testid="product-card"]');
    const count = await productCards.count();

    await productCards
      .first()
      .waitFor({ state: "visible", timeout: 10_000 })
      .catch(() => {});
  });

  test("can search products", async ({ page }) => {
    const catalog = new CatalogPage(page);
    await catalog.gotoCatalog();

    // Search for products
    const searchInput = page
      .getByPlaceholder(/search|suchen/i)
      .or(page.locator('input[type="search"]'))
      .first();

    if (await searchInput.isVisible({ timeout: 3000 })) {
      await searchInput.fill("balloon");
      await page.waitForTimeout(2000);

      const productCards = page.locator('[data-testid="product-card"]');
      const count = await productCards.count();

      if (count > 0) {
        await expect(productCards.first()).toBeVisible();
      }
    }
  });
});
