import type { Element, Page, PresentationDoc } from "./schema";

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

/** The credit line shown on the photo, as the licences ask: author, licence, source. */
export const creditOf = (p: Pick<FreePhoto, "author" | "license">) => `Foto: ${p.author} · ${p.license} · Wikimedia Commons`.slice(0, 300);

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
export function fillPhotoSlots(doc: PresentationDoc, photos: FreePhoto[]): PresentationDoc {
  let next = 0;
  const pages = doc.pages.map(
    (p): Page => ({
      ...p,
      elements: p.elements.map((e) => (isPhotoSlot(e) && next < photos.length ? photoElement(e, photos[next++]) : e)),
    }),
  );
  return { ...doc, pages };
}
