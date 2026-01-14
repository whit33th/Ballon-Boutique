import { expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class ProductPage extends BasePage {
  async selectOptionsIfNeeded() {
    await this.fillRequiredPersonalization();
  }

  async addToCart() {
    await this.selectOptionsIfNeeded();
    const addButton = this.page.getByTestId("add-to-cart");
    await expect(addButton).toBeEnabled();
    await expect(addButton).toBeVisible();
    
    await addButton.click();
    
    // Wait for toast notification (success message)
    // Toast appears in a sonner toast container
    await expect(
      this.page.locator('[data-sonner-toast]').or(
        this.page.getByText(/added|success|cart/i)
      )
    ).toBeVisible({ timeout: 5000 }).catch(() => {
      // If toast doesn't appear, wait a bit for cart to update
      return this.page.waitForTimeout(2000);
    });
    
    // Wait 2-3 seconds for cart to fully update before checking
    await this.page.waitForTimeout(2500);
  }

  async fillRequiredPersonalization() {
    // Fill size if needed
    const sizeSelect = this.page.locator('[data-testid="size-select"]').first();
    if (await sizeSelect.isVisible()) {
      const options = sizeSelect.locator("option:not([value=''])");
      const count = await options.count();
      if (count > 0) {
        const firstOptionValue = await options.first().getAttribute("value");
        if (firstOptionValue) {
          await sizeSelect.selectOption(firstOptionValue);
          await this.page.waitForTimeout(500);
        }
      }
    }

    // Fill color if required
    const colorOption = this.page.getByTestId("color-option").first();
    if (await colorOption.isVisible()) {
      await colorOption.click();
      await this.page.waitForTimeout(500);
    }

    // Fill required number if needed
    const numberInput = this.page.getByTestId("personalization-number");
    if (await numberInput.isVisible()) {
      const current = await numberInput.inputValue();
      if (!current || current.trim() === "") {
        await numberInput.fill("25");
        await this.page.waitForTimeout(300);
      }
    }

    // Fill optional text if available
    const textInput = this.page.getByTestId("personalization-text");
    if (await textInput.isVisible()) {
      const current = await textInput.inputValue();
      if (!current || current.trim() === "") {
        await textInput.fill("Test Text");
        await this.page.waitForTimeout(300);
      }
    }
  }
}

