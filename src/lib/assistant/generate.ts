import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { env } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { pageContentSchema } from "@/lib/editor/content";
import { buildLayout, isLayoutId, LAYOUT_IDS, type LayoutId } from "@/lib/editor/layouts";
import { ILLUSTRATION_IDS, isSvgShape, type SvgShape } from "@/lib/editor/shapes";
import { getTheme, isThemeId, modernTheme, THEMES, type ThemeId } from "@/lib/editor/themes";
import { documentSchema, type PresentationDoc } from "@/lib/editor/schema";
import type { DeckSpec } from "@/lib/editor/deck";
import { FORMS_3D, isForm3D, isMaterial3D, MATERIALS_3D, type Form3D } from "@/lib/three/ids";
import { applyLook3D } from "@/lib/three/styles";

/**
 * Zib writes a whole presentation: real, specific content for every page
 * (texts, points, numbers, quiz questions, speaker notes with sources to
 * check), plus the look that suits the topic, whatever the topic is: theme,
 * drawings for the margins and words to search photos with.
 *
 * The model answers through a tool whose input is validated with zod, so a
 * malformed or oversized answer can never reach the database: anything
 * invalid makes the caller fall back to the plain outline.
 */

const MODEL = "claude-opus-5-5";
/** AI-written presentations per day for the whole site, on top of each user's own limit. */
const DAILY_BUDGET = 150;

const generatedPage = z.object({
  layout: z.string(),
  content: pageContentSchema,
  notes: z.string().trim().max(1500).optional(),
});

export const generatedDeckSchema = z.object({
  title: z.string().trim().min(1).max(80),
  theme: z.string(),
  /** Drawings for the margins and icons, chosen for the topic. */
  decor: z.array(z.string()).max(6).default([]),
  /** Words to search free photos with, when photos were asked for. */
  photoQuery: z.string().trim().max(60).optional(),
  /** The 3D objects of the presentation, chosen for the topic. Unknown values are ignored. */
  look3d: z.object({ material: z.string(), second: z.string(), forms: z.array(z.string()).length(3) }).optional(),
  pages: z.array(generatedPage).min(3).max(12),
});
export type GeneratedDeck = z.infer<typeof generatedDeckSchema>;

/** What each layout reads from the content, so the model fills the right fields. */
const LAYOUT_GUIDE: Record<LayoutId, string> = {
  copertina: "heading (titolo), subtitle",
  "foto-piena": "heading, subtitle (copertina o pagina d'effetto con foto)",
  sezione: "heading, subtitle, stats[0].value = numero della sezione (es. 02)",
  chiusura: "heading, subtitle",
  agenda: "heading, items[4-6].title",
  "titolo-testo": "heading, body (3-5 frasi), highlight (la frase da ricordare)",
  "due-colonne": "heading, items[2] {title, text}",
  confronto: "heading, items[2] {title, text: 3 punti separati da a capo}",
  "tre-colonne": "heading, items[3] {title, text}",
  icone: "heading, items[6] {title breve, text di una riga}",
  "immagine-testo": "heading, body (con foto)",
  mosaico: "heading, body (con 4 foto)",
  citazione: "quote {text, author}: solo citazioni reali e attribuite correttamente",
  elenco: "heading, items[4-6] {title, text}",
  numeri: "heading, stats[2-3] {value breve, label, text}",
  percentuale: "heading, stats[0] {value come 72%, label, text}, highlight = fonte del dato",
  grafico: "heading, chart {kind: colonne|barre|linea|area|torta|ciambella, labels[2-8], series[1-3] {name, values: numeri veri}, unit opzionale come % o €}, highlight (la conclusione in una frase), subtitle (la fonte)",
  "linea-tempo": "heading, items[4-5] {title = data o periodo, text}",
  processo: "heading, items[3-5] {title, text}",
  piramide: "heading, items[3] {title, text} dalla cima alla base",
  mappa: "heading, highlight (idea centrale, 1-3 parole), items[4-6].title",
  esplora: "heading, body, items[2] {title, text} per i punti cliccabili sulla foto",
  schede: "heading, items[3] {title = etichetta del pulsante, text = contenuto nascosto}",
  domanda: "question {text, right, wrong, explanation}",
  bivio: "heading, subtitle, items[2].title = le due scelte",
  contatti: "heading, items[3].title, subtitle",
};

