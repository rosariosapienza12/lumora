import { style3D } from "../three/styles";
import type { Element, FontId, Page, PresentationDoc } from "./schema";
import type { SvgShape } from "./shapes";

/**
 * Visual themes: a palette of named roles and a pair of typefaces. Templates
 * and page layouts are drawn with roles, so the same layout looks right in
 * every theme, and switching theme remaps an existing presentation role by
 * role (colours the user picked by hand are left alone).
 */

export type Palette = {
  /** Cover and section pages. */
  coverBg: string;
  /** Optional second colour: cover pages become a gradient. */
  coverBg2?: string;
  coverTitle: string;
  coverSub: string;
  /** Content pages and a slightly different surface for alternating pages. */
  contentBg: string;
  contentAlt: string;
  title: string;
  text: string;
  muted: string;
  /** Cards and placeholders on content pages. */
  card: string;
  accent: string;
  accent2: string;
  /** Text on accent-coloured buttons. */
  onAccent: string;
  ok: string;
  ko: string;
};

/**
 * Art direction of a theme: not just colours, but how pages are composed.
 * - orbita: big orbs and rings, soft cards, a calm space feeling
 * - editoriale: magazine grid, hairline rules, oversized cropped titles, no boxes
 * - brutale: thick outlines, hard offset shadows, highlighter headings
 * - collage: tilted paper cards, tape strips, labels like stickers
 * - gesso: chalkboard, outlined cards, hand-drawn underlines and arrows
 * - neon: glowing outlines on dark, perspective grid, techy labels
 * - organico: soft blobs, very round cards, leaves of colour behind text
 */
export const STYLE_KINDS = ["orbita", "editoriale", "brutale", "collage", "gesso", "neon", "organico"] as const;
export type StyleKind = (typeof STYLE_KINDS)[number];
export const STYLE_NAMES: Record<StyleKind, string> = {
  orbita: "Orbite",
  editoriale: "Rivista",
  brutale: "Blocchi decisi",
  collage: "Collage",
  gesso: "Lavagna a gesso",
  neon: "Neon",
  organico: "Forme morbide",
};

/** Background textures a page can have. */
export const PATTERNS = ["none", "dots", "grid", "lines", "stars", "grain"] as const;
export type Pattern = (typeof PATTERNS)[number];

/**
 * Two themes may share an art direction, but never a composition: `variant`
 * moves the cover text (0 left, 1 right with mirrored art, 2 centred, 3 large at
 * the bottom) and `signature` is the theme's own drawing, used big on covers
 * and small as list marks.
 */
export type Theme = { id: string; name: string; mood: string; kind: StyleKind; variant: 0 | 1 | 2 | 3; signature: SvgShape; pattern?: Pattern; palette: Palette; fonts: { title: FontId; body: FontId } };

