import type { Element, EnterAnimation, Interaction, Page } from "./schema";
import { newId } from "./schema";
import type { StyleKind, Theme } from "./themes";
import type { ShapeId, SvgShape } from "./shapes";
import { MOTIFS } from "./motifs";
import type { MotifId } from "./motif-ids";
import { fitSize, nth, type Item, type PageContent } from "./content";

/**
 * Ready-made page layouts, drawn with theme roles so each one fits any theme,
 * and composed differently for each art direction (theme.kind): the same
 * "process" page is a row of glowing outlines in Neon, tilted paper cards with
 * tape in Collage, thick boxes with hard shadows in Brutale.
 *
 * Text and buttons stay inside the safe area x 120-1480, y 90-810 (see
 * .tastemaker/style-lock.md), so the margins are free for the topic
 * decorations. Text comes from a PageContent (written by Zib or the user) and
 * every block shrinks its font to fit, so real content never spills out.
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
  /** Shrink the size until the text fits its box (default for body text). */
  fit?: boolean;
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
  rotation?: number;
  /** Average letter width in em, for the fit: wider for big numbers and symbols. */
  charWidth?: number;
};
type ShapeOpts = { ellipse?: boolean; radius?: number; enter?: EnterAnimation; delay?: number; shadow?: boolean; opacity?: number; rotation?: number; stroke?: string; strokeWidth?: number };

/** Element builders bound to a theme and its art direction. */
export function drawWith(t: Theme) {
  const p = t.palette;
  const kind: StyleKind = t.kind;

  const text = (box: Box, s: string, o: TextOpts = {}): Element => {
    const lineHeight = o.lineHeight ?? (o.title ? 1.08 : 1.4);
    const max = o.size ?? 34;
    const size = o.fit === false ? max : fitSize(s, box.w, box.h, max, Math.min(max, o.title ? 28 : 18), lineHeight, o.charWidth ?? (o.title ? 0.62 : 0.5));
    return {
      ...base(o.enter ?? "fade", o.delay),
      ...box,
      ...(o.opacity !== undefined ? { opacity: o.opacity } : {}),
      ...(o.rotation ? { rotation: o.rotation } : {}),
      type: "text",
      text: s,
      fontSize: size,
      color: o.color ?? (o.title ? p.title : p.text),
      align: o.align ?? "left",
      weight: o.weight ?? (o.title ? "800" : "400"),
      font: o.title ? t.fonts.title : t.fonts.body,
      ...(o.italic ? { italic: true } : {}),
      lineHeight,
      ...(o.spacing ? { letterSpacing: o.spacing } : {}),
    };
  };
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
    ...(o.stroke ? { stroke: o.stroke, strokeWidth: o.strokeWidth ?? 3 } : {}),
  });
  /** A drawing or geometric shape from shapes.ts. */
  const figure = (box: Box, k: ShapeId, fill: string, o: Omit<ShapeOpts, "ellipse"> = {}): Element => ({ ...shape(box, fill, o), shape: k, radius: 0 }) as Element;
  /** Space for a photo, drawn as a card until a real photo takes its place. */
  const photoBox = (box: Box, o: { radius?: number; delay?: number; enter?: EnterAnimation; rotation?: number } = {}): Element =>
    ({ ...shape(box, p.card, { radius: o.radius ?? radius, enter: o.enter ?? "fade", delay: o.delay, rotation: o.rotation }), photoSlot: true }) as Element;
  const button = (box: Box, label: string, interaction: Interaction | null, o: { fill?: string; color?: string; delay?: number; size?: number } = {}): Element => ({
    ...base("pop", o.delay),
    ...box,
    interaction,
    type: "button",
    label: label.slice(0, 80),
    fill: o.fill ?? p.accent,
    color: o.color ?? p.onAccent,
    fontSize: o.size ?? 30,
    font: t.fonts.body,
  });
  const hotspot = (x: number, y: number, label: string, interaction: Interaction, delay = 0.4): Element => ({ ...base("pop", delay), x, y, w: 80, h: 80, interaction, type: "hotspot", fill: p.accent2, label });
  const page = (name: string, background: string, elements: Element[], transition: Page["transition"] = "fade", cover = false): Page => ({
    id: newId(),
    name,
    background,
    ...(cover && p.coverBg2 ? { color2: p.coverBg2, angle: 135 } : {}),
    ...(t.pattern && t.pattern !== "none" ? { pattern: t.pattern } : {}),
    transition,
    elements,
  });
  const goto = (target: Page): Interaction => ({ trigger: "click", action: { kind: "goto", pageId: target.id } });
  const popup = (title: string, body: string): Interaction => ({ trigger: "click", action: { kind: "popup", title: title.slice(0, 120), body } });
  const reveal = (target: Element): Interaction => ({ trigger: "click", action: { kind: "reveal", targetId: target.id } });
  const tooltip = (s: string): Interaction => ({ trigger: "hover", action: { kind: "tooltip", text: s } });
  /** A straight segment from one point to another (a rotated thin rectangle). */
  const connector = (x1: number, y1: number, x2: number, y2: number, fill: string, thick = 8, delay = 0): Element => {
    const len = Math.hypot(x2 - x1, y2 - y1);
    const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
    return shape({ x: Math.round((x1 + x2) / 2 - len / 2), y: Math.round((y1 + y2) / 2 - thick / 2), w: Math.round(len), h: thick }, fill, { radius: thick / 2, delay, rotation: Math.round(angle * 10) / 10 });
  };

  /* ---------- The art direction ---------- */

  const radius = { orbita: 32, editoriale: 0, brutale: 0, collage: 6, gesso: 18, neon: 14, organico: 56 }[kind];
  /** Small tilts for collage cards, so they look laid by hand. */
  const tilt = (i: number) => (kind === "collage" ? [-1.5, 1.2, -0.8, 1.6, -1.1, 0.9][i % 6] : 0);

  /** A card behind a block of content, drawn the way the art direction wants it. */
  const card = (box: Box, i = 0, o: { delay?: number; tone?: string } = {}): Element[] => {
    const delay = o.delay ?? 0.1 + i * 0.12;
    const fill = o.tone ?? p.contentAlt;
    switch (kind) {
      case "editoriale":
        // No boxes: a strong rule on top is enough on a magazine page.
        return [shape({ x: box.x, y: box.y, w: box.w, h: 4 }, p.title, { radius: 0, enter: "slide-left", delay })];
      case "brutale":
        return [
          shape({ ...box, x: box.x + 14, y: box.y + 14 }, p.title, { radius: 0, delay }),
          shape(box, fill, { radius: 0, stroke: p.title, strokeWidth: 5, enter: "slide-up", delay }),
        ];
      case "collage":
        return [
          shape(box, fill, { radius, shadow: true, rotation: tilt(i), enter: "zoom", delay }),
          shape({ x: box.x + box.w / 2 - 70, y: box.y - 20, w: 140, h: 40 }, p.accent2, { radius: 2, opacity: 0.8, rotation: tilt(i + 1) * 3, delay: delay + 0.1 }),
        ];
      case "gesso":
        return [shape(box, p.contentBg, { radius, stroke: p.text, strokeWidth: 3, enter: "fade", delay, opacity: 0.95 })];
      case "neon":
        return [shape(box, fill, { radius, stroke: i % 2 ? p.accent2 : p.accent, strokeWidth: 3, shadow: true, enter: "fade", delay })];
      case "organico":
        return [
          figure({ x: box.x - 40, y: box.y - 30, w: Math.min(220, box.w * 0.6), h: Math.min(200, box.h * 0.5) }, "blob", i % 2 ? p.accent2 : p.accent, { opacity: 0.18, delay, rotation: i * 40 }),
          shape(box, fill, { radius, shadow: true, enter: "slide-up", delay }),
        ];
      default:
        return [shape(box, fill, { radius, shadow: true, enter: "slide-up", delay })];
    }
  };

  /** The page title with the art direction's mark: dot, rule, highlighter, tape, chalk line, glow label, blob. */
  const heading = (s: string, o: { color?: string; size?: number; box?: Box; align?: "left" | "center" } = {}): Element[] => {
    const box = o.box ?? { x: 120, y: 90, w: 1360, h: 110 };
    const size = (o.size ?? 64) * (kind === "editoriale" ? 1.12 : 1);
    const title = text(box, s, { size, title: true, color: o.color ?? p.title, enter: "slide-up", align: o.align, lineHeight: 1.05 });
    const fs = (title as Extract<Element, { type: "text" }>).fontSize;
    const est = Math.min(box.w, s.length * fs * 0.55);
    const left = o.align === "center" ? box.x + (box.w - est) / 2 : box.x;
    switch (kind) {
      case "editoriale":
        return [title, shape({ x: box.x, y: box.y + box.h + 8, w: box.w, h: 2 }, p.title, { radius: 0, enter: "slide-left", delay: 0.2, opacity: 0.6 })];
      case "brutale":
        return [shape({ x: left - 8, y: box.y + fs * 0.55, w: Math.min(est + 16, box.w), h: fs * 0.5 }, p.accent, { radius: 0, enter: "slide-left", opacity: 0.85 }), title];
      case "collage":
        return [shape({ x: left - 14, y: box.y - 10, w: 120, h: 34 }, p.accent2, { radius: 2, rotation: -4, opacity: 0.85, enter: "pop" }), title];
      case "gesso":
        return [title, shape({ x: left, y: box.y + Math.min(box.h, fs * 1.15) + 4, w: Math.min(est, 420), h: 6 }, p.accent, { radius: 3, rotation: -1.2, enter: "slide-left", delay: 0.25 })];
      case "neon":
        return [shape({ x: left, y: box.y - 16, w: 72, h: 5 }, p.accent2, { radius: 3, enter: "slide-left" }), title];
      case "organico":
        return [figure({ x: left - 50, y: box.y - 40, w: 190, h: 160 }, "blob", p.accent, { opacity: 0.16, enter: "zoom" }), title];
      default:
        return [shape({ x: left, y: box.y - 14, w: 16, h: 16 }, p.accent2, { ellipse: true, enter: "pop" }), title];
    }
  };

  /** Small accent mark next to a list item. */
  const mark = (x: number, y: number, i: number, delay = 0): Element => {
    const fill = i % 2 ? p.accent2 : p.accent;
    switch (kind) {
      case "editoriale":
        return text({ x, y: y - 6, w: 70, h: 50 }, String(i + 1).padStart(2, "0"), { size: 32, title: true, color: p.accent, fit: false, delay });
      case "brutale":
        return shape({ x, y, w: 30, h: 30 }, fill, { radius: 0, stroke: p.title, strokeWidth: 4, delay, enter: "pop" });
      case "collage":
        return figure({ x, y, w: 34, h: 34 }, "star", fill, { delay, enter: "pop", rotation: tilt(i) * 8 });
      case "gesso":
        return figure({ x, y, w: 40, h: 28 }, "arrow", p.accent, { delay, enter: "slide-left" });
      case "neon":
        return shape({ x, y: y + 6, w: 30, h: 8 }, fill, { radius: 4, delay, enter: "slide-left", shadow: true });
      case "organico":
        return figure({ x, y, w: 34, h: 34 }, "leaf", fill, { delay, enter: "pop" });
      default:
        return shape({ x, y, w: 26, h: 26 }, fill, { ellipse: true, delay, enter: "pop" });
    }
  };

  return { p, kind, radius, tilt, text, shape, figure, photoBox, button, hotspot, page, goto, popup, reveal, tooltip, heading, connector, card, mark };
}