function systemPrompt() {
  return `Sei Zib, l'assistente di Lumora, e scrivi presentazioni complete in italiano (o nella lingua dell'argomento richiesto).

Contenuti:
- Informazioni vere, precise e utili: fatti, date, nomi, esempi concreti, spiegazioni chiare. Mai frasi segnaposto come "scrivi qui".
- Numeri e date solo se sei sicuro. Se un dato è incerto, preferisci una frase qualitativa. Nelle note del relatore indica le fonti da controllare (enti, libri, siti ufficiali).
- Frasi brevi e leggibili da lontano: rispetta le lunghezze dei campi. Niente markdown, niente lineette lunghe.
- Le note del relatore (notes) sono il discorso da dire su quella pagina: 2-5 frasi.
- Le domande dei quiz hanno una risposta giusta verificabile.

Aspetto, scelto per l'argomento:
- theme: uno di ${THEMES.map((t) => `${t.id} (${t.name}: ${t.mood})`).join("; ")}.
- decor: 3-4 disegni per i margini e le icone, scelti tra: ${ILLUSTRATION_IDS.join(", ")}, leaf, star, heart, drop, moon, cloud, wave, sun.
- photoQuery: 1-4 parole concrete per cercare foto su Wikimedia Commons (solo se richieste).
- look3d: gli oggetti 3D realistici di copertine, sezioni e chiusura. material e second tra: ${MATERIALS_3D.join(", ")}; forms: 3 forme tra ${FORMS_3D.join(", ")}. Scegli in modo evocativo per l'argomento (per esempio l'acqua: vetro e gocce; la finanza: metallo e monete; la chimica: vetro e molecola; l'arte classica: marmo e colonna ritorta).

Layout disponibili e campi che leggono:
${LAYOUT_IDS.map((id) => `- ${id}: ${LAYOUT_GUIDE[id]}`).join("\n")}

Varia i layout: preferisci quelli visivi (processo, mappa, confronto, percentuale, numeri, linea-tempo, icone, piramide) ai muri di testo e non ripetere lo stesso layout più di due volte. Usa foto-piena, immagine-testo, mosaico ed esplora solo se sono richieste le foto.`;
}

const tool = {
  name: "crea_presentazione",
  description: "Crea la presentazione completa: tema, disegni, parole per le foto e il contenuto di ogni pagina.",
  input_schema: z.toJSONSchema(generatedDeckSchema, { target: "draft-7" }) as Anthropic.Tool.InputSchema,
};

let client: Anthropic | null = null;

/** Is AI writing available right now for this user? Counts one use against both limits. */
export async function canGenerate(userId: string) {
  if (!env.ANTHROPIC_API_KEY) return false;
  return (await rateLimit(`zib:create:${userId}`, 10, 60 * 60)) && (await rateLimit("zib:create:global", DAILY_BUDGET, 24 * 60 * 60));
}

/** Asks the model for a complete presentation. Returns null when anything goes wrong. */
export async function generateDeck(request: { topic: string; outline?: DeckSpec; photos: boolean }): Promise<GeneratedDeck | null> {
  if (!env.ANTHROPIC_API_KEY) return null;
  client ??= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const outline = request.outline
    ? `\nSegui questa scaletta (puoi migliorare i titoli, non cambiare l'ordine): ${request.outline.pages.map((p, i) => `${i + 1}. ${p.layout}: ${p.heading}`).join("; ")}. Tema proposto: ${request.outline.theme}.`
    : "";
  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 12000,
      system: systemPrompt(),
      tools: [tool],
      tool_choice: { type: "tool", name: tool.name },
      messages: [
        {
          role: "user",
          content: `Argomento: ${request.topic.slice(0, 200)}\nFoto: ${request.photos ? "sì, usa 2-4 pagine con foto e indica photoQuery" : "no, nessun layout con foto"}.${outline}\nScrivi 7-11 pagine: copertina all'inizio, chiusura o contatti alla fine.`,
        },
      ],
    });
    const call = res.content.find((b) => b.type === "tool_use");
    if (!call || call.type !== "tool_use") return null;
    const parsed = generatedDeckSchema.safeParse(call.input);
    return parsed.success ? parsed.data : null;
  } catch (err) {
    console.error("zib generation failed", err instanceof Error ? err.message : err);
    return null;
  }
}

/** Builds the document from Zib's answer, dropping unknown layouts and drawings. Null if nothing valid remains. */
export function docFromGenerated(g: GeneratedDeck, forcedTheme?: ThemeId): { title: string; doc: PresentationDoc; photoQuery?: string } | null {
  const themeId: ThemeId = forcedTheme ?? modernTheme(isThemeId(g.theme) ? g.theme : "aurora");
  const theme = getTheme(themeId);
  const decor = g.decor.filter((s): s is SvgShape => isSvgShape(s)).slice(0, 4);
  const pages = g.pages
    .filter((p) => isLayoutId(p.layout))
    .map((p) => {
      // Clean pages: the drawings Zib picks are used as icons, not scattered in the margins.
      const page = buildLayout(p.layout as LayoutId, theme, p.content, { icons: decor });
      return p.notes ? { ...page, notes: p.notes } : page;
    });
  if (pages.length < 3) return null;
  let doc: PresentationDoc = { version: 1, pages, settings: { autoAdvance: 0, theme: themeId, ...(decor.length ? { decor } : {}) } };
  const l = g.look3d;
  if (l && isMaterial3D(l.material) && isMaterial3D(l.second) && l.forms.every(isForm3D)) {
    doc = applyLook3D(doc, { material: l.material, second: l.second, forms: l.forms as [Form3D, Form3D, Form3D] });
  }
  if (!documentSchema.safeParse(doc).success) return null;
  return { title: g.title, doc, photoQuery: g.photoQuery };
}
