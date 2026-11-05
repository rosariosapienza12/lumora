import { style3D } from "../three/styles";
import type { Element, Page, PresentationDoc } from "./schema";
import { CANVAS_H, CANVAS_W, newId } from "./schema";
import type { SvgShape } from "./shapes";
import { getTheme, type Theme, type ThemeId } from "./themes";
import { MOTIF_IDS, type MotifId } from "./motif-ids";

export { MOTIF_IDS, isMotifId, type MotifId } from "./motif-ids";

/**
 * Topic decorations. A presentation about the environment gets leaves and
 * buildings at the page margins, one about computers gets chips, code and
 * circuits, and so on. Each topic also has its own theme, the drawings used by
 * the icon layouts and the words that recognise it in a request.
 *
 * Decorations are ordinary shapes marked `decor`, placed behind everything and
 * locked, so they can be restyled by a theme change, removed or swapped when
 * the topic changes, and never get in the way while editing.
 */

export type Motif = {
  name: string;
  /** Theme that suits the topic (the user can still pick any other). */
  theme: ThemeId;
  /** Drawings placed at the margins, in order of importance. */
  decor: SvgShape[];
  /** Drawings for icon grids and columns. */
  icons: SvgShape[];
  /** Word stems that recognise the topic ("pianet" finds "pianeti"); a trailing space means the whole word. */
  words: string[];
};

export const MOTIFS: Record<MotifId, Motif> = {
  eco: {
    name: "Ambiente",
    theme: "natura",
    decor: ["leaf", "building", "tree", "sprout"],
    icons: ["leaf", "tree", "sprout", "sun", "drop", "building"],
    words: ["ambient", "ecolog", "natura", "clima", "riciclo", "sostenibil", "inquinament", "piante", "fotosintes", "foresta", "bosco", "energia rinnovabil", "green", "citta verd", "rifiuti", "biodiversit", "animali"],
  },
  tecnologia: {
    name: "Tecnologia",
    theme: "neon",
    decor: ["chip", "code", "circuit", "gear"],
    icons: ["chip", "code", "circuit", "gear", "bulb", "rocket"],
    words: ["tecnolog", "informatic", "intelligenza artificiale", "programmazion", "coding", "robot", "computer", "software", "internet", "cybersecurity", "sicurezza informatica", "app ", "videogioc", "gaming", "digitale", "algoritm", "dati "],
  },
  spazio: {
    name: "Spazio",
    theme: "notte",
    decor: ["planet", "rocket", "star", "moon"],
    icons: ["planet", "rocket", "star", "moon", "sun", "atom"],
    words: ["spazio", "sistema solare", "pianet", "stelle", "stella", "universo", "astronom", "galassi", "luna", "marte", "astronaut", "cosmo"],
  },
  mare: {
    name: "Mare",
    theme: "oceano",
    decor: ["wave", "fish", "anchor", "drop"],
    icons: ["fish", "wave", "anchor", "drop", "sun", "pin"],
    words: ["mare", "oceano", "oceani", "acqua", "pesci", "balen", "spiagg", "marin", "coral", "fiume", "lago"],
  },
  scienza: {
    name: "Scienza",
    theme: "laboratorio",
    decor: ["flask", "atom", "bulb", "gear"],
    icons: ["flask", "atom", "bulb", "chart", "gear", "drop"],
    words: ["scienz", "chimic", "fisica", "biologi", "esperiment", "laboratori", "molecol", "cellul", "dna", "atom", "energia", "elettricit", "matematic", "geometri"],
  },
  storia: {
    name: "Storia",
    theme: "pergamena",
    decor: ["column", "crown", "book", "star"],
    icons: ["column", "crown", "book", "pin", "trophy", "star"],
    words: ["storia ", "storico", "impero", "guerra", "medioevo", "antica", "antico", "rinascimento", "romani", "greci", "egizi", "re ", "regno", "rivoluzion", "risorgimento", "civilta"],
  },
  arte: {
    name: "Arte",
    theme: "galleria",
    decor: ["palette", "brush", "frame", "star"],
    icons: ["palette", "brush", "frame", "star", "heart", "bulb"],
    words: ["arte", "artist", "pittur", "quadr", "museo", "design", "disegn", "scultur", "fotografi", "cinema", "moda", "creativ", "architettur"],
  },
  musica: {
    name: "Musica",
    theme: "palco",
    decor: ["note", "headphones", "mic", "star"],
    icons: ["note", "headphones", "mic", "star", "heart", "trophy"],
    words: ["musica", "musicist", "canzon", "concert", "band", "rock", "jazz", "opera", "strument", "chitarr", "pianofort", "cantant", "rap", "festival"],
  },
  business: {
    name: "Business",
    theme: "aziendale",
    decor: ["chart", "briefcase", "building", "trophy"],
    icons: ["chart", "briefcase", "building", "trophy", "bulb", "gear"],
    words: ["business", "azienda", "aziendal", "startup", "impresa", "prodotto", "vendit", "marketing", "clienti", "investitor", "pitch", "budget", "fatturato", "riunione", "economi", "finanz", "mercato", "strategi"],
  },
  scuola: {
    name: "Scuola",
    theme: "lavagna",
    decor: ["book", "pencil", "cap", "bulb"],
    icons: ["book", "pencil", "cap", "bulb", "star", "chart"],
    words: ["scuola", "classe", "studenti", "insegnant", "lezione", "compiti", "grammatica", "italiano", "inglese", "geografi", "verifica", "materia", "universit", "esame"],
  },
  sport: {
    name: "Sport",
    theme: "stadio",
    decor: ["ball", "trophy", "dumbbell", "star"],
    icons: ["ball", "trophy", "dumbbell", "heart", "star", "pin"],
    words: ["sport", "calcio", "basket", "pallavolo", "tennis", "nuoto", "olimpiad", "atlet", "squadra", "allenament", "palestra", "fitness", "corsa", "partita", "campionat"],
  },
  cibo: {
    name: "Cibo",
    theme: "trattoria",
    decor: ["apple", "cutlery", "cup", "leaf"],
    icons: ["apple", "cutlery", "cup", "leaf", "heart", "star"],
    words: ["cibo", "cucina", "ricett", "aliment", "mangiare", "dieta", "nutrizion", "pizza", "pasta", "ristorant", "frutta", "verdura", "dolci", "caffe", "vino"],
  },
  viaggi: {
    name: "Viaggi",
    theme: "orizzonte",
    decor: ["plane", "suitcase", "pin", "mountain"],
    icons: ["plane", "suitcase", "pin", "mountain", "sun", "planet"],
    words: ["viaggi", "turism", "vacanz", "citta ", "paesi", "paese ", "europa", "mondo", "itinerari", "geografi", "montagn", "visita", "gita"],
  },
  salute: {
    name: "Salute",
    theme: "benessere",
    decor: ["heart", "pulse", "pill", "cross"],
    icons: ["heart", "pulse", "pill", "cross", "apple", "dumbbell"],
    words: ["salute", "medicin", "medico", "ospedal", "benessere", "corpo umano", "malatti", "cuore", "prevenzion", "igiene", "vaccin", "psicolog", "sonno", "stress"],
  },
};

