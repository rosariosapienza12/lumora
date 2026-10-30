import type { Element, Page, PresentationDoc } from "./schema";
import { newId } from "./schema";
import { buildTemplate } from "./templates";

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
    idea: "Una pagina a tre colonne da riordinare e allineare.",
    hint: "Seleziona un elemento e usa i pulsanti Allinea in Posizione. Trascinando, le guide arancioni ti agganciano al centro. Ctrl+C e Ctrl+V copiano tra le pagine.",
  },
  contenuti: {
    title: "Il mio racconto per immagini",
    idea: "Un titolo, un testo e uno spazio immagine da riempire.",
    hint: "Usa il pulsante Immagine per caricare una foto dal computer. In Contenuto trovi corsivo, interlinea, cornici e ombra.",
  },
  animazioni: {
    title: "Entrata in scena",
    idea: "Tre elementi che entrano uno dopo l'altro.",
    hint: "Seleziona un elemento e apri Animazione: scegli ingresso, effetto continuo, durata e ritardo. Premi Presenta per vederle.",
  },
  transizioni: {
    title: "Un viaggio in tre tappe",
    idea: "Tre pagine, ognuna con una transizione diversa.",
    hint: "Clicca su un punto vuoto della pagina: in Pagina scegli la transizione, oppure applicala a tutte le pagine con un clic.",
  },
  interattivita: {
    title: "Esplora l'immagine",
    idea: "Un'immagine con hotspot che aprono finestre di approfondimento.",
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

const el = (partial: Partial<Element> & Pick<Element, "type">): Element =>
  ({
    id: newId(),
    x: 0,
    y: 0,
    w: 400,
    h: 100,
    rotation: 0,
    opacity: 1,
    hidden: false,
    locked: false,
    animation: { enter: "fade", emphasis: "none", duration: 0.6, delay: 0 },
    interaction: null,
    ...partial,
  }) as Element;

const title = (t: string, color = "#1d1a3a", y = 90): Element =>
  el({ type: "text", x: 120, y, w: 1360, h: 120, text: t, fontSize: 72, color, align: "left", weight: "800", font: "display", animation: { enter: "slide-up", emphasis: "none", duration: 0.6, delay: 0 } });

const page = (name: string, background: string, elements: Element[], transition: Page["transition"] = "fade", notes?: string): Page => ({
  id: newId(),
  name,
  background,
  transition,
  elements,
  ...(notes ? { notes } : {}),
});

export function buildStarter(id: StarterId): { title: string; doc: PresentationDoc } {
  const name = STARTERS[id].title;
  switch (id) {
    case "modelli":
      return { title: name, doc: buildTemplate("lezione", name) };
    case "interattivita": {
      const doc = buildTemplate("lezione", name);
      // Open straight on the page with the hotspots.
      return { title: name, doc: { ...doc, pages: [doc.pages[1], doc.pages[0], doc.pages[2]] } };
    }
    case "percorsi":
      return { title: name, doc: buildTemplate("quiz", name) };
    case "condividi": {
      const doc = buildTemplate("pitch", name);
      const notes = [
        "Saluta, presentati e spiega in una frase di cosa parlerai.",
        "Racconta un esempio concreto del problema: una persona, una situazione.",
        "Mostra come la soluzione cambia quell'esempio.",
        "Commenta un numero alla volta, lascia il tempo di leggerli.",
        "Ringrazia e invita a scriverti: lascia questa pagina visibile durante le domande.",
      ];
      return { title: name, doc: { ...doc, pages: doc.pages.map((p, i) => ({ ...p, notes: notes[i] })) } };
    }
    case "layout": {
      const cols = ["#5b3df5", "#ffb547", "#18a689"].flatMap((color, i) => [
        el({ type: "shape", x: 120 + i * 470, y: 280, w: 420, h: 280, shape: "rect", fill: color, radius: 28, animation: { enter: "pop", emphasis: "none", duration: 0.5, delay: 0.15 * i } }),
        el({ type: "text", x: 120 + i * 470, y: 600, w: 420, h: 120, text: ["Primo punto", "Secondo punto", "Terzo punto"][i], fontSize: 40, color: "#1d1a3a", align: "left", weight: "600", font: "display" }),
      ]);
      return { title: name, doc: { version: 1, pages: [page("Tre colonne", "#ffffff", [title("Tre idee, una pagina"), ...cols])] } };
    }
    case "contenuti":
      return {
        title: name,
        doc: {
          version: 1,
          pages: [
            page("Racconto", "#fff8f2", [
              title("Una storia da raccontare", "#3a1424"),
              el({ type: "text", x: 120, y: 250, w: 640, h: 420, text: "Scrivi qui il tuo racconto. Prova il corsivo per le citazioni e regola l'interlinea per renderlo più leggibile.", fontSize: 36, color: "#5d3a46", align: "left", weight: "400", font: "sans", lineHeight: 1.5 }),
              el({ type: "shape", x: 860, y: 230, w: 620, h: 520, shape: "rect", fill: "#ffd6e0", radius: 32, stroke: "#ffffff", strokeWidth: 12, shadow: true, animation: { enter: "zoom", emphasis: "none", duration: 0.7, delay: 0.2 } }),
              el({ type: "text", x: 900, y: 450, w: 540, h: 80, text: "Carica qui la tua foto", fontSize: 32, color: "#a0526a", align: "center", weight: "600", font: "sans" }),
            ]),
          ],
        },
      };
    case "animazioni": {
      const steps = (["slide-up", "pop", "blur"] as const).map((enter, i) =>
        el({
          type: "shape",
          x: 160 + i * 460,
          y: 330,
          w: 360,
          h: 360,
          shape: "ellipse",
          fill: ["#ff7a2e", "#ffb547", "#5b3df5"][i],
          radius: 0,
          animation: { enter, emphasis: i === 1 ? "pulse" : "none", duration: 0.8, delay: 0.4 + i * 0.5 },
        }),
      );
      return { title: name, doc: { version: 1, pages: [page("In scena", "#1d1a3a", [title("Uno, due, tre", "#ffffff"), ...steps])] } };
    }
    case "transizioni": {
      const stop = (n: string, bg: string, t: Page["transition"], color: string) => page(n, bg, [title(n, color, 360)], t);
      return {
        title: name,
        doc: {
          version: 1,
          pages: [stop("Partenza", "#1d1a3a", "fade", "#ffffff"), stop("Tappa con scorrimento", "#a6e8ff", "slide-left", "#0a2a3a"), stop("Arrivo in 3D", "#ffb547", "flip", "#2a1a00")],
        },
      };
    }
  }
}
