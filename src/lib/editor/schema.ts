import { z } from "zod";
import { THEME_IDS } from "./themes";
import { SHAPE_IDS, SVG_SHAPE_IDS, type SvgShape } from "./shapes";
import { MOTIF_IDS } from "./motif-ids";
import { pageContentSchema } from "./content";
import { DECORATIONS } from "./decorations";
import { FORMS_3D, MATERIALS_3D, RELIEFS } from "../three/ids";
import { ICON_IDS, type IconId } from "./icons";
import { chartDataSchema } from "./chart";

/**
 * The presentation document. Everything a user can put in a presentation is
 * described here and validated on every save, so the server never stores
 * arbitrary JSON. Text is plain text rendered by React (never as HTML), and
 * every URL is restricted to https.
 */

export const CANVAS_W = 1600;
export const CANVAS_H = 900;
export const MAX_PAGES = 200;
export const MAX_ELEMENTS_PER_PAGE = 300;

const id = z.string().regex(/^[a-zA-Z0-9_-]{1,32}$/);
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const coord = z.number().finite().min(-CANVAS_W).max(CANVAS_W * 2);
const size = z.number().finite().min(1).max(CANVAS_W * 2);
const plainText = (max: number) => z.string().max(max);

const httpsUrl = z
  .string()
  .max(2048)
  .url()
  .refine((u) => {
    try {
      return new URL(u).protocol === "https:";
    } catch {
      return false;
    }
  }, "Solo link https");

/** Images: an https URL, or an image uploaded to Lumora (served from /a/<id>). */
export const ASSET_PATH = /^\/a\/[A-Za-z0-9_-]{22}$/;
const imageSrc = z.union([httpsUrl, z.string().regex(ASSET_PATH)]);

/** Typefaces available in presentations (loaded in src/app/layout.tsx). */
export const FONTS = ["display", "sans", "modern", "serif", "book", "rounded", "poster", "condensed", "tech", "hand", "script", "brush", "fancy", "mono", "clean", "geometric", "refined", "story", "slab", "impact", "magazine", "marker", "diary", "notebook", "retro", "soft", "classic", "vintage", "light", "playful", "pixel", "signature"] as const;
export type FontId = (typeof FONTS)[number];
export const FONT_LABELS: Record<FontId, string> = {
  display: "Titolo",
  sans: "Testo",
  modern: "Moderno",
  serif: "Elegante",
  book: "Libro",
  rounded: "Arrotondato",
  poster: "Manifesto",
  condensed: "Condensato",
  tech: "Tecnologico",
  hand: "A mano",
  script: "Calligrafico",
  brush: "Pennello",
  fancy: "Decorativo",
  mono: "Macchina da scrivere",
  clean: "Pulito",
  geometric: "Geometrico",
  refined: "Raffinato",
  story: "Racconto",
  slab: "Robusto",
  impact: "Impatto",
  magazine: "Rivista",
  marker: "Pennarello",
  diary: "Diario",
  notebook: "Quaderno",
  retro: "Retrò",
  soft: "Morbido",
  classic: "Classico",
  vintage: "Vintage",
  light: "Leggero",
  playful: "Giocoso",
  pixel: "Pixel",
  signature: "Firma",
};
export const FONT_FAMILY: Record<FontId, string> = {
  display: "var(--font-bricolage)",
  sans: "var(--font-instrument)",
  modern: "var(--font-montserrat)",
  serif: "var(--font-playfair)",
  book: "var(--font-merriweather)",
  rounded: "var(--font-nunito)",
  poster: "var(--font-bebas)",
  condensed: "var(--font-oswald)",
  tech: "var(--font-space)",
  hand: "var(--font-caveat)",
  script: "var(--font-dancing)",
  brush: "var(--font-pacifico)",
  fancy: "var(--font-lobster)",
  mono: "var(--font-mono)",
  clean: "var(--font-inter)",
  geometric: "var(--font-poppins)",
  refined: "var(--font-raleway)",
  story: "var(--font-lora)",
  slab: "var(--font-slab)",
  impact: "var(--font-archivo)",
  magazine: "var(--font-abril)",
  marker: "var(--font-marker)",
  diary: "var(--font-shadows)",
  notebook: "var(--font-indie)",
  retro: "var(--font-righteous)",
  soft: "var(--font-comfortaa)",
  classic: "var(--font-cinzel)",
  vintage: "var(--font-josefin)",
  light: "var(--font-quicksand)",
  playful: "var(--font-fredoka)",
  pixel: "var(--font-pixel)",
  signature: "var(--font-satisfy)",
};

