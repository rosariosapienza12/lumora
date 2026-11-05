import { describe, expect, it } from "vitest";
import { documentSchema, starterDocument } from "./schema";
import { SHAPE_IDS, SVG_SHAPES, isSvgShape } from "./shapes";

const doc = () => structuredClone(starterDocument("Prova"));

describe("documentSchema", () => {
  it("accepts the starter document", () => {
    expect(documentSchema.safeParse(doc()).success).toBe(true);
  });

  it("rejects javascript: and http: links", () => {
    for (const url of ["javascript:alert(1)", "http://example.com", "data:text/html,<script>alert(1)</script>"]) {
      const d = doc();
      d.pages[0].elements[0].interaction = { trigger: "click", action: { kind: "link", url } };
      expect(documentSchema.safeParse(d).success, url).toBe(false);
    }
  });

  it("accepts https links", () => {
    const d = doc();
    d.pages[0].elements[0].interaction = { trigger: "click", action: { kind: "link", url: "https://example.com/a?b=1" } };
    expect(documentSchema.safeParse(d).success).toBe(true);
  });

  it("rejects non-https image sources", () => {
    const d = doc();
    d.pages[0].elements.push({
      ...d.pages[0].elements[0],
      id: "img1",
      type: "image",
      src: "javascript:alert(1)",
      alt: "",
      fit: "cover",
      radius: 0,
    } as never);
    expect(documentSchema.safeParse(d).success).toBe(false);
  });

  it("rejects unknown element types and extra HTML fields are stripped", () => {
    const d = doc() as unknown as { pages: { elements: Record<string, unknown>[] }[] };
    d.pages[0].elements[0].html = "<img src=x onerror=alert(1)>";
    const parsed = documentSchema.safeParse(d);
    expect(parsed.success).toBe(true);
    expect(JSON.stringify(parsed.data)).not.toContain("onerror");

    d.pages[0].elements[0].type = "script";
    expect(documentSchema.safeParse(d).success).toBe(false);
  });

  it("rejects colours that are not hex (CSS injection)", () => {
    const d = doc();
    d.pages[0].background = "red;background:url(https://evil.test)";
    expect(documentSchema.safeParse(d).success).toBe(false);
  });

  it("rejects interactions pointing outside the document", () => {
    const d = doc();
    d.pages[0].elements[0].interaction = { trigger: "click", action: { kind: "goto", pageId: "missing" } };
    expect(documentSchema.safeParse(d).success).toBe(false);
  });
});

describe("shapes", () => {
  const withShape = (extra: Record<string, unknown>) => {
    const doc = starterDocument("Forme");
    doc.pages[0].elements.push({
      id: "s1", type: "shape", shape: "rect", x: 10, y: 10, w: 200, h: 200, rotation: 0, opacity: 1, hidden: false, locked: false,
      fill: "#ff0000", radius: 0, animation: { enter: "none", emphasis: "none", duration: 0.6, delay: 0 }, interaction: null,
      ...extra,
    } as never);
    return documentSchema.safeParse(doc);
  };

  it("accepts every shape in the catalogue, mirrored too", () => {
    for (const shape of SHAPE_IDS) expect(withShape({ shape, flipX: true, flipY: true }).success).toBe(true);
  });

  it("rejects unknown shapes and non-boolean flips", () => {
    expect(withShape({ shape: "pentagram" }).success).toBe(false);
    expect(withShape({ flipX: "yes" }).success).toBe(false);
  });

  it("has a valid SVG path for every non-basic shape", () => {
    for (const shape of SHAPE_IDS) {
      if (shape === "rect" || shape === "ellipse") continue;
      expect(isSvgShape(shape)).toBe(true);
      expect(SVG_SHAPES[shape].d).toMatch(/^[MmLlHhVvCcSsQqTtAaZz0-9 .,-]+$/);
    }
  });
});
