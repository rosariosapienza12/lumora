import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end checks in a real browser, on a computer and on a phone.
 * Run with `npm run e2e` (it starts `npm run dev` if nothing is listening on 3000).
 * The signed-in tests use the dev test account: E2E_EMAIL and E2E_PASSWORD,
 * or the local, git-ignored .dev-test-account.secret file.
 */
export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure" },
  projects: [
    { name: "computer", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "telefono", use: { ...devices["Pixel 7"] } },
  ],
  webServer: { command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: true, timeout: 180_000 },
});