/* ---------- Cover, section and closing: a full composition per art direction ---------- */

type HeroRole = "cover" | "section" | "closing";

/** Background art for the cover family, kept away from where the text goes. */
function heroArt(d: Draw, role: HeroRole): Element[] {
  const { p } = d;
  const closing = role === "closing";
  switch (d.kind) {
    case "editoriale":
      return [
        d.shape({ x: 120, y: 110, w: 1360, h: 3 }, p.coverSub, { radius: 0, enter: "slide-left" }),
        d.shape({ x: 120, y: 790, w: 1360, h: 3 }, p.coverSub, { radius: 0, enter: "slide-left", delay: 0.1 }),
      ];
    case "brutale":
      return closing
        ? [d.shape({ x: -60, y: 640, w: 520, h: 320 }, p.accent, { radius: 0, enter: "slide-up" }), d.shape({ x: 1180, y: -40, w: 480, h: 260 }, p.accent2, { radius: 0, enter: "slide-left", delay: 0.1 })]
        : [
            d.shape({ x: 1120, y: 140, w: 380, h: 620 }, p.coverTitle, { radius: 0, enter: "slide-up", delay: 0.05 }),
            d.shape({ x: 1096, y: 116, w: 380, h: 620 }, p.accent, { radius: 0, enter: "slide-up", stroke: p.coverTitle, strokeWidth: 6 }),
            d.figure({ x: 1190, y: 330, w: 240, h: 240 }, "burst", p.accent2, { enter: "pop", delay: 0.3 }),
          ];
    case "collage":
      return closing
        ? [d.shape({ x: -80, y: 600, w: 460, h: 340 }, p.contentAlt, { radius: 6, rotation: 8, shadow: true }), d.shape({ x: 1240, y: -60, w: 420, h: 320 }, p.card, { radius: 6, rotation: -6, shadow: true })]
        : [
            d.shape({ x: 1000, y: 130, w: 470, h: 560 }, p.card, { radius: 6, rotation: 5, shadow: true, enter: "zoom" }),
            d.shape({ x: 1050, y: 190, w: 430, h: 520 }, p.contentAlt, { radius: 6, rotation: -3, shadow: true, enter: "zoom", delay: 0.1 }),
            d.shape({ x: 1180, y: 160, w: 170, h: 46 }, p.accent2, { radius: 2, rotation: -6, opacity: 0.85, delay: 0.3 }),
            d.figure({ x: 1150, y: 330, w: 220, h: 220 }, "star", p.accent, { rotation: 12, enter: "pop", delay: 0.35 }),
          ];
    case "gesso":
      return [
        d.figure({ x: closing ? 140 : 1080, y: closing ? 120 : 220, w: 360, h: 360 }, "ring", p.coverSub, { opacity: 0.5, enter: "zoom" }),
        d.figure({ x: closing ? 1240 : 1220, y: closing ? 620 : 600, w: 150, h: 150 }, "star", p.accent, { rotation: 15, enter: "pop", delay: 0.3 }),
        d.figure({ x: closing ? 1300 : 900, y: closing ? 140 : 140, w: 170, h: 90 }, "arrow", p.accent2, { rotation: closing ? 150 : 160, opacity: 0.85, delay: 0.4 }),
      ];
    case "neon":
      return [
        ...[0, 1, 2, 3, 4].map((i) => d.shape({ x: 0, y: 640 + i * 52, w: 1600, h: 2 }, p.accent, { radius: 0, opacity: 0.18 + i * 0.12, delay: i * 0.05 })),
        d.figure({ x: closing ? 560 : 1020, y: closing ? 300 : 120, w: closing ? 480 : 440, h: closing ? 480 : 440 }, "ring", p.accent, { enter: "zoom", shadow: true, opacity: closing ? 0.35 : 1 }),
        d.figure({ x: closing ? 1300 : 1130, y: closing ? 80 : 230, w: 220, h: 220 }, "ring", p.accent2, { enter: "zoom", delay: 0.2, opacity: 0.8 }),
      ];
    case "organico":
      return closing
        ? [d.figure({ x: -160, y: 560, w: 560, h: 480 }, "blob", p.accent, { opacity: 0.85, enter: "zoom" }), d.figure({ x: 1220, y: -120, w: 460, h: 420 }, "blob", p.accent2, { opacity: 0.7, rotation: 60, enter: "zoom", delay: 0.15 })]
        : [
            d.figure({ x: 980, y: 80, w: 620, h: 560 }, "blob", p.accent, { opacity: 0.9, enter: "zoom" }),
            d.figure({ x: 1180, y: 460, w: 380, h: 340 }, "blob", p.accent2, { rotation: 110, opacity: 0.85, enter: "zoom", delay: 0.15 }),
            d.figure({ x: 1110, y: 260, w: 200, h: 200 }, "leaf", p.coverBg, { opacity: 0.5, delay: 0.3 }),
          ];
    default:
      return closing
        ? [d.figure({ x: -220, y: 470, w: 640, h: 640 }, "ring", p.accent, { enter: "zoom" }), d.shape({ x: 1260, y: -160, w: 480, h: 480 }, p.accent2, { ellipse: true, enter: "zoom", delay: 0.15, opacity: 0.3 })]
        : [
            d.shape({ x: 1040, y: -220, w: 780, h: 780 }, p.accent, { ellipse: true, enter: "zoom", opacity: 0.9 }),
            d.figure({ x: 1180, y: 440, w: 380, h: 380 }, "ring", p.accent2, { enter: "zoom", delay: 0.2 }),
            d.shape({ x: 990, y: 200, w: 48, h: 48 }, p.accent2, { ellipse: true, enter: "pop", delay: 0.4 }),
          ];
  }
}