/** Lowercase, no accents, only letters and digits between single spaces. */
const prepare = (s: string) => ` ${s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim()} `;

/**
 * The topic of a free-text request ("una lezione sulle balene" → mare), or
 * undefined when nothing matches. The topic with the most hits wins; on a
 * tie, the one listed first.
 */
export function detectMotif(text: string): MotifId | undefined {
  const t = prepare(text);
  let best: { id: MotifId; hits: number } | undefined;
  for (const id of MOTIF_IDS) {
    const hits = MOTIFS[id].words.filter((w) => t.includes(` ${w}`)).length;
    if (hits && (!best || hits > best.hits)) best = { id, hits };
  }
  return best?.id;
}

/* ---------- Placing decorations ---------- */

type Box = { x: number; y: number; w: number; h: number };

/** Places at the margins, partly outside the page. The decoration shrinks towards the edge until it touches nothing. */
const SPOTS: { x: number; y: number; size: number; rotation: number; anchor: [number, number] }[] = [
  { x: -50, y: -40, size: 200, rotation: -16, anchor: [0, 0] },
  { x: 1440, y: 700, size: 220, rotation: -10, anchor: [1, 1] },
  { x: 1450, y: -50, size: 190, rotation: 14, anchor: [1, 0] },
  { x: -60, y: 720, size: 210, rotation: 12, anchor: [0, 1] },
  { x: -80, y: 360, size: 160, rotation: 22, anchor: [0, 0.5] },
  { x: 1510, y: 380, size: 150, rotation: -18, anchor: [1, 0.5] },
];

