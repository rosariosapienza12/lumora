import type { Element, EnterAnimation, Interaction, Page, PresentationDoc } from "./schema";
import { newId } from "./schema";

/**
 * Starting points for a new presentation. Each template builds a fresh
 * document (new ids every time) that passes the document schema.
 */

export const TEMPLATES = [
  { id: "vuota", name: "Vuota", description: "Una copertina e nient'altro: parti da zero." },
  { id: "lezione", name: "Lezione interattiva", description: "Copertina, immagine con hotspot e domanda finale." },
  { id: "pitch", name: "Pitch", description: "Problema, soluzione, numeri e contatti, in quattro pagine." },
  { id: "quiz", name: "Quiz", description: "Domande con risposta giusta e sbagliata che portano avanti." },
] as const;

export type TemplateId = (typeof TEMPLATES)[number]["id"];

export const isTemplateId = (v: unknown): v is TemplateId => TEMPLATES.some((t) => t.id === v);

const base = (enter: EnterAnimation = "fade", delay = 0) => ({
  id: newId(),
  rotation: 0,
  opacity: 1,
  hidden: false,
  locked: false,
  animation: { enter, emphasis: "none" as const, duration: 0.6, delay },
  interaction: null as Interaction | null,
});

type Box = { x: number; y: number; w: number; h: number };

const text = (box: Box, t: string, o: { size?: number; color?: string; weight?: "400" | "600" | "800"; font?: "sans" | "display"; align?: "left" | "center" | "right"; enter?: EnterAnimation; delay?: number } = {}): Element => ({
  ...base(o.enter ?? "fade", o.delay),
  ...box,
  type: "text",
  text: t,
  fontSize: o.size ?? 40,
  color: o.color ?? "#1d1a3a",
  align: o.align ?? "left",
  weight: o.weight ?? "400",
  font: o.font ?? "sans",
});

const shape = (box: Box, fill: string, o: { ellipse?: boolean; radius?: number; enter?: EnterAnimation; delay?: number } = {}): Element => ({
  ...base(o.enter ?? "fade", o.delay),
  ...box,
  type: "shape",
  shape: o.ellipse ? "ellipse" : "rect",
  fill,
  radius: o.radius ?? 24,
});

const button = (box: Box, label: string, interaction: Interaction, o: { fill?: string; color?: string; delay?: number } = {}): Element => ({
  ...base("pop", o.delay),
  ...box,
  interaction,
  type: "button",
  label,
  fill: o.fill ?? "#5b3df5",
  color: o.color ?? "#ffffff",
  fontSize: 30,
});

const hotspot = (x: number, y: number, label: string, interaction: Interaction, delay = 0.4): Element => ({
  ...base("pop", delay),
  x,
  y,
  w: 80,
  h: 80,
  interaction,
  type: "hotspot",
  fill: "#ffb547",
  label,
});

const page = (name: string, background: string, elements: Element[], transition: Page["transition"] = "fade"): Page => ({
  id: newId(),
  name,
  background,
  transition,
  elements,
});

const goto = (target: Page): Interaction => ({ trigger: "click", action: { kind: "goto", pageId: target.id } });
const popup = (title: string, body: string): Interaction => ({ trigger: "click", action: { kind: "popup", title, body } });

function cover(title: string, subtitle: string): Page {
  return page("Copertina", "#1d1a3a", [
    shape({ x: 1180, y: -160, w: 620, h: 620 }, "#5b3df5", { ellipse: true, enter: "zoom" }),
    shape({ x: 1320, y: 520, w: 240, h: 240 }, "#ffb547", { ellipse: true, enter: "pop", delay: 0.3 }),
    text({ x: 140, y: 320, w: 1100, h: 180 }, title, { size: 96, color: "#ffffff", weight: "800", font: "display", enter: "slide-up" }),
    text({ x: 140, y: 520, w: 1000, h: 80 }, subtitle, { size: 36, color: "#c9c4ff", enter: "fade", delay: 0.3 }),
  ]);
}

