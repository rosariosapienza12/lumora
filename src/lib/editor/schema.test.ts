import { describe, expect, it } from "vitest";
import { documentSchema, starterDocument } from "./schema";

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