const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** Boxes that decorations must not touch: everything except page-wide backgrounds and other decorations. */
function obstacles(page: Page): Box[] {
  const pageArea = CANVAS_W * CANVAS_H;
  return page.elements
    .filter((e) => !e.decor)
    .filter((e) => e.type !== "shape" || e.photoSlot || e.w * e.h < pageArea * 0.45)
    .map((e) => {
      // A rotated element can reach beyond its box: use the box that contains it.
      if (!e.rotation) return e;
      const r = (Math.abs(e.rotation) * Math.PI) / 180;
      const w = Math.abs(e.w * Math.cos(r)) + Math.abs(e.h * Math.sin(r));
      const h = Math.abs(e.w * Math.sin(r)) + Math.abs(e.h * Math.cos(r));
      return { x: e.x + e.w / 2 - w / 2, y: e.y + e.h / 2 - h / 2, w, h };
    });
}

/** Does the page belong to the cover family (cover, section, closing)? */
const isCoverPage = (page: Page, t: Theme) => page.background.toLowerCase() === t.palette.coverBg.toLowerCase();

/**
 * Adds the topic decorations to a page, at free spots in the margins. `seed`
 * (usually the page number) varies which drawings and spots each page gets.
 */
export function decoratePage(page: Page, motif: MotifId | SvgShape[], t: Theme, seed = 0, density = 2): Page {
  const m = { decor: Array.isArray(motif) ? motif : MOTIFS[motif].decor };
  if (!m.decor.length || density <= 0) return page;
  const cover = isCoverPage(page, t);
  const blocked = obstacles(page);
  const max = [0, 1, cover ? 4 : 3, cover ? 6 : 5][density] ?? 3;
  const decor: Element[] = [];

  for (let k = 0; k < SPOTS.length && decor.length < max; k++) {
    const spot = SPOTS[(k + seed * 2) % SPOTS.length];
    for (const scale of [1, 0.78, 0.6]) {
      const size = Math.round(spot.size * scale);
      // Shrink towards the page edge the spot is anchored to.
      const box = { x: Math.round(spot.x + (spot.size - size) * spot.anchor[0]), y: Math.round(spot.y + (spot.size - size) * spot.anchor[1]), w: size, h: size };
      // Leave a little air between a decoration and the content.
      const padded = { x: box.x - 16, y: box.y - 16, w: box.w + 32, h: box.h + 32 };
      if (blocked.some((b) => overlaps(padded, b)) || decor.some((d) => overlaps(box, d))) continue;
      const shape = m.decor[(decor.length + seed) % m.decor.length];
      const second = decor.length % 2 === 1;
      decor.push({
        id: newId(),
        type: "shape",
        shape,
        ...box,
        rotation: spot.rotation,
        opacity: cover ? 0.9 : second ? 0.62 : 0.72,
        relief: style3D(t.id).relief,
        hidden: false,
        locked: true,
        decor: true,
        fill: second ? t.palette.accent2 : t.palette.accent,
        radius: 0,
        animation: { enter: "fade", emphasis: cover && !decor.length ? "float" : "none", duration: 0.9, delay: 0.1 * decor.length },
        interaction: null,
      });
      break;
    }
  }
  return { ...page, elements: [...decor, ...page.elements] };
}

/** The page without its topic decorations. */
export const stripDecor = (page: Page): Page => ({ ...page, elements: page.elements.filter((e) => !e.decor) });

/**
 * Sets (or with `undefined` removes) the topic of a presentation: old
 * decorations go, new ones are placed on every page in the current theme.
 */
export function applyMotif(doc: PresentationDoc, motif: MotifId | undefined, opts: { decor?: SvgShape[] | null; density?: number } = {}): PresentationDoc {
  const t = getTheme(doc.settings?.theme);
  // Drawings chosen by hand or by Zib win over the preset topic; `null` clears them.
  const decor = opts.decor === null ? undefined : (opts.decor ?? (motif === doc.settings?.motif ? doc.settings?.decor : undefined));
  const density = opts.density ?? doc.settings?.decorDensity ?? 2;
  const drawings = decor?.length ? decor : motif;
  const pages = doc.pages.map((p, i) => {
    const clean = stripDecor(p);
    return drawings ? decoratePage(clean, drawings, t, i, density) : clean;
  });
  const rest = { ...doc.settings };
  delete rest.motif;
  delete rest.decor;
  delete rest.decorDensity;
  const settings = { ...rest, autoAdvance: doc.settings?.autoAdvance ?? 0, ...(motif ? { motif } : {}), ...(decor?.length ? { decor } : {}), ...(density !== 2 ? { decorDensity: density } : {}) };
  return { ...doc, pages, settings };
}
