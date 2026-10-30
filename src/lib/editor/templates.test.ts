import { describe, expect, it } from "vitest";
import { documentSchema, MAX_DOC_BYTES } from "./schema";
import { buildTemplate, TEMPLATES } from "./templates";
import { buildStarter, STARTERS, type StarterId } from "./starters";
import { safeNext } from "../validation";

describe("templates", () => {
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
