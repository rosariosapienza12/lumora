import type { PresentationDoc } from "./schema";
import { buildLayout, isLayoutId, type LayoutId } from "./layouts";
import { getTheme, isThemeId, type ThemeId } from "./themes";

/**
 * A presentation outline proposed by Zib: a title, a theme and one heading per
 * page, each with a layout. It travels as a short, human-readable string
 *   Titolo|tema|layout=Titolo pagina;layout=Titolo pagina
 * inside the chat and in the /nuova link, and is validated strictly before a
 * presentation is built from it.
 */

export type DeckSpec = { title: string; theme: ThemeId; pages: { layout: LayoutId; heading: string }[] };

export const MAX_DECK_PAGES = 12;
const MAX_TITLE = 80;
const MAX_HEADING = 90;

/** Removes the separators of the format and control characters, trims and caps the length. */
const clean = (s: string, max: number) =>
  s
    .replace(/[|;=\[\]{}\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

export function serializeDeck(d: DeckSpec): string {
  return [clean(d.title, MAX_TITLE), d.theme, d.pages.map((p) => `${p.layout}=${clean(p.heading, MAX_HEADING)}`).join(";")].join("|");
}

/** Parses and validates an outline string; null when anything is off. */
export function parseDeck(raw: unknown): DeckSpec | null {
  if (typeof raw !== "string" || raw.length > 2000) return null;
  const [title, theme, pagesPart, ...rest] = raw.split("|");
  if (rest.length || !title?.trim() || !isThemeId(theme) || !pagesPart) return null;
  const pages: DeckSpec["pages"] = [];
  for (const item of pagesPart.split(";")) {
    const eq = item.indexOf("=");
    const layout = eq < 0 ? item.trim() : item.slice(0, eq).trim();
    if (!isLayoutId(layout)) return null;
    pages.push({ layout, heading: clean(eq < 0 ? "" : item.slice(eq + 1), MAX_HEADING) });
  }
  if (!pages.length || pages.length > MAX_DECK_PAGES) return null;
  return { title: clean(title, MAX_TITLE), theme, pages };
}

/** Builds the presentation; the first cover page carries the deck title. */
export function buildDeck(d: DeckSpec): PresentationDoc {
  const theme = getTheme(d.theme);
  const pages = d.pages.map((p, i) => buildLayout(p.layout, theme, p.heading || (i === 0 ? d.title : undefined)));
  return { version: 1, pages, settings: { autoAdvance: 0, theme: d.theme } };
}

/* ---------- Offline planner: a sensible outline from a topic, without AI ---------- */

/** Lowercase, no accents: "Perché" and "perche" match. */
export const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

type Kind = "lezione" | "pitch" | "relazione" | "quiz" | "storia" | "portfolio" | "workshop";

/** Topic words → kind of presentation and the theme that suits it (first match wins). */
const TOPICS: { words: string[]; kind: Kind; theme: ThemeId }[] = [
  { words: ["storia a bivi", "racconto", "fiaba", "favola", "avventura", "storia interattiva", "gioco narrativo"], kind: "storia", theme: "tramonto" },
  { words: ["quiz", "verifica", "test ", "interrogazione", "domande"], kind: "quiz", theme: "pastello" },
  { words: ["portfolio", "curriculum", "cv", "i miei lavori", "i miei progetti", "chi sono"], kind: "portfolio", theme: "minimal" },
  { words: ["workshop", "corso", "formazione", "laboratorio", "seminario", "webinar", "onboarding"], kind: "workshop", theme: "oceano" },
  { words: ["tesi", "ricerca", "relazione", "universita", "esame", "analisi", "report", "rapporto"], kind: "relazione", theme: "accademico" },
  { words: ["startup", "azienda", "aziendale", "prodotto", "vendit", "marketing", "clienti", "investitor", "business", "pitch", "budget", "fatturato", "riunione"], kind: "pitch", theme: "aziendale" },
  { words: ["sistema solare", "spazio", "pianet", "stelle", "universo", "astronom", "galassi", "luna"], kind: "lezione", theme: "notte" },
  { words: ["mare", "oceano", "acqua", "pesci", "balen"], kind: "lezione", theme: "oceano" },
  { words: ["natura", "ambiente", "animali", "piante", "fotosintes", "clima", "ecolog", "foresta", "bosco", "riciclo", "sostenibil"], kind: "lezione", theme: "natura" },
  { words: ["tecnologia", "informatica", "intelligenza artificiale", "programmazione", "coding", "robot", "videogioc", "gaming", "app ", "computer", "cybersecurity", "sicurezza informatica"], kind: "lezione", theme: "neon" },
  { words: ["arte", "musica", "design", "moda", "pittura", "cinema", "fotografia", "creativ"], kind: "lezione", theme: "tramonto" },
  { words: ["storia", "impero", "guerra", "medioevo", "antica", "antico", "rinascimento", "romani", "greci", "egizi"], kind: "lezione", theme: "retro" },
  { words: ["scuola", "classe", "bambini", "matematica", "geometria", "grammatica", "italiano", "scienze", "biologia", "chimica", "fisica"], kind: "lezione", theme: "lavagna" },
];

/** Picks the kind and theme for a topic. */
export function classifyTopic(topic: string): { kind: Kind; theme: ThemeId } {
  // Words are matched from their start ("pianet" finds "pianeti"), never inside another word ("tesi" is not in "fotosintesi").
  const t = ` ${normalize(topic).replace(/[^a-z0-9]+/g, " ")} `;
  // A trailing space in a word ("test ", "app ") means the whole word only.
  return TOPICS.find((x) => x.words.some((w) => t.includes(` ${w}`))) ?? { kind: "lezione", theme: "notte" };
}

/** An outline for a topic: the right kind of presentation, a fitting theme and headings about the topic. */
export function planDeck(topicRaw: string, forced?: { kind?: Kind; theme?: ThemeId }): DeckSpec {
  const topic = clean(topicRaw.replace(/[?.!]+$/, ""), 60) || "La mia presentazione";
  const title = topic.charAt(0).toUpperCase() + topic.slice(1);
  const auto = classifyTopic(topic);
  const kind = forced?.kind ?? auto.kind;
  const theme = forced?.theme ?? auto.theme;
  const T = topic;
  const P = (layout: LayoutId, heading: string) => ({ layout, heading });
  const plans: Record<Kind, DeckSpec["pages"]> = {
    lezione: [
      P("copertina", title),
      P("agenda", "Di cosa parleremo"),
      P("titolo-testo", `Che cos'è: ${T}`),
      P("esplora", `Esploriamo: ${T}`),
      P("elenco", "I punti chiave"),
      P("numeri", "Qualche numero"),
      P("domanda", `Quanto ne sai su ${T}?`),
      P("chiusura", "Grazie!"),
    ],
    pitch: [
      P("copertina", title),
      P("titolo-testo", "Il problema"),
      P("titolo-testo", "La nostra soluzione"),
      P("tre-colonne", "Perché funziona"),
      P("numeri", "I risultati"),
      P("linea-tempo", "Le prossime tappe"),
      P("contatti", "Parliamone"),
    ],
    relazione: [
      P("copertina", title),
      P("agenda", "Indice"),
      P("sezione", "Introduzione"),
      P("titolo-testo", "Il contesto"),
      P("due-colonne", "Un confronto"),
      P("immagine-testo", "Un esempio concreto"),
      P("citazione", "Una citazione che riassume il tema"),
      P("elenco", "Conclusioni"),
      P("chiusura", "Grazie per l'attenzione"),
    ],
    quiz: [P("copertina", title), P("domanda", "Prima domanda"), P("domanda", "Seconda domanda"), P("domanda", "Terza domanda"), P("chiusura", "Quiz completato!")],
    storia: [
      P("copertina", title),
      P("immagine-testo", "Tutto ha inizio"),
      P("bivio", "Che cosa succede adesso?"),
      P("immagine-testo", "La prima strada"),
      P("immagine-testo", "La seconda strada"),
      P("chiusura", "Fine"),
    ],
    portfolio: [P("copertina", title), P("titolo-testo", "Chi sono"), P("immagine-testo", "Progetto uno"), P("immagine-testo", "Progetto due"), P("numeri", "Risultati"), P("contatti", "Lavoriamo insieme")],
    workshop: [
      P("copertina", title),
      P("agenda", "Il programma"),
      P("linea-tempo", "Come lavoreremo"),
      P("schede", "Concetti da scoprire"),
      P("tre-colonne", "Gli strumenti"),
      P("domanda", "Verifica finale"),
      P("chiusura", "Grazie a tutti!"),
    ],
  };
  return { title, theme, pages: plans[kind] };
}
