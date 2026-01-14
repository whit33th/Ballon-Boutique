import { expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class CartPage extends BasePage {
  async gotoCart() {
    await this.page.goto("/cart", { waitUntil: "networkidle", timeout: 30000 });
    await this.page.waitForLoadState("networkidle");
    await this.page.waitForTimeout(2000);
    
    // Cart page might be empty or loading, wait for cart-page testid or empty cart message
    // Wait for either cart-page testid or empty cart heading
    try {
      await expect(this.page.getByTestId("cart-page")).toBeVisible({ timeout: 10_000 });
    } catch {
      // Fallback: wait for empty cart heading (Ihr Warenkorb ist leer)
      await expect(
        this.page.getByRole("heading").filter({ hasText: /warenkorb|cart|empty|leer/i })
      ).toBeVisible({ timeout: 10_000 });
    }
  }

  async getItemsCount() {
    return this.page.getByTestId("cart-item").count();
  }

  async assertTotalsPositive() {
    const totalText = await this.page.getByTestId("cart-total").innerText();
    const numeric = Number(totalText.replace(/[€,$]/g, "").trim());
    expect.soft(Number.isFinite(numeric)).toBeTruthy();
    expect(numeric).toBeGreaterThan(0);
  }

  async incrementFirstItem() {
    const incrementButton = this.page.getByTestId("cart-increment").first();
    if (await incrementButton.isVisible()) {
      await incrementButton.click();
    }
  }

  async proceedToCheckout() {
    await this.page.getByTestId("cart-checkout").click();
    await expect(this.page).toHaveURL(/checkout/);
  }
}