export const ENTER_ANIMATIONS = ["none", "fade", "slide-up", "slide-left", "zoom", "pop", "blur"] as const;
export const EMPHASIS_ANIMATIONS = ["none", "pulse", "wiggle", "float", "glow"] as const;
export const TRANSITIONS = ["none", "fade", "slide-left", "slide-up", "zoom", "flip", "morph"] as const;

const animation = z.object({
  enter: z.enum(ENTER_ANIMATIONS).default("none"),
  emphasis: z.enum(EMPHASIS_ANIMATIONS).default("none"),
  duration: z.number().min(0.1).max(10).default(0.6),
  delay: z.number().min(0).max(30).default(0),
});

const action = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("tooltip"), text: plainText(500) }),
  z.object({ kind: z.literal("popup"), title: plainText(120), body: plainText(4000) }),
  z.object({ kind: z.literal("goto"), pageId: id }),
  z.object({ kind: z.literal("link"), url: httpsUrl }),
  z.object({ kind: z.literal("reveal"), targetId: id }),
]);

export const interaction = z.object({
  trigger: z.enum(["click", "hover"]),
  action,
});

const base = {
  id,
  x: coord,
  y: coord,
  w: size,
  h: size,
  rotation: z.number().min(-360).max(360).default(0),
  opacity: z.number().min(0).max(1).default(1),
  // Hidden in the viewer until a "reveal" interaction shows it.
  hidden: z.boolean().default(false),
  locked: z.boolean().default(false),
  animation: animation.default({ enter: "none", emphasis: "none", duration: 0.6, delay: 0 }),
  interaction: interaction.nullable().default(null),
  // Optional styling added later; absent in older documents.
  shadow: z.boolean().optional(),
  /** Mirror the element horizontally / vertically. */
  flipX: z.boolean().optional(),
  flipY: z.boolean().optional(),
  /** Topic decoration added by Lumora (leaves, chips...): replaced when the topic changes. */
  decor: z.boolean().optional(),
  /** The content field this text shows ("heading", "items.2.title"…): edits update the page's words. */
  bind: z.string().max(40).optional(),
  /** Added by hand on a page drawn from a layout: kept when the page re-composes itself. */
  extra: z.boolean().optional(),
};

/** Optional second colour and direction: turns a flat colour into a gradient. */
const gradient = {
  color2: color.optional(),
  angle: z.number().min(0).max(360).optional(),
};

const stroke = {
  stroke: color.optional(),
  strokeWidth: z.number().min(0).max(60).optional(),
};

const textEl = z.object({
  ...base,
  type: z.literal("text"),
  text: plainText(5000),
  fontSize: z.number().min(8).max(400),
  color,
  align: z.enum(["left", "center", "right"]),
  weight: z.enum(["400", "600", "800"]),
  font: z.enum(FONTS),
  italic: z.boolean().optional(),
  underline: z.boolean().optional(),
  lineHeight: z.number().min(0.8).max(3).optional(),
  letterSpacing: z.number().min(-10).max(50).optional(),
  ...gradient,
});

const shapeEl = z.object({
  ...base,
  type: z.literal("shape"),
  shape: z.enum(SHAPE_IDS),
  fill: color,
  radius: z.number().min(0).max(800),
  /** Space reserved for a photo: the editor and "con immagini" put a real photo in its place. */
  photoSlot: z.boolean().optional(),
  /** Share of the "arc" shape that is drawn, 0-100. */
  progress: z.number().min(0).max(100).optional(),
  /** Rectangle that fades from transparent (top) to its colour (bottom): a shade under words on a photo. */
  fade: z.boolean().optional(),
  /** Light and shadow that make a flat drawing look 3D. */
  relief: z.enum(RELIEFS).optional(),
  ...stroke,
  ...gradient,
});

