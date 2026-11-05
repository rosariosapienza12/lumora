import { describe, expect, it } from "vitest";
import { documentSchema, MAX_DOC_BYTES } from "./schema";
import { buildTemplate, TEMPLATES } from "./templates";
import { THEMES } from "./themes";
import { buildStarter, STARTERS, type StarterId } from "./starters";
import { safeNext } from "../validation";

describe("templates", () => {
  it("each template is designed for its own theme", () => {
    expect(new Set(TEMPLATES.map((t) => t.theme)).size).toBe(TEMPLATES.length);
    expect(new Set(TEMPLATES.map((t) => t.style)).size).toBe(TEMPLATES.length);
  });

  it.each(THEMES.map((t) => t.id))("start buttons never cover the words in theme %s", (theme) => {
    const overlap = (a: { x: number; y: number; w: number; h: number }, b: typeof a) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    for (const t of TEMPLATES) {
      for (const page of buildTemplate(t.id, "Prova", theme).pages) {
        const words = page.elements.filter((e) => e.type === "text" && !e.decor);
        for (const b of page.elements.filter((e) => e.type === "button")) {
          for (const w of words) expect(overlap(b, w), `${t.id} / ${page.name}`).toBe(false);
          expect(b.y + b.h).toBeLessThanOrEqual(900);
        }
      }
    }
  });

  it("the quiz goes cover, round, question, round, question… end", () => {
    const { pages } = buildTemplate("quiz", "Prova");
    const next = (i: number) => {
      const b = pages[i].elements.at(-1);
      const a = b?.type === "button" ? b.interaction?.action : undefined;
      return a?.kind === "goto" ? pages.findIndex((p) => p.id === a.pageId) : -1;
    };
    expect([0, 1, 2, 3, 4, 5, 6].map(next)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it.each(TEMPLATES.map((t) => t.id))("%s builds a valid document", (id) => {
    const doc = buildTemplate(id, "Prova");
    const parsed = documentSchema.safeParse(doc);
    expect(parsed.success, JSON.stringify(parsed.error?.issues[0])).toBe(true);
    expect(JSON.stringify(doc).length).toBeLessThan(MAX_DOC_BYTES);
  });

  it("uses fresh ids every time", () => {
    expect(buildTemplate("quiz", "a").pages[0].id).not.toBe(buildTemplate("quiz", "a").pages[0].id);
  });
});

describe("feature starters", () => {
  it.each(Object.keys(STARTERS) as StarterId[])("%s builds a valid document", (id) => {
    const { doc } = buildStarter(id);
    const parsed = documentSchema.safeParse(doc);
    expect(parsed.success, JSON.stringify(parsed.error?.issues[0])).toBe(true);
  });

  it("the presenting idea ships with speaker notes", () => {
    expect(buildStarter("condividi").doc.pages.every((p) => p.notes)).toBe(true);
  });
});

describe("safeNext", () => {
  it("accepts only internal shortcut paths", () => {
    expect(safeNext("/crea/layout")).toBe("/crea/layout");
    for (const bad of ["https://evil.test", "//evil.test", "/crea/../admin", "/dashboard?x=1", "/crea/layout/x", "javascript:alert(1)", 42, null]) {
      expect(safeNext(bad), String(bad)).toBeNull();
    }
  });
});
