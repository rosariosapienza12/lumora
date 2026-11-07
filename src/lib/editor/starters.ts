import type { Page, PresentationDoc } from "./schema";
import { buildLayout, type LayoutId } from "./layouts";
import { buildTemplate } from "./templates";
import { DEFAULT_THEME, getTheme, type ThemeId } from "./themes";

/**
 * "Create with this feature": for each step of the homepage tour, a ready
 * presentation built around an idea that uses that feature, plus a hint shown
 * in the editor that points to its tools.
 */

export const STARTERS = {
  modelli: {
    title: "La mia lezione",
    idea: "Una lezione interattiva pronta da personalizzare.",
    hint: "Cambia testi e colori nel pannello a destra. Per un altro modello usa Nuova presentazione nella dashboard.",
  },
  layout: {
    title: "La mia composizione",
    idea: "Pagine a tre e due colonne da riordinare e allineare.",
    hint: "Seleziona un elemento e usa i pulsanti Allinea in Posizione. Trascinando, le guide arancioni ti agganciano al centro. Ctrl+C e Ctrl+V copiano tra le pagine.",
  },
  contenuti: {
    title: "Il mio racconto per immagini",
    idea: "Immagine e testo, una citazione e un elenco puntato.",
    hint: "Usa il pulsante Immagine per caricare una foto dal computer. In Contenuto trovi corsivo, interlinea, cornici e ombra.",
  },
  animazioni: {
    title: "Entrata in scena",
    idea: "Numeri, tappe e punti che entrano in scena uno dopo l'altro.",
    hint: "Seleziona un elemento e apri Animazione: scegli ingresso, effetto continuo, durata e ritardo. Premi Presenta per vederle.",
  },
  transizioni: {
    title: "Un viaggio in tre tappe",
    idea: "Quattro pagine, ognuna con una transizione diversa.",
    hint: "Clicca su un punto vuoto della pagina: in Pagina scegli la transizione, oppure applicala a tutte le pagine con un clic.",
  },
  interattivita: {
    title: "Esplora l'immagine",
    idea: "Hotspot che aprono approfondimenti e schede da scoprire al clic.",
    hint: "Seleziona un hotspot e apri Interazione: puoi aprire una finestra, mostrare un suggerimento o rivelare un elemento nascosto.",
  },
  percorsi: {
    title: "Il mio quiz",
    idea: "Domande con risposta giusta e sbagliata che portano avanti.",
    hint: "Seleziona un pulsante e apri Interazione: Vai a un'altra pagina collega le pagine, Rivela mostra la risposta.",
  },
  condividi: {
    title: "Il mio intervento",
    idea: "Un pitch con le note del relatore già scritte.",
    hint: "Scrivi le note sotto la pagina e premi Presenta per vederle con il cronometro. Con Condividi ottieni link, password, QR code ed embed; Esporta PDF crea il documento.",
  },
} as const;

export type StarterId = keyof typeof STARTERS;

export const isStarterId = (v: unknown): v is StarterId => typeof v === "string" && Object.hasOwn(STARTERS, v);

/** A fresh page in the given layout, optionally with a different transition. */
const L = (id: LayoutId, theme: ThemeId, title?: string, transition?: Page["transition"]): Page => {
  const p = buildLayout(id, getTheme(theme), title);
  return transition ? { ...p, transition } : p;
};

export function buildStarter(id: StarterId, theme: ThemeId = DEFAULT_THEME): { title: string; doc: PresentationDoc } {
  const name = STARTERS[id].title;
  const doc = (pages: Page[]): PresentationDoc => ({ version: 1, pages, settings: { autoAdvance: 0, theme } });
  switch (id) {
    case "modelli":
      return { title: name, doc: buildTemplate("lezione", name, theme) };
    case "layout":
      return { title: name, doc: doc([L("tre-colonne", theme), L("due-colonne", theme), L("titolo-testo", theme)]) };
    case "contenuti":
      return { title: name, doc: doc([L("immagine-testo", theme, "Una storia da raccontare"), L("citazione", theme), L("elenco", theme)]) };
    case "animazioni":
      return { title: name, doc: doc([L("numeri", theme, "Uno, due, tre"), L("linea-tempo", theme), L("elenco", theme, "Entrano uno alla volta")]) };
    case "transizioni":
      return {
        title: name,
        doc: doc([
          L("copertina", theme, name, "fade"),
          L("titolo-testo", theme, "Tappa con scorrimento", "slide-left"),
          L("sezione", theme, "Arrivo in 3D", "flip"),
          L("chiusura", theme, "Fine del viaggio", "zoom"),
        ]),
      };
    case "interattivita":
      return { title: name, doc: doc([L("esplora", theme), L("schede", theme), L("domanda", theme)]) };
    case "percorsi":
      return { title: name, doc: buildTemplate("quiz", name, theme) };
    case "condividi": {
      const pitch = buildTemplate("pitch", name, theme);
      const notes = [
        "Saluta, presentati e spiega in una frase di cosa parlerai.",
        "Racconta un esempio concreto del problema: una persona, una situazione.",
        "Mostra come la soluzione cambia quell'esempio, con una sola promessa.",
        "Dì il numero e poi fai silenzio per due secondi: è il messaggio.",
        "Mostra la curva e leggi solo la conclusione a destra: il grafico parla da solo.",
        "Spiega i passaggi in ordine, uno alla volta.",
        "Spiega le prossime tappe e cosa ti serve per arrivarci.",
        "Ringrazia e invita a scriverti: lascia questa pagina visibile durante le domande.",
      ];
      return { title: name, doc: { ...pitch, pages: pitch.pages.map((p, i) => ({ ...p, notes: notes[i] })) } };
    }
  }
}
