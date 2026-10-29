import type { PlanetKind } from "@/components/planets/textures";

/** The Lumora system: each planet carries one feature. Shared by the hero and the scrolling tour. */
export type Feature = {
  id: string;
  kind: PlanetKind;
  planet: string;
  title: string;
  body: string;
  /** One-line description for the tour. */
  tagline: string;
  /** What you can do with it, three short points. */
  points: [string, string, string];
  /** Hero orbit radius as a fraction of the system radius. */
  orbit: number;
  /** Hero planet diameter as a fraction of the stage width. */
  size: number;
  /** Hero seconds per revolution. */
  period: number;
  phase: number;
  /** Glow colour used for the planet's light in the tour. */
  glow: string;
};

export const FEATURES: Feature[] = [
  {
    id: "hotspot", kind: "ember", planet: "Ignis", title: "Hotspot",
    body: "Rendi cliccabile qualsiasi punto di una pagina: un dettaglio, un'area invisibile, un'immagine.",
    tagline: "Un punto luminoso che pulsa invita chi guarda a toccare. Dietro c'è quello che vuoi tu.",
    points: ["Su foto, mappe, schemi o parole","Anche su aree invisibili della pagina","Apre finestre, suggerimenti o altre pagine"],
    orbit: 0.2, size: 0.03, period: 9, phase: 0.1, glow: "#ff7a2e",
  },
  {
    id: "animazioni", kind: "aurora", planet: "Aurelia", title: "Animazioni",
    body: "Ingressi, enfasi e tempi regolabili per guidare lo sguardo nel momento giusto.",
    tagline: "Ogni elemento entra in scena quando e come decidi tu, per guidare lo sguardo passo dopo passo.",
    points: ["Sette ingressi: dissolvenza, zoom, pop e altri","Effetti continui: pulsa, galleggia, brilla","Durata e ritardo regolabili al decimo di secondo"],
    orbit: 0.29, size: 0.04, period: 13, phase: 0.62, glow: "#b072ff",
  },
  {
    id: "popup", kind: "ocean", planet: "Thalassa", title: "Finestre e suggerimenti",
    body: "Al clic o al passaggio del mouse si apre un approfondimento, senza cambiare pagina.",
    tagline: "Approfondimenti che si aprono sopra la pagina: chi guarda legge di più solo se vuole.",
    points: ["Finestre con titolo e testo","Suggerimenti al passaggio del mouse","Si chiudono con un clic o con Esc"],
    orbit: 0.38, size: 0.042, period: 17, phase: 0.35, glow: "#2fd4cf",
  },
  {
    id: "rivela", kind: "crystal", planet: "Cryo", title: "Contenuti da scoprire",
    body: "Nascondi risposte e indizi: compaiono solo quando chi guarda li cerca.",
    tagline: "Nascondi un elemento e lascia che sia il pubblico a farlo apparire.",
    points: ["Risposte che compaiono al clic","Indizi da scovare tra gli oggetti","Soluzioni da svelare passo passo"],
    orbit: 0.47, size: 0.034, period: 22, phase: 0.8, glow: "#a6e8ff",
  },
  {
    id: "percorsi", kind: "jungle", planet: "Silva", title: "Percorsi a scelta",
    body: "Collega le pagine tra loro e crea quiz, menu e storie in cui decide chi guarda.",
    tagline: "Ogni pulsante porta dove vuoi tu: la presentazione diventa un percorso da esplorare.",
    points: ["Quiz con risposta giusta e sbagliata","Menu e indici cliccabili","Storie e simulazioni a bivi"],
    orbit: 0.6, size: 0.078, period: 34, phase: 0.2, glow: "#4fe39a",
  },
  {
    id: "transizioni", kind: "gold", planet: "Aurum", title: "Transizioni",
    body: "Passa da una pagina all'altra con dissolvenze, scorrimenti e rotazioni 3D.",
    tagline: "Il passaggio da una pagina all'altra diventa parte del racconto.",
    points: ["Dissolvenza, scorrimento e zoom","Rotazione 3D come una carta","Una transizione diversa per ogni pagina"],
    orbit: 0.73, size: 0.05, period: 46, phase: 0.55, glow: "#ffc94d",
  },
  {
    id: "condividi", kind: "rose", planet: "Rosalia", title: "Condivisione",
    body: "Un link difficile da indovinare, una password se serve, o il codice per incorporarla nel tuo sito.",
    tagline: "Pubblichi con un clic e decidi tu chi può vedere, e per quanto tempo.",
    points: ["Link pubblico difficile da indovinare","Password facoltativa per chi guarda","Codice per incorporarla nel tuo sito"],
    orbit: 0.85, size: 0.044, period: 60, phase: 0.05, glow: "#ff8fb1",
  },
  {
    id: "sicurezza", kind: "aegis", planet: "Aegis", title: "Sicurezza",
    body: "Verifica in due passaggi, password cifrate e contenuti che non possono eseguire codice.",
    tagline: "Il tuo account e le tue presentazioni sono protetti a ogni livello, senza che tu debba pensarci.",
    points: ["Verifica in due passaggi con l'app del telefono","Password cifrate e mai salvate in chiaro","Blocco automatico dopo troppi tentativi"],
    orbit: 0.96, size: 0.043, period: 74, phase: 0.72, glow: "#6f8bff",
  },
];

export const tourAnchor = (id: string) => `pianeta-${id}`;
