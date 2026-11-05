import type { Element, EnterAnimation, Interaction, Page } from "./schema";
import { newId } from "./schema";
import type { Theme } from "./themes";
import type { ShapeId, SvgShape } from "./shapes";
import { MOTIFS } from "./motifs";
import type { MotifId } from "./motif-ids";

/**
 * Ready-made page layouts, drawn with theme roles so each one fits any theme.
 *
 * Every layout follows the same grid (see .tastemaker/style-lock.md): text and
 * buttons stay inside the safe area x 120-1480, y 90-810, so the margin band
 * outside it is free for the topic decorations. Each layout has one focal point
 * (a photo, a big number, a diagram) and the text works as its caption.
 * Photo areas are "photo slots": shapes that the editor, or the "con immagini"
 * option, replace with a real photo of the same size.
 */

type Box = { x: number; y: number; w: number; h: number };

const base = (enter: EnterAnimation = "fade", delay = 0) => ({
  id: newId(),
  rotation: 0,
  opacity: 1,
  hidden: false,
  locked: false,
  animation: { enter, emphasis: "none" as const, duration: 0.6, delay },
  interaction: null as Interaction | null,
});

export type Draw = ReturnType<typeof drawWith>;

type TextOpts = {
  size?: number;
  color?: string;
  weight?: "400" | "600" | "800";
  title?: boolean;
  align?: "left" | "center" | "right";
  enter?: EnterAnimation;
  delay?: number;
  italic?: boolean;
  lineHeight?: number;
  opacity?: number;
  spacing?: number;
};
type ShapeOpts = { ellipse?: boolean; radius?: number; enter?: EnterAnimation; delay?: number; shadow?: boolean; opacity?: number; rotation?: number };

/** Element builders bound to a theme. */
export function drawWith(t: Theme) {
  const p = t.palette;
  const text = (box: Box, s: string, o: TextOpts = {}): Element => ({
    ...base(o.enter ?? "fade", o.delay),
    ...box,
    ...(o.opacity !== undefined ? { opacity: o.opacity } : {}),
    type: "text",
    text: s,
    fontSize: o.size ?? 34,
    color: o.color ?? (o.title ? p.title : p.text),
    align: o.align ?? "left",
    weight: o.weight ?? (o.title ? "800" : "400"),
    font: o.title ? t.fonts.title : t.fonts.body,
    ...(o.italic ? { italic: true } : {}),
    ...(o.lineHeight ? { lineHeight: o.lineHeight } : {}),
    ...(o.spacing ? { letterSpacing: o.spacing } : {}),
  });
  const shape = (box: Box, fill: string, o: ShapeOpts = {}): Element => ({
    ...base(o.enter ?? "fade", o.delay),
    ...box,
    ...(o.opacity !== undefined ? { opacity: o.opacity } : {}),
    ...(o.rotation ? { rotation: o.rotation } : {}),
    type: "shape",
    shape: o.ellipse ? "ellipse" : "rect",
    fill,
    radius: o.radius ?? 28,
    ...(o.shadow ? { shadow: true } : {}),
  });
  /** A drawing or geometric shape from shapes.ts. */
  const figure = (box: Box, kind: ShapeId, fill: string, o: Omit<ShapeOpts, "ellipse"> = {}): Element => ({
    ...shape(box, fill, o),
    shape: kind,
    radius: 0,
  } as Element);
  /** Space for a photo, drawn as a card until a real photo takes its place. */
  const photo = (box: Box, o: { radius?: number; delay?: number; enter?: EnterAnimation } = {}): Element => ({
    ...shape(box, p.card, { radius: o.radius ?? 28, enter: o.enter ?? "fade", delay: o.delay }),
    photoSlot: true,
  } as Element);
  const button = (box: Box, label: string, interaction: Interaction | null, o: { fill?: string; color?: string; delay?: number; size?: number } = {}): Element => ({
    ...base("pop", o.delay),
    ...box,
    interaction,
    type: "button",
    label,
    fill: o.fill ?? p.accent,
    color: o.color ?? p.onAccent,
    fontSize: o.size ?? 30,
    font: t.fonts.body,
  });
  const hotspot = (x: number, y: number, label: string, interaction: Interaction, delay = 0.4): Element => ({
    ...base("pop", delay),
    x,
    y,
    w: 80,
    h: 80,
    interaction,
    type: "hotspot",
    fill: p.accent2,
    label,
  });
  const page = (name: string, background: string, elements: Element[], transition: Page["transition"] = "fade", cover = false): Page => ({
    id: newId(),
    name,
    background,
    ...(cover && p.coverBg2 ? { color2: p.coverBg2, angle: 135 } : {}),
    transition,
    elements,
  });
  const goto = (target: Page): Interaction => ({ trigger: "click", action: { kind: "goto", pageId: target.id } });
  const popup = (title: string, body: string): Interaction => ({ trigger: "click", action: { kind: "popup", title, body } });
  const reveal = (target: Element): Interaction => ({ trigger: "click", action: { kind: "reveal", targetId: target.id } });
  const tooltip = (s: string): Interaction => ({ trigger: "hover", action: { kind: "tooltip", text: s } });
  /** Page title at the top of the safe area. */
  const heading = (s: string, o: { color?: string; size?: number; box?: Box } = {}) =>
    text(o.box ?? { x: 120, y: 90, w: 1360, h: 110 }, s, { size: o.size ?? 64, title: true, color: o.color ?? p.title, enter: "slide-up", lineHeight: 1.08 });
  /** A straight segment from one point to another (a rotated thin rectangle). */
  const connector = (x1: number, y1: number, x2: number, y2: number, fill: string, thick = 8, delay = 0): Element => {
    const len = Math.hypot(x2 - x1, y2 - y1);
    const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
    return shape({ x: Math.round((x1 + x2) / 2 - len / 2), y: Math.round((y1 + y2) / 2 - thick / 2), w: Math.round(len), h: thick }, fill, { radius: thick / 2, delay, rotation: Math.round(angle * 10) / 10 });
  };
  return { p, text, shape, figure, photo, button, hotspot, page, goto, popup, reveal, tooltip, heading, connector };
}

