import type { Element, Page, PresentationDoc } from "./schema";
import { CANVAS_H } from "./schema";
import type { PageContent } from "./content";
import { buildLayout, drawWith, type LayoutId } from "./layouts";
import { DEFAULT_THEME, getTheme, type ThemeId } from "./themes";

/**
 * Starting points for a new presentation. Each one follows the storytelling
 * grammar of a style from the Lemo-Opuscar library (the order in which
 * information arrives and how much room each part gets), comes with the theme
 * that suits it, and is filled with example content that shows what goes
 * where, so nobody starts from "write here". Every call builds a fresh
 * document (new ids every time) that passes the document schema.
 */

export const TEMPLATES = [
  { id: "vuota", name: "Vuota", style: "Pagina bianca", theme: "aurora", description: "Una copertina e nient'altro: parti da zero." },
  { id: "lezione", name: "Lezione alla lavagna", style: "Lavagna e gesso", theme: "carta", description: "Prima cosa si pensa, poi cosa è vero: idea sbagliata, verità, parole chiave, esplorazione e verifica." },
  { id: "pitch", name: "Pitch da keynote", style: "Keynote tech", theme: "ardesia", description: "Il caos, una sola soluzione, un numero gigante da solo, come funziona e l'invito finale." },
  { id: "quiz", name: "Quiz a round", style: "Show a quiz", theme: "corallo", description: "Tre round, ognuno con il suo cartello e una domanda; punteggio alla fine." },
  { id: "relazione", name: "Relazione con i dati", style: "Racconto con i dati", theme: "nordico", description: "Domanda, dati onesti con la fonte, confronto, citazione e conclusioni." },
  { id: "storia", name: "Storia a bivi", style: "Albo illustrato", theme: "lavanda", description: "Chi guarda sceglie la strada: due percorsi e due finali." },
  { id: "portfolio", name: "Portfolio", style: "Art déco", theme: "sabbia", description: "Chi sei, i lavori in vetrina, i risultati e chi ha lavorato con te." },
  { id: "workshop", name: "Workshop", style: "Progetto tecnico", theme: "marea", description: "Programma, fasi, schede da scoprire, livelli e verifica finale." },
  { id: "viaggio", name: "Diario di viaggio", style: "Poster da viaggio", theme: "foresta", description: "Foto d'apertura, itinerario, numeri del viaggio, cosa portare e i ricordi." },
  { id: "tutorial", name: "Tutorial passo passo", style: "Spiegazione alla lavagna bianca", theme: "inchiostro", description: "Cosa serve, i passaggi in ordine, giusto e sbagliato, prova finale." },
  { id: "notizia", name: "Servizio giornalistico", style: "Telegiornale", theme: "grafite", description: "Il fatto in una frase, come è andata, i numeri, una voce e cosa succede ora." },
] as const satisfies readonly { id: string; name: string; style: string; theme: ThemeId; description: string }[];

export type TemplateId = (typeof TEMPLATES)[number]["id"];

export const isTemplateId = (v: unknown): v is TemplateId => TEMPLATES.some((t) => t.id === v);

/** The theme a template is designed for. */
export const templateTheme = (id: TemplateId): ThemeId => TEMPLATES.find((t) => t.id === id)?.theme ?? DEFAULT_THEME;

type Box = { x: number; y: number; w: number; h: number };
const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/**
 * Adds a button that leads to `target`, in a spot where it covers no words,
 * buttons or pictures: first right under the lowest text (aligned with it),
 * then the free corners at the bottom and the top.
 */
/**
 * A free spot for a button on a page, where it covers no words, buttons or
 * pictures: first right under the lowest text (aligned with it), then the free
 * corners at the bottom and the top.
 */
