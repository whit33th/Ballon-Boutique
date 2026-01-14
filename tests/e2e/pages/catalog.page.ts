import { expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class CatalogPage extends BasePage {
  productCards = this.page.getByTestId("product-card");

  async gotoCatalog() {
    await this.page.goto("/catalog", { waitUntil: "networkidle" });
    await this.waitForHeader();
  }

  async openFirstProduct() {
    await expect(this.productCards.first()).toBeVisible({ timeout: 15_000 });

    // Get the href from the product card and navigate directly (more reliable than clicking)
    const firstCard = this.productCards.first();
    await firstCard.waitFor({ state: "visible", timeout: 5000 });

    const href = await firstCard.getAttribute("href");

    if (href) {
      // Navigate directly using href (works better in Firefox)
      await this.page.goto(href, { waitUntil: "networkidle", timeout: 30000 });
      await this.page.waitForLoadState("networkidle");
      await this.page.waitForTimeout(1000);
    } else {
      // Fallback: click the card
      await firstCard.scrollIntoViewIfNeeded();
      await this.page.waitForTimeout(500);
      await firstCard.click({ timeout: 15000, force: true });
      await this.page.waitForURL(/\/catalog\//, { timeout: 15000 });
    }
  }
}