/** A real 3D object, drawn by Lumora's renderer with light, shadow and material. */
const object3dEl = z.object({
  ...base,
  type: z.literal("object3d"),
  form: z.enum(FORMS_3D),
  material: z.enum(MATERIALS_3D),
  fill: color,
  /** Second colour: marble veins, neon glow, studio tint. */
  color2: color.optional(),
  tiltX: z.number().min(-180).max(180).optional(),
  tiltY: z.number().min(-180).max(180).optional(),
  /** Where the key light comes from, in degrees. */
  light: z.number().min(0).max(360).optional(),
  /** Turns slowly during the presentation. */
  spin: z.boolean().optional(),
  /** Description for screen readers. */
  alt: plainText(200).optional(),
});

const imageEl = z.object({
  ...base,
  type: z.literal("image"),
  src: imageSrc,
  alt: plainText(300),
  fit: z.enum(["cover", "contain"]),
  radius: z.number().min(0).max(800),
  /** Author and licence of a free photo (Wikimedia Commons), shown on the photo. */
  credit: plainText(300).optional(),
  /** The photo's page on Wikimedia Commons, with the full licence. */
  creditUrl: httpsUrl.optional(),
  ...stroke,
});

const buttonEl = z.object({
  ...base,
  type: z.literal("button"),
  label: plainText(80),
  fill: color,
  color,
  fontSize: z.number().min(8).max(200),
  font: z.enum(FONTS).optional(),
  ...gradient,
});

const hotspotEl = z.object({
  ...base,
  type: z.literal("hotspot"),
  fill: color,
  label: plainText(3),
});

/** A line icon from the icon library (icons.ts), in any colour. */
const iconEl = z.object({
  ...base,
  type: z.literal("icon"),
  icon: z.enum(ICON_IDS as [IconId, ...IconId[]]),
  color,
  strokeWidth: z.number().min(0.5).max(4).optional(),
});

/** A chart drawn from the numbers people type in (chart.ts). */
const chartEl = z.object({
  ...base,
  type: z.literal("chart"),
  data: chartDataSchema,
  /** Labels, values and axis text. */
  color,
  /** Grid lines and axis. */
  gridColor: color.optional(),
  font: z.enum(FONTS).optional(),
});

/** A live audience poll: in the presentation people vote from their phone (QR code) and the bars move. */
const pollEl = z.object({
  ...base,
  type: z.literal("poll"),
  question: plainText(160),
  options: z.array(plainText(60)).min(2).max(6),
  /** Bars and accents. */
  fill: color,
  /** Question and labels. */
  color,
  font: z.enum(FONTS).optional(),
});

export const element = z.discriminatedUnion("type", [textEl, shapeEl, imageEl, buttonEl, hotspotEl, object3dEl, iconEl, chartEl, pollEl]);

export const page = z.object({
  id,
  name: plainText(80),
  background: color,
  ...gradient,
  transition: z.enum(TRANSITIONS).default("fade"),
  elements: z.array(element).max(MAX_ELEMENTS_PER_PAGE),
  /** Background texture drawn over the colour. */
  pattern: z.enum(["none", "dots", "grid", "lines", "stars", "grain"]).optional(),
  /** The words and the layout the page was drawn from: lets "Cambia impaginazione" redraw it. */
  source: z.object({ layout: z.string().regex(/^[a-z-]{2,30}$/), content: pageContentSchema }).optional(),
  /** Background decoration in two colours (decorations.ts): never covers the content. */
  decoration: z.object({ style: z.enum(DECORATIONS), color, color2: color }).optional(),
  /** In the presentation, the page's blocks appear one per click. */
  build: z.boolean().optional(),
  /** Speaker notes: shown only to the presenter, never in the public viewer. */
  notes: plainText(5000).optional(),
});

