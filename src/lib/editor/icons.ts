/**
 * Line icons in one consistent style (24×24 grid, round 2px strokes), drawn
 * for Lumora. Professional presentation tools use icons like these instead of
 * clip-art: they read at any size and take the colour of the theme.
 *
 * `words` are Italian keywords: layouts pick the icon that matches the text
 * of each point (for example "Costi" gets the euro sign).
 */

const ICON_DEFS = {
  check: { name: "Spunta", d: "M5 12.5l4.5 4.5L19 7.5", words: ["fatto", "ok", "sì", "corretto", "vantaggi", "pro"] },
  x: { name: "Croce", d: "M6 6l12 12M18 6L6 18", words: ["no", "errore", "sbagliato", "contro", "problema"] },
  plus: { name: "Più", d: "M12 5v14M5 12h14", words: ["aggiungi", "nuovo", "più"] },
  "arrow-right": { name: "Freccia", d: "M5 12h14M13 6l6 6-6 6", words: ["passo", "avanti", "prossimo", "poi"] },
  "trend-up": { name: "Crescita", d: "M3 17l6-6 4 4 8-8M15 7h6v6", words: ["crescita", "aumento", "sale", "risultati", "vendite", "ricavi"] },
  "trend-down": { name: "Calo", d: "M3 7l6 6 4-4 8 8M15 17h6v-6", words: ["calo", "riduzione", "scende", "perdita", "ritardi"] },
  "bar-chart": { name: "Grafico a barre", d: "M4 20h16M7 20v-8M12 20V5M17 20v-9", words: ["dati", "numeri", "statistiche", "analisi", "report", "mercato"] },
  pie: { name: "Torta", d: "M12 3a9 9 0 1 0 9 9h-9zM15 3.5A8.5 8.5 0 0 1 20.5 9H15z", words: ["quota", "percentuale", "parte", "budget"] },
  target: { name: "Obiettivo", d: "M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM12 7a5 5 0 1 0 0 10a5 5 0 1 0 0-10zM12 11.2a.8.8 0 1 0 0 1.6a.8.8 0 1 0 0-1.6z", words: ["obiettivo", "scopo", "missione", "target", "focus"] },
  user: { name: "Persona", d: "M12 12a4 4 0 1 0 0-8a4 4 0 1 0 0 8zM4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5", words: ["persona", "utente", "cliente", "chi sono", "io"] },
  users: { name: "Gruppo", d: "M9 11a3.5 3.5 0 1 0 0-7a3.5 3.5 0 1 0 0 7zM2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5M16 4.3a3.5 3.5 0 0 1 0 6.4M18 14.8c2.2.6 3.5 2.4 3.5 5.2", words: ["team", "squadra", "gruppo", "persone", "community", "cittadini", "pubblico", "insieme"] },
  mail: { name: "Email", d: "M3 6h18v12H3zM3 7l9 6 9-6", words: ["email", "posta", "contatti", "messaggio"] },
  phone: { name: "Telefono", d: "M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z", words: ["telefono", "chiama", "app", "mobile"] },
  globe: { name: "Mondo", d: "M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM3 12h18M12 3c2.5 2.8 3.8 5.8 3.8 9s-1.3 6.2-3.8 9c-2.5-2.8-3.8-5.8-3.8-9S9.5 5.8 12 3z", words: ["mondo", "globale", "estero", "internazionale", "web", "sito", "lingue"] },
  "map-pin": { name: "Luogo", d: "M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5a2.5 2.5 0 1 0 0 5z", words: ["luogo", "dove", "città", "mappa", "sede", "viaggio", "indirizzo"] },
  calendar: { name: "Calendario", d: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4", words: ["data", "giorno", "calendario", "quando", "evento", "programma", "anno"] },
  clock: { name: "Orologio", d: "M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM12 7v5l3 2", words: ["tempo", "ore", "orario", "durata", "veloce", "perso"] },
  lightbulb: { name: "Idea", d: "M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.8.6 1.1 1.4 1.1 2.2h5c0-.8.3-1.6 1.1-2.2A6 6 0 0 0 12 3z", words: ["idea", "soluzione", "trucco", "consiglio", "intuizione", "innovazione"] },
  rocket: { name: "Razzo", d: "M12 2c3 2.5 4.5 6 4.5 10v5h-9v-5C7.5 8 9 4.5 12 2zM7.5 13L4 16v3h3.5M16.5 13l3.5 3v3h-3.5M10 21h4M10.5 10a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0", words: ["lancio", "startup", "partenza", "crescita veloce", "spazio"] },
  shield: { name: "Sicurezza", d: "M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6zM8.5 12l2.5 2.5 4.5-5", words: ["sicurezza", "protezione", "garanzia", "privacy", "regole"] },
  lock: { name: "Lucchetto", d: "M6 11h12v10H6zM8.5 11V7.5a3.5 3.5 0 0 1 7 0V11", words: ["password", "privato", "chiuso", "accesso"] },
  search: { name: "Cerca", d: "M11 4a7 7 0 1 0 0 14a7 7 0 1 0 0-14zM16 16l5 5", words: ["cerca", "ricerca", "trova", "osserva", "indagine", "domanda"] },
  home: { name: "Casa", d: "M3 11l9-7 9 7M5 9.5V20h14V9.5M10 20v-5h4v5", words: ["casa", "home", "famiglia", "abitare"] },
  briefcase: { name: "Lavoro", d: "M3 8h18v12H3zM8 8V5h8v3M3 13h18", words: ["lavoro", "azienda", "business", "carriera", "progetti", "clienti"] },
  book: { name: "Libro", d: "M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2zM4 21V5M8 7h8", words: ["libro", "studio", "lezione", "storia", "lettura", "teoria", "basi"] },
  graduation: { name: "Laurea", d: "M2 9l10-5 10 5-10 5zM6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5M22 9v6", words: ["scuola", "università", "formazione", "imparare", "studenti", "tesi", "corso"] },
  leaf: { name: "Foglia", d: "M5 19C5 10 10 5 20 4c0 10-5 15-14 15zM5 19l8-8", words: ["natura", "ambiente", "eco", "verde", "sostenibile", "riciclo"] },
  sun: { name: "Sole", d: "M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8zM12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4", words: ["sole", "estate", "energia", "luce", "clima", "mattina"] },
  cloud: { name: "Nuvola", d: "M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 9.5A4.3 4.3 0 0 0 7 18z", words: ["cloud", "nuvola", "online", "meteo", "dati online"] },
  zap: { name: "Fulmine", d: "M13 2L4 14h7l-1 8 9-12h-7z", words: ["energia", "veloce", "automatizza", "potenza", "elettricità", "rapido"] },
  flag: { name: "Bandiera", d: "M5 21V4M5 4h12l-2 4 2 4H5", words: ["traguardo", "tappa", "meta", "inizio", "obiettivi"] },
  award: { name: "Premio", d: "M12 3a6 6 0 1 0 0 12a6 6 0 1 0 0-12zM8.5 14L7 21l5-3 5 3-1.5-7", words: ["premio", "qualità", "eccellenza", "vittoria", "campioni", "successo"] },
  star: { name: "Stella", d: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z", words: ["stella", "migliore", "preferito", "valutazione", "recensione"] },
  heart: { name: "Cuore", d: "M12 20s-8-4.8-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.2 12 20 12 20z", words: ["salute", "cura", "amore", "benessere", "passione", "cuore"] },
  message: { name: "Messaggio", d: "M4 5h16v11H9l-5 4z", words: ["chat", "commento", "parliamone", "dialogo", "feedback", "voce", "testimone"] },
  bell: { name: "Notifica", d: "M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 20h4", words: ["avviso", "notifica", "attenzione", "promemoria"] },
  link: { name: "Collegamento", d: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1", words: ["collega", "link", "connessione", "integrazione", "rete"] },
  download: { name: "Scarica", d: "M12 4v11M7 10l5 5 5-5M5 20h14", words: ["scarica", "importa", "download"] },
  play: { name: "Play", d: "M8 5v14l11-7z", words: ["video", "play", "inizia", "avvia", "demo"] },
  euro: { name: "Euro", d: "M17 6.5A6.5 6.5 0 0 0 6.5 12A6.5 6.5 0 0 0 17 17.5M4 10h9M4 14h9", words: ["costi", "costo", "prezzo", "soldi", "euro", "budget", "spesa", "investimento", "abbonamenti", "risparmio"] },
  cart: { name: "Carrello", d: "M3 4h2l2.5 11h10.5l2-8H6.3M8 20a1 1 0 1 0 2 0a1 1 0 1 0-2 0M16 20a1 1 0 1 0 2 0a1 1 0 1 0-2 0", words: ["acquisti", "negozio", "vendita", "shop", "carrello", "mercati"] },
  truck: { name: "Consegna", d: "M2 6h12v10H2zM14 10h4l3 3v3h-7M4 18a2 2 0 1 0 4 0a2 2 0 1 0-4 0M15 18a2 2 0 1 0 4 0a2 2 0 1 0-4 0", words: ["consegna", "trasporto", "spedizione", "logistica"] },
  code: { name: "Codice", d: "M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16", words: ["codice", "software", "sviluppo", "programma", "tecnologia"] },
  cpu: { name: "Processore", d: "M7 7h10v10H7zM10 10h4v4h-4zM9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4", words: ["computer", "intelligenza artificiale", "ia", "tecnologia", "digitale", "strumenti"] },
  layers: { name: "Livelli", d: "M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17l9 5 9-5", words: ["livelli", "struttura", "piattaforma", "insieme"] },
  sliders: { name: "Regolazioni", d: "M4 6h10M18 6h2M16 4v4M4 12h4M12 12h8M10 10v4M4 18h12M20 18h0M18 16v4", words: ["impostazioni", "regole", "personalizza", "controllo", "materiali"] },
  eye: { name: "Occhio", d: "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6z", words: ["vedi", "guarda", "visione", "osserva", "dettaglio"] },
  image: { name: "Immagine", d: "M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6M14 8.5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0", words: ["foto", "immagine", "galleria", "portfolio"] },
  camera: { name: "Fotocamera", d: "M3 8h4l2-3h6l2 3h4v12H3zM12 10a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7z", words: ["fotocamera", "scatto", "ricordi", "foto"] },
  quote: { name: "Citazione", d: "M10 7H6v5h4v-1c0 3-1.5 5-4 6M20 7h-4v5h4v-1c0 3-1.5 5-4 6", words: ["citazione", "frase", "dicono"] },
  percent: { name: "Percentuale", d: "M19 5L5 19M5 7a2 2 0 1 0 4 0a2 2 0 1 0-4 0M15 17a2 2 0 1 0 4 0a2 2 0 1 0-4 0", words: ["percentuale", "sconto", "tasso", "quota"] },
  pulse: { name: "Battito", d: "M3 12h4l2-4 4 8 2-4h6", words: ["battito", "salute", "monitorare", "stato", "stress"] },
  question: { name: "Domanda", d: "M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.5V14M12 17h.01", words: ["domanda", "perché", "dubbio", "quiz", "faq"] },
  info: { name: "Informazione", d: "M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM12 11v6M12 7.5h.01", words: ["info", "informazione", "nota", "contesto", "fatto"] },
  warning: { name: "Attenzione", d: "M12 3l10 18H2zM12 10v4M12 17.5h.01", words: ["attenzione", "rischio", "pericolo", "errori", "caos", "limiti"] },
  puzzle: { name: "Pezzo", d: "M5 8h3a2 2 0 1 1 4 0h3v3a2 2 0 1 1 0 4v3h-3a2 2 0 1 0-4 0H5v-3a2 2 0 1 0 0-4z", words: ["pezzo", "integrazione", "soluzione", "combina", "strumento"] },
  compass: { name: "Bussola", d: "M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM15.5 8.5l-2 5-5 2 2-5z", words: ["direzione", "strategia", "orientamento", "esplora", "visione"] },
} as const;

export type IconId = keyof typeof ICON_DEFS;
export const ICONS: Record<IconId, { name: string; d: string; words: readonly string[] }> = ICON_DEFS;
export const ICON_IDS = Object.keys(ICON_DEFS) as IconId[];
export const isIconId = (v: unknown): v is IconId => typeof v === "string" && v in ICON_DEFS;

/** Icons used in turn when no keyword matches. */
const FALLBACK: IconId[] = ["target", "zap", "users", "trend-up", "shield", "clock", "lightbulb", "globe", "layers", "compass"];

/** The icon that best matches a text (a point's title and description), else the i-th fallback. */
export function pickIcon(text: string, i = 0, used: Set<IconId> = new Set()): IconId {
  const t = ` ${text.toLowerCase()} `;
  let best: IconId | null = null;
  let score = 0;
  for (const id of ICON_IDS) {
    if (used.has(id)) continue;
    for (const w of ICONS[id].words) {
      if (t.includes(w) && w.length > score) {
        best = id;
        score = w.length;
      }
    }
  }
  if (best) return best;
  const free = FALLBACK.filter((f) => !used.has(f));
  return (free.length ? free : FALLBACK)[i % (free.length || FALLBACK.length)];
}
