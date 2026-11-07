import { z } from "zod";

/**
 * Charts people edit with their own numbers, like in Keynote or Google
 * Slides: bars, columns, lines, areas, pies and donuts, up to three series.
 * Pure data and geometry here; components/slide/chart-view.tsx draws them.
 */

export const CHART_KINDS = ["colonne", "barre", "linea", "area", "torta", "ciambella"] as const;
export type ChartKind = (typeof CHART_KINDS)[number];
export const CHART_NAMES: Record<ChartKind, string> = {
  colonne: "Colonne",
  barre: "Barre orizzontali",
  linea: "Linea",
  area: "Area",
  torta: "Torta",
  ciambella: "Ciambella",
};

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const num = z.number().finite().min(-1e12).max(1e12);

export const chartSeriesSchema = z.object({ name: z.string().max(40), values: z.array(num).max(12), color });
export const chartDataSchema = z.object({
  kind: z.enum(CHART_KINDS),
  labels: z.array(z.string().max(40)).min(1).max(12),
  series: z.array(chartSeriesSchema).min(1).max(3),
  /** Shown after every value: "%", " €", " km"… */
  unit: z.string().max(6).optional(),
  showValues: z.boolean().optional(),
  showLegend: z.boolean().optional(),
});
export type ChartData = z.infer<typeof chartDataSchema>;

/** The words Zib writes for a chart (colours come from the theme). */
export const chartContentSchema = z.object({
  kind: z.enum(CHART_KINDS),
  labels: z.array(z.string().trim().max(40)).min(1).max(12),
  series: z.array(z.object({ name: z.string().trim().max(40), values: z.array(num).max(12) })).min(1).max(3),
  unit: z.string().max(6).optional(),
});
export type ChartContent = z.infer<typeof chartContentSchema>;

export const isPieKind = (k: ChartKind) => k === "torta" || k === "ciambella";

/** A round top value for the axis (1, 2, 2.5, 5 × 10ⁿ above the max) and its 4 steps. */
export function niceScale(max: number): { top: number; step: number } {
  if (!(max > 0)) return { top: 1, step: 0.25 };
  const raw = max / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s * 4 >= max) ?? 10 * pow;
  return { top: step * 4, step };
}

/** A number written the Italian way, short: 1.200, 3,5, 12 mila, 2,4 mln. */
export function formatValue(v: number, unit = ""): string {
  const abs = Math.abs(v);
  const f = (n: number, d = 1) => n.toLocaleString("it-IT", { maximumFractionDigits: d });
  const s = abs >= 1e9 ? `${f(v / 1e9)} mld` : abs >= 1e6 ? `${f(v / 1e6)} mln` : abs >= 1e4 ? `${f(v / 1e3)} mila` : f(v, 2);
  return `${s}${unit}`;
}

/** Each series' values, aligned to the labels (missing ones are 0). */
export const valuesOf = (d: ChartData, s: number) => d.labels.map((_, i) => d.series[s]?.values[i] ?? 0);

/** Slices of a pie: start and end angle (radians, from 12 o'clock, clockwise) and share. */
export function pieSlices(values: number[]): { start: number; end: number; share: number }[] {
  const pos = values.map((v) => Math.max(0, v));
  const total = pos.reduce((a, b) => a + b, 0) || 1;
  let a = 0;
  return pos.map((v) => {
    const share = v / total;
    const start = a;
    a += share * Math.PI * 2;
    return { start, end: a, share };
  });
}
