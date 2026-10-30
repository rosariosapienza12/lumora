import type { Element, Page, PresentationDoc } from "./schema";
import { buildLayout, drawWith } from "./layouts";
import { DEFAULT_THEME, getTheme, type ThemeId } from "./themes";

/**
 * Starting points for a new presentation, assembled from page layouts in the
 * chosen theme. Each call builds a fresh document (new ids every time) that
 * passes the document schema.
 */

export const TEMPLATES = [
  { id: "vuota", name: "Vuota", description: "Una copertina e nient'altro: parti da zero." },
  { id: "lezione", name: "Lezione interattiva", description: "Indice, immagine con hotspot, punti chiave e domanda finale." },
  { id: "pitch", name: "Pitch", description: "Problema, soluzione, numeri, tappe e contatti." },
  { id: "quiz", name: "Quiz", description: "Domande con risposta giusta e sbagliata che portano avanti." },
  { id: "relazione", name: "Relazione", description: "Per scuola e università: indice, sezioni, confronto, citazione e conclusioni." },
  { id: "storia", name: "Storia a bivi", description: "Chi guarda sceglie la strada: due percorsi e due finali." },
  { id: "portfolio", name: "Portfolio", description: "Presenta i tuoi lavori con immagini, risultati e contatti." },
  { id: "workshop", name: "Workshop", description: "Programma, tappe, schede da scoprire e verifica finale." },
] as const;

export type TemplateId = (typeof TEMPLATES)[number]["id"];

export const isTemplateId = (v: unknown): v is TemplateId => TEMPLATES.some((t) => t.id === v);

/** Adds a "start" button on a cover page that leads to `target`. */
function startButton(cover: Page, target: Page, label: string, themeId: ThemeId) {
  const d = drawWith(getTheme(themeId));
  cover.elements.push(d.button({ x: 140, y: 680, w: 360, h: 90 }, label, d.goto(target), { delay: 0.6 }));
}

/** Chains question pages: each one gets an "Avanti" button to the next. */
function chain(pages: Page[], last: Page, themeId: ThemeId) {
  const d = drawWith(getTheme(themeId));
  pages.forEach((p, i) => p.elements.push(d.button({ x: 640, y: 770, w: 320, h: 80 }, "Avanti", d.goto(pages[i + 1] ?? last), { delay: 0.8 })));
}

export function buildTemplate(id: TemplateId, title: string, themeId: ThemeId = DEFAULT_THEME): PresentationDoc {
  const theme = getTheme(themeId);
  const L = (layout: Parameters<typeof buildLayout>[0], heading?: string) => buildLayout(layout, theme, heading);
  const doc = (pages: Page[]): PresentationDoc => ({ version: 1, pages, settings: { autoAdvance: 0, theme: themeId } });

  switch (id) {
    case "vuota":
      return doc([L("copertina", title)]);

    case "lezione": {
      const cover = L("copertina", title);
      const explore = L("esplora");
      startButton(cover, explore, "Inizia", themeId);
      return doc([cover, L("agenda"), explore, L("elenco"), L("domanda", "Hai capito? Mettiti alla prova"), L("chiusura")]);
    }

    case "pitch":
      return doc([
        L("copertina", title),
        L("titolo-testo", "Il problema"),
        L("titolo-testo", "La soluzione"),
        L("numeri"),
        L("linea-tempo", "Le prossime tappe"),
        L("contatti", "Parliamone"),
      ]);

    case "quiz": {
      const cover = L("copertina", title);
      const end = L("chiusura", "Quiz completato!");
      const questions = [L("domanda", "Scrivi qui la prima domanda"), L("domanda", "Scrivi qui la seconda domanda"), L("domanda", "Scrivi qui la terza domanda")];
      chain(questions, end, themeId);
      startButton(cover, questions[0], "Inizia il quiz", themeId);
      return doc([cover, ...questions, end]);
    }

    case "relazione":
      return doc([
        L("copertina", title),
        L("agenda"),
        L("sezione", "Introduzione"),
        L("titolo-testo", "Il contesto"),
        L("due-colonne", "Un confronto"),
        L("immagine-testo", "Un esempio"),
        L("citazione"),
        L("elenco", "Conclusioni"),
        L("chiusura"),
      ]);

    case "storia": {
      const d = drawWith(theme);
      const cover = L("copertina", title);
      const fork = L("bivio", "Sei davanti a un bivio. Dove vai?");
      const pathA = L("immagine-testo", "Hai scelto il bosco");
      const pathB = L("immagine-testo", "Hai scelto il mare");
      const endA = L("chiusura", "Fine: il bosco");
      const endB = L("chiusura", "Fine: il mare");
      // Wire the fork's two buttons and each path to its ending.
      const [a, b] = fork.elements.filter((e): e is Extract<Element, { type: "button" }> => e.type === "button");
      a.interaction = d.goto(pathA);
      b.interaction = d.goto(pathB);
      a.label = "Il bosco";
      b.label = "Il mare";
      fork.elements = fork.elements.filter((e) => !(e.type === "text" && e.text.startsWith("Collega")));
      pathA.elements.push(d.button({ x: 120, y: 760, w: 300, h: 80 }, "Continua", d.goto(endA), { delay: 0.6 }));
      pathB.elements.push(d.button({ x: 120, y: 760, w: 300, h: 80 }, "Continua", d.goto(endB), { delay: 0.6 }));
      startButton(cover, fork, "Comincia", themeId);
      return doc([cover, fork, pathA, endA, pathB, endB]);
    }

    case "portfolio":
      return doc([
        L("copertina", title),
        L("titolo-testo", "Chi sono"),
        L("immagine-testo", "Progetto uno"),
        L("immagine-testo", "Progetto due"),
        L("numeri", "Risultati"),
        L("citazione", "Hanno lavorato con me e dicono che…"),
        L("contatti"),
      ]);

    case "workshop": {
      const cover = L("copertina", title);
      const agenda = L("agenda", "Il programma");
      startButton(cover, agenda, "Iniziamo", themeId);
      return doc([cover, agenda, L("linea-tempo", "Come lavoreremo"), L("schede"), L("tre-colonne", "Gli strumenti"), L("domanda", "Verifica: cosa hai imparato?"), L("chiusura")]);
    }
  }
}
