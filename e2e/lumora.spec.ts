import { existsSync, readFileSync } from "node:fs";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const SESSION = "e2e/.auth/session.json";

/** Uses the session saved by auth.setup.ts; skips when no test account is configured. */
async function signIn(page: Page) {
  test.skip(!existsSync(SESSION), "No test account configured");
  const state = JSON.parse(readFileSync(SESSION, "utf8")) as { cookies: Parameters<BrowserContext["addCookies"]>[0] };
  await page.context().addCookies(state.cookies);
  await page.goto("/dashboard");
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
  await expect(page.getByText(/pagine nel tema Marea/)).toBeVisible();
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

test("Zib's preview with photos opens (the credits page is not in the outline)", async ({ page }) => {
  const outline = "Colosseo|aurora|foto-piena=Colosseo;immagine-testo=Che cos'è;chiusura=Grazie!|foto=Colosseo";
  const res = await page.goto(`/nuova?d=${encodeURIComponent(outline)}`);
  expect(res?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Colosseo" })).toBeVisible();
});

test("a template with a topic is titled with the topic", async ({ page }) => {
  await signIn(page);
  await page.getByRole("button", { name: "Nuova presentazione" }).click();
  await page.getByRole("tab", { name: "Da un modello" }).click();
  await page.getByLabel(/Argomento/).fill("Le Alpi");
  await page.getByText("Pitch da keynote", { exact: true }).first().click();
  await page.getByRole("button", { name: "Crea presentazione" }).click();
  await expect(page).toHaveURL(/\/editor\//, { timeout: 60_000 });
  await expect(page.getByLabel("Titolo della presentazione")).toHaveValue("Le Alpi");
});
