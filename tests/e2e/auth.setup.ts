import { test as setup } from "@playwright/test";
import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";
import { AuthPage } from "./pages/auth.page";

dotenv.config({ path: "env.example" });
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });

const authDir = path.join(process.cwd(), "tests/e2e/.auth");

const credentials = [
  {
    label: "user",
    email: process.env.E2E_USER_EMAIL,
    password: process.env.E2E_USER_PASSWORD,
    storagePath: path.join(authDir, "user.json"),
  },
  {
    label: "admin",
    email: process.env.E2E_ADMIN_EMAIL,
    password: process.env.E2E_ADMIN_PASSWORD,
    storagePath: path.join(authDir, "admin.json"),
  },
];

setup.beforeAll(async () => {
  await fs.mkdir(authDir, { recursive: true });
});

for (const cred of credentials) {
  const hasCreds = Boolean(cred.email && cred.password);

  setup.describe(`${cred.label} authentication`, () => {
    setup.skip(
      !hasCreds,
      `Skipping ${cred.label} auth state: missing credentials in env`,
    );

    setup(`${cred.label} storage state`, async ({ page }) => {
      const authPage = new AuthPage(page);
      await authPage.signIn(cred.email as string, cred.password as string);
      await page.context().storageState({ path: cred.storagePath });
    });
  });
}