export type LayoutId =
  | "copertina" | "sezione" | "chiusura" | "agenda"
  | "titolo-testo" | "due-colonne" | "tre-colonne" | "confronto" | "icone"
  | "immagine-testo" | "foto-piena" | "mosaico" | "citazione" | "elenco"
  | "numeri" | "percentuale" | "linea-tempo" | "processo" | "piramide" | "mappa"
  | "esplora" | "schede"
  | "domanda" | "bivio"
  | "contatti";

/** The feature groups shown in the "Nuova pagina" menu (ids match the homepage planets). */
export const LAYOUT_GROUPS: { feature: string; title: string; layouts: { id: LayoutId; name: string }[] }[] = [
  { feature: "modelli", title: "Struttura", layouts: [{ id: "copertina", name: "Copertina" }, { id: "agenda", name: "Indice" }, { id: "sezione", name: "Inizio sezione" }, { id: "chiusura", name: "Chiusura" }] },
  {
    feature: "layout",
    title: "Pagine e layout",
    layouts: [{ id: "titolo-testo", name: "Titolo e testo" }, { id: "due-colonne", name: "Due colonne" }, { id: "tre-colonne", name: "Tre colonne" }, { id: "confronto", name: "Confronto VS" }, { id: "icone", name: "Griglia di icone" }],
  },
  {
    feature: "contenuti",
    title: "Foto e testi",
    layouts: [{ id: "foto-piena", name: "Foto a tutta pagina" }, { id: "immagine-testo", name: "Foto e testo" }, { id: "mosaico", name: "Mosaico di foto" }, { id: "citazione", name: "Citazione" }, { id: "elenco", name: "Elenco puntato" }],
  },
  {
    feature: "animazioni",
    title: "Numeri e schemi",
    layouts: [{ id: "numeri", name: "Numeri in evidenza" }, { id: "percentuale", name: "Percentuale nel cerchio" }, { id: "linea-tempo", name: "Linea del tempo" }, { id: "processo", name: "Processo a frecce" }, { id: "piramide", name: "Piramide" }, { id: "mappa", name: "Mappa concettuale" }],
  },
  { feature: "interattivita", title: "Interattività", layouts: [{ id: "esplora", name: "Esplora con hotspot" }, { id: "schede", name: "Schede da scoprire" }] },
  { feature: "percorsi", title: "Percorsi e quiz", layouts: [{ id: "domanda", name: "Domanda a risposta" }, { id: "bivio", name: "Bivio" }] },
  { feature: "condividi", title: "Presenta e condividi", layouts: [{ id: "contatti", name: "Contatti" }] },
];

export const LAYOUT_IDS = LAYOUT_GROUPS.flatMap((g) => g.layouts.map((l) => l.id));
export const isLayoutId = (v: unknown): v is LayoutId => LAYOUT_IDS.includes(v as LayoutId);
export const LAYOUT_NAMES = Object.fromEntries(LAYOUT_GROUPS.flatMap((g) => g.layouts.map((l) => [l.id, l.name]))) as Record<LayoutId, string>;

/** Layouts with at least one photo slot. */
export const PHOTO_LAYOUTS: LayoutId[] = ["foto-piena", "immagine-testo", "mosaico", "esplora"];

const DEFAULT_ICONS: SvgShape[] = ["bulb", "star", "heart", "gear", "chart", "pin"];

export type LayoutOptions = {
  /** Topic of the presentation: icon layouts use its drawings. */
  motif?: MotifId;
};

