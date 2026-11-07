import { z } from "zod";
import { chartContentSchema } from "./chart";

/**
 * The words of a page, apart from how it is drawn. Zib (with AI) writes this
 * for every page of a presentation; the layouts turn it into elements in the
 * style of the theme. Kept with the page (`page.source`), it lets "Cambia
 * impaginazione" redraw the same words in another layout.
 *
 * Every field is optional: a layout falls back to a helpful placeholder.
 */

const line = (max: number) => z.string().trim().max(max);

export const itemSchema = z.object({ title: line(80), text: line(400).optional() });
export const statSchema = z.object({ value: line(16), label: line(60), text: line(160).optional() });

export const pageContentSchema = z.object({
  heading: line(110).optional(),
  subtitle: line(180).optional(),
  body: line(700).optional(),
  /** One sentence to remember, shown apart. */
  highlight: line(160).optional(),
  /** Points, steps, columns, map nodes, timeline stages, pyramid levels, cards, agenda entries. */
  items: z.array(itemSchema).max(8).optional(),
  /** Big numbers; the first one is the percentage of "percentuale". */
  stats: z.array(statSchema).max(4).optional(),
  quote: z.object({ text: line(280), author: line(80) }).optional(),
  question: z.object({ text: line(200), right: line(80), wrong: line(80), explanation: line(240).optional() }).optional(),
  /** The numbers of the "grafico" layout. */
  chart: chartContentSchema.optional(),
});

export type PageContent = z.infer<typeof pageContentSchema>;
export type Item = z.infer<typeof itemSchema>;

/** The text at `i`, or the fallback. */
export const nth = <T,>(list: T[] | undefined, i: number, fallback: T): T => list?.[i] ?? fallback;

/**
 * A font size that lets `text` fit in a w×h box: starts at `max` and shrinks
 * (down to `min`) using an average letter width, so real content written by
 * Zib never spills out of its box.
 */
export function fitSize(text: string, w: number, h: number, max: number, min = 18, lineHeight = 1.4, charWidth = 0.52): number {
  for (let size = max; size > min; size -= 2) {
    const perLine = Math.max(1, Math.floor(w / (size * charWidth)));
    const lines = text.split("\n").reduce((n, para) => n + Math.max(1, Math.ceil(para.length / perLine)), 0);
    if (lines * size * lineHeight <= h) return size;
  }
  return min;
}

/**
 * A field of the content, as a path: "heading", "items.2.title",
 * "stats.0.value", "quote.text", "question.right"…
 */
export const CONTENT_PATH = /^(heading|subtitle|body|highlight|(items|stats)\.\d{1,2}\.(title|text|value|label)|quote\.(text|author)|question\.(text|right|wrong|explanation))$/;

/** The text at a path, if the content has it. */
export function getAt(c: PageContent, path: string): string | undefined {
  const [a, b, d] = path.split(".");
  const v = (c as Record<string, unknown>)[a];
  if (b === undefined) return typeof v === "string" ? v : undefined;
  if (d === undefined) return typeof (v as Record<string, unknown> | undefined)?.[b] === "string" ? ((v as Record<string, string>)[b]) : undefined;
  const row = Array.isArray(v) ? (v[Number(b)] as Record<string, unknown> | undefined) : undefined;
  return typeof row?.[d] === "string" ? (row[d] as string) : undefined;
}

/** A copy of the content with the text at `path` replaced (rows are created when missing). */
export function setAt(c: PageContent, path: string, value: string): PageContent {
  if (!CONTENT_PATH.test(path)) return c;
  const [a, b, d] = path.split(".");
  const next = structuredClone(c) as Record<string, unknown>;
  if (b === undefined) next[a] = value;
  else if (d === undefined) next[a] = { ...((next[a] as object) ?? {}), [b]: value };
  else {
    const list = [...((next[a] as Record<string, unknown>[]) ?? [])];
    const i = Number(b);
    while (list.length <= i) list.push(a === "stats" ? { value: "", label: "" } : { title: "" });
    list[i] = { ...list[i], [d]: value };
    next[a] = list;
  }
  return next as PageContent;
}

/** Every text field of the content with its path (to recognise which text on the page shows which field). */
export function contentFields(c: PageContent): [path: string, text: string][] {
  const out: [string, string][] = [];
  for (const k of ["heading", "subtitle", "body", "highlight"] as const) if (c[k]) out.push([k, c[k]!]);
  c.items?.forEach((it, i) => {
    if (it.title) out.push([`items.${i}.title`, it.title]);
    if (it.text) out.push([`items.${i}.text`, it.text]);
  });
  c.stats?.forEach((s, i) => {
    if (s.value) out.push([`stats.${i}.value`, s.value]);
    if (s.label) out.push([`stats.${i}.label`, s.label]);
    if (s.text) out.push([`stats.${i}.text`, s.text]);
  });
  if (c.quote) out.push(["quote.text", c.quote.text], ["quote.author", c.quote.author]);
  if (c.question) {
    out.push(["question.text", c.question.text], ["question.right", c.question.right], ["question.wrong", c.question.wrong]);
    if (c.question.explanation) out.push(["question.explanation", c.question.explanation]);
  }
  return out;
}