export const THEMES = [
  {
    id: "notte",
    variant: 0, signature: "planet",
    kind: "orbita", pattern: "stars",
    name: "Notte stellata",
    mood: "Viola profondo e ambra: il tema di Lumora.",
    palette: { coverBg: "#1d1a3a", coverTitle: "#ffffff", coverSub: "#c9c4ff", contentBg: "#f4f2ff", contentAlt: "#ffffff", title: "#1d1a3a", text: "#5d5a7a", muted: "#8a86a8", card: "#d9d3ff", accent: "#5b3df5", accent2: "#ffb547", onAccent: "#ffffff", ok: "#18a689", ko: "#d22f4f" },
    fonts: { title: "display", body: "sans" },
  },
  {
    id: "minimal",
    variant: 0, signature: "diamond",
    kind: "editoriale",
    name: "Minimal",
    mood: "Bianco, nero e un solo colore: lascia parlare i contenuti.",
    palette: { coverBg: "#fafafa", coverTitle: "#16161a", coverSub: "#6b6b76", contentBg: "#ffffff", contentAlt: "#f3f3f5", title: "#16161a", text: "#3a3a44", muted: "#8b8b96", card: "#e9e9ee", accent: "#16161a", accent2: "#e5484d", onAccent: "#ffffff", ok: "#1f9d55", ko: "#e5484d" },
    fonts: { title: "clean", body: "clean" },
  },
  {
    id: "aziendale",
    variant: 0, signature: "chart",
    kind: "brutale", pattern: "grid",
    name: "Aziendale",
    mood: "Blu affidabile e verde crescita, per pitch e riunioni.",
    palette: { coverBg: "#0f2747", coverBg2: "#1c4c8c", coverTitle: "#ffffff", coverSub: "#bcd2f0", contentBg: "#ffffff", contentAlt: "#f2f6fb", title: "#0f2747", text: "#33445c", muted: "#6b7a90", card: "#e3edf9", accent: "#1c64f2", accent2: "#00b37e", onAccent: "#ffffff", ok: "#00b37e", ko: "#e02424" },
    fonts: { title: "modern", body: "clean" },
  },
  {
    id: "accademico",
    variant: 2, signature: "book",
    kind: "editoriale", pattern: "lines",
    name: "Accademico",
    mood: "Blu notte, carta avorio e titoli con le grazie: tesi e relazioni.",
    palette: { coverBg: "#14213d", coverTitle: "#fdf8ec", coverSub: "#d9c9a3", contentBg: "#fdf8ec", contentAlt: "#fffdf7", title: "#14213d", text: "#2e3650", muted: "#6a6e80", card: "#efe4c8", accent: "#14213d", accent2: "#b08d57", onAccent: "#fdf8ec", ok: "#2f7d4f", ko: "#a63d40" },
    fonts: { title: "serif", body: "book" },
  },
  {
    id: "lavagna",
    variant: 0, signature: "pencil",
    kind: "gesso",
    name: "Lavagna",
    mood: "Verde lavagna e gesso colorato: lezioni in classe.",
    palette: { coverBg: "#1e3b32", coverTitle: "#f7f7f2", coverSub: "#cfe0d6", contentBg: "#24443a", contentAlt: "#2b5045", title: "#f7f7f2", text: "#e4ece6", muted: "#a9c2b5", card: "#335e51", accent: "#f2c94c", accent2: "#eb5757", onAccent: "#1e3b32", ok: "#7ee0a1", ko: "#ff8a80" },
    fonts: { title: "hand", body: "light" },
  },
  {
    id: "natura",
    variant: 0, signature: "leaf",
    kind: "organico",
    name: "Foresta",
    mood: "Verdi di bosco e luce calda: ambiente e scienze.",
    palette: { coverBg: "#1f3b2d", coverBg2: "#2f5d40", coverTitle: "#f4f1e4", coverSub: "#cfe3c4", contentBg: "#f4f1e4", contentAlt: "#fffdf4", title: "#1f3b2d", text: "#2f4a3a", muted: "#5f7564", card: "#d8e6c9", accent: "#4f8a4b", accent2: "#e3b23c", onAccent: "#ffffff", ok: "#2e7d32", ko: "#c0392b" },
    fonts: { title: "story", body: "sans" },
  },
  {
    id: "oceano",
    variant: 1, signature: "wave",
    kind: "orbita", pattern: "dots",
    name: "Oceano",
    mood: "Blu profondi e turchese: chiaro e rilassante.",
    palette: { coverBg: "#062a43", coverBg2: "#0b5d7a", coverTitle: "#ffffff", coverSub: "#a6e3f0", contentBg: "#eef8fb", contentAlt: "#ffffff", title: "#062a43", text: "#24475c", muted: "#5b7a8c", card: "#cdeef4", accent: "#0fa3b1", accent2: "#ffd166", onAccent: "#ffffff", ok: "#0f9d76", ko: "#e4572e" },
    fonts: { title: "geometric", body: "clean" },
  },
  {
    id: "tramonto",
    variant: 0, signature: "sun",
    kind: "collage", pattern: "grain",
    name: "Tramonto",
    mood: "Corallo e magenta in sfumatura: energia e creatività.",
    palette: { coverBg: "#ff7a59", coverBg2: "#c2306b", coverTitle: "#ffffff", coverSub: "#ffe0d2", contentBg: "#fff4ee", contentAlt: "#ffffff", title: "#4a1532", text: "#5c2d3f", muted: "#8a5c68", card: "#ffd9c7", accent: "#e8505b", accent2: "#ffb547", onAccent: "#ffffff", ok: "#2a9d8f", ko: "#c2306b" },
    fonts: { title: "magazine", body: "refined" },
  },
  {
    id: "pastello",
    variant: 1, signature: "cloud",
    kind: "organico", pattern: "dots",
    name: "Pastello",
    mood: "Lilla e menta, forme morbide: delicato e amichevole.",
    palette: { coverBg: "#f3e8ff", coverBg2: "#e3f6f1", coverTitle: "#4b3a75", coverSub: "#7c6aa8", contentBg: "#fffaf5", contentAlt: "#ffffff", title: "#4b3a75", text: "#5a4f73", muted: "#8a82a0", card: "#efe6ff", accent: "#9b7bff", accent2: "#5cc9a7", onAccent: "#ffffff", ok: "#3fae8c", ko: "#e5737f" },
    fonts: { title: "soft", body: "rounded" },
  },
  {
    id: "neon",
    variant: 0, signature: "circuit",
    kind: "neon", pattern: "grid",
    name: "Neon",
    mood: "Notte elettrica, fucsia e ciano: tecnologia e gaming.",
    palette: { coverBg: "#0b0b1a", coverBg2: "#1a0b2e", coverTitle: "#ffffff", coverSub: "#7ff6ff", contentBg: "#12122a", contentAlt: "#1b1b3a", title: "#ffffff", text: "#d9d9f2", muted: "#9b9bc4", card: "#24244a", accent: "#ff2bd6", accent2: "#2bf0ff", onAccent: "#0b0b1a", ok: "#3dffa0", ko: "#ff5470" },
    fonts: { title: "tech", body: "clean" },
  },
  {
    id: "retro",
    variant: 1, signature: "burst",
    kind: "collage", pattern: "grain",
    name: "Retrò",
    mood: "Senape, cacao e turchese anni Settanta.",
    palette: { coverBg: "#2b1b12", coverTitle: "#f6d55c", coverSub: "#f3e3c3", contentBg: "#f3e3c3", contentAlt: "#fbf3e0", title: "#2b1b12", text: "#4a3526", muted: "#7a5f4a", card: "#e8cfa0", accent: "#e07a2f", accent2: "#3caea3", onAccent: "#ffffff", ok: "#3caea3", ko: "#c8553d" },
    fonts: { title: "retro", body: "vintage" },
  },
  // Themes made for a topic (see motifs.ts); like the others, they work for anything.
  {
    id: "laboratorio",
    variant: 3, signature: "atom",
    kind: "editoriale", pattern: "grid",
    name: "Laboratorio",
    mood: "Bianco da laboratorio, verde acqua e corallo: esperimenti e scoperte.",
    palette: { coverBg: "#0e3b43", coverBg2: "#12606b", coverTitle: "#ffffff", coverSub: "#b7ece6", contentBg: "#f5fbfa", contentAlt: "#ffffff", title: "#0e3b43", text: "#2c4f55", muted: "#66868a", card: "#d4efeb", accent: "#0f8a80", accent2: "#ff7a5c", onAccent: "#fffffe", ok: "#1b9e5a", ko: "#d64545" },
    fonts: { title: "geometric", body: "clean" },
  },
  {
    id: "pergamena",
    variant: 2, signature: "crown",
    kind: "collage", pattern: "grain",
    name: "Pergamena",
    mood: "Carta antica, rosso porpora e oro: storia e grandi racconti.",
    palette: { coverBg: "#3b1f1a", coverTitle: "#f4e6c8", coverSub: "#d8c29a", contentBg: "#f6ecd6", contentAlt: "#fbf5e6", title: "#3b1f1a", text: "#4e3a2c", muted: "#85705a", card: "#ead8b2", accent: "#8c2f2b", accent2: "#c99a3c", onAccent: "#fffaf0", ok: "#4f7a3a", ko: "#a1342e" },
    fonts: { title: "classic", body: "book" },
  },
  {
    id: "galleria",
    variant: 1, signature: "frame",
    kind: "brutale",
    name: "Galleria",
    mood: "Pareti bianche, rosso e blu primari: arte e design.",
    palette: { coverBg: "#f2efe8", coverTitle: "#141414", coverSub: "#5d5a55", contentBg: "#fbfaf7", contentAlt: "#ffffff", title: "#141414", text: "#34322e", muted: "#807c75", card: "#e9e4d9", accent: "#d93425", accent2: "#2d4bd8", onAccent: "#fffffe", ok: "#2f8f4e", ko: "#c62828" },
    fonts: { title: "poster", body: "clean" },
  },
  {
    id: "palco",
    variant: 1, signature: "note",
    kind: "neon", pattern: "stars",
    name: "Palco",
    mood: "Luci di scena viola, giallo e fucsia: musica e spettacolo.",
    palette: { coverBg: "#1a0f2e", coverBg2: "#3b1250", coverTitle: "#ffffff", coverSub: "#e2c7ff", contentBg: "#1f1533", contentAlt: "#2a1d44", title: "#fffdf7", text: "#e6dcf5", muted: "#a998c4", card: "#3a2a5a", accent: "#ffd23f", accent2: "#ff4fa3", onAccent: "#1a0f2e", ok: "#4fe3a1", ko: "#ff6b6b" },
    fonts: { title: "impact", body: "sans" },
  },
  {
    id: "stadio",
    variant: 3, signature: "ball",
    kind: "brutale", pattern: "lines",
    name: "Stadio",
    mood: "Verde campo e arancione: sport, squadre e sfide.",
    palette: { coverBg: "#0c2a1f", coverBg2: "#11553a", coverTitle: "#ffffff", coverSub: "#c8f5d8", contentBg: "#f3f7f2", contentAlt: "#ffffff", title: "#0c2a1f", text: "#2b4237", muted: "#687a70", card: "#dcebdf", accent: "#e8590c", accent2: "#1db954", onAccent: "#fffffe", ok: "#1a8f47", ko: "#d93a2b" },
    fonts: { title: "condensed", body: "modern" },
  },
  {
    id: "trattoria",
    variant: 3, signature: "apple",
    kind: "collage", pattern: "grain",
    name: "Trattoria",
    mood: "Rosso pomodoro, crema e basilico: cibo e cucina.",
    palette: { coverBg: "#b8322a", coverBg2: "#e0533d", coverTitle: "#fffaf2", coverSub: "#ffd9c2", contentBg: "#fff8ec", contentAlt: "#ffffff", title: "#3a1d14", text: "#57362a", muted: "#8d6c5d", card: "#f6e2c8", accent: "#c8392f", accent2: "#4c8c3c", onAccent: "#fffffe", ok: "#3f8a3a", ko: "#a8261f" },
    fonts: { title: "slab", body: "story" },
  },
  {
    id: "orizzonte",
    variant: 2, signature: "mountain",
    kind: "organico", pattern: "dots",
    name: "Orizzonte",
    mood: "Petrolio e arancio tramonto su sabbia: viaggi e luoghi.",
    palette: { coverBg: "#0f4c5c", coverBg2: "#16697a", coverTitle: "#ffffff", coverSub: "#fde4cf", contentBg: "#fbf6ef", contentAlt: "#ffffff", title: "#0f4c5c", text: "#33525a", muted: "#7a8b8f", card: "#f1e3cf", accent: "#d35a10", accent2: "#0f8b8d", onAccent: "#fffffe", ok: "#2a9d68", ko: "#c0392b" },
    fonts: { title: "modern", body: "light" },
  },
  {
    id: "benessere",
    variant: 3, signature: "heart",
    kind: "organico",
    name: "Benessere",
    mood: "Menta, azzurro e corallo tenue: salute e cura di sé.",
    palette: { coverBg: "#e8f6f3", coverBg2: "#dceefe", coverTitle: "#134e4a", coverSub: "#3f7d76", contentBg: "#fbfefd", contentAlt: "#ffffff", title: "#0f4743", text: "#35605b", muted: "#6f8c88", card: "#d7efea", accent: "#0f8f7a", accent2: "#f06a6a", onAccent: "#fffffe", ok: "#13946f", ko: "#d9534f" },
    fonts: { title: "rounded", body: "clean" },
  },
] as const satisfies readonly Theme[];

