import fs from "fs";
import { test, expect } from "@playwright/test";
import { ProfilePage } from "./pages/profile.page";

const hasUserState = fs.existsSync("tests/e2e/.auth/user.json");

if (hasUserState) {
  test.use({ storageState: "tests/e2e/.auth/user.json" });
}

test.describe("Authenticated user flows", () => {
  test.skip(
    !hasUserState,
    "User storage state not found. Run auth.setup first.",
  );

  test("profile shows user identity", async ({ page }) => {
    const profile = new ProfilePage(page);
    await profile.gotoProfile();

    const email = process.env.E2E_USER_EMAIL ?? "";
    if (email) {
      await profile.expectUserEmail(email);
    }
  });

  test("user is blocked from admin area", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).not.toHaveURL(/\/admin$/);
    await expect(page.getByTestId("admin-dashboard")).toHaveCount(0);
  });
});
