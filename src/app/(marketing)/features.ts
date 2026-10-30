import type { PlanetKind } from "@/components/planets/textures";

/**
 * The Lumora system: one world per step of making a presentation, in the
 * order you meet them. Shared by the hero and the scrolling tour. Every tool
 * listed here exists in the editor.
 */
export type Feature = {
  id: string;
  kind: PlanetKind;
  planet: string;
  title: string;
  /** Short line for the hero card. */
  body: string;
  /** One-line description for the tour. */
  tagline: string;
  /** Tools available for this step. */
  tools: string[];
  /** Hero orbit radius as a fraction of the system radius. */
  orbit: number;
  /** Hero planet diameter as a fraction of the stage width. */
  size: number;
  /** Hero seconds per revolution. */
  period: number;
  phase: number;
  /** Glow colour used for the planet's light. */
  glow: string;
};

export const FEATURES: Feature[] = [
  {
    id: "modelli", kind: "gold", planet: "Aurum", title: "Modelli",
    body: "Parti da una lezione, un pitch o un quiz già impostati.",
    tagline: "Non partire dal foglio bianco: scegli un modello già impaginato e animato, poi fallo tuo.",
    tools: ["Lezione interattiva", "Pitch in 5 pagine", "Quiz a domande", "Pagina vuota", "Anteprima prima di scegliere", "Duplica presentazione"],
    orbit: 0.2, size: 0.03, period: 9, phase: 0.5, glow: "#ffc94d",
  },
  {
    id: "layout", kind: "aurora", planet: "Aurelia", title: "Pagine e layout",
    body: "Trascina, ridimensiona e allinea gli elementi su ogni pagina.",
    tagline: "Componi ogni pagina trascinando gli elementi: guide e allineamenti fanno il resto.",
    tools: ["Guide di centratura", "Allinea in 6 direzioni", "Copia e incolla tra pagine", "Livelli", "Rotazione e opacità", "Blocca posizione", "Spostamento con le frecce", "Annulla e ripeti"],
    orbit: 0.29, size: 0.04, period: 13, phase: 0.97, glow: "#b072ff",
  },
  {
    id: "contenuti", kind: "rose", planet: "Rosalia", title: "Testi e immagini",
    body: "Titoli, testi, immagini, forme e pulsanti con i tuoi colori.",
    tagline: "Tutto quello che serve per riempire una pagina, con i caratteri e i colori che scegli tu.",
    tools: ["Carica immagini dal computer", "Corsivo e sottolineato", "Interlinea e spaziatura", "Bordi e cornici", "Ombre", "Forme e pulsanti", "Testo alternativo"],
    orbit: 0.38, size: 0.042, period: 17, phase: 0.42, glow: "#ff8fb1",
  },
  {
    id: "animazioni", kind: "ember", planet: "Ignis", title: "Animazioni",
    body: "Fai entrare in scena ogni elemento al momento giusto.",
    tagline: "Ogni elemento entra in scena quando e come decidi tu, per guidare lo sguardo passo dopo passo.",
    tools: ["7 effetti di ingresso", "4 effetti continui", "Durata regolabile", "Ritardo regolabile", "Versione statica automatica"],
    orbit: 0.47, size: 0.034, period: 22, phase: 0.12, glow: "#ff7a2e",
  },
  {
    id: "transizioni", kind: "crystal", planet: "Cryo", title: "Transizioni",
    body: "Scegli come si passa da una pagina all'altra.",
    tagline: "Il passaggio da una pagina all'altra diventa parte del racconto.",
    tools: ["Dissolvenza", "Scorrimento orizzontale e verticale", "Zoom", "Rotazione 3D", "Applica a tutte le pagine"],
    orbit: 0.6, size: 0.078, period: 34, phase: 0.33, glow: "#a6e8ff",
  },
  {
    id: "interattivita", kind: "ocean", planet: "Thalassa", title: "Interattività",
    body: "Hotspot, finestre e contenuti da scoprire al clic.",
    tagline: "Chi guarda tocca, esplora e scopre: ogni elemento può reagire a un clic o al passaggio del mouse.",
    tools: ["Hotspot luminosi", "Finestre di approfondimento", "Suggerimenti al passaggio", "Contenuti da rivelare", "Link esterni con conferma"],
    orbit: 0.73, size: 0.05, period: 46, phase: 0.2, glow: "#2fd4cf",
  },
  {
    id: "percorsi", kind: "jungle", planet: "Silva", title: "Percorsi e quiz",
    body: "Collega le pagine e crea quiz e storie a bivi.",
    tagline: "Ogni pulsante porta dove vuoi tu: la presentazione diventa un percorso da esplorare.",
    tools: ["Vai a una pagina", "Risposte giuste e sbagliate", "Menu e indici", "Storie a bivi", "Riordina e duplica pagine"],
    orbit: 0.85, size: 0.044, period: 60, phase: 0.48, glow: "#4fe39a",
  },
  {
    id: "condividi", kind: "aegis", planet: "Aegis", title: "Presenta e condividi",
    body: "Presenta a schermo intero o condividi con un link.",
    tagline: "Quando è pronta, presentala dal vivo con le tue note oppure mandala a chi vuoi.",
    tools: ["Modalità presentatore con note", "Cronometro", "Avanzamento automatico", "Esporta in PDF", "Link con password", "QR code", "Incorpora nel tuo sito"],
    orbit: 0.96, size: 0.043, period: 74, phase: 0.04, glow: "#6f8bff",
  },
];

export const tourAnchor = (id: string) => `pianeta-${id}`;
