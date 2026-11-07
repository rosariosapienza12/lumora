import { describe, expect, it } from "vitest";
import { chartDataSchema, formatValue, niceScale, pieSlices } from "./chart";
import { ICON_IDS, ICONS, pickIcon } from "./icons";
import { buildLayout, chartElement } from "./layouts";
import { getTheme } from "./themes";
import { documentSchema } from "./schema";

describe("charts", () => {
  it("round axis tops", () => {
    expect(niceScale(65000)).toEqual({ top: 80000, step: 20000 });
    expect(niceScale(9).top).toBeGreaterThanOrEqual(9);
    expect(niceScale(0)).toEqual({ top: 1, step: 0.25 });
  });

  it("writes numbers the Italian way", () => {
    expect(formatValue(1234)).toBe("1234");
    expect(formatValue(1234.5)).toBe("1234,5");
    expect(formatValue(3.5, "%")).toBe("3,5%");
    expect(formatValue(65000)).toBe("65 mila");
    expect(formatValue(2400000, " €")).toBe("2,4 mln €");
  });

  it("pie slices add up to a full turn and ignore negative values", () => {
    const s = pieSlices([1, 1, 2, -5]);
    expect(s.at(-1)!.end).toBeCloseTo(Math.PI * 2);
    expect(s[3].share).toBe(0);
    expect(s[2].share).toBeCloseTo(0.5);
  });

  it("refuses malformed data", () => {
    const ok = { kind: "colonne", labels: ["a"], series: [{ name: "s", values: [1], color: "#000000" }] };
    expect(chartDataSchema.safeParse(ok).success).toBe(true);
    expect(chartDataSchema.safeParse({ ...ok, kind: "radar" }).success).toBe(false);
    expect(chartDataSchema.safeParse({ ...ok, labels: Array(13).fill("x") }).success).toBe(false);
    expect(chartDataSchema.safeParse({ ...ok, series: [{ name: "s", values: [Infinity], color: "#000000" }] }).success).toBe(false);
  });

  it("the chart layout and a chart element are valid pages in every theme", () => {
    for (const id of ["aurora", "inchiostro", "carta"]) {
      const page = buildLayout("grafico", getTheme(id), { chart: { kind: "torta", labels: ["A", "B"], series: [{ name: "x", values: [1, 2] }] } });
      expect(documentSchema.safeParse({ version: 1, pages: [{ ...page, elements: [...page.elements, chartElement(getTheme(id))] }] }).success).toBe(true);
    }
  });
});

describe("icons", () => {
  it("every icon has a name, a path and keywords", () => {
    for (const id of ICON_IDS) {
      expect(ICONS[id].name.length).toBeGreaterThan(1);
      expect(ICONS[id].d).toMatch(/^M[\d.\s,a-zA-Z-]+$/);
      expect(ICONS[id].words.length).toBeGreaterThan(0);
    }
  });

  it("picks icons from the words of a point, without repeating", () => {
    expect(pickIcon("Costi: abbonamenti che si sommano")).toBe("euro");
    expect(pickIcon("Il nostro team")).toBe("users");
    const used = new Set(["euro"] as const);
    expect(pickIcon("Costi", 0, new Set(used))).not.toBe("euro");
  });
});

describe("layouts with real content", () => {
  it("never pad real points with placeholders", () => {
    const page = buildLayout("linea-tempo", getTheme("ardesia"), { items: [{ title: "Oggi" }, { title: "Tra 6 mesi" }, { title: "Tra 1 anno" }] });
    const texts = page.elements.filter((e) => e.type === "text").map((e) => (e.type === "text" ? e.text : ""));
    expect(texts.filter((t) => t === "Oggi")).toHaveLength(1);
    expect(texts.some((t) => t.includes("Cosa è successo"))).toBe(false);
  });
});