export function freeSpot(page: Page, w = 340, h = 76, ignore?: string): Box {
  const busy = page.elements.filter((e) => e.id !== ignore && !e.decor && (e.type === "text" || e.type === "button" || e.type === "image" || (e.type === "shape" && e.photoSlot)));
  const texts = busy.filter((e): e is Extract<Element, { type: "text" }> => e.type === "text");
  const low = texts.reduce<(typeof texts)[number] | undefined>((a, e) => (!a || e.y + e.h > a.y + a.h ? e : a), undefined);
  const under: Box[] = low
    ? [{ x: low.align === "center" ? (1600 - w) / 2 : low.align === "right" ? low.x + low.w - w : low.x, y: low.y + low.h + 16, w, h }]
    : [];
  const spots: Box[] = [
    ...under,
    { x: 1600 - w - 60, y: CANVAS_H - h - 40, w, h },
    { x: (1600 - w) / 2, y: CANVAS_H - h - 40, w, h },
    { x: 60, y: CANVAS_H - h - 40, w, h },
    { x: 1600 - w - 60, y: 30, w, h },
  ];
  return spots.find((s) => s.y + s.h <= CANVAS_H - 10 && !busy.some((e) => overlaps(s, e))) ?? spots[1];
}

/** Adds a button that leads to `target`, in a free spot of the page. */
function linkButton(page: Page, target: Page, label: string, themeId: ThemeId) {
  const d = drawWith(getTheme(themeId));
  page.elements.push(d.button(freeSpot(page), label, d.goto(target), { delay: 0.6 }));
}