function hero(d: Draw, role: HeroRole, c: PageContent, defaults: { heading: string; subtitle: string; number?: string }): Page {
  const { p } = d;
  const editorial = d.kind === "editoriale";
  const heading = c.heading || defaults.heading;
  const sub = c.subtitle || defaults.subtitle;
  const els = heroArt(d, role);
  if (role === "closing") {
    els.push(
      d.text({ x: 200, y: 250, w: 1200, h: 220 }, heading, { size: editorial ? 150 : 124, title: true, color: p.coverTitle, align: "center", enter: "pop", lineHeight: 1 }),
      d.text({ x: 240, y: 500, w: 1120, h: 110 }, sub, { size: 36, color: p.coverSub, align: "center", delay: 0.3 }),
    );
    return d.page(heading.slice(0, 80) || "Chiusura", p.coverBg, els, "zoom", true);
  }
  if (role === "section") {
    const n = defaults.number ?? "01";
    els.push(
      d.text({ x: 120, y: editorial ? 130 : 200, w: 400, h: 200 }, n, { size: editorial ? 190 : 150, title: true, color: p.accent2, fit: false, enter: "blur", lineHeight: 1 }),
      d.text({ x: 120, y: 420, w: 940, h: 240 }, heading, { size: 88, title: true, color: p.coverTitle, enter: "slide-up", delay: 0.15, lineHeight: 1.04 }),
      d.text({ x: 120, y: 680, w: 900, h: 100 }, sub, { size: 32, color: p.coverSub, delay: 0.35 }),
    );
    return d.page(heading.slice(0, 80) || "Sezione", p.coverBg, els, "slide-left", true);
  }
  els.push(
    d.text(editorial ? { x: 120, y: 260, w: 1360, h: 380 } : { x: 120, y: 260, w: 900, h: 330 }, heading, {
      size: editorial ? 140 : 104,
      title: true,
      color: p.coverTitle,
      enter: "slide-up",
      lineHeight: editorial ? 0.98 : 1.02,
    }),
    d.text({ x: 120, y: editorial ? 670 : 620, w: 860, h: 110 }, sub, { size: 34, color: p.coverSub, delay: 0.3, lineHeight: 1.35 }),
  );
  return d.page("Copertina", p.coverBg, els, "fade", true);
}

/* ---------- The layouts ---------- */

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

