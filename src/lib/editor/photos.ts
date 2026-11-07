import type { Element, Page, PresentationDoc } from "./schema";
import { newId } from "./schema";
import { getTheme } from "./themes";

/**
 * Free photos (from Wikimedia Commons) inside a presentation. Pure functions,
 * shared by the editor, the "con immagini" generation and the tests: the
 * network part lives in src/lib/images/commons.ts.
 */

export type FreePhoto = {
  /** Large version for the slide (https://upload.wikimedia.org/...). */
  src: string;
  /** Small version for the search results. */
  thumb: string;
  width: number;
  height: number;
  /** Short description, used as alt text. */
  title: string;
  author: string;
  license: string;
  /** The file page on Commons: author, licence and history. */
  pageUrl: string;
};

/** The credit line of a photo, as the licences ask: author, licence, source. */
export const creditOf = (p: Pick<FreePhoto, "author" | "license">) => `${p.author} · ${p.license} · Wikimedia Commons`.slice(0, 300);

export const CREDITS_PAGE = "Crediti foto";

/**
 * Free licences such as CC BY-SA ask to credit the author. Instead of writing
 * it on the photo, Lumora keeps a "Crediti foto" page at the end with every
 * photo used: rebuilt whenever photos change, removed when there are none.
 */
export function withCreditsPage(doc: PresentationDoc): PresentationDoc {
  const pages = doc.pages.filter((p) => p.name !== CREDITS_PAGE);
  const credits = [...new Set(pages.flatMap((p) => p.elements.flatMap((e) => (e.type === "image" && e.credit ? [`${e.alt || "Foto"}: ${e.credit}`] : []))))];
  if (!credits.length) return pages.length === doc.pages.length ? doc : { ...doc, pages };
  const t = getTheme(doc.settings?.theme);
  const p = t.palette;
  const size = credits.length > 10 ? 18 : 22;
  const base = { rotation: 0, opacity: 1, hidden: false, locked: false, interaction: null, animation: { enter: "fade" as const, emphasis: "none" as const, duration: 0.6, delay: 0 } };
  const page: Page = {
    id: newId(),
    name: CREDITS_PAGE,
    background: p.contentBg,
    transition: "fade",
    elements: [
      { ...base, id: newId(), type: "text", x: 120, y: 90, w: 1360, h: 90, text: CREDITS_PAGE, fontSize: 56, color: p.title, align: "left", weight: "800", font: t.fonts.title },
      { ...base, id: newId(), type: "text", x: 120, y: 190, w: 1360, h: 60, text: "Foto con licenza libera da Wikimedia Commons. Grazie agli autori.", fontSize: 26, color: p.muted, align: "left", weight: "400", font: t.fonts.body },
      { ...base, id: newId(), type: "text", x: 120, y: 270, w: 1360, h: 560, text: credits.slice(0, 40).join("\n"), fontSize: size, color: p.text, align: "left", weight: "400", font: t.fonts.body, lineHeight: 1.5 },
    ],
  };
  return { ...doc, pages: [...pages, page] };
}

/** An image element that takes the place (and the size, animation and interaction) of `target`. */
export function photoElement(target: Element, photo: Pick<FreePhoto, "src" | "title" | "author" | "license" | "pageUrl">): Element {
  return {
    id: target.id,
    type: "image",
    x: target.x,
    y: target.y,
    w: target.w,
    h: target.h,
    rotation: target.rotation,
    opacity: target.type === "shape" && target.photoSlot ? 1 : target.opacity,
    hidden: target.hidden,
    locked: false,
    animation: target.animation,
    interaction: target.interaction,
    ...(target.shadow ? { shadow: true } : {}),
    src: photo.src,
    alt: photo.title.slice(0, 300),
    fit: "cover",
    radius: "radius" in target ? target.radius : 0,
    credit: creditOf(photo),
    creditUrl: photo.pageUrl,
  };
}

export const isPhotoSlot = (e: Element) => e.type === "shape" && e.photoSlot === true;

/** How many empty photo spaces the presentation has. */
export const countPhotoSlots = (doc: PresentationDoc) => doc.pages.reduce((n, p) => n + p.elements.filter(isPhotoSlot).length, 0);

/** Fills the empty photo spaces, page by page, with the photos in order; spaces left over stay empty. */
export function fillPhotoSlots(doc: PresentationDoc, photos: FreePhoto[], perPage: Map<string, FreePhoto[]> = new Map()): PresentationDoc {
  // Each space gets the unused photo whose shape is closest to its own (a wide space a wide photo),
  // so nothing important is cropped away; ties keep the search order (relevance). A page with
  // its own search uses its own photos first.
  const used = new Set<string>();
  const pick = (slot: { w: number; h: number }, pool: FreePhoto[]) => {
    const want = Math.log(slot.w / slot.h);
    let best: FreePhoto | null = null;
    let bestScore = Infinity;
    pool.forEach((ph, i) => {
      if (used.has(ph.src)) return;
      const score = Math.abs(Math.log(ph.width / ph.height) - want) * 3 + i * 0.08;
      if (score < bestScore) {
        best = ph;
        bestScore = score;
      }
    });
    if (best) used.add((best as FreePhoto).src);
    return best as FreePhoto | null;
  };
  const pages = doc.pages.map(
    (p): Page => ({
      ...p,
      elements: p.elements.map((e) => {
        if (!isPhotoSlot(e)) return e;
        const ph = pick(e, perPage.get(p.id) ?? []) ?? pick(e, photos);
        return ph ? photoElement(e, ph) : e;
      }),
    }),
  );
  return withCreditsPage({ ...doc, pages });
}
