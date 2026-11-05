import { describe, expect, it } from "vitest";
import { documentSchema, type Element } from "./schema";
import { buildLayout, LAYOUT_IDS, PHOTO_LAYOUTS } from "./layouts";
import { applyMotif, decoratePage, detectMotif, MOTIF_IDS, MOTIFS } from "./motifs";
import { buildDeck, parseDeck, planDeck, serializeDeck } from "./deck";
import { countPhotoSlots, fillPhotoSlots, type FreePhoto } from "./photos";
import { getTheme, isThemeId } from "./themes";
import { parseCommons, plainText } from "../images/commons";

const overlaps = (a: Element, b: Element) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe("topic decorations", () => {
  it.each(MOTIF_IDS)("%s has its own theme and drawings", (id) => {
    expect(isThemeId(MOTIFS[id].theme)).toBe(true);
    expect(MOTIFS[id].decor.length).toBeGreaterThanOrEqual(3);
  });

  it("every topic uses a different theme", () => {
    expect(new Set(MOTIF_IDS.map((id) => MOTIFS[id].theme)).size).toBe(MOTIF_IDS.length);
  });

  it.each(MOTIF_IDS.flatMap((m) => LAYOUT_IDS.map((l) => [m, l] as const)))("%s on %s never covers text, photos or buttons", (motif, layout) => {
    const theme = getTheme(MOTIFS[motif].theme);
    const page = decoratePage(buildLayout(layout, theme, undefined, { motif }), motif, theme, 3);
    const decor = page.elements.filter((e) => e.decor);
    const content = page.elements.filter((e) => !e.decor && (e.type !== "shape" || e.photoSlot));
    for (const d of decor) for (const c of content) expect(overlaps(d, c), `${d.type} over ${c.type}`).toBe(false);
    expect(documentSchema.safeParse({ version: 1, pages: [page] }).success).toBe(true);
  });

  it("most pages get at least one decoration", () => {
    const theme = getTheme("natura");
    const decorated = LAYOUT_IDS.filter((l) => decoratePage(buildLayout(l, theme), "eco", theme).elements.some((e) => e.decor));
    expect(decorated.length).toBeGreaterThan(LAYOUT_IDS.length * 0.7);
  });

  it("changing topic swaps the decorations, removing it clears them", () => {
    const doc = buildDeck(planDeck("il riciclo"));
    expect(doc.settings?.motif).toBe("eco");
    const tech = applyMotif(doc, "tecnologia");
    const shapes = tech.pages.flatMap((p) => p.elements.filter((e) => e.decor).map((e) => (e.type === "shape" ? e.shape : "")));
    expect(shapes.every((s) => (MOTIFS.tecnologia.decor as string[]).includes(s))).toBe(true);
    const none = applyMotif(tech, undefined);
    expect(none.pages.some((p) => p.elements.some((e) => e.decor))).toBe(false);
    expect(none.settings?.motif).toBeUndefined();
  });

  it("recognises topics from free text", () => {
    expect(detectMotif("una lezione sulle balene e il mare")).toBe("mare");
    expect(detectMotif("intelligenza artificiale a scuola di programmazione")).toBe("tecnologia");
    expect(detectMotif("ricette della cucina siciliana")).toBe("cibo");
    expect(detectMotif("qualcosa di generico")).toBeUndefined();
  });
});

