import type { Element, EnterAnimation, Interaction, Page } from "./schema";
import { newId } from "./schema";
import type { Theme } from "./themes";

/**
 * Ready-made page layouts, drawn with theme roles so each one fits any theme.
 * Grouped by the feature (planet) they show off; the editor's "Nuova pagina"
 * menu and the templates are both built from these.
 */

type Box = { x: number; y: number; w: number; h: number };

const base = (enter: EnterAnimation = "fade", delay = 0) => ({
  id: newId(),
  rotation: 0,
  opacity: 1,
  hidden: false,
  locked: false,
  animation: { enter, emphasis: "none" as const, duration: 0.6, delay },
  interaction: null as Interaction | null,
});

export type Draw = ReturnType<typeof drawWith>;

/** Element builders bound to a theme. */
export function drawWith(t: Theme) {
  const p = t.palette;
  const text = (box: Box, s: string, o: { size?: number; color?: string; weight?: "400" | "600" | "800"; title?: boolean; align?: "left" | "center" | "right"; enter?: EnterAnimation; delay?: number; italic?: boolean; lineHeight?: number } = {}): Element => ({
    ...base(o.enter ?? "fade", o.delay),
    ...box,
    type: "text",
    text: s,
    fontSize: o.size ?? 36,
    color: o.color ?? (o.title ? p.title : p.text),
    align: o.align ?? "left",
    weight: o.weight ?? (o.title ? "800" : "400"),
    font: o.title ? t.fonts.title : t.fonts.body,
    ...(o.italic ? { italic: true } : {}),
    ...(o.lineHeight ? { lineHeight: o.lineHeight } : {}),
  });
  const shape = (box: Box, fill: string, o: { ellipse?: boolean; radius?: number; enter?: EnterAnimation; delay?: number; shadow?: boolean } = {}): Element => ({
    ...base(o.enter ?? "fade", o.delay),
    ...box,
    type: "shape",
    shape: o.ellipse ? "ellipse" : "rect",
    fill,
    radius: o.radius ?? 28,
    ...(o.shadow ? { shadow: true } : {}),
  });
  const button = (box: Box, label: string, interaction: Interaction | null, o: { fill?: string; color?: string; delay?: number } = {}): Element => ({
    ...base("pop", o.delay),
    ...box,
    interaction,
    type: "button",
    label,
    fill: o.fill ?? p.accent,
    color: o.color ?? p.onAccent,
    fontSize: 30,
    font: t.fonts.body,
  });
  const hotspot = (x: number, y: number, label: string, interaction: Interaction, delay = 0.4): Element => ({
    ...base("pop", delay),
    x,
    y,
    w: 80,
    h: 80,
    interaction,
    type: "hotspot",
    fill: p.accent2,
    label,
  });
  const page = (name: string, background: string, elements: Element[], transition: Page["transition"] = "fade", cover = false): Page => ({
    id: newId(),
    name,
    background,
    ...(cover && p.coverBg2 ? { color2: p.coverBg2, angle: 135 } : {}),
    transition,
    elements,
  });
  const goto = (target: Page): Interaction => ({ trigger: "click", action: { kind: "goto", pageId: target.id } });
  const popup = (title: string, body: string): Interaction => ({ trigger: "click", action: { kind: "popup", title, body } });
  const reveal = (target: Element): Interaction => ({ trigger: "click", action: { kind: "reveal", targetId: target.id } });
  const tooltip = (s: string): Interaction => ({ trigger: "hover", action: { kind: "tooltip", text: s } });
  const heading = (s: string, color = p.title) => text({ x: 120, y: 80, w: 1360, h: 120 }, s, { size: 68, title: true, color, enter: "slide-up" });
  return { p, text, shape, button, hotspot, page, goto, popup, reveal, tooltip, heading };
}

export type LayoutId =
  | "copertina" | "sezione" | "chiusura"
  | "titolo-testo" | "due-colonne" | "tre-colonne"
  | "immagine-testo" | "citazione" | "elenco"
  | "numeri" | "linea-tempo"
  | "esplora" | "schede"
  | "domanda" | "bivio"
  | "agenda" | "contatti";

