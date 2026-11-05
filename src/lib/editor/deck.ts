import type { PresentationDoc } from "./schema";
import { buildLayout, isLayoutId, type LayoutId } from "./layouts";
import { getTheme, isThemeId, type ThemeId } from "./themes";
import { decoratePage, detectMotif, isMotifId, MOTIFS, type MotifId } from "./motifs";

/**
 * A presentation outline proposed by Zib or by "Nuova presentazione": a title,
 * a theme and one heading per page, each with a layout, plus two optional
 * fields, the topic (for the decorations) and the photo search. It travels as
 * a short, human-readable string
 *   Titolo|tema|layout=Titolo pagina;layout=Titolo pagina|argomento|foto=parole da cercare
 * inside the chat and in the /nuova link, and is validated strictly before a
 * presentation is built from it. The last two fields can be left out, in any order.
 */

export type DeckSpec = {
  title: string;
  theme: ThemeId;
  pages: { layout: LayoutId; heading: string }[];
  /** Topic: decorations at the margins and drawings in the icon layouts. */
  motif?: MotifId;
  /** When set, the photo spaces are filled with free photos found with these words. */
  photos?: string;
};

export const MAX_DECK_PAGES = 12;
const MAX_TITLE = 80;
const MAX_HEADING = 90;
const MAX_PHOTO_QUERY = 60;

