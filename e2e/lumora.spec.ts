import { existsSync, readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

/** The dev test account, from the environment or the local secret file. */
function account() {
  if (process.env.E2E_EMAIL && process.env.E2E_PASSWORD) return { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD };
  if (!existsSync(".dev-test-account.secret")) return null;
  const vars = Object.fromEntries(readFileSync(".dev-test-account.secret", "utf8").split(/\r?\n/).filter(Boolean).map((l) => l.split("=", 2) as [string, string]));
  return vars.email && vars.password ? { email: vars.email, password: vars.password } : null;
}

async function signIn(page: Page) {
  const acc = account();
  test.skip(!acc, "No test account configured");
  await page.goto("/accedi");
  await page.getByLabel("Email").fill(acc!.email);
  await page.getByLabel("Password", { exact: true }).fill(acc!.password);
  await page.getByLabel("Password", { exact: true }).press("Enter");
  await expect(page).toHaveURL(/\/dashboard/);
}

const outline = (theme: string) =>
  `/nuova?d=${encodeURIComponent(`Il riciclo|${theme}|copertina=Il riciclo;processo=Dal bidone alla nuova vita;numeri=I numeri;confronto=Plastica e vetro;chiusura=Grazie|eco`)}`;

test("Zib's preview shows every page, in a theme with its own art direction", async ({ page }) => {
  await page.goto(outline("tramonto"));
  await expect(page.getByRole("heading", { name: "Il riciclo", level: 1 })).toBeVisible();
  await expect(page.getByText("5 pagine nel tema Tramonto")).toBeVisible();
  await expect(page.locator("ol > li")).toHaveCount(5);
  // Nothing spills sideways on a phone.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("a malformed outline never reaches the page", async ({ page }) => {
  await page.goto("/nuova?d=Titolo|tema-finto|copertina=A");
  await expect(page).toHaveURL(/\/$/);
});

test("new presentation from a topic, then re-layout, background texture and handout", async ({ page }) => {
  await signIn(page);
  await page.getByRole("button", { name: "Nuova presentazione" }).click();
  await page.getByLabel("Di cosa parla la presentazione?").fill("il ciclo dell'acqua");
  await expect(page.getByText(/pagine nel tema Oceano/)).toBeVisible();
  await page.getByRole("button", { name: "Crea presentazione" }).click();
  await expect(page).toHaveURL(/\/editor\//, { timeout: 60_000 });

  // A page with a layout can be redrawn with another one that fits the same words.
  await page.getByRole("button", { name: /^3\./ }).click();
  const relayout = page.getByRole("button", { name: /Cambia impaginazione/ });
  await expect(relayout).toBeVisible();
  await relayout.click();
  await page.getByLabel("Motivo di sfondo").selectOption("dots");
  await expect(page.getByText("Salvato")).toBeVisible({ timeout: 20_000 });

  // The handout lists the pages with their text.
  const id = page.url().split("/editor/")[1];
  await page.goto(`/editor/${id}/dispensa`);
  await expect(page.getByText("Dispensa", { exact: true })).toBeVisible();
  await expect(page.locator("section")).not.toHaveCount(0);
});

test("free photos from Wikimedia Commons, credited on a last page", async ({ page }) => {
  await signIn(page);
  await page.getByRole("button", { name: "Nuova presentazione" }).click();
  await page.getByRole("tab", { name: "Da un modello" }).click();
  await page.getByRole("button", { name: "Crea presentazione" }).click();
  await expect(page).toHaveURL(/\/editor\//);
  await page.getByRole("button", { name: "Foto gratis" }).click();
  await page.getByLabel("Cosa cerchi").fill("balena");
  await page.getByRole("button", { name: "Cerca", exact: true }).click();
  const first = page.getByRole("dialog").getByRole("listitem").first().getByRole("button");
  await expect(first).toBeVisible({ timeout: 30_000 });
  await first.click();
  await expect(page.getByRole("button", { name: /Crediti foto/ })).toBeVisible();
});