export const settings = z.object({
  /** Seconds before moving to the next page automatically; 0 = off. */
  autoAdvance: z.number().int().min(0).max(300),
  /** Visual theme the presentation was built with (used to restyle it). */
  theme: z.enum(THEME_IDS).optional(),
  /** Topic of the presentation: decides the decorations at the page margins. */
  motif: z.enum(MOTIF_IDS).optional(),
  /** Drawings chosen for this presentation's topic (by Zib or by hand): they win over the preset topic. */
  decor: z.array(z.enum(SVG_SHAPE_IDS as [SvgShape, ...SvgShape[]])).min(1).max(6).optional(),
  /** Main colours picked by hand over the theme's own. */
  colors: z.object({ accent: color.optional(), accent2: color.optional() }).optional(),
  /** How many decorations per page: 0 none, 1 few, 2 normal, 3 many. */
  decorDensity: z.number().int().min(0).max(3).optional(),
  /** Materials and forms of the 3D objects, chosen by Zib or by hand over the theme's own. */
  look3d: z.object({ material: z.enum(MATERIALS_3D), second: z.enum(MATERIALS_3D), forms: z.tuple([z.enum(FORMS_3D), z.enum(FORMS_3D), z.enum(FORMS_3D)]) }).optional(),
});

export const documentSchema = z
  .object({
    version: z.literal(1),
    pages: z.array(page).min(1).max(MAX_PAGES),
    settings: settings.optional(),
  })
  .superRefine((doc, ctx) => {
    // References must point inside the document.
    const pageIds = new Set(doc.pages.map((p) => p.id));
    for (const p of doc.pages) {
      const elIds = new Set(p.elements.map((e) => e.id));
      for (const el of p.elements) {
        const a = el.interaction?.action;
        if (a?.kind === "goto" && !pageIds.has(a.pageId)) ctx.addIssue({ code: "custom", message: "Pagina di destinazione mancante" });
        if (a?.kind === "reveal" && !elIds.has(a.targetId)) ctx.addIssue({ code: "custom", message: "Elemento da rivelare mancante" });
      }
    }
  });

export type PresentationDoc = z.infer<typeof documentSchema>;
export type Page = z.infer<typeof page>;
export type Element = z.infer<typeof element>;
export type ElementType = Element["type"];
export type Interaction = z.infer<typeof interaction>;
export type EnterAnimation = (typeof ENTER_ANIMATIONS)[number];
export type EmphasisAnimation = (typeof EMPHASIS_ANIMATIONS)[number];
export type Transition = (typeof TRANSITIONS)[number];

export const MAX_DOC_BYTES = 1_500_000;

export function newId() {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  return Array.from(bytes, (b) => "abcdefghijklmnopqrstuvwxyz0123456789"[b % 36]).join("");
}

export function blankPage(name = "Pagina"): Page {
  return { id: newId(), name, background: "#ffffff", transition: "fade", elements: [] };
}

export function starterDocument(title: string): PresentationDoc {
  const p = blankPage("Copertina");
  p.background = "#1d1a3a";
  p.elements = [
    {
      id: newId(), type: "text", x: 160, y: 320, w: 1280, h: 160, rotation: 0, opacity: 1, hidden: false, locked: false,
      text: title, fontSize: 96, color: "#ffffff", align: "left", weight: "800", font: "display",
      animation: { enter: "slide-up", emphasis: "none", duration: 0.7, delay: 0 }, interaction: null,
    },
    {
      id: newId(), type: "text", x: 160, y: 500, w: 1100, h: 80, rotation: 0, opacity: 1, hidden: false, locked: false,
      text: "Clicca per modificare il sottotitolo", fontSize: 36, color: "#c9c4ff", align: "left", weight: "400", font: "sans",
      animation: { enter: "fade", emphasis: "none", duration: 0.6, delay: 0.3 }, interaction: null,
    },
  ];
  return { version: 1, pages: [p] };
}