export function buildTemplate(id: TemplateId, title: string): PresentationDoc {
  switch (id) {
    case "vuota":
      return { version: 1, pages: [cover(title, "Clicca per modificare il sottotitolo")] };

    case "lezione": {
      const intro = cover(title, "Una lezione da esplorare");
      const explore = page(
        "Esplora",
        "#f4f2ff",
        [
          text({ x: 120, y: 80, w: 1360, h: 110 }, "Tocca i punti luminosi", { size: 64, weight: "800", font: "display", enter: "slide-up" }),
          shape({ x: 120, y: 230, w: 900, h: 560 }, "#d9d3ff", { radius: 32, enter: "fade" }),
          text({ x: 160, y: 470, w: 820, h: 80 }, "Sostituisci con un'immagine", { size: 32, color: "#5d5a7a", align: "center" }),
          hotspot(360, 340, "1", popup("Primo dettaglio", "Spiega qui cosa si vede in questo punto.")),
          hotspot(760, 560, "2", popup("Secondo dettaglio", "Aggiungi un approfondimento, una data o un esempio."), 0.6),
          text({ x: 1080, y: 260, w: 400, h: 400 }, "Ogni punto apre una finestra con un approfondimento. Chi guarda esplora al proprio ritmo.", { size: 30, color: "#1d1a3a", enter: "fade", delay: 0.4 }),
        ],
        "slide-left",
      );
      const answer = text({ x: 160, y: 640, w: 1280, h: 90 }, "Esatto! Scrivi qui la spiegazione.", { size: 40, color: "#18a689", weight: "600", align: "center", enter: "pop" });
      answer.hidden = true;
      const question = page(
        "Domanda",
        "#1d1a3a",
        [
          text({ x: 160, y: 160, w: 1280, h: 140 }, "Hai capito? Mettiti alla prova", { size: 64, color: "#ffffff", weight: "800", font: "display", align: "center", enter: "slide-up" }),
          button({ x: 600, y: 420, w: 400, h: 110 }, "Mostra la risposta", { trigger: "click", action: { kind: "reveal", targetId: answer.id } }, { fill: "#ffb547", color: "#1d1a3a", delay: 0.3 }),
          answer,
        ],
        "zoom",
      );
      intro.elements.push(button({ x: 140, y: 680, w: 340, h: 90 }, "Inizia", goto(explore), { delay: 0.6 }));
      return { version: 1, pages: [intro, explore, question] };
    }

    case "pitch": {
      const intro = cover(title, "La nostra idea in quattro passaggi");
      const block = (name: string, heading: string, body: string, accent: string, transition: Page["transition"]) =>
        page(
          name,
          "#ffffff",
          [
            shape({ x: 0, y: 0, w: 40, h: 900 }, accent, { radius: 0, enter: "slide-up" }),
            text({ x: 140, y: 160, w: 1300, h: 140 }, heading, { size: 80, weight: "800", font: "display", enter: "slide-up" }),
            text({ x: 140, y: 340, w: 1100, h: 300 }, body, { size: 40, color: "#5d5a7a", enter: "fade", delay: 0.3 }),
          ],
          transition,
        );
      const problem = block("Problema", "Il problema", "Descrivi in due righe la situazione che vuoi cambiare.", "#d22f4f", "slide-left");
      const solution = block("Soluzione", "La soluzione", "Racconta come la tua idea risolve il problema.", "#18a689", "slide-left");
      const numbers = page(
        "Numeri",
        "#f4f2ff",
        [
          text({ x: 140, y: 120, w: 1300, h: 120 }, "I numeri", { size: 80, weight: "800", font: "display", enter: "slide-up" }),
          ...[
            ["120%", "crescita"],
            ["3.000", "utenti"],
            ["4,8", "valutazione"],
          ].flatMap(([n, l], i) => [
            text({ x: 140 + i * 460, y: 380, w: 420, h: 140 }, n, { size: 110, color: "#5b3df5", weight: "800", font: "display", enter: "pop", delay: 0.2 + i * 0.2 }),
            text({ x: 140 + i * 460, y: 530, w: 420, h: 60 }, l, { size: 36, color: "#5d5a7a", enter: "fade", delay: 0.3 + i * 0.2 }),
          ]),
        ],
        "slide-up",
      );
      const contact = page("Contatti", "#1d1a3a", [
        text({ x: 140, y: 300, w: 1300, h: 140 }, "Parliamone", { size: 96, color: "#ffffff", weight: "800", font: "display", enter: "slide-up" }),
        text({ x: 140, y: 470, w: 1300, h: 80 }, "nome@esempio.it", { size: 44, color: "#ffb547", enter: "fade", delay: 0.3 }),
      ], "zoom");
      return { version: 1, pages: [intro, problem, solution, numbers, contact] };
    }

    case "quiz": {
      const intro = cover(title, "Quante risposte indovini?");
      const end = page("Fine", "#1d1a3a", [
        text({ x: 160, y: 340, w: 1280, h: 160 }, "Quiz completato!", { size: 96, color: "#ffffff", weight: "800", font: "display", align: "center", enter: "pop" }),
      ], "zoom");
      const question = (n: number, q: string, right: string, wrong: string, next: Page) => {
        const ok = text({ x: 160, y: 660, w: 1280, h: 80 }, "Giusto!", { size: 44, color: "#18a689", weight: "600", align: "center", enter: "pop" });
        const ko = text({ x: 160, y: 660, w: 1280, h: 80 }, "Non proprio, riprova.", { size: 44, color: "#d22f4f", weight: "600", align: "center", enter: "pop" });
        ok.hidden = true;
        ko.hidden = true;
        const reveal = (target: Element): Interaction => ({ trigger: "click", action: { kind: "reveal", targetId: target.id } });
        return page(
          `Domanda ${n}`,
          "#f4f2ff",
          [
            text({ x: 160, y: 140, w: 1280, h: 160 }, q, { size: 64, weight: "800", font: "display", align: "center", enter: "slide-up" }),
            button({ x: 260, y: 400, w: 480, h: 120 }, right, reveal(ok), { fill: "#ffffff", color: "#1d1a3a", delay: 0.3 }),
            button({ x: 860, y: 400, w: 480, h: 120 }, wrong, reveal(ko), { fill: "#ffffff", color: "#1d1a3a", delay: 0.45 }),
            ok,
            ko,
            button({ x: 640, y: 770, w: 320, h: 80 }, "Avanti", goto(next), { fill: "#5b3df5", delay: 0.8 }),
          ],
          "slide-left",
        );
      };
      const q2 = question(2, "Scrivi qui la seconda domanda", "Risposta giusta", "Risposta sbagliata", end);
      const q1 = question(1, "Scrivi qui la prima domanda", "Risposta giusta", "Risposta sbagliata", q2);
      intro.elements.push(button({ x: 140, y: 680, w: 340, h: 90 }, "Inizia il quiz", goto(q1), { delay: 0.6 }));
      return { version: 1, pages: [intro, q1, q2, end] };
    }
  }
}
