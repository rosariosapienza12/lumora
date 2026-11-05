import { describe, expect, it } from "vitest";
import { CANVAS_H, CANVAS_W, documentSchema, MAX_DOC_BYTES } from "./schema";
import { buildTemplate, TEMPLATES } from "./templates";
import { buildLayout, LAYOUT_IDS } from "./layouts";
import { applyTheme, THEMES } from "./themes";

const valid = (doc: unknown) => {
  const parsed = documentSchema.safeParse(doc);
  return parsed.success ? "ok" : JSON.stringify(parsed.error.issues[0]);
};

describe("themes", () => {
  it.each(TEMPLATES.flatMap((t) => THEMES.map((th) => [t.id, th.id] as const)))("template %s in theme %s is a valid document", (template, theme) => {
    const doc = buildTemplate(template, "Prova", theme);
    expect(valid(doc)).toBe("ok");
    expect(doc.settings?.theme).toBe(theme);
    expect(JSON.stringify(doc).length).toBeLessThan(MAX_DOC_BYTES);
  });

  it.each(LAYOUT_IDS.flatMap((l) => THEMES.map((th) => [l, th] as const)))("layout %s works in every theme", (layout, theme) => {
    expect(valid({ version: 1, pages: [buildLayout(layout, theme)] })).toBe("ok");
  });

  it.each(LAYOUT_IDS)("layout %s keeps every text and button inside the page", (layout) => {
    for (const e of buildLayout(layout, THEMES[0]).elements) {
      if (e.type !== "text" && e.type !== "button") continue;
      expect([e.x >= 0, e.y >= 0, e.x + e.w <= CANVAS_W, e.y + e.h <= CANVAS_H], `${e.type} at ${e.x},${e.y}`).toEqual([true, true, true, true]);
    }
  });

  it("switching theme restyles pages and keeps the document valid", () => {
    const doc = buildTemplate("lezione", "Prova", "notte");
    const neon = applyTheme(doc, "neon");
    expect(valid(neon)).toBe("ok");
    expect(neon.settings?.theme).toBe("neon");
    expect(neon.pages[0].background).toBe(THEMES.find((t) => t.id === "neon")!.palette.coverBg);
    expect(neon.pages[0].color2).toBeDefined();
    // Interactions and structure are untouched.
    expect(neon.pages.map((p) => p.elements.length)).toEqual(doc.pages.map((p) => p.elements.length));
  });

  it.each(THEMES.flatMap((a) => THEMES.map((b) => [a.id, b.id] as const)))("from %s to %s, headings use the right role for their page", (a, b) => {
    const target = THEMES.find((t) => t.id === b)!;
    const doc = applyTheme({ version: 1, pages: [buildLayout("linea-tempo", THEMES.find((t) => t.id === a)!), buildLayout("copertina", THEMES.find((t) => t.id === a)!)], settings: { autoAdvance: 0, theme: a } }, b);
    const heading = (i: number) => doc.pages[i].elements.find((e) => e.type === "text" && e.weight === "800");
    expect(heading(0)).toMatchObject({ color: target.palette.title });
    expect(heading(1)).toMatchObject({ color: target.palette.coverTitle });
  });

  it("a colour picked by hand survives a theme change", () => {
    const doc = buildTemplate("vuota", "Prova", "notte");
    const custom = { ...doc, pages: [{ ...doc.pages[0], background: "#123456" }] };
    expect(applyTheme(custom, "oceano").pages[0].background).toBe("#123456");
  });

  it("switching back and forth returns to the original colours", () => {
    const doc = buildTemplate("pitch", "Prova", "aziendale");
    const round = applyTheme(applyTheme(doc, "pastello"), "aziendale");
    expect(round.pages.map((p) => p.background)).toEqual(doc.pages.map((p) => p.background));
  });
});

describe("every theme has its own design, not just its own colours", () => {
  /** The shape of a page without colours, fonts or ids: what kind of element is where. */
  const skeleton = (theme: (typeof THEMES)[number], layout: Parameters<typeof buildLayout>[0]) =>
    JSON.stringify(buildLayout(layout, theme).elements.map((e) => [e.type, e.type === "shape" ? e.shape : "", Math.round(e.x / 20), Math.round(e.y / 20), Math.round(e.w / 20), e.type === "text" ? e.align : ""]));

  it("no two themes share the same cover", () => {
    const covers = THEMES.map((t) => skeleton(t, "copertina"));
    expect(new Set(covers).size).toBe(THEMES.length);
  });

  it("each theme has a different signature drawing", () => {
    expect(new Set(THEMES.map((t) => t.signature)).size).toBe(THEMES.length);
  });

  it("art directions change the content pages too", () => {
    const kinds = new Map(THEMES.map((t) => [t.kind, t]));
    const pages = [...kinds.values()].map((t) => skeleton(t, "processo"));
    expect(new Set(pages).size).toBe(kinds.size);
  });
});
