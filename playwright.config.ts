import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: "env.example" });
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });

const rawBaseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000/de";
// Normalize to origin to avoid subtle issues when baseURL contains a path (e.g. "/de").
const baseURL = new URL(rawBaseURL).origin;

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /.*\.spec\.ts/,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : 2,
  // failOnFlakyTests: !!process.env.CI,
  reporter: [
    ["line"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
    ["github"],
  ],
  use: {
    baseURL,
    trace: "on-first-retry",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    headless: true,
  },
  webServer: {
    command: "bun run start -- --hostname 0.0.0.0 --port 3000",
    url: baseURL,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
    stderr: "pipe",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium",
      dependencies: ["setup"],
      testIgnore: [/admin(-full)?\.spec\.ts/, /checkout\.spec\.ts/],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      dependencies: ["setup"],
      testIgnore: [/admin(-full)?\.spec\.ts/, /checkout\.spec\.ts/],
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      dependencies: ["setup"],
      testIgnore: [/admin(-full)?\.spec\.ts/, /checkout\.spec\.ts/],
      use: { ...devices["Desktop Safari"] },
    },
    // Mutating suites (admin CRUD, checkout/Stripe) are intentionally single-browser to avoid
    // cross-browser parallel runs racing on shared backend state.
    {
      name: "chromium-admin",
      dependencies: ["setup"],
      testMatch: /admin(-full)?\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium-checkout",
      dependencies: ["setup"],
      testMatch: /checkout\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
