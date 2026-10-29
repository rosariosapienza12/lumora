import { z } from "zod";

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

export const ENTER_ANIMATIONS = ["none", "fade", "slide-up", "slide-left", "zoom", "pop", "blur"] as const;
export const EMPHASIS_ANIMATIONS = ["none", "pulse", "wiggle", "float", "glow"] as const;
export const TRANSITIONS = ["none", "fade", "slide-left", "slide-up", "zoom", "flip"] as const;

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
};

const textEl = z.object({
  ...base,
  type: z.literal("text"),
  text: plainText(5000),
  fontSize: z.number().min(8).max(400),
  color,
  align: z.enum(["left", "center", "right"]),
  weight: z.enum(["400", "600", "800"]),
  font: z.enum(["sans", "display"]),
});

const shapeEl = z.object({
  ...base,
  type: z.literal("shape"),
  shape: z.enum(["rect", "ellipse"]),
  fill: color,
  radius: z.number().min(0).max(800),
});

const imageEl = z.object({
  ...base,
  type: z.literal("image"),
  src: httpsUrl,
  alt: plainText(300),
  fit: z.enum(["cover", "contain"]),
  radius: z.number().min(0).max(800),
});

const buttonEl = z.object({
  ...base,
  type: z.literal("button"),
  label: plainText(80),
  fill: color,
  color,
  fontSize: z.number().min(8).max(200),
});

const hotspotEl = z.object({
  ...base,
  type: z.literal("hotspot"),
  fill: color,
  label: plainText(3),
});

export const element = z.discriminatedUnion("type", [textEl, shapeEl, imageEl, buttonEl, hotspotEl]);

export const page = z.object({
  id,
  name: plainText(80),
  background: color,
  transition: z.enum(TRANSITIONS).default("fade"),
  elements: z.array(element).max(MAX_ELEMENTS_PER_PAGE),
});

export const documentSchema = z
  .object({
    version: z.literal(1),
    pages: z.array(page).min(1).max(MAX_PAGES),
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
