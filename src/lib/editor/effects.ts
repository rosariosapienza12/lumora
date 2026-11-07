import type { Element, Page } from "./schema";
import { CANVAS_H, CANVAS_W } from "./schema";

/**
 * Presentation effects that make sense on stage, like Keynote's Magic Move
 * and PowerPoint's builds:
 *
 * - Morph: elements that appear on two pages in a row glide from where they
 *   were to where they are, resizing on the way.
 * - One at a time: the blocks of a page appear one per click, in reading
 *   order, so the audience follows the speaker instead of reading ahead.
 */

type Box = { x: number; y: number; w: number; h: number };

/** What makes two elements "the same" across pages. */
function morphKey(e: Element): string {
  switch (e.type) {
    case "text":
      return `t:${e.text.trim().slice(0, 80)}`;
    case "image":
      return `i:${e.src}`;
    case "icon":
      return `c:${e.icon}:${e.color}`;
    case "shape":
      return `s:${e.shape}:${e.fill}:${e.photoSlot ? 1 : 0}`;
    case "chart":
      return `g:${e.data.kind}:${e.data.labels.join("|")}`;
    case "object3d":
      return `o:${e.form}:${e.material}`;
    case "button":
      return `b:${e.label}`;
    case "hotspot":
      return `h:${e.label}`;
  }
}

/** Keys made unique within a page (the second identical shape gets "#2"). */
function keyed(page: Page) {
  const seen = new Map<string, number>();
  return page.elements.map((e) => {
    const k = morphKey(e);
    const n = (seen.get(k) ?? 0) + 1;
    seen.set(k, n);
    return [e, n > 1 ? `${k}#${n}` : k] as const;
  });
}

/** For each element of `to`, the box it had on `from` when it is there too. */
export function morphMatches(from: Page, to: Page): Map<string, Box & { rotation: number }> {
  const before = new Map(keyed(from).map(([e, k]) => [k, e]));
  const out = new Map<string, Box & { rotation: number }>();
  for (const [e, k] of keyed(to)) {
    const old = before.get(k);
    if (old && (old.x !== e.x || old.y !== e.y || old.w !== e.w || old.h !== e.h || old.rotation !== e.rotation)) {
      out.set(e.id, { x: old.x, y: old.y, w: old.w, h: old.h, rotation: old.rotation });
    }
  }
  return out;
}

const overlaps = (a: Box, b: Box, pad = 14) => a.x - pad < b.x + b.w && b.x - pad < a.x + a.w && a.y - pad < b.y + b.h && b.y - pad < a.y + a.h;

/**
 * The steps of a page shown one at a time: element ids per step. Step 0 is
 * what is always visible (backgrounds, decorations, the title); then each
 * block — elements that touch each other, like a card with its icon and words
 * — in reading order (top to bottom, left to right).
 */
export function buildSteps(page: Page): string[][] {
  const always: string[] = [];
  const rest: Element[] = [];
  for (const e of page.elements) {
    if (e.hidden) continue;
    const big = e.w * e.h > CANVAS_W * CANVAS_H * 0.45;
    const title = e.type === "text" && (e.bind === "heading" || (e.y < 230 && e.weight === "800"));
    if (big || e.decor || title || (e.type === "shape" && e.y + e.h < 230)) always.push(e.id);
    else rest.push(e);
  }
  // Pages made of points: each point is a block, and every other element (its card, arrow,
  // icon or number) joins the point whose words are closest to it.
  const itemOf = (e: Element) => (e.type === "text" && e.bind?.startsWith("items.") ? Number(e.bind.split(".")[1]) : null);
  const points = new Map<number, Element[]>();
  for (const e of rest) {
    const n = itemOf(e);
    if (n !== null) points.set(n, [...(points.get(n) ?? []), e]);
  }
  if (points.size >= 2) {
    const centre = (e: Box) => [e.x + e.w / 2, e.y + e.h / 2] as const;
    const anchors = [...points.entries()].map(([n, els]) => {
      const xs = els.map((e) => centre(e)[0]);
      const ys = els.map((e) => centre(e)[1]);
      return { n, x: xs.reduce((a, b) => a + b, 0) / xs.length, y: ys.reduce((a, b) => a + b, 0) / ys.length };
    });
    const groups = new Map<number, Element[]>(anchors.map((a) => [a.n, []]));
    for (const e of rest) {
      const own = itemOf(e);
      const [cx, cy] = centre(e);
      const n = own ?? anchors.reduce((best, a) => (Math.hypot(a.x - cx, a.y - cy) < Math.hypot(best.x - cx, best.y - cy) ? a : best)).n;
      groups.get(n)!.push(e);
    }
    return [always, ...[...groups.entries()].sort((a, b) => a[0] - b[0]).map(([, els]) => els.map((e) => e.id))];
  }

  // Other pages: blocks are elements whose boxes touch.
  const parent = rest.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < rest.length; i++) for (let j = i + 1; j < rest.length; j++) if (overlaps(rest[i], rest[j])) parent[find(i)] = find(j);
  const groups = new Map<number, Element[]>();
  rest.forEach((e, i) => groups.set(find(i), [...(groups.get(find(i)) ?? []), e]));
  const blocks = [...groups.values()].map((els) => ({ els, top: Math.min(...els.map((e) => e.y)), left: Math.min(...els.map((e) => e.x)) }));
  // Reading order: rows first (blocks whose tops are within 60px share a row), then left to right.
  blocks.sort((a, b) => (Math.abs(a.top - b.top) < 60 ? a.left - b.left : a.top - b.top));
  return [always, ...blocks.map((b) => b.els.map((e) => e.id))];
}
