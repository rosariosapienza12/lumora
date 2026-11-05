import { describe, expect, it } from "vitest";
import { documentSchema, type PresentationDoc } from "../editor/schema";
import { buildLayout } from "../editor/layouts";
import { getTheme, THEMES } from "../editor/themes";
import { buildTemplate } from "../editor/templates";
import { FORMS_3D, MATERIALS_3D } from "./ids";
import { buildComposition, COMPOSITIONS } from "./compositions";
import { applyLook3D, lookOf, THEME_3D } from "./styles";
import { lightDir, rotation } from "./renderer";

const pal = { main: "vetro", second: "cromo", accent: "#5b3df5", accent2: "#ffb547" } as const;

describe("3D objects", () => {
  it("every theme has its own 3D look", () => {
    const looks = THEMES.map((t) => JSON.stringify(THEME_3D[t.id]));
    expect(new Set(looks).size).toBe(THEMES.length);
  });

  it.each(COMPOSITIONS.map((c) => c.id))("composition %s is a valid page", (id) => {
    const els = buildComposition(id, pal);
    expect(els.length).toBeGreaterThan(1);
    const doc: PresentationDoc = { version: 1, pages: [{ id: "p1", name: "P", background: "#ffffff", transition: "fade", elements: els }] };
    expect(documentSchema.safeParse(doc).success).toBe(true);
  });

  it("covers carry a 3D composition in the theme's materials", () => {
    for (const t of THEMES) {
      const objs = buildLayout("copertina", t).elements.filter((e) => e.type === "object3d");
      expect(objs).toHaveLength(3);
      expect(objs.every((o) => o.type === "object3d" && [THEME_3D[t.id].material, THEME_3D[t.id].second].includes(o.material))).toBe(true);
    }
  });

  it("a new look re-makes the objects and is remembered", () => {
    const doc = buildTemplate("pitch", "Prova", "neon");
    const look = { material: "marmo", second: "gesso", forms: ["torsione", "piramide", "sfera"] } as const;
    const next = applyLook3D(doc, { ...look, forms: [...look.forms] });
    const objs = next.pages.flatMap((p) => p.elements).filter((e) => e.type === "object3d");
    expect(objs.length).toBeGreaterThan(0);
    expect(objs.every((o) => o.type === "object3d" && (o.material === "marmo" || o.material === "gesso"))).toBe(true);
    expect(lookOf(next).material).toBe("marmo");
    expect(documentSchema.safeParse(next).success).toBe(true);
  });

  it("the schema refuses unknown forms and materials", () => {
    const [el] = buildComposition("pianeta", pal);
    const page = (e: unknown) => ({ version: 1, pages: [{ id: "p1", name: "P", background: "#ffffff", transition: "fade", elements: [e] }] });
    expect(documentSchema.safeParse(page({ ...el, form: "teiera" })).success).toBe(false);
    expect(documentSchema.safeParse(page({ ...el, material: "oro<script>" })).success).toBe(false);
    expect(documentSchema.safeParse(page({ ...el, tiltX: 900 })).success).toBe(false);
  });

  it("drawings in layouts are lit in the theme's relief", () => {
    const shapes = buildLayout("icone", getTheme("pastello")).elements.filter((e) => e.type === "shape" && e.relief);
    expect(shapes.length).toBeGreaterThan(0);
  });

  it("rotation matrices are orthonormal and light comes from above", () => {
    const m = rotation(-18, 24);
    const col = (i: number) => [m[i * 3], m[i * 3 + 1], m[i * 3 + 2]];
    for (const i of [0, 1, 2]) expect(Math.hypot(...col(i))).toBeCloseTo(1, 6);
    expect(col(0).reduce((s, v, k) => s + v * col(1)[k], 0)).toBeCloseTo(0, 6);
    for (const deg of [0, 90, 180, 270]) expect(lightDir(deg)[1]).toBeGreaterThan(0.4);
  });

  it("form and material lists match the shader's order", () => {
    expect(FORMS_3D).toHaveLength(16);
    expect(MATERIALS_3D).toHaveLength(12);
  });
});
