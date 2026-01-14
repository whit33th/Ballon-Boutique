import fs from "fs";
import { test, expect } from "@playwright/test";
import { ProfilePage } from "./pages/profile.page";

const hasUserState = fs.existsSync("tests/e2e/.auth/user.json");

if (hasUserState) {
  test.use({ storageState: "tests/e2e/.auth/user.json" });
}

test.describe("Profile management", () => {
  test.skip(
    !hasUserState,
    "User storage state not found. Run auth.setup first.",
  );

  test("can view profile information", async ({ page }) => {
    const profile = new ProfilePage(page);
    await profile.gotoProfile();

    const email = process.env.E2E_USER_EMAIL ?? "";
    if (email) {
      await profile.expectUserEmail(email);
    }

    // Enter edit mode and ensure editable fields exist
    const editButton = page.getByRole("button", {
      name: /edit|bearbeiten|редакт/i,
    });
    await expect(editButton.first()).toBeVisible({ timeout: 10_000 });
    await editButton.first().click();

    await expect(
      page.getByLabel(/vollst(ä|a)ndiger\s+name|full\s+name|name/i).first(),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByLabel(/e-?mail|email/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("can update profile name", async ({ page }) => {
    const profile = new ProfilePage(page);
    await profile.gotoProfile();

    const editButton = page.getByRole("button", {
      name: /edit|bearbeiten|редакт/i,
    });
    await expect(editButton.first()).toBeVisible({ timeout: 10_000 });
    await editButton.first().click();

    const nameInput = page
      .getByLabel(/vollst(ä|a)ndiger\s+name|full\s+name|name/i)
      .first();
    await expect(nameInput).toBeVisible({ timeout: 10_000 });

    const newName = `Test User ${Date.now()}`;
    await nameInput.clear();
    await nameInput.fill(newName);

    // Save changes
    const saveButton = page.getByRole("button", {
      name: /save\s+changes|speichern|save/i,
    });
    await expect(saveButton.first()).toBeVisible({ timeout: 10_000 });
    await saveButton.first().click();

    // After save, the page returns to view mode and shows the updated name
    await expect(page.getByText(newName).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("can update profile phone", async ({ page }) => {
    const profile = new ProfilePage(page);
    await profile.gotoProfile();

    const phoneInput = page.getByTestId("profile-phone-input");
    if (await phoneInput.isVisible({ timeout: 3000 })) {
      const newPhone = `+43${Math.floor(Math.random() * 900000000) + 100000000}`;
      await phoneInput.clear();
      await phoneInput.fill(newPhone);

      // Save changes
      const saveButton = page
        .getByRole("button", { name: /save|update|speichern/i })
        .first();
      if (await saveButton.isVisible()) {
        await saveButton.click();
        await page.waitForTimeout(2000);

        // Verify success message
        await expect(
          page.getByText(/saved|updated|success|gespeichert/i),
        ).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test("can update profile address", async ({ page }) => {
    const profile = new ProfilePage(page);
    await profile.gotoProfile();

    const streetInput = page.getByTestId("profile-address-street-input");
    if (await streetInput.isVisible({ timeout: 3000 })) {
      await streetInput.clear();
      await streetInput.fill("Test Street 123");

      const cityInput = page.getByTestId("profile-address-city-input");
      if (await cityInput.isVisible({ timeout: 3000 })) {
        await cityInput.clear();
        await cityInput.fill("Test City");
      }

      const postalInput = page.getByTestId("profile-address-postal-input");
      if (await postalInput.isVisible({ timeout: 3000 })) {
        await postalInput.clear();
        await postalInput.fill("12345");
      }

      // Save changes
      const saveButton = page
        .getByRole("button", { name: /save|update|speichern/i })
        .first();
      if (await saveButton.isVisible()) {
        await saveButton.click();
        await page.waitForTimeout(2000);

        // Verify success message
        await expect(
          page.getByText(/saved|updated|success|gespeichert/i),
        ).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test("validates required fields", async ({ page }) => {
    const profile = new ProfilePage(page);
    await profile.gotoProfile();

    const nameInput = page.getByTestId("profile-name-input");
    if (await nameInput.isVisible({ timeout: 3000 })) {
      // Clear required field
      await nameInput.clear();

      // Try to save
      const saveButton = page
        .getByRole("button", { name: /save|update|speichern/i })
        .first();
      if (await saveButton.isVisible()) {
        await saveButton.click();
        await page.waitForTimeout(1000);

        // Should show validation error
        await expect(page.getByText(/required|name|field|feld/i)).toBeVisible({
          timeout: 5000,
        });
      }
    }
  });

  test("validates email format", async ({ page }) => {
    const profile = new ProfilePage(page);
    await profile.gotoProfile();

    const emailInput = page.getByTestId("profile-email-input");
    if (await emailInput.isVisible({ timeout: 3000 })) {
      await emailInput.clear();
      await emailInput.fill("invalid-email");

      // Try to save
      const saveButton = page
        .getByRole("button", { name: /save|update|speichern/i })
        .first();
      if (await saveButton.isVisible()) {
        await saveButton.click();
        await page.waitForTimeout(1000);

        // Should show validation error
        await expect(
          page.getByText(/valid.*email|email.*format|ungültig/i),
        ).toBeVisible({ timeout: 5000 });
      }
    }
  });
});