describe("outlines with topic and photos", () => {
  it("round-trip the new optional fields and still read the old format", () => {
    const spec = planDeck("il sistema solare", { photos: true });
    expect(spec.motif).toBe("spazio");
    expect(spec.pages[0].layout).toBe("foto-piena");
    expect(parseDeck(serializeDeck(spec))).toEqual(spec);
    expect(parseDeck("Titolo|notte|copertina=A;chiusura=B")?.motif).toBeUndefined();
    expect(parseDeck("Titolo|notte|copertina=A|foto|mare")).toMatchObject({ motif: "mare", photos: "Titolo" });
    expect(parseDeck("Titolo|notte|copertina=A|mare|mare")).toBeNull();
  });

  it("without photos, no page is left with an empty photo space", () => {
    for (const topic of ["il riciclo", "la mia startup", "la tesi sulla ricerca", "una storia a bivi", "il mio portfolio", "workshop di cucina"]) {
      expect(countPhotoSlots(buildDeck(planDeck(topic))), topic).toBe(0);
    }
  });

  it("uses varied layouts", () => {
    const pages = planDeck("la fotosintesi").pages;
    expect(new Set(pages.map((p) => p.layout)).size).toBeGreaterThanOrEqual(pages.length - 1);
  });

  it("fills photo spaces with credited photos and keeps the document valid", () => {
    const doc = buildDeck(planDeck("il mare", { photos: true }));
    const n = countPhotoSlots(doc);
    expect(n).toBeGreaterThan(2);
    const photo: FreePhoto = { src: "https://upload.wikimedia.org/a.jpg", thumb: "https://upload.wikimedia.org/t.jpg", width: 2000, height: 1300, title: "Mare", author: "Ada", license: "CC BY-SA 4.0", pageUrl: "https://commons.wikimedia.org/wiki/File:Mare.jpg" };
    const filled = fillPhotoSlots(doc, [photo, photo]);
    expect(countPhotoSlots(filled)).toBe(n - 2);
    const img = filled.pages.flatMap((p) => p.elements).find((e) => e.type === "image");
    expect(img).toMatchObject({ credit: "Ada · CC BY-SA 4.0 · Wikimedia Commons", fit: "cover" });
    // The credits live on a last page, not on the photos.
    const last = filled.pages.at(-1)!;
    expect(last.name).toBe("Crediti foto");
    expect(JSON.stringify(last)).toContain("Ada · CC BY-SA 4.0");
    expect(fillPhotoSlots(filled, []).pages.filter((p) => p.name === "Crediti foto")).toHaveLength(1);
    expect(documentSchema.safeParse(filled).success).toBe(true);
  });

  it("photo layouts really have photo spaces", () => {
    for (const l of PHOTO_LAYOUTS) expect(buildLayout(l, getTheme("notte")).elements.some((e) => e.type === "shape" && e.photoSlot), l).toBe(true);
  });
});

describe("Wikimedia Commons answers", () => {
  const page = (over: Record<string, unknown> = {}, meta: Record<string, unknown> = {}) => ({
    index: 1,
    title: "File:Grande_onda.jpg",
    imageinfo: [
      {
        url: "https://upload.wikimedia.org/wikipedia/commons/a/ab/Grande_onda.jpg",
        thumburl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/Grande_onda.jpg/500px-Grande_onda.jpg?utm_source=x",
        width: 3000,
        height: 2000,
        mime: "image/jpeg",
        descriptionurl: "https://commons.wikimedia.org/wiki/File:Grande_onda.jpg",
        extmetadata: { Artist: { value: '<a href="//x">Mario &amp; Co</a>' }, LicenseShortName: { value: "CC BY 4.0" }, ...meta },
        ...over,
      },
    ],
  });
  const parse = (...pages: unknown[]) => parseCommons({ query: { pages } });

  it("keeps author, licence and a large https image", () => {
    expect(parse(page())).toEqual([
      expect.objectContaining({ author: "Mario & Co", license: "CC BY 4.0", title: "Grande onda", src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/Grande_onda.jpg/1280px-Grande_onda.jpg" }),
    ]);
  });

  it("drops foreign hosts, odd formats, small images and non-free licences", () => {
    expect(parse(page({ url: "https://evil.test/a.jpg" }))).toEqual([]);
    expect(parse(page({ mime: "image/svg+xml" }))).toEqual([]);
    expect(parse(page({ width: 300 }))).toEqual([]);
    expect(parse(page({}, { LicenseShortName: { value: "CC BY-NC 2.0" } }))).toEqual([]);
    expect(parse(page({}, { LicenseShortName: undefined }))).toEqual([]);
    expect(parseCommons(null)).toEqual([]);
  });

  it("turns HTML into plain text", () => {
    expect(plainText("<b>Anna</b> &lt;script&gt;")).toBe("Anna <script>");
    // Decoded once only: an escaped entity stays an entity.
    expect(plainText("Tom &amp;lt;b&amp;gt; &#39;x&#39;")).toBe("Tom &lt;b&gt; 'x'");
  });
});