/** The feature groups shown in the "Nuova pagina" menu (ids match the homepage planets). */
export const LAYOUT_GROUPS: { feature: string; title: string; layouts: { id: LayoutId; name: string }[] }[] = [
  { feature: "modelli", title: "Struttura", layouts: [{ id: "copertina", name: "Copertina" }, { id: "agenda", name: "Indice" }, { id: "sezione", name: "Inizio sezione" }, { id: "chiusura", name: "Chiusura" }] },
  { feature: "layout", title: "Pagine e layout", layouts: [{ id: "titolo-testo", name: "Titolo e testo" }, { id: "due-colonne", name: "Due colonne" }, { id: "tre-colonne", name: "Tre colonne" }] },
  { feature: "contenuti", title: "Testi e immagini", layouts: [{ id: "immagine-testo", name: "Immagine e testo" }, { id: "citazione", name: "Citazione" }, { id: "elenco", name: "Elenco puntato" }] },
  { feature: "animazioni", title: "Animazioni", layouts: [{ id: "numeri", name: "Numeri in evidenza" }, { id: "linea-tempo", name: "Linea del tempo" }] },
  { feature: "interattivita", title: "Interattività", layouts: [{ id: "esplora", name: "Esplora con hotspot" }, { id: "schede", name: "Schede da scoprire" }] },
  { feature: "percorsi", title: "Percorsi e quiz", layouts: [{ id: "domanda", name: "Domanda a risposta" }, { id: "bivio", name: "Bivio" }] },
  { feature: "condividi", title: "Presenta e condividi", layouts: [{ id: "contatti", name: "Contatti" }] },
];

export const LAYOUT_IDS = LAYOUT_GROUPS.flatMap((g) => g.layouts.map((l) => l.id));
export const isLayoutId = (v: unknown): v is LayoutId => LAYOUT_IDS.includes(v as LayoutId);

