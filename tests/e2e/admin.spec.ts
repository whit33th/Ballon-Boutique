import fs from "fs";
import { test, expect } from "@playwright/test";
import { AdminPage } from "./pages/admin.page";

const hasAdminState = fs.existsSync("tests/e2e/.auth/admin.json");

if (hasAdminState) {
  test.use({ storageState: "tests/e2e/.auth/admin.json" });
}

test.describe("Admin access", () => {
  test.skip(
    !hasAdminState,
    "Admin storage state not found. Provide E2E_ADMIN_* creds.",
  );

  test("admin dashboard is accessible", async ({ page }) => {
    const admin = new AdminPage(page);
    await admin.gotoAdmin();

    // Verify admin dashboard is visible
    await expect(page.getByTestId("admin-dashboard")).toBeVisible({
      timeout: 15_000,
    });

    // Admin page should have tabs (products, orders, payments, insights)
    // Check for at least one tab to confirm admin page is loaded
    const hasTabs = await page
      .getByRole("tablist")
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    const hasProductsTab = await page
      .getByRole("tab", { name: /products|produkte/i })
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    const hasOrdersTab = await page
      .getByRole("tab", { name: /orders|bestellungen/i })
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    // At least one admin tab should be visible
    expect(hasTabs || hasProductsTab || hasOrdersTab).toBeTruthy();
  });
});
