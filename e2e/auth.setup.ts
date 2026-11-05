import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { expect, test as setup } from "@playwright/test";

/** The dev test account, from the environment or the local, git-ignored secret file. */
function account() {
  if (process.env.E2E_EMAIL && process.env.E2E_PASSWORD) return { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD };
  if (!existsSync(".dev-test-account.secret")) return null;
  const vars = Object.fromEntries(readFileSync(".dev-test-account.secret", "utf8").split(/\r?\n/).filter(Boolean).map((l) => l.split("=", 2) as [string, string]));
  return vars.email && vars.password ? { email: vars.email, password: vars.password } : null;
}

setup("sign in once with the test account", async ({ page }) => {
  const acc = account();
  setup.skip(!acc, "No test account configured");
  await page.goto("/accedi");
  await page.getByLabel("Email").fill(acc!.email);
  await page.getByLabel("Password", { exact: true }).fill(acc!.password);
  await page.getByLabel("Password", { exact: true }).press("Enter");
  await expect(page).toHaveURL(/\/dashboard/);
  mkdirSync("e2e/.auth", { recursive: true });
  await page.context().storageState({ path: "e2e/.auth/session.json" });
});