/** Builds one page in the given layout and theme. `title` customises the main heading. */
export function buildLayout(id: LayoutId, t: Theme, title?: string): Page {
  const d = drawWith(t);
  const { p } = d;
  switch (id) {
    case "copertina":
      return d.page("Copertina", p.coverBg, [
        d.shape({ x: 1180, y: -160, w: 620, h: 620 }, p.accent, { ellipse: true, enter: "zoom" }),
        d.shape({ x: 1320, y: 520, w: 240, h: 240 }, p.accent2, { ellipse: true, enter: "pop", delay: 0.3 }),
        d.text({ x: 140, y: 300, w: 1100, h: 200 }, title ?? "Il titolo della presentazione", { size: 96, title: true, color: p.coverTitle, enter: "slide-up" }),
        d.text({ x: 140, y: 520, w: 1000, h: 80 }, "Clicca per modificare il sottotitolo", { size: 36, color: p.coverSub, delay: 0.3 }),
      ], "fade", true);

    case "sezione":
      return d.page("Sezione", p.coverBg, [
        d.text({ x: 140, y: 300, w: 300, h: 160 }, "01", { size: 140, title: true, color: p.accent2, enter: "pop" }),
        d.text({ x: 140, y: 470, w: 1300, h: 130 }, title ?? "Titolo della sezione", { size: 80, title: true, color: p.coverTitle, enter: "slide-up", delay: 0.2 }),
        d.shape({ x: 140, y: 620, w: 220, h: 10 }, p.accent2, { radius: 5, enter: "slide-left", delay: 0.4 }),
      ], "slide-left", true);

    case "chiusura":
      return d.page("Chiusura", p.coverBg, [
        d.shape({ x: -200, y: 520, w: 620, h: 620 }, p.accent, { ellipse: true, enter: "zoom" }),
        d.text({ x: 160, y: 300, w: 1280, h: 170 }, title ?? "Grazie!", { size: 120, title: true, color: p.coverTitle, align: "center", enter: "pop" }),
        d.text({ x: 160, y: 500, w: 1280, h: 80 }, "Domande? Parliamone insieme.", { size: 40, color: p.coverSub, align: "center", delay: 0.3 }),
      ], "zoom", true);

    case "titolo-testo":
      return d.page("Titolo e testo", p.contentBg, [
        d.shape({ x: 0, y: 0, w: 32, h: 900 }, p.accent, { radius: 0, enter: "slide-up" }),
        d.heading(title ?? "Un titolo chiaro"),
        d.text({ x: 120, y: 260, w: 1200, h: 420 }, "Scrivi qui il messaggio della pagina in poche righe. Un'idea per pagina rende la presentazione più facile da seguire.", { size: 40, lineHeight: 1.5, delay: 0.3 }),
      ], "slide-left");

    case "due-colonne":
      return d.page("Due colonne", p.contentBg, [
        d.heading(title ?? "Due punti di vista"),
        ...[0, 1].flatMap((i) => [
          d.shape({ x: 120 + i * 700, y: 250, w: 660, h: 520 }, p.contentAlt, { radius: 32, shadow: true, enter: "slide-up", delay: 0.15 + i * 0.15 }),
          d.text({ x: 170 + i * 700, y: 290, w: 560, h: 90 }, i ? "Dopo" : "Prima", { size: 48, title: true, color: i ? p.accent : p.muted, delay: 0.3 + i * 0.15 }),
          d.text({ x: 170 + i * 700, y: 400, w: 560, h: 320 }, "Scrivi qui il contenuto della colonna: un confronto, pro e contro, teoria e pratica.", { size: 32, lineHeight: 1.45, delay: 0.4 + i * 0.15 }),
        ]),
      ], "slide-left");

    case "tre-colonne":
      return d.page("Tre colonne", p.contentBg, [
        d.heading(title ?? "Tre idee, una pagina"),
        ...[p.accent, p.accent2, p.ok].flatMap((c, i) => [
          d.shape({ x: 120 + i * 470, y: 260, w: 420, h: 220 }, c, { radius: 28, enter: "pop", delay: 0.15 * i }),
          d.text({ x: 150 + i * 470, y: 330, w: 360, h: 90 }, String(i + 1), { size: 80, title: true, color: p.onAccent, align: "center", delay: 0.15 * i + 0.1 }),
          d.text({ x: 120 + i * 470, y: 520, w: 420, h: 70 }, ["Primo punto", "Secondo punto", "Terzo punto"][i], { size: 40, title: true, weight: "600", delay: 0.2 + 0.15 * i }),
          d.text({ x: 120 + i * 470, y: 600, w: 420, h: 200 }, "Una frase che spiega il punto.", { size: 30, delay: 0.3 + 0.15 * i }),
        ]),
      ], "slide-up");

    case "immagine-testo":
      return d.page("Immagine e testo", p.contentAlt, [
        d.shape({ x: 860, y: 140, w: 620, h: 620 }, p.card, { radius: 36, shadow: true, enter: "zoom", delay: 0.2 }),
        d.text({ x: 900, y: 410, w: 540, h: 80 }, "Carica qui la tua immagine", { size: 30, color: p.muted, weight: "600", align: "center", delay: 0.3 }),
        d.text({ x: 120, y: 200, w: 660, h: 150 }, title ?? "Una storia da raccontare", { size: 64, title: true, enter: "slide-up" }),
        d.text({ x: 120, y: 380, w: 640, h: 360 }, "Accompagna l'immagine con poche righe: cosa si vede, perché conta, cosa ricordare.", { size: 34, lineHeight: 1.5, delay: 0.3 }),
      ], "fade");

    case "citazione":
      return d.page("Citazione", p.coverBg, [
        d.text({ x: 120, y: 80, w: 300, h: 300 }, "“", { size: 300, title: true, color: p.accent2, enter: "pop" }),
        d.text({ x: 220, y: 300, w: 1160, h: 260 }, title ?? "La semplicità è la suprema sofisticazione.", { size: 64, title: true, color: p.coverTitle, italic: true, lineHeight: 1.3, enter: "blur", delay: 0.2 }),
        d.text({ x: 220, y: 620, w: 1160, h: 70 }, "Leonardo da Vinci", { size: 34, color: p.coverSub, delay: 0.5 }),
      ], "fade", true);

    case "elenco":
      return d.page("Elenco", p.contentBg, [
        d.heading(title ?? "I punti chiave"),
        ...["Il primo concetto da ricordare", "Il secondo, con un esempio", "Il terzo, che lega i primi due", "La conclusione in una frase"].flatMap((s, i) => [
          d.shape({ x: 130, y: 278 + i * 130, w: 34, h: 34 }, i % 2 ? p.accent2 : p.accent, { ellipse: true, enter: "pop", delay: 0.2 + i * 0.25 }),
          d.text({ x: 200, y: 262 + i * 130, w: 1200, h: 70 }, s, { size: 40, enter: "slide-left", delay: 0.25 + i * 0.25 }),
        ]),
      ], "slide-left");

    case "numeri":
      return d.page("Numeri", p.contentBg, [
        d.heading(title ?? "I numeri che contano"),
        ...[["120%", "crescita"], ["3.000", "persone coinvolte"], ["4,8", "valutazione media"]].flatMap(([n, l], i) => [
          d.text({ x: 120 + i * 470, y: 340, w: 440, h: 150 }, n, { size: 120, title: true, color: i === 1 ? p.accent2 : p.accent, enter: "pop", delay: 0.2 + i * 0.25 }),
          d.text({ x: 120 + i * 470, y: 500, w: 420, h: 60 }, l, { size: 34, color: p.muted, delay: 0.35 + i * 0.25 }),
        ]),
      ], "slide-up");

    case "linea-tempo":
      return d.page("Linea del tempo", p.contentAlt, [
        d.heading(title ?? "Le tappe"),
        d.shape({ x: 200, y: 486, w: 1140, h: 8 }, p.card, { radius: 4, enter: "slide-left" }),
        ...["2023", "2024", "2025", "Oggi"].flatMap((y, i) => [
          d.shape({ x: 170 + i * 380, y: 460, w: 60, h: 60 }, i === 3 ? p.accent2 : p.accent, { ellipse: true, enter: "pop", delay: 0.3 + i * 0.3 }),
          d.text({ x: 130 + i * 380, y: 340, w: 320, h: 80 }, y, { size: 48, title: true, delay: 0.35 + i * 0.3 }),
          d.text({ x: 130 + i * 380, y: 560, w: 320, h: 160 }, "Cosa è successo in questa tappa.", { size: 28, delay: 0.4 + i * 0.3 }),
        ]),
      ], "slide-left");

    case "esplora":
      return d.page("Esplora", p.contentBg, [
        d.heading(title ?? "Tocca i punti luminosi"),
        d.shape({ x: 120, y: 230, w: 900, h: 560 }, p.card, { radius: 32 }),
        d.text({ x: 160, y: 470, w: 820, h: 80 }, "Sostituisci con un'immagine", { size: 32, color: p.muted, align: "center" }),
        d.hotspot(360, 340, "1", d.popup("Primo dettaglio", "Spiega qui cosa si vede in questo punto.")),
        d.hotspot(760, 560, "2", d.popup("Secondo dettaglio", "Aggiungi un approfondimento, una data o un esempio."), 0.6),
        d.text({ x: 1080, y: 260, w: 400, h: 400 }, "Ogni punto apre una finestra con un approfondimento. Chi guarda esplora al proprio ritmo.", { size: 30, lineHeight: 1.45, delay: 0.4 }),
      ], "slide-left");

    case "schede": {
      const els: Element[] = [d.heading(title ?? "Clicca le schede per scoprire")];
      ["Curiosità", "Esempio", "Definizione"].forEach((label, i) => {
        const hiddenText = d.text({ x: 150 + i * 470, y: 470, w: 360, h: 260 }, "Il contenuto nascosto appare qui, al clic sulla scheda.", { size: 30, lineHeight: 1.4, enter: "pop" });
        hiddenText.hidden = true;
        els.push(
          d.shape({ x: 120 + i * 470, y: 260, w: 420, h: 500 }, p.contentAlt, { radius: 32, shadow: true, enter: "slide-up", delay: 0.15 * i }),
          d.button({ x: 150 + i * 470, y: 300, w: 360, h: 120 }, label, d.reveal(hiddenText), { fill: i === 1 ? p.accent2 : p.accent, delay: 0.3 + 0.15 * i }),
          hiddenText,
        );
      });
      return d.page("Schede", p.contentBg, els, "fade");
    }

    case "domanda": {
      const ok = d.text({ x: 160, y: 660, w: 1280, h: 80 }, "Giusto!", { size: 44, color: p.ok, weight: "600", align: "center", enter: "pop" });
      const ko = d.text({ x: 160, y: 660, w: 1280, h: 80 }, "Non proprio, riprova.", { size: 44, color: p.ko, weight: "600", align: "center", enter: "pop" });
      ok.hidden = true;
      ko.hidden = true;
      return d.page("Domanda", p.contentBg, [
        d.text({ x: 160, y: 140, w: 1280, h: 180 }, title ?? "Scrivi qui la domanda", { size: 64, title: true, align: "center", enter: "slide-up" }),
        d.button({ x: 260, y: 400, w: 480, h: 120 }, "Risposta giusta", d.reveal(ok), { fill: p.contentAlt, color: p.title, delay: 0.3 }),
        d.button({ x: 860, y: 400, w: 480, h: 120 }, "Risposta sbagliata", d.reveal(ko), { fill: p.contentAlt, color: p.title, delay: 0.45 }),
        ok,
        ko,
      ], "slide-left");
    }

    case "bivio":
      return d.page("Bivio", p.coverBg, [
        d.text({ x: 160, y: 160, w: 1280, h: 180 }, title ?? "Che strada scegli?", { size: 72, title: true, color: p.coverTitle, align: "center", enter: "slide-up" }),
        d.text({ x: 260, y: 340, w: 1080, h: 80 }, "Collega ogni pulsante a una pagina: Interazione → Vai a una pagina.", { size: 30, color: p.coverSub, align: "center", delay: 0.2 }),
        d.button({ x: 260, y: 500, w: 480, h: 140 }, "Strada A", d.tooltip("Collegami a una pagina in Interazione"), { fill: p.accent, delay: 0.4 }),
        d.button({ x: 860, y: 500, w: 480, h: 140 }, "Strada B", d.tooltip("Collegami a una pagina in Interazione"), { fill: p.accent2, color: p.title, delay: 0.55 }),
      ], "zoom", true);

    case "agenda":
      return d.page("Indice", p.contentAlt, [
        d.heading(title ?? "Di cosa parleremo"),
        ...["Introduzione", "Il cuore dell'argomento", "Esempi pratici", "Conclusioni"].flatMap((s, i) => [
          d.text({ x: 140, y: 260 + i * 140, w: 120, h: 100 }, String(i + 1).padStart(2, "0"), { size: 64, title: true, color: p.accent, enter: "pop", delay: 0.15 + i * 0.2 }),
          d.text({ x: 300, y: 280 + i * 140, w: 1100, h: 80 }, s, { size: 44, title: true, weight: "600", enter: "slide-left", delay: 0.2 + i * 0.2 }),
        ]),
      ], "fade");

    case "contatti":
      return d.page("Contatti", p.coverBg, [
        d.text({ x: 140, y: 240, w: 1300, h: 150 }, title ?? "Restiamo in contatto", { size: 88, title: true, color: p.coverTitle, enter: "slide-up" }),
        d.text({ x: 140, y: 420, w: 1300, h: 70 }, "nome@esempio.it", { size: 44, color: p.accent2, delay: 0.3 }),
        d.text({ x: 140, y: 500, w: 1300, h: 70 }, "www.ilmiosito.it", { size: 36, color: p.coverSub, delay: 0.4 }),
        d.text({ x: 140, y: 640, w: 1300, h: 70 }, "Condividi questa presentazione con il QR code da Condividi.", { size: 28, color: p.coverSub, delay: 0.5 }),
      ], "zoom", true);
  }
}