/** Builds one page in the given layout and theme. `title` customises the main heading. */
export function buildLayout(id: LayoutId, t: Theme, title?: string, opts: LayoutOptions = {}): Page {
  const d = drawWith(t);
  const { p } = d;
  const icons = opts.motif ? MOTIFS[opts.motif].icons : DEFAULT_ICONS;

  switch (id) {
    /* ---------- Structure ---------- */

    case "copertina":
      return d.page("Copertina", p.coverBg, [
        d.shape({ x: 1040, y: -220, w: 780, h: 780 }, p.accent, { ellipse: true, enter: "zoom", opacity: 0.9 }),
        d.figure({ x: 1180, y: 440, w: 380, h: 380 }, "ring", p.accent2, { enter: "zoom", delay: 0.2 }),
        d.shape({ x: 990, y: 200, w: 48, h: 48 }, p.accent2, { ellipse: true, enter: "pop", delay: 0.4 }),
        d.shape({ x: 120, y: 250, w: 96, h: 10 }, p.accent2, { radius: 5, enter: "slide-left", delay: 0.1 }),
        d.text({ x: 120, y: 290, w: 900, h: 270 }, title ?? "Il titolo della presentazione", { size: 104, title: true, color: p.coverTitle, enter: "slide-up", lineHeight: 1.02 }),
        d.text({ x: 120, y: 580, w: 820, h: 90 }, "Una riga che dice di cosa parlerai", { size: 34, color: p.coverSub, delay: 0.3, lineHeight: 1.3 }),
      ], "fade", true);

    case "sezione":
      return d.page("Sezione", p.coverBg, [
        d.text({ x: 820, y: 40, w: 760, h: 620 }, "01", { size: 400, title: true, color: p.accent2, align: "right", enter: "blur", opacity: 0.35, lineHeight: 1 }),
        d.shape({ x: 120, y: 330, w: 160, h: 10 }, p.accent2, { radius: 5, enter: "slide-left" }),
        d.text({ x: 120, y: 370, w: 980, h: 250 }, title ?? "Titolo della sezione", { size: 88, title: true, color: p.coverTitle, enter: "slide-up", delay: 0.15, lineHeight: 1.05 }),
        d.text({ x: 120, y: 640, w: 900, h: 70 }, "Una frase che introduce questa parte", { size: 32, color: p.coverSub, delay: 0.35 }),
      ], "slide-left", true);

    case "chiusura":
      return d.page("Chiusura", p.coverBg, [
        d.figure({ x: -220, y: 470, w: 640, h: 640 }, "ring", p.accent, { enter: "zoom" }),
        d.shape({ x: 1260, y: -160, w: 480, h: 480 }, p.accent2, { ellipse: true, enter: "zoom", delay: 0.15, opacity: 0.3 }),
        d.text({ x: 200, y: 250, w: 1200, h: 200 }, title ?? "Grazie!", { size: 128, title: true, color: p.coverTitle, align: "center", enter: "pop", lineHeight: 1 }),
        d.text({ x: 200, y: 480, w: 1200, h: 70 }, "Domande? Parliamone insieme.", { size: 36, color: p.coverSub, align: "center", delay: 0.3 }),
        ...[0, 1, 2].map((i) => d.shape({ x: 764 + i * 28, y: 600, w: 16, h: 16 }, p.accent2, { ellipse: true, enter: "pop", delay: 0.5 + i * 0.1 })),
      ], "zoom", true);

    case "agenda":
      return d.page("Indice", p.contentAlt, [
        d.text({ x: 120, y: 120, w: 500, h: 260 }, title ?? "Di cosa parleremo", { size: 72, title: true, enter: "slide-up", lineHeight: 1.05 }),
        d.shape({ x: 120, y: 410, w: 96, h: 10 }, p.accent, { radius: 5, enter: "slide-left", delay: 0.2 }),
        ...["Introduzione", "Il cuore dell'argomento", "Esempi pratici", "Conclusioni"].flatMap((s, i) => [
          d.text({ x: 700, y: 130 + i * 165, w: 140, h: 100 }, String(i + 1).padStart(2, "0"), { size: 64, title: true, color: p.accent, enter: "pop", delay: 0.2 + i * 0.15 }),
          d.text({ x: 860, y: 148 + i * 165, w: 620, h: 70 }, s, { size: 40, title: true, weight: "600", enter: "slide-left", delay: 0.25 + i * 0.15 }),
          d.shape({ x: 700, y: 268 + i * 165, w: 780, h: 3 }, p.card, { radius: 2, delay: 0.3 + i * 0.15 }),
        ]),
      ], "fade");

    /* ---------- Pages and layout ---------- */

    case "titolo-testo":
      return d.page("Titolo e testo", p.contentBg, [
        d.shape({ x: 120, y: 120, w: 12, h: 220 }, p.accent, { radius: 6, enter: "slide-up" }),
        d.text({ x: 170, y: 110, w: 540, h: 420 }, title ?? "Un titolo chiaro", { size: 68, title: true, enter: "slide-up", lineHeight: 1.05 }),
        d.text({ x: 800, y: 120, w: 680, h: 460 }, "Scrivi qui il messaggio della pagina in poche righe. Un'idea per pagina rende la presentazione più facile da seguire e da ricordare.", { size: 34, lineHeight: 1.5, delay: 0.25 }),
        d.shape({ x: 800, y: 620, w: 680, h: 170 }, p.contentAlt, { radius: 24, shadow: true, delay: 0.4 }),
        d.text({ x: 840, y: 650, w: 600, h: 110 }, "La frase da ricordare, in una riga", { size: 32, weight: "600", color: p.accent, delay: 0.5, lineHeight: 1.3 }),
      ], "slide-left");

    case "due-colonne":
      return d.page("Due colonne", p.contentBg, [
        d.heading(title ?? "Due punti di vista"),
        ...[0, 1].flatMap((i) => [
          d.shape({ x: 120 + i * 700, y: 250, w: 660, h: 560 }, i ? p.card : p.contentAlt, { radius: 32, shadow: !i, enter: "slide-up", delay: 0.15 + i * 0.15 }),
          d.shape({ x: 170 + i * 700, y: 300, w: 170, h: 52 }, p.accent, { radius: 26, delay: 0.3 + i * 0.15 }),
          d.text({ x: 170 + i * 700, y: 308, w: 170, h: 40 }, i ? "Dopo" : "Prima", { size: 24, weight: "600", color: p.onAccent, align: "center", delay: 0.3 + i * 0.15 }),
          d.text({ x: 170 + i * 700, y: 390, w: 560, h: 70 }, "Titolo della colonna", { size: 40, title: true, weight: "600", delay: 0.35 + i * 0.15 }),
          d.text({ x: 170 + i * 700, y: 470, w: 560, h: 300 }, "Scrivi qui il contenuto: un confronto, pro e contro, teoria e pratica.", { size: 30, lineHeight: 1.45, delay: 0.4 + i * 0.15 }),
        ]),
      ], "slide-left");

    case "tre-colonne":
      return d.page("Tre colonne", p.contentBg, [
        d.heading(title ?? "Tre idee, una pagina"),
        ...[0, 1, 2].flatMap((i) => [
          d.shape({ x: 120 + i * 470, y: 250, w: 420, h: 560 }, p.contentAlt, { radius: 28, shadow: true, enter: "slide-up", delay: 0.1 + i * 0.15 }),
          d.shape({ x: 160 + i * 470, y: 290, w: 120, h: 120 }, i === 1 ? p.accent2 : p.accent, { ellipse: true, enter: "pop", delay: 0.25 + i * 0.15 }),
          d.figure({ x: 190 + i * 470, y: 320, w: 60, h: 60 }, icons[i % icons.length], i === 1 ? p.title : p.onAccent, { enter: "pop", delay: 0.3 + i * 0.15 }),
          d.text({ x: 160 + i * 470, y: 450, w: 340, h: 60 }, ["Primo punto", "Secondo punto", "Terzo punto"][i], { size: 38, title: true, weight: "600", delay: 0.35 + i * 0.15 }),
          d.text({ x: 160 + i * 470, y: 520, w: 340, h: 240 }, "Una o due frasi che spiegano il punto.", { size: 28, lineHeight: 1.45, delay: 0.4 + i * 0.15 }),
        ]),
      ], "slide-up");

    case "confronto":
      return d.page("Confronto", p.contentBg, [
        d.shape({ x: 0, y: 0, w: 800, h: 900 }, p.contentAlt, { radius: 0, enter: "slide-left" }),
        d.shape({ x: 800, y: 0, w: 800, h: 900 }, p.card, { radius: 0, enter: "slide-left", delay: 0.1, opacity: 0.6 }),
        d.text({ x: 200, y: 90, w: 1200, h: 80 }, title ?? "Le due opzioni a confronto", { size: 48, title: true, align: "center", enter: "slide-up" }),
        ...[0, 1].flatMap((i) => [
          d.text({ x: 120 + i * 800, y: 230, w: 560, h: 80 }, i ? "Opzione B" : "Opzione A", { size: 52, title: true, color: i ? p.accent2 : p.accent, delay: 0.2 + i * 0.2 }),
          ...["Un vantaggio concreto", "Un limite da sapere", "Quando sceglierla"].map((s, j) =>
            d.text({ x: 120 + i * 800, y: 360 + j * 130, w: 540, h: 100 }, `• ${s}`, { size: 32, lineHeight: 1.35, enter: "slide-up", delay: 0.3 + i * 0.2 + j * 0.1 }),
          ),
        ]),
        d.shape({ x: 715, y: 375, w: 170, h: 170 }, p.accent, { ellipse: true, enter: "pop", delay: 0.6, shadow: true }),
        d.text({ x: 715, y: 418, w: 170, h: 84 }, "VS", { size: 60, title: true, color: p.onAccent, align: "center", enter: "pop", delay: 0.65 }),
      ], "fade");

    case "icone":
      return d.page("Griglia di icone", p.contentBg, [
        d.heading(title ?? "Sei cose da sapere"),
        ...[0, 1, 2, 3, 4, 5].flatMap((i) => {
          const x = 120 + (i % 3) * 470;
          const y = 260 + Math.floor(i / 3) * 280;
          const delay = 0.15 + i * 0.1;
          return [
            d.shape({ x, y, w: 110, h: 110 }, p.card, { radius: 32, enter: "pop", delay }),
            d.figure({ x: x + 25, y: y + 25, w: 60, h: 60 }, icons[i % icons.length], p.accent, { enter: "pop", delay: delay + 0.05 }),
            d.text({ x: x + 140, y: y + 6, w: 290, h: 50 }, `Voce ${i + 1}`, { size: 32, title: true, weight: "600", delay: delay + 0.1 }),
            d.text({ x: x + 140, y: y + 60, w: 290, h: 110 }, "Una riga di spiegazione.", { size: 24, color: p.muted, lineHeight: 1.4, delay: delay + 0.1 }),
          ];
        }),
      ], "slide-up");

    /* ---------- Photos and text ---------- */

    case "foto-piena":
      return d.page("Foto a tutta pagina", p.coverBg, [
        d.photo({ x: 0, y: 0, w: 1600, h: 900 }, { radius: 0, enter: "zoom" }),
        d.shape({ x: 0, y: 560, w: 1600, h: 340 }, p.coverBg, { radius: 0, opacity: 0.82, enter: "slide-up", delay: 0.2 }),
        d.shape({ x: 120, y: 610, w: 80, h: 8 }, p.accent2, { radius: 4, enter: "slide-left", delay: 0.35 }),
        d.text({ x: 120, y: 640, w: 1300, h: 110 }, title ?? "Una foto che racconta tutto", { size: 76, title: true, color: p.coverTitle, enter: "slide-up", delay: 0.3, lineHeight: 1.05 }),
        d.text({ x: 120, y: 760, w: 1200, h: 44 }, "Una riga per dire dove e quando", { size: 26, color: p.coverSub, delay: 0.45 }),
      ], "fade", true);

    case "immagine-testo":
      return d.page("Foto e testo", p.contentAlt, [
        d.photo({ x: 0, y: 0, w: 760, h: 900 }, { radius: 0, enter: "slide-left" }),
        d.shape({ x: 860, y: 170, w: 80, h: 8 }, p.accent, { radius: 4, enter: "slide-left", delay: 0.2 }),
        d.text({ x: 860, y: 200, w: 620, h: 200 }, title ?? "Una storia da raccontare", { size: 64, title: true, enter: "slide-up", delay: 0.1, lineHeight: 1.05 }),
        d.text({ x: 860, y: 420, w: 600, h: 300 }, "Accompagna la foto con poche righe: cosa si vede, perché conta, cosa ricordare.", { size: 32, lineHeight: 1.5, delay: 0.3 }),
      ], "fade");

    case "mosaico":
      return d.page("Mosaico di foto", p.contentBg, [
        d.text({ x: 120, y: 120, w: 470, h: 280 }, title ?? "Uno sguardo d'insieme", { size: 64, title: true, enter: "slide-up", lineHeight: 1.05 }),
        d.shape({ x: 120, y: 420, w: 80, h: 8 }, p.accent, { radius: 4, enter: "slide-left", delay: 0.2 }),
        d.text({ x: 120, y: 460, w: 460, h: 300 }, "Più foto raccontano un luogo, un evento o un progetto meglio di una sola.", { size: 30, lineHeight: 1.45, delay: 0.3 }),
        d.photo({ x: 650, y: 90, w: 500, h: 450 }, { enter: "zoom", delay: 0.1, radius: 24 }),
        d.photo({ x: 650, y: 560, w: 240, h: 250 }, { enter: "zoom", delay: 0.2, radius: 24 }),
        d.photo({ x: 910, y: 560, w: 240, h: 250 }, { enter: "zoom", delay: 0.3, radius: 24 }),
        d.photo({ x: 1170, y: 90, w: 310, h: 720 }, { enter: "zoom", delay: 0.4, radius: 24 }),
      ], "fade");

    case "citazione":
      return d.page("Citazione", p.coverBg, [
        d.text({ x: 100, y: 0, w: 400, h: 420 }, "“", { size: 400, title: true, color: p.accent2, enter: "pop", opacity: 0.9, lineHeight: 1 }),
        d.text({ x: 220, y: 280, w: 1160, h: 300 }, title ?? "La semplicità è la suprema sofisticazione.", { size: 62, title: true, weight: "600", color: p.coverTitle, italic: true, lineHeight: 1.25, enter: "blur", delay: 0.2 }),
        d.shape({ x: 220, y: 640, w: 64, h: 6 }, p.accent2, { radius: 3, enter: "slide-left", delay: 0.4 }),
        d.text({ x: 310, y: 618, w: 900, h: 50 }, "Leonardo da Vinci", { size: 30, color: p.coverSub, delay: 0.5 }),
      ], "fade", true);

    case "elenco":
      return d.page("Elenco", p.contentBg, [
        d.heading(title ?? "I punti chiave"),
        ...["Il primo concetto", "Il secondo, con un esempio", "Il terzo, che lega i primi due", "La conclusione"].flatMap((s, i) => {
          const x = 120 + (i % 2) * 700;
          const y = 270 + Math.floor(i / 2) * 270;
          const delay = 0.2 + i * 0.15;
          return [
            d.shape({ x, y, w: 14, h: 170 }, i % 3 ? p.accent2 : p.accent, { radius: 7, enter: "slide-up", delay }),
            d.text({ x: x + 44, y: y - 4, w: 600, h: 60 }, s, { size: 38, title: true, weight: "600", enter: "slide-left", delay }),
            d.text({ x: x + 44, y: y + 64, w: 600, h: 110 }, "Una frase che lo spiega a chi ascolta.", { size: 28, lineHeight: 1.45, delay: delay + 0.05 }),
          ];
        }),
      ], "slide-left");

    /* ---------- Numbers and diagrams ---------- */

    case "numeri":
      return d.page("Numeri", p.contentBg, [
        d.heading(title ?? "I numeri che contano"),
        ...[["120%", "di crescita", "rispetto all'anno scorso"], ["3.000", "persone", "coinvolte nel progetto"], ["4,8", "su 5", "la valutazione media"]].flatMap(([n, l, s], i) => [
          d.shape({ x: 120 + i * 470, y: 290, w: 420, h: 6 }, i === 1 ? p.accent2 : p.accent, { radius: 3, enter: "slide-left", delay: 0.15 + i * 0.2 }),
          d.text({ x: 120 + i * 470, y: 320, w: 440, h: 170 }, n, { size: 132, title: true, color: i === 1 ? p.accent2 : p.accent, enter: "pop", delay: 0.2 + i * 0.2, lineHeight: 1 }),
          d.text({ x: 120 + i * 470, y: 500, w: 420, h: 56 }, l, { size: 34, title: true, weight: "600", delay: 0.3 + i * 0.2 }),
          d.text({ x: 120 + i * 470, y: 560, w: 420, h: 90 }, s, { size: 26, color: p.muted, delay: 0.35 + i * 0.2 }),
        ]),
      ], "slide-up");

    case "percentuale":
      return d.page("Percentuale", p.contentBg, [
        d.heading(title ?? "Un dato in un colpo d'occhio"),
        d.figure({ x: 160, y: 240, w: 540, h: 540 }, "ring", p.card, { enter: "zoom" }),
        { ...d.figure({ x: 160, y: 240, w: 540, h: 540 }, "arc", p.accent, { enter: "zoom", delay: 0.2 }), progress: 72 } as Element,
        d.text({ x: 200, y: 430, w: 460, h: 150 }, "72%", { size: 128, title: true, color: p.accent, align: "center", enter: "pop", delay: 0.4, lineHeight: 1 }),
        d.text({ x: 820, y: 300, w: 660, h: 150 }, "Cosa misura questo numero", { size: 48, title: true, weight: "600", enter: "slide-up", delay: 0.3, lineHeight: 1.15 }),
        d.text({ x: 820, y: 470, w: 640, h: 220 }, "Spiega in due righe perché conta. Per cambiare l'arco seleziona il cerchio colorato e regola la percentuale.", { size: 28, lineHeight: 1.45, delay: 0.45 }),
        d.text({ x: 820, y: 720, w: 640, h: 40 }, "Fonte: da dove viene il dato", { size: 22, color: p.muted, delay: 0.55 }),
      ], "fade");

    case "linea-tempo":
      return d.page("Linea del tempo", p.contentAlt, [
        d.heading(title ?? "Le tappe"),
        d.shape({ x: 160, y: 497, w: 1280, h: 6 }, p.card, { radius: 3, enter: "slide-left" }),
        ...["2023", "2024", "2025", "Oggi"].flatMap((y, i) => {
          const cx = 280 + i * 347;
          const delay = 0.3 + i * 0.25;
          return [
            d.shape({ x: cx - 22, y: 478, w: 44, h: 44 }, i === 3 ? p.accent2 : p.accent, { ellipse: true, enter: "pop", delay }),
            d.shape({ x: cx - 2, y: 420, w: 4, h: 50 }, p.card, { radius: 2, delay }),
            d.text({ x: cx - 150, y: 340, w: 300, h: 70 }, y, { size: 48, title: true, color: i === 3 ? p.accent2 : p.accent, align: "center", delay }),
            d.text({ x: cx - 150, y: 560, w: 300, h: 160 }, "Cosa è successo in questa tappa.", { size: 26, align: "center", lineHeight: 1.4, delay: delay + 0.05 }),
          ];
        }),
      ], "slide-left");

    case "processo":
      return d.page("Processo", p.contentBg, [
        d.heading(title ?? "Come funziona, passo dopo passo"),
        ...["Si parte", "Si prepara", "Si realizza", "Si verifica"].flatMap((s, i) => {
          const x = 120 + i * 340;
          const delay = 0.2 + i * 0.2;
          return [
            d.figure({ x, y: 290, w: 360, h: 150 }, i ? "chevron" : "arrow", p.accent, { enter: "slide-left", delay, opacity: 1 - i * 0.12 }),
            d.text({ x: x + (i ? 110 : 60), y: 322, w: 130, h: 90 }, String(i + 1), { size: 64, title: true, color: p.onAccent, align: "center", enter: "pop", delay: delay + 0.1, lineHeight: 1.2 }),
            d.text({ x: x + 20, y: 480, w: 300, h: 60 }, s, { size: 34, title: true, weight: "600", delay: delay + 0.1 }),
            d.text({ x: x + 20, y: 545, w: 290, h: 200 }, "Cosa succede in questo passaggio.", { size: 26, lineHeight: 1.4, delay: delay + 0.15 }),
          ];
        }),
      ], "slide-left");

    case "piramide": {
      const levels = [
        { x: 367, w: 220, y: 250, shape: "triangle" as const },
        { x: 277, w: 400, y: 426, shape: "trapezoid" as const },
        { x: 120, w: 714, y: 602, shape: "trapezoid" as const },
      ];
      return d.page("Piramide", p.contentBg, [
        d.heading(title ?? "Dalla base alla cima"),
        ...levels.flatMap((l, i) => [
          d.figure({ x: l.x, y: l.y, w: l.w, h: 160 }, l.shape, i === 0 ? p.accent2 : p.accent, { enter: "slide-up", delay: 0.6 - i * 0.2 }),
          ...(i ? [d.text({ x: l.x + 60, y: l.y + 56, w: l.w - 120, h: 50 }, ["", "Livello 2", "Livello 3"][i], { size: 30, weight: "600", color: p.onAccent, align: "center", delay: 0.7 - i * 0.2 })] : []),
          d.connector(l.x + l.w - (i ? l.w * 0.11 : l.w * 0.25) + 20, l.y + 80, 900, l.y + 80, p.card, 4, 0.8),
          d.text({ x: 920, y: l.y + 20, w: 560, h: 56 }, ["La cima: l'obiettivo", "Il livello di mezzo", "La base: da qui si parte"][i], { size: 34, title: true, weight: "600", delay: 0.8 + i * 0.1 }),
          d.text({ x: 920, y: l.y + 80, w: 560, h: 70 }, "Cosa contiene questo livello.", { size: 26, color: p.muted, delay: 0.85 + i * 0.1 }),
        ]),
      ], "slide-up");
    }

    case "mappa": {
      const center = { x: 800, y: 480 };
      const nodes = [
        { x: 120, y: 200 }, { x: 120, y: 415 }, { x: 120, y: 630 },
        { x: 1180, y: 200 }, { x: 1180, y: 415 }, { x: 1180, y: 630 },
      ];
      return d.page("Mappa concettuale", p.contentBg, [
        d.text({ x: 120, y: 70, w: 1360, h: 90 }, title ?? "Tutto parte da un'idea", { size: 52, title: true, align: "center", enter: "slide-up" }),
        ...nodes.map((n, i) => d.connector(center.x, center.y, n.x + 150, n.y + 65, p.card, 8, 0.2 + i * 0.05)),
        d.shape({ x: 590, y: 360, w: 420, h: 240 }, p.accent, { ellipse: true, enter: "zoom", delay: 0.1, shadow: true }),
        d.text({ x: 630, y: 440, w: 340, h: 80 }, "Idea centrale", { size: 42, title: true, color: p.onAccent, align: "center", enter: "pop", delay: 0.2 }),
        ...nodes.flatMap((n, i) => [
          d.shape({ x: n.x, y: n.y, w: 300, h: 130 }, p.contentAlt, { radius: 24, shadow: true, enter: "pop", delay: 0.35 + i * 0.1 }),
          d.shape({ x: n.x, y: n.y, w: 10, h: 130 }, i % 2 ? p.accent2 : p.accent, { radius: 5, enter: "pop", delay: 0.35 + i * 0.1 }),
          d.text({ x: n.x + 30, y: n.y + 38, w: 250, h: 56 }, `Concetto ${i + 1}`, { size: 30, weight: "600", color: p.title, delay: 0.4 + i * 0.1 }),
        ]),
      ], "zoom");
    }

    /* ---------- Interactivity ---------- */

    case "esplora":
      return d.page("Esplora", p.contentBg, [
        d.heading(title ?? "Tocca i punti luminosi", { size: 52, box: { x: 120, y: 80, w: 1360, h: 90 } }),
        d.photo({ x: 120, y: 200, w: 940, h: 610 }, { radius: 28 }),
        d.hotspot(360, 340, "1", d.popup("Primo dettaglio", "Spiega qui cosa si vede in questo punto.")),
        d.hotspot(780, 560, "2", d.popup("Secondo dettaglio", "Aggiungi un approfondimento, una data o un esempio."), 0.6),
        d.shape({ x: 1120, y: 200, w: 360, h: 610 }, p.contentAlt, { radius: 28, shadow: true, delay: 0.2 }),
        d.text({ x: 1160, y: 240, w: 290, h: 60 }, "Come si usa", { size: 32, title: true, weight: "600", delay: 0.3 }),
        d.text({ x: 1160, y: 310, w: 290, h: 440 }, "Ogni punto apre un approfondimento. Chi guarda esplora la foto al proprio ritmo.", { size: 26, lineHeight: 1.45, delay: 0.4 }),
      ], "slide-left");

    case "schede": {
      const els: Element[] = [d.heading(title ?? "Clicca le schede per scoprire")];
      ["Curiosità", "Esempio", "Definizione"].forEach((label, i) => {
        const hiddenText = d.text({ x: 160 + i * 470, y: 440, w: 340, h: 320 }, "Il contenuto nascosto appare qui, al clic sulla scheda.", { size: 30, lineHeight: 1.4, enter: "pop" });
        hiddenText.hidden = true;
        els.push(
          d.shape({ x: 120 + i * 470, y: 250, w: 420, h: 560 }, p.contentAlt, { radius: 32, shadow: true, enter: "slide-up", delay: 0.15 * i }),
          d.figure({ x: 290 + i * 470, y: 560, w: 80, h: 80 }, icons[(i + 3) % icons.length], p.card, { delay: 0.3 + 0.15 * i }),
          d.button({ x: 160 + i * 470, y: 290, w: 340, h: 110 }, label, d.reveal(hiddenText), { fill: i === 1 ? p.accent2 : p.accent, color: i === 1 ? p.title : p.onAccent, delay: 0.3 + 0.15 * i }),
          hiddenText,
        );
      });
      return d.page("Schede", p.contentBg, els, "fade");
    }

    /* ---------- Paths and quizzes ---------- */

    case "domanda": {
      const ok = d.text({ x: 160, y: 590, w: 1280, h: 80 }, "Giusto!", { size: 44, color: p.ok, weight: "600", align: "center", enter: "pop" });
      const ko = d.text({ x: 160, y: 590, w: 1280, h: 80 }, "Non proprio, riprova.", { size: 44, color: p.ko, weight: "600", align: "center", enter: "pop" });
      ok.hidden = true;
      ko.hidden = true;
      return d.page("Domanda", p.contentBg, [
        d.shape({ x: 720, y: 90, w: 160, h: 46 }, p.accent, { radius: 23, enter: "pop" }),
        d.text({ x: 720, y: 97, w: 160, h: 34 }, "Domanda", { size: 22, weight: "600", color: p.onAccent, align: "center", enter: "pop" }),
        d.text({ x: 160, y: 160, w: 1280, h: 180 }, title ?? "Scrivi qui la domanda", { size: 60, title: true, align: "center", enter: "slide-up", lineHeight: 1.15 }),
        d.button({ x: 160, y: 400, w: 620, h: 130 }, "A. Risposta giusta", d.reveal(ok), { fill: p.contentAlt, color: p.title, delay: 0.3, size: 32 }),
        d.button({ x: 820, y: 400, w: 620, h: 130 }, "B. Risposta sbagliata", d.reveal(ko), { fill: p.contentAlt, color: p.title, delay: 0.45, size: 32 }),
        ok,
        ko,
      ], "slide-left");
    }

    case "bivio":
      return d.page("Bivio", p.coverBg, [
        d.figure({ x: 700, y: 640, w: 200, h: 260 }, "triangle", p.accent2, { opacity: 0.25, enter: "slide-up" }),
        d.text({ x: 160, y: 120, w: 1280, h: 170 }, title ?? "Che strada scegli?", { size: 72, title: true, color: p.coverTitle, align: "center", enter: "slide-up" }),
        d.text({ x: 260, y: 300, w: 1080, h: 60 }, "Collega ogni pulsante a una pagina: Interazione, poi Vai a una pagina.", { size: 28, color: p.coverSub, align: "center", delay: 0.2 }),
        d.button({ x: 200, y: 450, w: 560, h: 170 }, "Strada A", d.tooltip("Collegami a una pagina in Interazione"), { fill: p.accent, delay: 0.4, size: 36 }),
        d.button({ x: 840, y: 450, w: 560, h: 170 }, "Strada B", d.tooltip("Collegami a una pagina in Interazione"), { fill: p.accent2, color: p.title, delay: 0.55, size: 36 }),
      ], "zoom", true);

    /* ---------- Present and share ---------- */

    case "contatti":
      return d.page("Contatti", p.coverBg, [
        d.figure({ x: 1100, y: 160, w: 560, h: 560 }, "ring", p.accent, { enter: "zoom", opacity: 0.8 }),
        d.text({ x: 120, y: 180, w: 960, h: 220 }, title ?? "Restiamo in contatto", { size: 92, title: true, color: p.coverTitle, enter: "slide-up", lineHeight: 1.02 }),
        ...([["bubble", "nome@esempio.it"], ["planet", "www.ilmiosito.it"], ["pin", "Via Roma 1, Milano"]] as const).flatMap(([icon, s], i) => [
          d.figure({ x: 120, y: 450 + i * 90, w: 52, h: 52 }, icon, p.accent2, { enter: "pop", delay: 0.3 + i * 0.12 }),
          d.text({ x: 200, y: 452 + i * 90, w: 860, h: 52 }, s, { size: 34, color: i ? p.coverSub : p.coverTitle, delay: 0.35 + i * 0.12 }),
        ]),
        d.text({ x: 120, y: 760, w: 960, h: 40 }, "Per il QR code della presentazione usa Condividi.", { size: 24, color: p.coverSub, delay: 0.6 }),
      ], "zoom", true);
  }
}