export function buildTemplate(id: TemplateId, title: string, themeId: ThemeId = templateTheme(id)): PresentationDoc {
  const theme = getTheme(themeId);
  const d = drawWith(theme);
  const L = (layout: LayoutId, content: PageContent = {}) => buildLayout(layout, theme, content);
  const doc = (pages: Page[]): PresentationDoc => ({ version: 1, pages, settings: { autoAdvance: 0, theme: themeId } });

  switch (id) {
    case "vuota":
      return doc([L("copertina", { heading: title, subtitle: "Il sottotitolo: in una riga, perché vale la pena ascoltare" })]);

    // Chalkboard: write what people think, wipe it, write what is true in the same place. Few words, large letters.
    case "lezione": {
      const cover = L("copertina", { heading: title, subtitle: "Una lezione in sei pagine, con una domanda alla fine" });
      const myth = L("titolo-testo", {
        heading: "Cosa pensiamo",
        body: "Scrivi qui l'idea sbagliata più comune sull'argomento, come la direbbe uno studente. Per esempio: \"D'estate fa caldo perché la Terra è più vicina al Sole\".",
        highlight: "Partire dall'errore fa ricordare meglio la verità.",
      });
      const truth = L("titolo-testo", {
        heading: "Cosa è vero",
        body: "Ora la spiegazione giusta, nello stesso spazio. Per esempio: le stagioni dipendono dall'inclinazione dell'asse terrestre, non dalla distanza dal Sole; a gennaio la Terra è anzi più vicina.",
        highlight: "Una sola idea per pagina, con parole grandi.",
      });
      const explore = L("esplora", {
        heading: "Guarda da vicino",
        body: "Metti qui un'immagine e tocca i punti per scoprire i dettagli.",
        items: [
          { title: "Primo dettaglio", text: "Cosa si vede in questo punto e perché conta." },
          { title: "Secondo dettaglio", text: "Un particolare che di solito sfugge." },
        ],
      });
      linkButton(cover, myth, "Inizia la lezione", themeId);
      return doc([
        cover,
        myth,
        truth,
        L("mappa", { heading: "Le parole chiave", highlight: "L'idea", items: [{ title: "Causa" }, { title: "Effetto" }, { title: "Esempio" }, { title: "Eccezione" }] }),
        explore,
        L("domanda", {
          question: { text: "Perché d'estate fa più caldo?", right: "Per l'inclinazione dell'asse", wrong: "Perché siamo più vicini al Sole", explanation: "I raggi arrivano più dritti e le giornate sono più lunghe." },
        }),
        L("chiusura", { heading: "Lezione finita!", subtitle: "Ripassa: idea sbagliata, idea giusta, parole chiave." }),
      ]);
    }

    // Dark Tech Keynote: disorder first, one decisive action, the big number on its own screen, then empty space and the call.
    case "pitch":
      return doc([
        L("copertina", { heading: title, subtitle: "Il prodotto in una frase: cosa fa, per chi" }),
        L("icone", {
          heading: "Oggi è un caos",
          items: [
            { title: "Troppi strumenti", text: "Ogni lavoro in un'app diversa" },
            { title: "Tempo perso", text: "Ore a cercare file e messaggi" },
            { title: "Errori", text: "Dati copiati a mano" },
            { title: "Costi", text: "Abbonamenti che si sommano" },
            { title: "Ritardi", text: "Decisioni che aspettano" },
            { title: "Stress", text: "Nessuno ha il quadro" },
          ],
        }),
        L("titolo-testo", {
          heading: "Una sola mossa",
          body: "Descrivi la soluzione come un'unica azione chiara: cosa fa l'utente, cosa succede subito dopo. Niente elenco di funzioni: una promessa.",
          highlight: "Se due cose sono importanti, una è di troppo.",
        }),
        L("percentuale", { heading: "Il numero che conta", stats: [{ value: "72%", label: "di tempo risparmiato", text: "Il risultato principale, da solo sulla pagina." }], highlight: "Fonte: test con i primi clienti" }),
        L("processo", {
          heading: "Come funziona",
          items: [
            { title: "Collega", text: "Si importano i dati in un clic" },
            { title: "Automatizza", text: "Il lavoro ripetitivo sparisce" },
            { title: "Decidi", text: "Il quadro è sempre aggiornato" },
          ],
        }),
        L("linea-tempo", {
          heading: "Le prossime tappe",
          items: [
            { title: "Oggi", text: "Prodotto in prova con i primi clienti" },
            { title: "Tra 6 mesi", text: "Lancio pubblico" },
            { title: "Tra 1 anno", text: "Espansione all'estero" },
          ],
        }),
        L("contatti", { heading: "Parliamone", subtitle: "Una sola richiesta chiara: cosa vuoi da chi ti ascolta?" }),
      ]);

    // Game Show Flat: a round is a card plus one repeatable action, ending on a judgement read at a glance.
    case "quiz": {
      const cover = L("copertina", { heading: title, subtitle: "Tre round, una domanda ciascuno. Pronti?" });
      const end = L("chiusura", { heading: "Quiz completato!", subtitle: "Conta le risposte giuste: 3 su 3 è da campioni." });
      const round = (n: number, name: string) => L("sezione", { heading: name, subtitle: `Round ${n} di 3`, stats: [{ value: `0${n}`, label: "Round" }] });
      const questions = [
        L("domanda", { question: { text: "Qual è il pianeta più grande del Sistema solare?", right: "Giove", wrong: "Saturno", explanation: "Giove ha una massa oltre il doppio di tutti gli altri pianeti insieme." } }),
        L("domanda", { question: { text: "In che anno è caduto il Muro di Berlino?", right: "1989", wrong: "1991", explanation: "Il 9 novembre 1989; nel 1991 si è dissolta l'Unione Sovietica." } }),
        L("domanda", { question: { text: "Quanti lati ha un esagono?", right: "6", wrong: "8", explanation: "Esa vuol dire sei; l'ottagono ne ha otto." } }),
      ];
      const rounds = [round(1, "Spazio"), round(2, "Storia"), round(3, "Matematica")];
      // Each round card leads to its question; each question's "Avanti" leads to the next round, then to the end.
      rounds.forEach((r, i) => linkButton(r, questions[i], "Vai alla domanda", themeId));
      questions.forEach((q, i) => linkButton(q, rounds[i + 1] ?? end, "Avanti", themeId));
      linkButton(cover, rounds[0], "Inizia il quiz", themeId);
      return doc([cover, ...rounds.flatMap((r, i) => [r, questions[i]]), end]);
    }

    // Data Storytelling: the chart's own headline, honest numbers, the source always shown.
    case "relazione":
      return doc([
        L("copertina", { heading: title, subtitle: "Relazione di: nome e classe o corso" }),
        L("agenda", { heading: "Di cosa parlo", items: [{ title: "La domanda" }, { title: "I dati" }, { title: "Il confronto" }, { title: "Le conclusioni" }] }),
        L("titolo-testo", {
          heading: "La domanda",
          body: "Scrivi la domanda a cui risponde la relazione, in una frase. Poi in due righe: perché è interessante e come hai cercato la risposta.",
          highlight: "Una buona relazione risponde a una domanda sola.",
        }),
        L("numeri", {
          heading: "I dati",
          stats: [
            { value: "3", label: "fonti consultate", text: "Libri, siti ufficiali, interviste" },
            { value: "120", label: "risposte raccolte", text: "Il campione del sondaggio" },
            { value: "2", label: "anni confrontati", text: "Il periodo osservato" },
          ],
        }),
        L("percentuale", { heading: "Il dato principale", stats: [{ value: "64%", label: "il risultato più importante", text: "Spiega cosa significa, senza esagerarlo." }], highlight: "Fonte: scrivi sempre da dove viene il dato" }),
        L("confronto", { heading: "Prima e dopo", items: [{ title: "Prima", text: "Primo punto\nSecondo punto\nTerzo punto" }, { title: "Dopo", text: "Primo punto\nSecondo punto\nTerzo punto" }] }),
        L("citazione", { quote: { text: "Non tutto ciò che può essere contato conta, e non tutto ciò che conta può essere contato.", author: "William Bruce Cameron" } }),
        L("elenco", {
          heading: "Conclusioni",
          items: [
            { title: "La risposta", text: "Cosa dicono i dati, in una frase" },
            { title: "I limiti", text: "Cosa i dati non dicono" },
            { title: "Il passo dopo", text: "Cosa si potrebbe studiare ancora" },
          ],
        }),
        L("chiusura", { heading: "Grazie", subtitle: "Domande?" }),
      ]);

    // Picture book: the reader turns the page and picks the way.
    case "storia": {
      const cover = L("copertina", { heading: title, subtitle: "Una storia dove decidi tu" });
      const fork = L("bivio", { heading: "Sei davanti a un bivio. Dove vai?", subtitle: "Tocca una strada per scoprire cosa succede.", items: [{ title: "Il bosco" }, { title: "Il mare" }] });
      const pathA = L("immagine-testo", { heading: "Hai scelto il bosco", body: "Gli alberi si chiudono sopra di te e senti un fruscio tra le foglie. Racconta qui cosa succede." });
      const pathB = L("immagine-testo", { heading: "Hai scelto il mare", body: "Il vento porta odore di sale e all'orizzonte c'è una vela. Racconta qui cosa succede." });
      const endA = L("chiusura", { heading: "Fine: il bosco", subtitle: "Torna all'inizio e prova l'altra strada." });
      const endB = L("chiusura", { heading: "Fine: il mare", subtitle: "Torna all'inizio e prova l'altra strada." });
      const [a, b] = fork.elements.filter((e): e is Extract<Element, { type: "button" }> => e.type === "button");
      a.interaction = d.goto(pathA);
      b.interaction = d.goto(pathB);
      linkButton(pathA, endA, "Continua", themeId);
      linkButton(pathB, endB, "Continua", themeId);
      linkButton(cover, fork, "Comincia", themeId);
      return doc([cover, fork, pathA, endA, pathB, endB]);
    }

    // Art Deco: symmetry, a gallery frame for each work, one gold accent.
    case "portfolio":
      return doc([
        L("copertina", { heading: title, subtitle: "Il tuo mestiere in una riga" }),
        L("titolo-testo", { heading: "Chi sono", body: "Tre frasi: cosa fai, per chi lo fai, cosa ti distingue. Scrivi come parleresti a un cliente.", highlight: "Il lavoro di cui vai più fiero, in una frase." }),
        L("mosaico", { heading: "I lavori", body: "Quattro progetti, una foto ciascuno. Tocca uno spazio e usa Foto gratis o Immagine." }),
        L("immagine-testo", { heading: "Progetto in primo piano", body: "La sfida, cosa hai fatto, il risultato. Una foto grande vale più di dieci righe." }),
        L("numeri", {
          heading: "Risultati",
          stats: [
            { value: "40+", label: "progetti", text: "Consegnati dal primo giorno" },
            { value: "12", label: "clienti", text: "Che sono tornati" },
            { value: "5", label: "anni", text: "Di esperienza" },
          ],
        }),
        L("citazione", { quote: { text: "Scrivi qui il commento di un cliente, con le sue parole.", author: "Nome, ruolo e azienda" } }),
        L("contatti", { heading: "Lavoriamo insieme" }),
      ]);

    // Blueprint: a technical plan, phases drawn in order, levels from the base up.
    case "workshop": {
      const cover = L("copertina", { heading: title, subtitle: "Un laboratorio pratico: si impara facendo" });
      const agenda = L("agenda", { heading: "Il programma", items: [{ title: "Benvenuto" }, { title: "Le basi" }, { title: "Prova pratica" }, { title: "Confronto" }, { title: "Verifica" }] });
      linkButton(cover, agenda, "Iniziamo", themeId);
      return doc([
        cover,
        agenda,
        L("processo", {
          heading: "Come lavoreremo",
          items: [
            { title: "Osserva", text: "Guardiamo un esempio insieme" },
            { title: "Prova", text: "Ognuno lo rifà da solo" },
            { title: "Confronta", text: "Mettiamo a confronto i risultati" },
            { title: "Migliora", text: "Correggiamo e riproviamo" },
          ],
        }),
        L("schede", {
          heading: "Gli strumenti",
          items: [
            { title: "Materiali", text: "L'elenco di cosa serve sul tavolo." },
            { title: "Regole", text: "Tre regole per lavorare bene insieme." },
            { title: "Aiuto", text: "Cosa fare se ci si blocca." },
          ],
        }),
        L("piramide", {
          heading: "Dalle basi alla maestria",
          items: [
            { title: "Creare", text: "Inventare qualcosa di nuovo" },
            { title: "Applicare", text: "Usare quello che si sa" },
            { title: "Capire", text: "Le basi, per tutti" },
          ],
        }),
        L("domanda", { question: { text: "Qual è il primo passo del metodo?", right: "Osservare un esempio", wrong: "Provare subito da soli", explanation: "Prima si osserva, poi si prova: così si sbaglia meno." } }),
        L("chiusura", { heading: "Ben fatto!", subtitle: "Porta a casa una cosa che hai imparato oggi." }),
      ]);
    }

    // Silkscreen travel poster: one big image, flat colours, the route, the numbers of the trip.
    case "viaggio":
      return doc([
        L("foto-piena", { heading: title, subtitle: "Dove, quando e con chi" }),
        L("linea-tempo", {
          heading: "L'itinerario",
          items: [
            { title: "Giorno 1", text: "Arrivo e primo giro in centro" },
            { title: "Giorno 2", text: "Il luogo più famoso" },
            { title: "Giorno 3", text: "Fuori città, nella natura" },
            { title: "Giorno 4", text: "Mercati, cibo e ritorno" },
          ],
        }),
        L("numeri", {
          heading: "Il viaggio in numeri",
          stats: [
            { value: "1.200", label: "chilometri", text: "Percorsi in totale" },
            { value: "4", label: "giorni", text: "Di avventura" },
            { value: "3", label: "città", text: "Visitate" },
          ],
        }),
        L("mosaico", { heading: "Le foto più belle", body: "Quattro scatti: un paesaggio, un piatto, una persona, un dettaglio." }),
        L("icone", {
          heading: "Cosa portare",
          items: [
            { title: "Documenti", text: "Carta d'identità e biglietti" },
            { title: "Scarpe comode", text: "Si cammina tanto" },
            { title: "Caricatore", text: "E una batteria esterna" },
            { title: "Borraccia", text: "Meno plastica, più soldi" },
            { title: "Mappa", text: "Scaricata, funziona offline" },
            { title: "Curiosità", text: "La cosa più importante" },
          ],
        }),
        L("citazione", { quote: { text: "Il mondo è un libro, e chi non viaggia ne legge solo una pagina.", author: "Attribuita a Sant'Agostino" } }),
        L("chiusura", { heading: "Alla prossima meta!", subtitle: "Dove andresti tu?" }),
      ]);

    // Whiteboard explainer: what you need, the steps in order, right versus wrong, then try it.
    case "tutorial":
      return doc([
        L("copertina", { heading: title, subtitle: "Impara a farlo in pochi passaggi" }),
        L("icone", {
          heading: "Cosa ti serve",
          items: [
            { title: "Strumento 1", text: "A cosa serve" },
            { title: "Strumento 2", text: "A cosa serve" },
            { title: "Materiale", text: "Quanto ne serve" },
            { title: "Tempo", text: "Circa 20 minuti" },
            { title: "Spazio", text: "Un tavolo libero" },
            { title: "Pazienza", text: "La prima volta è lenta" },
          ],
        }),
        L("processo", {
          heading: "I passaggi",
          items: [
            { title: "Prepara", text: "Metti tutto a portata di mano" },
            { title: "Inizia", text: "Il primo gesto, spiegato bene" },
            { title: "Controlla", text: "Come capire se va bene" },
            { title: "Rifinisci", text: "Il tocco finale" },
          ],
        }),
        L("confronto", { heading: "Giusto o sbagliato?", items: [{ title: "Così sì", text: "Un gesto corretto\nUn buon segnale\nUn trucco utile" }, { title: "Così no", text: "L'errore più comune\nUn segnale d'allarme\nCosa evitare" }] }),
        L("titolo-testo", { heading: "Il trucco in più", body: "Il consiglio che di solito si impara solo dopo tanti tentativi. Spiegalo con un esempio.", highlight: "Il dettaglio che fa la differenza." }),
        L("domanda", { question: { text: "Cosa si fa prima di iniziare?", right: "Preparare tutto", wrong: "Partire dalla rifinitura", explanation: "Con tutto a portata di mano si lavora senza interruzioni." } }),
        L("chiusura", { heading: "Ora tocca a te!", subtitle: "Prova e mostra il risultato." }),
      ]);

    // Broadcast news package: the lead in one sentence, how it happened, the figures, a voice from the scene, what comes next.
    case "notizia":
      return doc([
        L("copertina", { heading: title, subtitle: "Il fatto in una frase: chi, cosa, dove, quando" }),
        L("titolo-testo", {
          heading: "Il fatto",
          body: "Le cinque domande del giornalismo: chi, cosa, dove, quando e perché. Rispondi in tre frasi, la più importante per prima.",
          highlight: "La notizia sta nella prima riga.",
        }),
        L("linea-tempo", {
          heading: "Come è andata",
          items: [
            { title: "Mattina", text: "Il primo segnale" },
            { title: "Mezzogiorno", text: "Il momento decisivo" },
            { title: "Pomeriggio", text: "Le prime reazioni" },
            { title: "Sera", text: "La situazione ora" },
          ],
        }),
        L("numeri", {
          heading: "I numeri",
          stats: [
            { value: "500", label: "persone coinvolte", text: "Secondo le prime stime" },
            { value: "3", label: "ore", text: "Durata dell'evento" },
            { value: "2", label: "città", text: "Interessate" },
          ],
        }),
        L("citazione", { quote: { text: "Scrivi qui la frase di un testimone, con le sue parole esatte.", author: "Nome e ruolo del testimone" } }),
        L("mappa", { heading: "Chi è coinvolto", highlight: "Il fatto", items: [{ title: "Cittadini" }, { title: "Istituzioni" }, { title: "Esperti" }, { title: "Testimoni" }] }),
        L("chiusura", { heading: "Cosa succede ora", subtitle: "Il prossimo appuntamento o la prossima decisione." }),
      ]);
  }
}
