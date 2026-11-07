import { describe, expect, it } from "vitest";
import { decorationLayers, DECORATIONS } from "./decorations";
import { buildLayout } from "./layouts";
import { applyTheme, getTheme } from "./themes";
import { documentSchema } from "./schema";

describe("decorations", () => {
  it("every style but none draws background layers, never elements", () => {
    for (const d of DECORATIONS) {
      const css = decorationLayers(d, "#5b3df5", "#ffb547");
      expect(css === "").toBe(d === "nessuna");
    }
  });

  it("content pages wear the theme's decoration, covers keep their composition", () => {
    const t = getTheme("aurora");
    expect(buildLayout("elenco", t).decoration).toMatchObject({ style: "sfumature", color: t.palette.accent });
    expect(buildLayout("copertina", t).decoration).toBeUndefined();
  });

  it("a theme change moves the decoration to the new theme's style and colours", () => {
    const doc = { version: 1 as const, pages: [buildLayout("elenco", getTheme("aurora"))], settings: { autoAdvance: 0, theme: "aurora" as const } };
    const next = applyTheme(doc, "marea");
    expect(next.pages[0].decoration).toMatchObject({ style: "onda", color: getTheme("marea").palette.accent });
    expect(documentSchema.safeParse(next).success).toBe(true);
    expect(applyTheme(doc, "grafite").pages[0].decoration).toBeUndefined();
  });
});
