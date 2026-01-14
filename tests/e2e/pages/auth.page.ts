import { expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class AuthPage extends BasePage {
  async signIn(email: string, password: string) {
    await this.page.goto("/auth");
    await this.page.getByTestId("auth-email").fill(email);
    await this.page.getByTestId("auth-password").fill(password);
    await this.page.getByTestId("auth-submit").click();
    await expect(this.page.getByTestId("user-nav-trigger")).toBeVisible({
      timeout: 15_000,
    });
  }
}

