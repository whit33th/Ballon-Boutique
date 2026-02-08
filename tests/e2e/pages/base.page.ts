import { expect, type Page } from "@playwright/test";

export class BasePage {
  constructor(protected readonly page: Page) {}

  async goto(path: string = "/") {
    await this.page.goto(path, { waitUntil: "domcontentloaded" });
    await this.waitForHeader();
  }

  async waitForHeader() {
    await this.page
      .getByTestId("site-header")
      .waitFor({ state: "visible", timeout: 15_000 });
  }

  async openCart() {
    await this.page.getByTestId("nav-cart").click();
    await expect(this.page).toHaveURL(/\/cart/);
  }

  async openAuth() {
    await this.page.getByTestId("nav-auth").click();
    await expect(this.page).toHaveURL(/\/auth/);
  }
}
