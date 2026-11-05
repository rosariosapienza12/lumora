import { describe, expect, it } from "vitest";
import { initState, reducer, currentPage } from "./store";
import { buildLayout } from "@/lib/editor/layouts";
import { documentSchema, type PresentationDoc } from "@/lib/editor/schema";
import { getTheme } from "@/lib/editor/themes";

const words = { heading: "Il ciclo dell'acqua", items: [{ title: "Evaporazione", text: "Il sole scalda il mare." }, { title: "Condensazione", text: "Il vapore forma le nuvole." }, { title: "Precipitazione", text: "Piove." }] };
const docWith = (): PresentationDoc => ({ version: 1, pages: [buildLayout("processo", getTheme("oceano"), words)], settings: { autoAdvance: 0, theme: "oceano" } });
const texts = (doc: PresentationDoc) => JSON.stringify(doc.pages[0].elements.filter((e) => e.type === "text").map((e) => (e.type === "text" ? e.text : "")));

describe("editor actions", () => {
  it("Cambia impaginazione redraws the same words in another layout, and undo brings it back", () => {
    const s0 = initState(docWith());
    const s1 = reducer(s0, { type: "relayout" });
    expect(currentPage(s1).source?.layout).not.toBe("processo");
    expect(currentPage(s1).id).toBe(currentPage(s0).id);
    for (const w of ["Evaporazione", "Condensazione", "Precipitazione"]) expect(texts(s1.doc)).toContain(w);
    expect(documentSchema.safeParse(s1.doc).success).toBe(true);
    expect(currentPage(reducer(s1, { type: "undo" })).source?.layout).toBe("processo");
  });

  it("a main colour is replaced everywhere it is used", () => {
    const s0 = initState(docWith());
    const old = getTheme("oceano").palette.accent;
    const s1 = reducer(s0, { type: "main-color", role: "accent", color: "#aa00ff" });
    expect(JSON.stringify(s1.doc).toLowerCase()).not.toContain(old.toLowerCase());
    expect(s1.doc.settings?.colors?.accent).toBe("#aa00ff");
    // A second change starts from the colour picked before.
    const s2 = reducer(s1, { type: "main-color", role: "accent", color: "#00aa55" });
    expect(JSON.stringify(s2.doc)).not.toContain("#aa00ff\"");
  });

  it("background textures go on one page or all of them", () => {
    const doc = { ...docWith(), pages: [...docWith().pages, ...docWith().pages.map((p) => ({ ...p, id: "secondpage" }))] };
    const one = reducer(initState(doc), { type: "pattern", pattern: "dots" });
    expect(one.doc.pages.map((p) => p.pattern)).toEqual(["dots", doc.pages[1].pattern]);
    const all = reducer(initState(doc), { type: "pattern", pattern: "grid", all: true });
    expect(all.doc.pages.every((p) => p.pattern === "grid")).toBe(true);
  });

  it("decoration density changes how many decorations each page gets", () => {
    const withTopic = reducer(initState(docWith()), { type: "apply-motif", motif: "mare" });
    const none = reducer(withTopic, { type: "decor-density", density: 0 });
    const many = reducer(withTopic, { type: "decor-density", density: 3 });
    const count = (d: PresentationDoc) => d.pages[0].elements.filter((e) => e.decor).length;
    expect(count(none.doc)).toBe(0);
    expect(count(many.doc)).toBeGreaterThanOrEqual(count(withTopic.doc));
  });
});
