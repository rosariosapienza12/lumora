import { describe, expect, it } from "vitest";
import { buildSteps, morphMatches } from "./effects";
import { buildLayout } from "./layouts";
import { getTheme } from "./themes";
import { documentSchema } from "./schema";

const theme = getTheme("aurora");

describe("morph", () => {
  it("matches the same element on two pages and reports where it was", () => {
    const a = buildLayout("titolo-testo", theme, { heading: "Il ciclo dell'acqua", body: "Evaporazione e pioggia." });
    const b = structuredClone(a);
    b.id = "b";
    const title = b.elements.find((e) => e.type === "text" && e.text === "Il ciclo dell'acqua")!;
    const was = { x: title.x, y: title.y };
    title.x += 300;
    title.y += 200;
    const m = morphMatches(a, b);
    expect(m.get(title.id)).toMatchObject(was);
    // Elements that did not move are not animated.
    expect(m.size).toBe(1);
  });
});

describe("one at a time", () => {
  it("keeps the title always visible and reveals each point as a block, in reading order", () => {
    const page = buildLayout("tre-colonne", theme, { heading: "Tre idee", items: [{ title: "Uno", text: "a" }, { title: "Due", text: "b" }, { title: "Tre", text: "c" }] });
    const steps = buildSteps(page);
    const textOf = (id: string) => page.elements.find((e) => e.id === id && e.type === "text")?.type === "text" ? (page.elements.find((e) => e.id === id) as { text: string }).text : null;
    expect(steps[0].map(textOf)).toContain("Tre idee");
    const blocks = steps.slice(1).map((ids) => ids.map(textOf).filter(Boolean));
    expect(blocks.map((b) => b.find((t) => ["Uno", "Due", "Tre"].includes(t!)))).toEqual(["Uno", "Due", "Tre"]);
    // Every element is in exactly one step.
    expect(steps.flat().sort()).toEqual(page.elements.filter((e) => !e.hidden).map((e) => e.id).sort());
  });

  it("the build option and the morph transition are valid in a document", () => {
    const page = { ...buildLayout("elenco", theme), build: true, transition: "morph" as const };
    expect(documentSchema.safeParse({ version: 1, pages: [page] }).success).toBe(true);
  });
});