/** Removes the separators of the format and control characters, trims and caps the length. */
const clean = (s: string, max: number) =>
  s
    .replace(/[|;=\[\]{}\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

export function serializeDeck(d: DeckSpec): string {
  return [
    clean(d.title, MAX_TITLE),
    d.theme,
    d.pages.map((p) => `${p.layout}=${clean(p.heading, MAX_HEADING)}`).join(";"),
    ...(d.motif ? [d.motif] : []),
    ...(d.photos ? [`foto=${clean(d.photos, MAX_PHOTO_QUERY)}`] : []),
  ].join("|");
}

/** Parses and validates an outline string; null when anything is off. */
export function parseDeck(raw: unknown): DeckSpec | null {
  if (typeof raw !== "string" || raw.length > 2000) return null;
  const [title, theme, pagesPart, ...extra] = raw.split("|");
  if (extra.length > 2 || !title?.trim() || !isThemeId(theme) || !pagesPart) return null;
  const pages: DeckSpec["pages"] = [];
  for (const item of pagesPart.split(";")) {
    const eq = item.indexOf("=");
    const layout = eq < 0 ? item.trim() : item.slice(0, eq).trim();
    if (!isLayoutId(layout)) return null;
    pages.push({ layout, heading: clean(eq < 0 ? "" : item.slice(eq + 1), MAX_HEADING) });
  }
  if (!pages.length || pages.length > MAX_DECK_PAGES) return null;

  const spec: DeckSpec = { title: clean(title, MAX_TITLE), theme, pages };
  for (const field of extra) {
    const f = field.trim();
    const photo = f.match(/^(?:foto|immagini)(?:[=:](.*))?$/i);
    if (isMotifId(f) && !spec.motif) spec.motif = f;
    else if (photo && !spec.photos) spec.photos = clean(photo[1] ?? "", MAX_PHOTO_QUERY) || spec.title;
    else return null;
  }
  return spec;
}

/** Builds the presentation; the first cover page carries the deck title. Photos are added separately (see src/lib/images/fill.ts). */
export function buildDeck(d: DeckSpec): PresentationDoc {
  const theme = getTheme(d.theme);
  const pages = d.pages.map((p, i) => {
    const page = buildLayout(p.layout, theme, p.heading || (i === 0 ? d.title : undefined), { motif: d.motif });
    return d.motif ? decoratePage(page, d.motif, theme, i) : page;
  });
  return { version: 1, pages, settings: { autoAdvance: 0, theme: d.theme, ...(d.motif ? { motif: d.motif } : {}) } };
}

/* ---------- Offline planner: a sensible outline from a topic, without AI ---------- */

/** Lowercase, no accents: "Perché" and "perche" match. */
export const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export type Kind = "lezione" | "pitch" | "relazione" | "quiz" | "storia" | "portfolio" | "workshop";

/** Words that decide the kind of presentation (first match wins), and the theme used when no topic is recognised. */
const KINDS: { words: string[]; kind: Kind; theme: ThemeId }[] = [
  { words: ["storia a bivi", "racconto", "fiaba", "favola", "avventura", "storia interattiva", "gioco narrativo"], kind: "storia", theme: "tramonto" },
  { words: ["quiz", "verifica", "test ", "interrogazione", "domande"], kind: "quiz", theme: "pastello" },
  { words: ["portfolio", "curriculum", "cv ", "i miei lavori", "i miei progetti", "chi sono"], kind: "portfolio", theme: "minimal" },
  { words: ["workshop", "corso", "formazione", "laboratorio", "seminario", "webinar", "onboarding"], kind: "workshop", theme: "oceano" },
  { words: ["tesi", "ricerca", "relazione", "analisi", "report", "rapporto"], kind: "relazione", theme: "accademico" },
  { words: ["startup", "pitch", "investitor", "la mia azienda", "il mio prodotto", "la mia app"], kind: "pitch", theme: "aziendale" },
];

/** Picks the kind, the topic and the theme for a request. */
export function classifyTopic(topic: string): { kind: Kind; theme: ThemeId; motif?: MotifId } {
  // Words are matched from their start ("pianet" finds "pianeti"), never inside another word ("tesi" is not in "fotosintesi").
  const t = ` ${normalize(topic).replace(/[^a-z0-9]+/g, " ")} `;
  // A trailing space in a word ("test ", "cv ") means the whole word only.
  const k = KINDS.find((x) => x.words.some((w) => t.includes(` ${w}`)));
  const motif = detectMotif(topic);
  return { kind: k?.kind ?? "lezione", theme: motif ? MOTIFS[motif].theme : (k?.theme ?? "notte"), motif };
}

/** A small, stable number from a text: the same topic always gets the same variant, different topics get different ones. */
function hash(s: string) {
  let h = 7;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

/** An outline for a topic: the right kind of presentation, a fitting theme and topic, varied layouts and headings about the topic. */
export function planDeck(topicRaw: string, forced: { kind?: Kind; theme?: ThemeId; motif?: MotifId | null; photos?: boolean } = {}): DeckSpec {
  const topic = clean(topicRaw.replace(/[?.!]+$/, ""), 60) || "La mia presentazione";
  const title = topic.charAt(0).toUpperCase() + topic.slice(1);
  const auto = classifyTopic(topic);
  const kind = forced.kind ?? auto.kind;
  const motif = forced.motif === null ? undefined : (forced.motif ?? auto.motif);
  const theme = forced.theme ?? (forced.motif ? MOTIFS[forced.motif].theme : auto.theme);
  const photos = forced.photos === true;
  const T = topic;
  const h = hash(normalize(topic));
  const P = (layout: LayoutId, heading: string) => ({ layout, heading });
  /** One of two layouts, chosen by the topic, so two topics rarely get the same sequence. */
  const pick = (bit: number, a: LayoutId, b: LayoutId) => ((h >> bit) & 1 ? b : a);
  /** The same choice, for a layout that comes with its own heading. */
  const pickPage = (bit: number, a: [LayoutId, string], b: [LayoutId, string]) => P(...((h >> bit) & 1 ? b : a));
  /** A photo layout when the presentation has photos, otherwise a layout that looks complete without them. */
  const ph = (withPhoto: LayoutId, without: LayoutId) => (photos ? withPhoto : without);
  const cover = P(ph("foto-piena", "copertina"), title);

  const plans: Record<Kind, DeckSpec["pages"]> = {
    lezione: [
      cover,
      P("agenda", "Di cosa parleremo"),
      P(ph("immagine-testo", "titolo-testo"), `Che cos'è: ${T}`),
      P(pick(0, "mappa", "icone"), "Le parole chiave"),
      P(motif === "storia" ? "linea-tempo" : pick(1, "processo", "linea-tempo"), motif === "storia" ? "Le date da ricordare" : "Come funziona"),
      P(pick(2, "numeri", "percentuale"), "Qualche numero"),
      ...(photos ? [P("mosaico", "Da vedere")] : []),
      pickPage(3, ["confronto", "Due aspetti a confronto"], ["piramide", "Dal semplice al complesso"]),
      P(ph("esplora", "schede"), photos ? `Esploriamo: ${T}` : "Curiosità da scoprire"),
      P("domanda", `Quanto ne sai su ${T}?`),
      P("chiusura", "Grazie!"),
    ],
    pitch: [
      cover,
      P("titolo-testo", "Il problema"),
      P(pick(0, "icone", "tre-colonne"), "La nostra soluzione"),
      P("processo", "Come funziona"),
      P(pick(1, "percentuale", "mappa"), "Il mercato"),
      P("confronto", "Noi e gli altri"),
      pickPage(2, ["numeri", "I risultati"], ["piramide", "I nostri obiettivi"]),
      P("linea-tempo", "Le prossime tappe"),
      P("contatti", "Parliamone"),
    ],
    relazione: [
      cover,
      P("agenda", "Indice"),
      P("sezione", "Introduzione"),
      P("titolo-testo", "Il contesto"),
      P("mappa", "I concetti principali"),
      P(pick(0, "confronto", "due-colonne"), "Un confronto"),
      P(ph("immagine-testo", "percentuale"), photos ? "Un esempio concreto" : "Un dato importante"),
      P("citazione", "Una citazione che riassume il tema"),
      P("elenco", "Conclusioni"),
      P("chiusura", "Grazie per l'attenzione"),
    ],
    quiz: [cover, P("domanda", "Prima domanda"), P("domanda", "Seconda domanda"), P("domanda", "Terza domanda"), P("chiusura", "Quiz completato!")],
    storia: [
      cover,
      P(ph("immagine-testo", "citazione"), "Tutto ha inizio"),
      P("bivio", "Che cosa succede adesso?"),
      P(ph("foto-piena", "titolo-testo"), "La prima strada"),
      P(ph("immagine-testo", "titolo-testo"), "La seconda strada"),
      P("chiusura", "Fine"),
    ],
    portfolio: [
      cover,
      P("titolo-testo", "Chi sono"),
      P(ph("mosaico", "icone"), "I miei lavori"),
      P(ph("immagine-testo", "processo"), photos ? "Progetto uno" : "Come lavoro"),
      P("numeri", "Risultati"),
      P("citazione", "Hanno lavorato con me e dicono che…"),
      P("contatti", "Lavoriamo insieme"),
    ],
    workshop: [
      cover,
      P("agenda", "Il programma"),
      P("processo", "Come lavoreremo"),
      P("schede", "Concetti da scoprire"),
      P("icone", "Gli strumenti"),
      pickPage(0, ["percentuale", "Un dato per cominciare"], ["piramide", "Gli obiettivi"]),
      P("domanda", "Verifica finale"),
      P("chiusura", "Grazie a tutti!"),
    ],
  };
  return { title, theme, pages: plans[kind].slice(0, MAX_DECK_PAGES), ...(motif ? { motif } : {}), ...(photos ? { photos: topic } : {}) };
}
