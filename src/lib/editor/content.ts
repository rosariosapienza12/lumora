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