export type ThemeId = (typeof THEMES)[number]["id"];
export const THEME_IDS = THEMES.map((t) => t.id) as [ThemeId, ...ThemeId[]];
export const DEFAULT_THEME: ThemeId = "notte";
export const isThemeId = (v: unknown): v is ThemeId => THEMES.some((t) => t.id === v);
export const getTheme = (id: string | undefined): Theme => THEMES.find((t) => t.id === id) ?? THEMES[0];

/** Roles, grouped by where a colour is used: the same hex can mean different things in each place. */
const BACKGROUND_ROLES = ["coverBg", "contentBg", "contentAlt", "card"] as const;
// Text on cover pages and on content pages: when two roles share a colour (white titles in a
// dark theme), the kind of page decides which one is meant.
const COVER_TEXT_ROLES = ["coverTitle", "coverSub", "accent2", "accent", "title", "text", "muted", "ok", "ko", "onAccent"] as const;
const CONTENT_TEXT_ROLES = ["title", "text", "muted", "accent", "accent2", "ok", "ko", "onAccent", "coverTitle", "coverSub"] as const;
const FILL_ROLES = ["accent", "accent2", "card", "contentAlt", "coverBg", "contentBg", "coverTitle", "ok", "ko"] as const;

function roleMap(from: Palette, to: Palette, roles: readonly (keyof Palette)[]) {
  const map = new Map<string, string>();
  for (const role of roles) {
    const a = from[role]?.toLowerCase();
    const b = to[role];
    if (a && b && !map.has(a)) map.set(a, b);
  }
  return (c: string) => map.get(c.toLowerCase()) ?? c;
}

