import { expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class HomePage extends BasePage {
  async gotoHome() {
    await this.goto("/");
  }

  async assertHeroVisible() {
    await expect(this.page.getByTestId("site-header")).toBeVisible();
  }

  async goToCatalog() {
    await this.page.goto("/catalog");
    await expect(this.page.getByTestId("product-card")).toBeVisible();
  }
}