/** Layouts that can show the same content: "Cambia impaginazione" moves between them. */
export const LAYOUT_FAMILIES: LayoutId[][] = [
  ["copertina", "foto-piena"],
  ["sezione", "citazione"],
  ["titolo-testo", "immagine-testo", "mosaico"],
  ["elenco", "tre-colonne", "icone", "processo", "linea-tempo", "piramide", "mappa", "schede", "agenda"],
  ["due-colonne", "confronto"],
  ["numeri", "percentuale"],
  ["domanda"],
  ["bivio"],
  ["chiusura", "contatti"],
  ["esplora", "immagine-testo"],
];

const DEFAULT_ICONS: SvgShape[] = ["bulb", "star", "heart", "gear", "chart", "pin"];

export type LayoutOptions = {
  /** Topic of the presentation: icon layouts use its drawings. */
  motif?: MotifId;
  /** Drawings chosen for the topic (they win over the preset). */
  icons?: SvgShape[];
};

const ph = (i: number, what: string) => `${what} ${i + 1}`;
const items = (c: PageContent, n: number, fallback: (i: number) => Item): Item[] => Array.from({ length: n }, (_, i) => nth(c.items, i, fallback(i)));
/** How many items the content has, between min and max (placeholders fill up to min). */
const count = (c: PageContent, min: number, max: number) => Math.max(min, Math.min(max, c.items?.length ?? 0));

/**
 * Builds one page in the given layout and theme. `content` is the page's
 * words (or just its heading); anything missing becomes a placeholder that
 * says what to write.
 */
export function buildLayout(id: LayoutId, t: Theme, content?: PageContent | string, opts: LayoutOptions = {}): Page {
  const c: PageContent = typeof content === "string" ? { heading: content } : (content ?? {});
  const page = drawLayout(id, t, c, opts);
  return { ...page, source: { layout: id, content: c } };
}