/**
 * Restyles a presentation from one theme to another: page backgrounds, text,
 * shapes, buttons and hotspots move to the matching role of the new palette;
 * title and body typefaces follow. Anything coloured by hand stays as it is.
 */
export function applyTheme(doc: PresentationDoc, toId: ThemeId): PresentationDoc {
  const from = getTheme(doc.settings?.theme);
  const to = getTheme(toId);
  const bg = roleMap(from.palette, to.palette, BACKGROUND_ROLES);
  const coverInk = roleMap(from.palette, to.palette, COVER_TEXT_ROLES);
  const contentInk = roleMap(from.palette, to.palette, CONTENT_TEXT_ROLES);
  const fill = roleMap(from.palette, to.palette, FILL_ROLES);
  const font = (f: FontId): FontId => (f === from.fonts.title ? to.fonts.title : f === from.fonts.body ? to.fonts.body : f);

  const pages = doc.pages.map((p): Page => {
    const background = bg(p.background);
    const isCover = p.background.toLowerCase() === from.palette.coverBg.toLowerCase();
    const ink = isCover ? coverInk : contentInk;
    // Cover pages pick up the new theme's gradient (or lose the old one).
    const gradient =
      isCover && to.palette.coverBg2 ? { color2: to.palette.coverBg2, angle: p.angle ?? 135 }
      : isCover && from.palette.coverBg2 && p.color2?.toLowerCase() === from.palette.coverBg2.toLowerCase() ? { color2: undefined, angle: undefined }
      : p.color2 ? { color2: bg(p.color2) }
      : {};
    const elements = p.elements.map((e): Element => {
      switch (e.type) {
        case "text":
          return { ...e, color: ink(e.color), font: font(e.font), ...(e.color2 ? { color2: ink(e.color2) } : {}) };
        case "shape":
          return { ...e, fill: fill(e.fill), ...(e.color2 ? { color2: fill(e.color2) } : {}), ...(e.stroke ? { stroke: fill(e.stroke) } : {}) };
        case "button":
          return { ...e, fill: fill(e.fill), color: ink(e.color), ...(e.font ? { font: font(e.font) } : {}), ...(e.color2 ? { color2: fill(e.color2) } : {}) };
        case "hotspot":
          return { ...e, fill: fill(e.fill) };
        case "image":
          return e.stroke ? { ...e, stroke: fill(e.stroke) } : e;
        case "object3d": {
          // Objects in the old theme's materials take the new theme's ones; hand-picked materials stay.
          const [a, b] = [style3D(from.id), style3D(to.id)];
          const material = e.material === a.material ? b.material : e.material === a.second ? b.second : e.material;
          return { ...e, material, fill: fill(e.fill), ...(e.color2 ? { color2: fill(e.color2) } : {}) };
        }
      }
    });
    return { ...p, background, ...gradient, elements };
  });
  return { ...doc, pages, settings: { ...doc.settings, autoAdvance: doc.settings?.autoAdvance ?? 0, theme: to.id as ThemeId } };
}
