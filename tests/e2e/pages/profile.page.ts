import { expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class ProfilePage extends BasePage {
  async gotoProfile() {
    await this.page.goto("/profile");
    await expect(this.page.getByTestId("profile-page")).toBeVisible({
      timeout: 20_000,
    });
  }

  async expectUserEmail(email: string) {
    // Email might appear multiple times, use first() to avoid strict mode violation
    await expect(
      this.page.getByText(email, { exact: false }).first()
    ).toBeVisible({ timeout: 10_000 });
  }
}