function drawLayout(id: LayoutId, t: Theme, c: PageContent, opts: LayoutOptions): Page {
  const d = drawWith(t);
  const { p } = d;
  const icons = opts.icons?.length ? opts.icons : opts.motif ? MOTIFS[opts.motif].icons : DEFAULT_ICONS;
  const H = (fallback: string) => c.heading || fallback;

  switch (id) {
    /* ---------- Structure ---------- */

    case "copertina":
      return hero(d, "cover", c, { heading: "Il titolo della presentazione", subtitle: "Una riga che dice di cosa parlerai" });
    case "sezione":
      return hero(d, "section", c, { heading: "Titolo della sezione", subtitle: "Una frase che introduce questa parte", number: c.stats?.[0]?.value });
    case "chiusura":
      return hero(d, "closing", c, { heading: "Grazie!", subtitle: "Domande? Parliamone insieme." });

    case "agenda": {
      const n = count(c, 4, 6);
      const list = items(c, n, (i) => ({ title: ["Introduzione", "Il cuore dell'argomento", "Esempi pratici", "Conclusioni", "Approfondimenti", "Domande"][i] }));
      const step = Math.min(165, 660 / n);
      return d.page("Indice", p.contentAlt, [
        ...d.heading(H("Di cosa parleremo"), { size: 72, box: { x: 120, y: 130, w: 500, h: 280 } }),
        ...list.flatMap((it, i) => [
          d.text({ x: 700, y: 130 + i * step, w: 140, h: 90 }, String(i + 1).padStart(2, "0"), { size: Math.min(64, step * 0.5), title: true, color: i % 2 ? p.accent2 : p.accent, enter: "pop", delay: 0.2 + i * 0.12, fit: false }),
          d.text({ x: 860, y: 140 + i * step, w: 620, h: step - 30 }, it.title, { size: 38, title: true, weight: "600", enter: "slide-left", delay: 0.25 + i * 0.12 }),
          d.shape({ x: 700, y: 130 + (i + 1) * step - 12, w: 780, h: 2 }, p.card, { radius: 1, delay: 0.3 + i * 0.12 }),
        ]),
      ], "fade");
    }

    /* ---------- Pages and layout ---------- */

    case "titolo-testo": {
      const editorial = d.kind === "editoriale";
      return d.page(H("Titolo e testo").slice(0, 80), p.contentBg, [
        ...d.heading(H("Un titolo chiaro"), { size: editorial ? 80 : 68, box: { x: 120, y: 110, w: 580, h: 440 } }),
        d.text({ x: 800, y: 120, w: 680, h: c.highlight ? 470 : 660 }, c.body || "Scrivi qui il messaggio della pagina in poche righe. Un'idea per pagina rende la presentazione più facile da seguire e da ricordare.", { size: 34, delay: 0.25, lineHeight: 1.5 }),
        ...(c.highlight !== "" ? [
          ...d.card({ x: 800, y: 630, w: 680, h: 170 }, 1, { delay: 0.4 }),
          d.text({ x: 840, y: 660, w: 600, h: 110 }, c.highlight || "La frase da ricordare, in una riga", { size: 30, weight: "600", color: p.accent, delay: 0.5, lineHeight: 1.3 }),
        ] : []),
      ], "slide-left");
    }

    case "due-colonne":
    case "confronto": {
      const vs = id === "confronto";
      const cols = items(c, 2, (i) => ({ title: vs ? (i ? "Opzione B" : "Opzione A") : i ? "Dopo" : "Prima", text: vs ? "Un vantaggio concreto\nUn limite da sapere\nQuando sceglierla" : "Scrivi qui il contenuto: un confronto, pro e contro, teoria e pratica." }));
      const els: Element[] = [...d.heading(H(vs ? "Le due opzioni a confronto" : "Due punti di vista"), { align: vs ? "center" : "left", size: vs ? 56 : 64 })];
      cols.forEach((col, i) => {
        const x = 120 + i * 720;
        const lines = (col.text ?? "").split("\n").filter(Boolean);
        els.push(
          ...d.card({ x, y: 250, w: 640, h: 560 }, i),
          d.text({ x: x + 40, y: 290, w: 560, h: 80 }, col.title, { size: 46, title: true, color: i ? p.accent2 : p.accent, delay: 0.3 + i * 0.15 }),
          d.text({ x: x + 40, y: 390, w: 560, h: 390 }, vs ? lines.map((l) => `• ${l}`).join("\n") : (col.text ?? ""), { size: 30, delay: 0.4 + i * 0.15, lineHeight: 1.5 }),
        );
      });
      if (vs) {
        els.push(
          d.shape({ x: 715, y: 440, w: 170, h: 170 }, p.accent, { ellipse: d.kind !== "brutale", radius: 0, enter: "pop", delay: 0.6, shadow: true, ...(d.kind === "brutale" ? { stroke: p.title, strokeWidth: 5 } : {}), rotation: d.kind === "collage" ? -8 : 0 }),
          d.text({ x: 715, y: 483, w: 170, h: 84 }, "VS", { size: 60, title: true, color: p.onAccent, align: "center", enter: "pop", delay: 0.65, fit: false }),
        );
      }
      return d.page(vs ? "Confronto" : "Due colonne", p.contentBg, els, vs ? "fade" : "slide-left");
    }

    case "tre-colonne": {
      const cols = items(c, 3, (i) => ({ title: ["Primo punto", "Secondo punto", "Terzo punto"][i], text: "Una o due frasi che spiegano il punto." }));
      return d.page("Tre colonne", p.contentBg, [
        ...d.heading(H("Tre idee, una pagina")),
        ...cols.flatMap((col, i) => {
          const x = 120 + i * 470;
          return [
            ...d.card({ x, y: 260, w: 420, h: 550 }, i),
            d.shape({ x: x + 40, y: 300, w: 110, h: 110 }, i === 1 ? p.accent2 : p.accent, { ellipse: d.kind !== "brutale" && d.kind !== "editoriale", radius: 0, enter: "pop", delay: 0.25 + i * 0.15 }),
            d.figure({ x: x + 67, y: 327, w: 56, h: 56 }, icons[i % icons.length], i === 1 ? p.title : p.onAccent, { enter: "pop", delay: 0.3 + i * 0.15 }),
            d.text({ x: x + 40, y: 440, w: 340, h: 70 }, col.title, { size: 36, title: true, weight: "600", delay: 0.35 + i * 0.15 }),
            d.text({ x: x + 40, y: 520, w: 340, h: 260 }, col.text ?? "", { size: 27, delay: 0.4 + i * 0.15 }),
          ];
        }),
      ], "slide-up");
    }

    case "icone": {
      const list = items(c, 6, (i) => ({ title: ph(i, "Voce"), text: "Una riga di spiegazione." }));
      return d.page("Griglia di icone", p.contentBg, [
        ...d.heading(H("Sei cose da sapere")),
        ...list.flatMap((it, i) => {
          const x = 120 + (i % 3) * 470;
          const y = 260 + Math.floor(i / 3) * 280;
          const delay = 0.15 + i * 0.1;
          return [
            d.shape({ x, y, w: 110, h: 110 }, d.kind === "neon" ? p.contentAlt : p.card, { radius: d.kind === "organico" ? 55 : Math.min(32, d.radius), enter: "pop", delay, ...(d.kind === "brutale" || d.kind === "gesso" || d.kind === "neon" ? { stroke: d.kind === "neon" ? p.accent : p.title, strokeWidth: d.kind === "brutale" ? 5 : 3 } : {}), rotation: d.tilt(i) * 3 }),
            d.figure({ x: x + 25, y: y + 25, w: 60, h: 60 }, icons[i % icons.length], p.accent, { enter: "pop", delay: delay + 0.05 }),
            d.text({ x: x + 140, y: y + 6, w: 290, h: 52 }, it.title, { size: 32, title: true, weight: "600", delay: delay + 0.1 }),
            d.text({ x: x + 140, y: y + 62, w: 290, h: 150 }, it.text ?? "", { size: 24, color: p.muted, delay: delay + 0.1 }),
          ];
        }),
      ], "slide-up");
    }

    /* ---------- Photos and text ---------- */

    case "foto-piena": {
      const band = d.kind === "editoriale" || d.kind === "brutale";
      return d.page("Foto a tutta pagina", p.coverBg, [
        d.photoBox({ x: 0, y: 0, w: 1600, h: 900 }, { radius: 0, enter: "zoom" }),
        band
          ? d.shape({ x: 80, y: 520, w: 1000, h: 300 }, p.coverBg, { radius: 0, enter: "slide-up", delay: 0.2, ...(d.kind === "brutale" ? { stroke: p.coverTitle, strokeWidth: 6 } : {}) })
          : d.shape({ x: 0, y: 560, w: 1600, h: 340 }, p.coverBg, { radius: 0, opacity: 0.82, enter: "slide-up", delay: 0.2 }),
        d.shape({ x: 120, y: 590, w: 80, h: 8 }, p.accent2, { radius: 4, enter: "slide-left", delay: 0.35 }),
        d.text({ x: 120, y: 620, w: band ? 920 : 1300, h: 130 }, H("Una foto che racconta tutto"), { size: 76, title: true, color: p.coverTitle, enter: "slide-up", delay: 0.3, lineHeight: 1.04 }),
        d.text({ x: 120, y: 756, w: band ? 920 : 1200, h: 48 }, c.subtitle || "Una riga per dire dove e quando", { size: 26, color: p.coverSub, delay: 0.45 }),
      ], "fade", true);
    }

    case "immagine-testo": {
      const framed = d.kind === "collage" || d.kind === "organico" || d.kind === "neon";
      return d.page("Foto e testo", p.contentAlt, [
        framed
          ? d.photoBox({ x: 100, y: 110, w: 640, h: 680 }, { rotation: d.tilt(0) * 2, enter: "zoom", radius: d.kind === "organico" ? 320 : d.radius })
          : d.photoBox({ x: 0, y: 0, w: 760, h: 900 }, { radius: 0, enter: "slide-left" }),
        ...d.heading(H("Una storia da raccontare"), { box: { x: 860, y: 180, w: 620, h: 220 } }),
        d.text({ x: 860, y: 430, w: 620, h: 370 }, c.body || "Accompagna la foto con poche righe: cosa si vede, perché conta, cosa ricordare.", { size: 31, delay: 0.3, lineHeight: 1.5 }),
      ], "fade");
    }

    case "mosaico":
      return d.page("Mosaico di foto", p.contentBg, [
        ...d.heading(H("Uno sguardo d'insieme"), { box: { x: 120, y: 130, w: 470, h: 280 } }),
        d.text({ x: 120, y: 450, w: 470, h: 350 }, c.body || "Più foto raccontano un luogo, un evento o un progetto meglio di una sola.", { size: 30, delay: 0.3 }),
        d.photoBox({ x: 650, y: 90, w: 500, h: 450 }, { enter: "zoom", delay: 0.1, rotation: d.tilt(0) }),
        d.photoBox({ x: 650, y: 560, w: 240, h: 250 }, { enter: "zoom", delay: 0.2, rotation: d.tilt(1) }),
        d.photoBox({ x: 910, y: 560, w: 240, h: 250 }, { enter: "zoom", delay: 0.3, rotation: d.tilt(2) }),
        d.photoBox({ x: 1170, y: 90, w: 310, h: 720 }, { enter: "zoom", delay: 0.4, rotation: d.tilt(3) }),
      ], "fade");

    case "citazione": {
      const q = c.quote ?? { text: c.heading || "La semplicità è la suprema sofisticazione.", author: c.subtitle || "Leonardo da Vinci" };
      const editorial = d.kind === "editoriale";
      return d.page("Citazione", p.coverBg, [
        d.text({ x: 100, y: 0, w: 400, h: 420 }, d.kind === "brutale" ? "!" : "“", { size: 400, title: true, color: p.accent2, enter: "pop", opacity: 0.9, lineHeight: 1, fit: false }),
        d.text({ x: 220, y: 260, w: 1160, h: 340 }, q.text, { size: editorial ? 70 : 60, title: true, weight: "600", color: p.coverTitle, italic: !editorial, lineHeight: 1.22, enter: "blur", delay: 0.2 }),
        d.shape({ x: 220, y: 650, w: 64, h: 6 }, p.accent2, { radius: 3, enter: "slide-left", delay: 0.4 }),
        d.text({ x: 310, y: 628, w: 900, h: 50 }, q.author, { size: 30, color: p.coverSub, delay: 0.5 }),
      ], "fade", true);
    }

    case "elenco": {
      const n = count(c, 4, 6);
      const list = items(c, n, (i) => ({ title: ["Il primo concetto", "Il secondo, con un esempio", "Il terzo, che lega i primi due", "La conclusione", "Un dettaglio in più", "L'ultima idea"][i], text: "Una frase che lo spiega a chi ascolta." }));
      const rows = Math.ceil(n / 2);
      const rowH = 540 / rows;
      return d.page("Elenco", p.contentBg, [
        ...d.heading(H("I punti chiave")),
        ...list.flatMap((it, i) => {
          const x = 120 + (i % 2) * 700;
          const y = 260 + Math.floor(i / 2) * rowH;
          const delay = 0.2 + i * 0.12;
          return [
            d.mark(x, y + 8, i, delay),
            d.text({ x: x + 80, y, w: 580, h: Math.min(60, rowH * 0.35) }, it.title, { size: 34, title: true, weight: "600", enter: "slide-left", delay }),
            d.text({ x: x + 80, y: y + Math.min(60, rowH * 0.35) + 6, w: 580, h: rowH - Math.min(60, rowH * 0.35) - 30 }, it.text ?? "", { size: 26, delay: delay + 0.05 }),
          ];
        }),
      ], "slide-left");
    }

    /* ---------- Numbers and diagrams ---------- */

    case "numeri": {
      const n = Math.max(2, Math.min(3, c.stats?.length ?? 3));
      const stats = Array.from({ length: n }, (_, i) => nth(c.stats, i, [{ value: "120%", label: "di crescita", text: "rispetto all'anno scorso" }, { value: "3.000", label: "persone", text: "coinvolte nel progetto" }, { value: "4,8", label: "su 5", text: "la valutazione media" }][i]));
      const w = 1360 / n;
      return d.page("Numeri", p.contentBg, [
        ...d.heading(H("I numeri che contano")),
        ...stats.flatMap((s, i) => {
          const x = 120 + i * w;
          const color = i === 1 ? p.accent2 : p.accent;
          return [
            ...(d.kind === "brutale" || d.kind === "neon" || d.kind === "collage" || d.kind === "organico" ? d.card({ x, y: 270, w: w - 50, h: 470 }, i) : [d.shape({ x, y: 290, w: w - 50, h: 6 }, color, { radius: 3, enter: "slide-left", delay: 0.15 + i * 0.2 })]),
            d.text({ x: x + 30, y: 320, w: w - 110, h: 170 }, s.value, { size: d.kind === "editoriale" ? 150 : 128, title: true, color, enter: "pop", delay: 0.2 + i * 0.2, lineHeight: 1, charWidth: 0.78 }),
            d.text({ x: x + 30, y: 500, w: w - 110, h: 60 }, s.label, { size: 34, title: true, weight: "600", delay: 0.3 + i * 0.2 }),
            d.text({ x: x + 30, y: 566, w: w - 110, h: 150 }, s.text ?? "", { size: 26, color: p.muted, delay: 0.35 + i * 0.2 }),
          ];
        }),
      ], "slide-up");
    }

    case "percentuale": {
      const s = nth(c.stats, 0, { value: "72%", label: "Cosa misura questo numero", text: "Spiega in due righe perché conta. Per cambiare l'arco seleziona il cerchio colorato e regola la percentuale." });
      const pct = Math.max(0, Math.min(100, Number.parseFloat(s.value.replace(",", ".")) || 0));
      return d.page("Percentuale", p.contentBg, [
        ...d.heading(H("Un dato in un colpo d'occhio")),
        d.figure({ x: 160, y: 240, w: 540, h: 540 }, "ring", d.kind === "neon" ? p.contentAlt : p.card, { enter: "zoom" }),
        { ...d.figure({ x: 160, y: 240, w: 540, h: 540 }, "arc", p.accent, { enter: "zoom", delay: 0.2, shadow: d.kind === "neon" }), progress: pct } as Element,
        d.text({ x: 210, y: 430, w: 440, h: 150 }, s.value, { size: 128, title: true, color: p.accent, align: "center", enter: "pop", delay: 0.4, lineHeight: 1, charWidth: 0.78 }),
        d.text({ x: 820, y: 280, w: 660, h: 170 }, s.label, { size: 48, title: true, weight: "600", enter: "slide-up", delay: 0.3, lineHeight: 1.15 }),
        d.text({ x: 820, y: 470, w: 640, h: 230 }, s.text ?? "", { size: 28, delay: 0.45 }),
        d.text({ x: 820, y: 720, w: 640, h: 60 }, c.highlight || "Fonte: da dove viene il dato", { size: 22, color: p.muted, delay: 0.55 }),
      ], "fade");
    }

    case "linea-tempo": {
      const n = count(c, 4, 5);
      const list = items(c, n, (i) => ({ title: ["2023", "2024", "2025", "Oggi", "Domani"][i], text: "Cosa è successo in questa tappa." }));
      const step = 1240 / n;
      return d.page("Linea del tempo", p.contentAlt, [
        ...d.heading(H("Le tappe")),
        d.shape({ x: 160, y: 497, w: 1280, h: d.kind === "brutale" ? 10 : 6 }, d.kind === "neon" ? p.accent : p.card, { radius: 3, enter: "slide-left", shadow: d.kind === "neon" }),
        ...list.flatMap((it, i) => {
          const cx = Math.round(160 + step / 2 + i * step);
          const delay = 0.3 + i * 0.2;
          const last = i === n - 1;
          return [
            d.shape({ x: cx - 22, y: 478, w: 44, h: 44 }, last ? p.accent2 : p.accent, { ellipse: d.kind !== "brutale", radius: 0, enter: "pop", delay, ...(d.kind === "brutale" ? { stroke: p.title, strokeWidth: 4 } : {}) }),
            d.text({ x: cx - step / 2 + 10, y: 330, w: step - 20, h: 120 }, it.title, { size: 44, title: true, color: last ? p.accent2 : p.accent, align: "center", delay }),
            d.text({ x: cx - step / 2 + 10, y: 550, w: step - 20, h: 250 }, it.text ?? "", { size: 25, align: "center", delay: delay + 0.05 }),
          ];
        }),
      ], "slide-left");
    }

    case "processo": {
      const n = count(c, 3, 5);
      const list = items(c, n, (i) => ({ title: ["Si parte", "Si prepara", "Si realizza", "Si verifica", "Si migliora"][i], text: "Cosa succede in questo passaggio." }));
      const step = 1360 / n;
      return d.page("Processo", p.contentBg, [
        ...d.heading(H("Come funziona, passo dopo passo")),
        ...list.flatMap((it, i) => {
          const x = Math.round(120 + i * step);
          const delay = 0.2 + i * 0.18;
          const chevron = d.kind === "gesso" || d.kind === "editoriale"
            ? d.figure({ x, y: 300, w: step + 10, h: 130 }, "arrow", p.accent, { enter: "slide-left", delay, opacity: d.kind === "gesso" ? 0.85 : 1 })
            : d.figure({ x, y: 290, w: step + 20, h: 150 }, i ? "chevron" : "arrow", i % 2 && d.kind !== "brutale" ? p.accent2 : p.accent, { enter: "slide-left", delay, ...(d.kind === "brutale" ? { stroke: p.title, strokeWidth: 4 } : {}), shadow: d.kind === "neon" || d.kind === "collage" });
          return [
            chevron,
            d.text({ x: x + step * 0.3, y: 318, w: step * 0.4, h: 90 }, String(i + 1), { size: 60, title: true, color: i % 2 && d.kind !== "brutale" && d.kind !== "gesso" && d.kind !== "editoriale" ? p.title : p.onAccent, align: "center", enter: "pop", delay: delay + 0.1, fit: false }),
            d.text({ x: x + 16, y: 470, w: step - 40, h: 64 }, it.title, { size: 32, title: true, weight: "600", delay: delay + 0.1 }),
            d.text({ x: x + 16, y: 540, w: step - 40, h: 260 }, it.text ?? "", { size: 25, delay: delay + 0.15 }),
          ];
        }),
      ], "slide-left");
    }

    case "piramide": {
      const list = items(c, 3, (i) => ({ title: ["La cima: l'obiettivo", "Il livello di mezzo", "La base: da qui si parte"][i], text: "Cosa contiene questo livello." }));
      const levels = [
        { x: 367, w: 220, y: 250, shape: "triangle" as const },
        { x: 277, w: 400, y: 426, shape: "trapezoid" as const },
        { x: 120, w: 714, y: 602, shape: "trapezoid" as const },
      ];
      return d.page("Piramide", p.contentBg, [
        ...d.heading(H("Dalla base alla cima")),
        ...levels.flatMap((l, i) => [
          d.figure({ x: l.x, y: l.y, w: l.w, h: 160 }, l.shape, i === 0 ? p.accent2 : p.accent, { enter: "slide-up", delay: 0.6 - i * 0.2, ...(d.kind === "brutale" ? { stroke: p.title, strokeWidth: 4 } : {}), shadow: d.kind === "neon" }),
          d.connector(l.x + l.w - (i ? l.w * 0.11 : l.w * 0.25) + 20, l.y + 80, 900, l.y + 80, p.card, 4, 0.8),
          d.text({ x: 920, y: l.y + 10, w: 560, h: 60 }, list[i].title, { size: 32, title: true, weight: "600", delay: 0.8 + i * 0.1 }),
          d.text({ x: 920, y: l.y + 74, w: 560, h: 90 }, list[i].text ?? "", { size: 24, color: p.muted, delay: 0.85 + i * 0.1 }),
        ]),
      ], "slide-up");
    }

    case "mappa": {
      const n = count(c, 4, 6);
      const list = items(c, n, (i) => ({ title: ph(i, "Concetto") }));
      const slots = [{ x: 120, y: 200 }, { x: 1180, y: 200 }, { x: 120, y: 630 }, { x: 1180, y: 630 }, { x: 120, y: 415 }, { x: 1180, y: 415 }].slice(0, n);
      const center = { x: 800, y: 480 };
      const round = d.kind !== "brutale" && d.kind !== "editoriale";
      return d.page("Mappa concettuale", p.contentBg, [
        d.text({ x: 120, y: 70, w: 1360, h: 90 }, H("Tutto parte da un'idea"), { size: 52, title: true, align: "center", enter: "slide-up" }),
        ...slots.map((s, i) => d.connector(center.x, center.y, s.x + 150, s.y + 65, d.kind === "neon" ? p.accent : p.card, d.kind === "brutale" ? 8 : 6, 0.2 + i * 0.05)),
        d.shape({ x: 590, y: 360, w: 420, h: 240 }, p.accent, { ellipse: round, radius: 0, enter: "zoom", delay: 0.1, shadow: true, ...(d.kind === "brutale" ? { stroke: p.title, strokeWidth: 6 } : {}) }),
        d.text({ x: 630, y: 410, w: 340, h: 140 }, c.highlight || "Idea centrale", { size: 40, title: true, color: p.onAccent, align: "center", enter: "pop", delay: 0.2 }),
        ...slots.flatMap((s, i) => [
          ...d.card({ x: s.x, y: s.y, w: 300, h: 130 }, i, { delay: 0.35 + i * 0.1 }),
          d.text({ x: s.x + 24, y: s.y + 20, w: 252, h: 90 }, list[i].title, { size: 28, weight: "600", color: p.title, delay: 0.4 + i * 0.1 }),
        ]),
      ], "zoom");
    }

    /* ---------- Interactivity ---------- */

    case "esplora": {
      const dots = items(c, 2, (i) => ({ title: ["Primo dettaglio", "Secondo dettaglio"][i], text: ["Spiega qui cosa si vede in questo punto.", "Aggiungi un approfondimento, una data o un esempio."][i] }));
      return d.page("Esplora", p.contentBg, [
        ...d.heading(H("Tocca i punti luminosi"), { size: 52, box: { x: 120, y: 80, w: 1360, h: 90 } }),
        d.photoBox({ x: 120, y: 200, w: 940, h: 610 }, { rotation: d.tilt(0) }),
        d.hotspot(360, 340, "1", d.popup(dots[0].title, dots[0].text ?? "")),
        d.hotspot(780, 560, "2", d.popup(dots[1].title, dots[1].text ?? ""), 0.6),
        ...d.card({ x: 1120, y: 200, w: 360, h: 610 }, 1, { delay: 0.2 }),
        d.text({ x: 1160, y: 240, w: 290, h: 60 }, "Come si usa", { size: 32, title: true, weight: "600", delay: 0.3 }),
        d.text({ x: 1160, y: 310, w: 290, h: 470 }, c.body || "Ogni punto apre un approfondimento. Chi guarda esplora la foto al proprio ritmo.", { size: 26, delay: 0.4 }),
      ], "slide-left");
    }

    case "schede": {
      const cards = items(c, 3, (i) => ({ title: ["Curiosità", "Esempio", "Definizione"][i], text: "Il contenuto nascosto appare qui, al clic sulla scheda." }));
      const els: Element[] = [...d.heading(H("Clicca le schede per scoprire"))];
      cards.forEach((it, i) => {
        const x = 120 + i * 470;
        const hiddenText = d.text({ x: x + 40, y: 440, w: 340, h: 330 }, it.text ?? "", { size: 28, enter: "pop" });
        hiddenText.hidden = true;
        els.push(
          ...d.card({ x, y: 250, w: 420, h: 560 }, i),
          d.figure({ x: x + 170, y: 560, w: 80, h: 80 }, icons[(i + 3) % icons.length], p.card, { delay: 0.3 + 0.15 * i }),
          d.button({ x: x + 40, y: 290, w: 340, h: 110 }, it.title, d.reveal(hiddenText), { fill: i === 1 ? p.accent2 : p.accent, color: i === 1 ? p.title : p.onAccent, delay: 0.3 + 0.15 * i }),
          hiddenText,
        );
      });
      return d.page("Schede", p.contentBg, els, "fade");
    }

    /* ---------- Paths and quizzes ---------- */

    case "domanda": {
      const q = c.question ?? { text: c.heading || "Scrivi qui la domanda", right: "Risposta giusta", wrong: "Risposta sbagliata" };
      const ok = d.text({ x: 160, y: 570, w: 1280, h: 110 }, q.explanation ? `Giusto! ${q.explanation}` : "Giusto!", { size: 38, color: p.ok, weight: "600", align: "center", enter: "pop" });
      const ko = d.text({ x: 160, y: 570, w: 1280, h: 110 }, "Non proprio, riprova.", { size: 38, color: p.ko, weight: "600", align: "center", enter: "pop" });
      ok.hidden = true;
      ko.hidden = true;
      // The right answer is not always on the left.
      const swap = q.text.length % 2 === 1;
      const btn = (x: number, label: string, target: Element, delay: number) =>
        d.button({ x, y: 390, w: 620, h: 140 }, label, d.reveal(target), { fill: d.kind === "neon" ? p.contentAlt : p.card, color: p.title, delay, size: 30 });
      return d.page("Domanda", p.contentBg, [
        d.shape({ x: 720, y: 90, w: 160, h: 46 }, p.accent, { radius: d.kind === "brutale" || d.kind === "editoriale" ? 0 : 23, enter: "pop", rotation: d.tilt(1) * 3 }),
        d.text({ x: 720, y: 97, w: 160, h: 34 }, "Domanda", { size: 22, weight: "600", color: p.onAccent, align: "center", enter: "pop", fit: false }),
        d.text({ x: 160, y: 160, w: 1280, h: 190 }, q.text, { size: 56, title: true, align: "center", enter: "slide-up", lineHeight: 1.15 }),
        btn(swap ? 820 : 160, `${swap ? "B" : "A"}. ${q.right}`, ok, 0.3),
        btn(swap ? 160 : 820, `${swap ? "A" : "B"}. ${q.wrong}`, ko, 0.45),
        ok,
        ko,
      ], "slide-left");
    }

    case "bivio": {
      const ways = items(c, 2, (i) => ({ title: i ? "Strada B" : "Strada A" }));
      return d.page("Bivio", p.coverBg, [
        d.figure({ x: 700, y: 640, w: 200, h: 260 }, "triangle", p.accent2, { opacity: 0.25, enter: "slide-up" }),
        d.text({ x: 160, y: 120, w: 1280, h: 170 }, H("Che strada scegli?"), { size: 72, title: true, color: p.coverTitle, align: "center", enter: "slide-up" }),
        d.text({ x: 260, y: 300, w: 1080, h: 60 }, c.subtitle || "Collega ogni pulsante a una pagina: Interazione, poi Vai a una pagina.", { size: 28, color: p.coverSub, align: "center", delay: 0.2 }),
        d.button({ x: 200, y: 450, w: 560, h: 170 }, ways[0].title, d.tooltip("Collegami a una pagina in Interazione"), { fill: p.accent, delay: 0.4, size: 36 }),
        d.button({ x: 840, y: 450, w: 560, h: 170 }, ways[1].title, d.tooltip("Collegami a una pagina in Interazione"), { fill: p.accent2, color: p.title, delay: 0.55, size: 36 }),
      ], "zoom", true);
    }

    /* ---------- Present and share ---------- */

    case "contatti": {
      const rows = items(c, 3, (i) => ({ title: ["nome@esempio.it", "www.ilmiosito.it", "Via Roma 1, Milano"][i] }));
      return d.page("Contatti", p.coverBg, [
        ...heroArt(d, "cover").slice(0, 2),
        d.text({ x: 120, y: 180, w: 900, h: 220 }, H("Restiamo in contatto"), { size: 92, title: true, color: p.coverTitle, enter: "slide-up", lineHeight: 1.02 }),
        ...(["bubble", "planet", "pin"] as const).flatMap((icon, i) => [
          d.figure({ x: 120, y: 450 + i * 90, w: 52, h: 52 }, icon, p.accent2, { enter: "pop", delay: 0.3 + i * 0.12 }),
          d.text({ x: 200, y: 452 + i * 90, w: 820, h: 56 }, rows[i].title, { size: 34, color: i ? p.coverSub : p.coverTitle, delay: 0.35 + i * 0.12 }),
        ]),
        d.text({ x: 120, y: 760, w: 900, h: 40 }, c.subtitle || "Per il QR code della presentazione usa Condividi.", { size: 24, color: p.coverSub, delay: 0.6 }),
      ], "zoom", true);
    }
  }
}

/** The family of layouts that can show the same content as `id`, in order. */
export function relatedLayouts(id: string): LayoutId[] {
  return LAYOUT_FAMILIES.find((f) => f.includes(id as LayoutId)) ?? [];
}
