import { LAYOUT_GROUPS } from "@/lib/editor/layouts";
import { normalize, parseDeck, planDeck, serializeDeck, type DeckSpec } from "@/lib/editor/deck";
import { getTheme, THEMES, type ThemeId } from "@/lib/editor/themes";

/**
 * Zib's on-board brain, used when no AI key is configured (and as a fallback).
 * It understands questions without accents and with small typos, can answer
 * two topics at once, follows up on the previous question ("e come si fa?"),
 * and turns "make me a presentation about X" into a full outline with a button
 * that creates it. Answers use the chat's formats: "•" lists, [[path|label]]
 * buttons, [[crea|outline]] and {{suggested question}}.
 */

export type ChatMessage = { role: "user" | "assistant"; content: string };

type Intent = {
  id: string;
  /** Stems ("animaz") match the start of a word, with one typo allowed; phrases ("due passaggi") match as written. */
  keys: string[];
  answer: string;
  /** Extra detail for "e poi?", "come?", "spiegami meglio". */
  more?: string;
  action?: string;
  next?: string[];
};

const INTENTS: Intent[] = [
  {
    id: "saluto",
    keys: ["ciao", "salve", "buongiorno", "buonasera", "hey", "ehi", "hola", "hello"],
    answer: "Ciao! 👽 Sono Zib, il tuo copilota tra i pianeti di Lumora. Posso spiegarti ogni funzione, risolvere un problema o preparare per te una presentazione completa su un argomento.",
    next: ["Fammi una presentazione sul sistema solare", "Come funziona Lumora?", "Quali temi ci sono?"],
  },
  {
    id: "chi-sei",
    keys: ["chi sei", "cosa sai fare", "cosa puoi fare", "come funzioni", "aiuto", "help", "zib", "come funziona lumora", "cos'e lumora", "cose lumora"],
    answer:
      "Lumora serve a creare presentazioni interattive: pagine animate, hotspot, quiz e percorsi a bivi, da presentare o condividere con un link. Io posso:\n• spiegarti ogni strumento, passo per passo\n• proporti tema, modello e scaletta per un argomento, e creare la presentazione con un clic\n• aiutarti con account, sicurezza e condivisione",
    next: ["Crea una lezione sugli oceani", "Come rendo interattiva una pagina?", "Come la condivido?"],
  },
  { id: "grazie", keys: ["grazie", "perfetto", "ottimo", "fantastico", "gentilissimo", "top"], answer: "Di niente! Se ti serve altro, sono qui in orbita. 🛸", next: ["Quali scorciatoie da tastiera ci sono?", "Come presento?"] },
  {
    id: "registrazione",
    keys: ["registr", "iscriv", "creare un account", "nuovo account", "account"],
    answer: "Vai su Registrati, inserisci nome, email e una password (almeno 12 caratteri, e controllo che non sia comparsa in violazioni di dati), poi conferma l'email dal link che ricevi. Creare un account è gratuito.",
    more: "Se l'email non arriva controlla lo spam e attendi qualche minuto. Dopo la conferma entri direttamente nella dashboard.",
    action: "[[/registrati|Crea un account]]",
    next: ["Come attivo la verifica in due passaggi?", "Quanto costa?"],
  },
  {
    id: "accesso",
    keys: ["accedi", "accesso", "login", "entrare", "loggarmi", "non riesco ad entrare"],
    answer: "Entri da Accedi con email e password. Se hai attivato la verifica in due passaggi ti chiedo anche il codice a 6 cifre della tua app di autenticazione.",
    more: "Dopo 10 tentativi sbagliati l'accesso si blocca per qualche minuto: è una protezione contro chi prova a indovinare la password.",
    action: "[[/accedi|Accedi]]",
    next: ["Ho dimenticato la password", "Il codice 2FA non funziona"],
  },
  {
    id: "password",
    keys: ["password", "dimenticat", "reimposta", "cambiare password", "cambio password"],
    answer: "Se l'hai dimenticata vai su Password dimenticata: ti mando un link per sceglierne una nuova. Se vuoi solo cambiarla, la trovi in Impostazioni → Sicurezza.",
    more: "Quando cambi la password esco da tutti gli altri dispositivi, così una vecchia sessione rimasta aperta non resta valida.",
    action: "[[/password-dimenticata|Recupera la password]]",
    next: ["Come attivo la verifica in due passaggi?"],
  },
  {
    id: "2fa",
    keys: ["2fa", "due passaggi", "due fattori", "autenticazione", "authenticator", "codice", "totp", "otp"],
    answer: "La verifica in due passaggi si attiva da Impostazioni:\n• scansiona il QR con un'app come Google Authenticator\n• inserisci il codice a 6 cifre per confermare\n• conserva i codici di recupero in un posto sicuro",
    more: "Se il codice viene rifiutato controlla che l'ora del telefono sia impostata in automatico. Se hai perso il telefono usa uno dei codici di recupero: ognuno vale una volta sola.",
    action: "[[/impostazioni|Apri la sicurezza]]",
    next: ["Ho perso il telefono", "Come esco da tutti i dispositivi?"],
  },
  {
    id: "recupero",
    keys: ["codici di recupero", "perso il telefono", "telefono perso", "recupero"],
    answer: "Nessun panico: all'accesso, al posto del codice dell'app inserisci uno dei codici di recupero che hai salvato quando hai attivato la verifica. Ogni codice funziona una sola volta; poi da Impostazioni puoi generarne di nuovi.",
    action: "[[/impostazioni|Apri la sicurezza]]",
  },
  {
    id: "sessioni",
    keys: ["esci da tutti", "disconnetti", "altri dispositivi", "sessioni", "logout", "uscire"],
    answer: "Per uscire usa Esci in alto. Da Impostazioni puoi anche chiudere la sessione su tutti gli altri dispositivi in un colpo solo.",
    action: "[[/impostazioni|Apri le impostazioni]]",
  },
  {
    id: "temi",
    keys: ["tema", "temi", "stile", "palette", "aspetto", "look"],
    answer: `Ci sono ${THEMES.length} temi, ognuno con colori e caratteri coordinati: ${THEMES.map((t) => t.name).join(", ")}. Lo scegli quando crei la presentazione e puoi cambiarlo in qualsiasi momento.`,
    more: "Per cambiarlo nell'editor clicca su un punto vuoto della pagina: a destra trovi la sezione Tema. Cambia colori e caratteri di tutte le pagine; i colori che hai scelto a mano restano come sono e puoi sempre annullare con Ctrl+Z.",
    next: ["Che tema mi consigli per una lezione?", "Fammi una presentazione in stile Neon sui videogiochi"],
  },
  {
    id: "layout",
    keys: ["layout", "nuova pagina", "aggiungere una pagina", "aggiungo una pagina", "impaginazione", "colonne", "linea del tempo", "citazione", "indice"],
    answer: `Con "+ Nuova pagina" nell'editor scegli tra ${LAYOUT_GROUPS.reduce((n, g) => n + g.layouts.length, 0)} layout già impaginati e animati, nei colori del tuo tema: ${LAYOUT_GROUPS.flatMap((g) => g.layouts.map((l) => l.name.toLowerCase())).join(", ")}.`,
    more: "Ogni layout è raggruppato per funzione (struttura, testi e immagini, animazioni, interattività, quiz…). Se preferisci partire da zero c'è anche Pagina vuota.",
    next: ["Come sposto o allineo gli elementi?", "Come aggiungo una linea del tempo?"],
  },
  {
    id: "modelli",
    keys: ["modell", "template", "nuova presentazione", "iniziare", "inizio", "partire", "prima presentazione"],
    answer: "Dalla dashboard premi Nuova presentazione: scegli un tema e uno degli 8 modelli (Vuota, Lezione interattiva, Pitch, Quiz, Relazione, Storia a bivi, Portfolio, Workshop). Oppure dimmi l'argomento e preparo io la scaletta!",
    action: "[[/dashboard|Apri la dashboard]]",
    next: ["Fammi una presentazione sulla fotosintesi", "Crea un pitch per la mia startup"],
  },
  {
    id: "testi",
    keys: ["font", "carattere", "caratteri", "scritta", "scrivere", "testo", "grassetto", "corsivo", "sottolineato", "interlinea"],
    answer: "Seleziona un testo e usa il pannello a destra: 32 caratteri (dal calligrafico al pixel), grassetto, corsivo, sottolineato, allineamento, interlinea e spaziatura tra le lettere.",
    more: "Per un titolo d'effetto prova un carattere come Manifesto o Rivista con la sfumatura attiva. Ricorda: due caratteri per presentazione bastano.",
    action: "[[/crea/contenuti|Prova testi e immagini]]",
    next: ["Come faccio una sfumatura?", "Come aggiungo un'ombra?"],
  },
  {
    id: "colori",
    keys: ["colore", "colori", "sfumat", "gradiente", "sfondo", "ombra", "bordo", "contorno"],
    answer: "Nel pannello a destra ogni elemento ha colore pieno o sfumatura (con secondo colore e direzione in gradi), più ombra e contorno. Lo sfondo della pagina si cambia cliccando su un punto vuoto della pagina.",
    next: ["Come cambio il tema di tutta la presentazione?"],
  },
  {
    id: "animazioni",
    keys: ["animaz", "effett", "entrata", "ingresso", "comparire", "muovere"],
    answer: "Seleziona un elemento e apri Animazione: 7 effetti di ingresso e 4 continui (pulsazione, oscillazione, fluttuazione, bagliore), con durata e ritardo regolabili.",
    more: "Per far entrare gli elementi uno dopo l'altro dai a ciascuno un ritardo crescente (0, 0.3, 0.6 secondi…). Chi ha attivato la riduzione del movimento vede automaticamente la versione statica.",
    action: "[[/crea/animazioni|Prova le animazioni]]",
    next: ["Come cambio la transizione tra le pagine?"],
  },
  {
    id: "transizioni",
    keys: ["transiz", "passaggio tra", "cambio pagina"],
    answer: "Clicca su un punto vuoto della pagina: in Pagina scegli la transizione d'ingresso (dissolvenza, scorrimento orizzontale o verticale, zoom, rotazione 3D). Con un clic la applichi a tutte le pagine.",
    action: "[[/crea/transizioni|Prova le transizioni]]",
  },
  {
    id: "interattivita",
    keys: ["interatt", "hotspot", "popup", "pop-up", "finestra", "rivel", "clicca", "cliccabile", "tooltip", "suggeriment"],
    answer: "Seleziona un elemento e apri Interazione: al clic o al passaggio del mouse può aprire una finestra di approfondimento, mostrare un suggerimento, rivelare un elemento nascosto, andare a un'altra pagina o aprire un link. Gli hotspot sono punti luminosi pronti per questo.",
    more: "Per un effetto \"scopri la risposta\": nascondi un testo (casella Nascosto), poi a un pulsante dai l'interazione Rivela e scegli quel testo. Il layout \"Schede da scoprire\" lo fa già per te.",
    action: "[[/crea/interattivita|Prova l'interattività]]",
    next: ["Come faccio un quiz?", "Come collego due pagine?"],
  },
  {
    id: "quiz",
    keys: ["quiz", "domand", "risposta giusta", "verifica", "test"],
    answer: "Per un quiz usa il layout \"Domanda a risposta\": due pulsanti rivelano \"Giusto!\" o \"Riprova\". Aggiungi un pulsante Avanti con l'interazione Vai a una pagina per passare alla domanda successiva. Il modello Quiz è già tutto collegato.",
    action: "[[/crea/percorsi|Crea un quiz]]",
    next: ["Fammi un quiz sugli animali", "Come collego due pagine?"],
  },
  {
    id: "percorsi",
    keys: ["bivi", "collegare", "collego", "vai a", "percorso", "salta", "menu", "navigazione"],
    answer: "Per collegare le pagine seleziona un pulsante, apri Interazione e scegli Vai a un'altra pagina. Così costruisci menu, indici cliccabili e storie a bivi: il layout Bivio e il modello Storia a bivi sono già pronti.",
    action: "[[/crea/percorsi|Prova i percorsi]]",
  },
  {
    id: "immagini",
    keys: ["immagin", "foto", "carica", "upload", "png", "jpg"],
    answer: "Nell'editor premi Immagine e scegli un file dal computer: PNG, JPEG, WebP o GIF fino a 4 MB. Poi aggiungi il testo alternativo, che descrive l'immagine a chi usa un lettore di schermo.",
    more: "Se il caricamento non va controlla formato e dimensione. Puoi arrotondare gli angoli, aggiungere una cornice e scegliere se l'immagine riempie il riquadro o si vede intera.",
    action: "[[/crea/contenuti|Aggiungi immagini]]",
  },
  {
    id: "posizione",
    keys: ["allinea", "allineare", "spostare", "sposto", "centrare", "centro", "livell", "davanti", "dietro", "ruotare", "bloccare"],
    answer: "Trascina gli elementi: le guide arancioni ti agganciano al centro. In Posizione trovi i pulsanti per allineare in 6 direzioni, i livelli (porta avanti o indietro), rotazione, opacità e il lucchetto per bloccare un elemento.",
    more: "Con le frecce sposti l'elemento di 2 pixel, tenendo premuto Maiusc di 20.",
  },
  {
    id: "scorciatoie",
    keys: ["scorciatoi", "tastiera", "tasti", "shortcut", "annulla", "ripeti", "ctrl"],
    answer: "Nell'editor:\n• Ctrl/Cmd+Z annulla, Ctrl/Cmd+Y ripeti\n• Ctrl/Cmd+C e Ctrl/Cmd+V copiano e incollano, anche tra pagine\n• Ctrl/Cmd+D duplica, Canc elimina\n• frecce per spostare (Maiusc per passi lunghi), Esc deseleziona\nDurante la presentazione: frecce o spazio per avanzare, N per le note, Esc per uscire.",
  },
  {
    id: "presenta",
    keys: ["present", "proiett", "relatore", "note", "cronometr", "schermo intero"],
    answer: "Premi Presenta nell'editor. Nella modalità presentatore vedi le note della pagina, il cronometro e l'anteprima della pagina successiva; il tasto N mostra o nasconde le note, Schermo intero ingrandisce tutto.",
    more: "Le note si scrivono sotto ogni pagina nell'editor e non compaiono mai nella versione condivisa. Con Avanza da sola (pannello Presentazione) le pagine scorrono da sole: utile per chioschi e vetrine.",
    action: "[[/crea/condividi|Prova a presentare]]",
  },
  {
    id: "condividi",
    keys: ["condivid", "link", "pubblic", "mandare", "inviare", "qr", "incorpora", "embed", "sito web"],
    answer: "Premi Condividi nell'editor: ottieni un link pubblico, puoi proteggerlo con una password e hai anche il QR code e il codice per incorporarla in un altro sito.",
    more: "Se annulli la condivisione il vecchio link smette di funzionare per sempre. Chi apre il link vede la presentazione ma mai le tue note.",
    action: "[[/crea/condividi|Prova a condividere]]",
    next: ["Come esporto in PDF?"],
  },
  {
    id: "pdf",
    keys: ["pdf", "stampa", "esporta", "scarica", "download"],
    answer: "Premi Esporta PDF nell'editor: si apre una pagina con tutte le slide, poi scegli Salva come PDF con orientamento orizzontale.",
  },
  {
    id: "gestione",
    keys: ["duplic", "copia", "cestino", "elimina", "cancell", "rinomin", "cerca"],
    answer: "Nella dashboard ogni presentazione si può duplicare, rinominare o spostare nel cestino; dal cestino la ripristini o la elimini definitivamente. La ricerca per titolo trova subito quella che ti serve.",
    action: "[[/dashboard|Apri la dashboard]]",
  },
  {
    id: "limiti",
    keys: ["limit", "spazio", "quante", "massimo", "quota", "prezz", "costo", "costa", "gratis", "pagare", "abbonamento"],
    answer: "Lumora è gratuito: ogni account può avere fino a 500 presentazioni e 100 MB di spazio, con immagini fino a 4 MB l'una.",
    action: "[[/registrati|Inizia gratis]]",
  },
  {
    id: "sicurezza",
    keys: ["sicur", "privacy", "dati", "hacker", "protett", "cookie"],
    answer: "Lumora protegge gli account con password cifrate (argon2id), controllo delle password compromesse, verifica in due passaggi, sessioni sicure e difese contro gli attacchi più comuni (CSRF, XSS, tentativi ripetuti). Le note e le presentazioni private restano solo tue.",
    action: "[[/#sicurezza|Scopri la sicurezza]]",
  },
];

/* ---------- Matching ---------- */

const tokens = (s: string) => normalize(s).split(/[^a-z0-9']+/).filter(Boolean);

/** Edit distance, capped: enough to forgive one typo. */
function close(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  // One substitution, insertion or deletion at the first difference.
  return a.slice(i + 1) === b.slice(i + 1) || a.slice(i + 1) === b.slice(i) || a.slice(i) === b.slice(i + 1);
}

function score(intent: Intent, text: string, words: string[]) {
  let s = 0;
  for (const key of intent.keys) {
    if (key.includes(" ")) {
      if (text.includes(key)) s += 2;
    } else if (words.some((w) => w.startsWith(key) || (key.length >= 5 && w.length >= key.length && close(w.slice(0, key.length), key)) || (key.length >= 5 && close(w, key)))) {
      s += 1;
    }
  }
  return s;
}

function rank(text: string) {
  const norm = ` ${normalize(text)} `;
  const words = tokens(text);
  return INTENTS.map((i) => ({ i, s: score(i, norm, words) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);
}

/* ---------- Presentations on request ---------- */

const CREATE = /\b(crea|creami|fammi|fai|prepara|preparami|genera|generami|costruisci|realizza|organizza|progetta|voglio|vorrei|mi serve|mi servirebbe|aiutami|serve|idee?|idea|scaletta|proposta|bozza)\b/;
const DECK_WORDS = /\b(presentazion\w*|slide|lezion\w*|pitch|quiz|scalett\w*|relazion\w*|storia|portfolio|workshop|corso|idee?|tesi|lavoro)\b/;
const KIND_WORDS: [RegExp, Parameters<typeof planDeck>[1]][] = [
  [/\b(?:storia a bivi|racconto|avventura|fiaba|favola)\b/, { kind: "storia" }],
  [/\b(?:quiz|verifica)\b/, { kind: "quiz" }],
  [/\b(?:pitch|startup)\b/, { kind: "pitch" }],
  [/\b(?:relazione|tesi|ricerca)\b/, { kind: "relazione" }],
  [/\bportfolio\b/, { kind: "portfolio" }],
  [/\b(?:workshop|corso|formazione)\b/, { kind: "workshop" }],
  [/\blezione\b/, { kind: "lezione" }],
];
const KIND_NAMES = { lezione: "una lezione", pitch: "un pitch", relazione: "una relazione", quiz: "un quiz", storia: "una storia a bivi", portfolio: "un portfolio", workshop: "un workshop" } as const;

/** "tema neon", "in stile Minimal", or just a theme name mentioned. */
function themeIn(text: string): ThemeId | undefined {
  const t = normalize(text);
  return THEMES.find((th) => t.includes(normalize(th.name)) || new RegExp(`\\b${th.id}\\b`).test(t))?.id;
}

/** The topic after "su", "sul", "riguardo"…, as the user wrote it. */
function topicOf(text: string): string | null {
  const m = text.match(/\b(?:su(?:l|lla|llo|ll'|i|gli|lle)?|riguardo(?: a| al| alla)?|a tema|dal titolo|intitolat[ao]|sull')\s*(.{2,80}?)\s*(?:\b(?:in stile|con (?:il )?tema|tema)\b.*)?[?.!]*$/i);
  return m ? m[1].replace(/^["'«]+|["'»]+$/g, "").trim() : null;
}

const LAYOUT_NAMES = Object.fromEntries(LAYOUT_GROUPS.flatMap((g) => g.layouts.map((l) => [l.id, l.name])));

function deckAnswer(spec: DeckSpec, kindName: string) {
  const theme = getTheme(spec.theme);
  const lines = spec.pages.map((p) => `• ${LAYOUT_NAMES[p.layout]}: ${p.heading}`);
  const otherTheme = THEMES.find((t) => t.id !== spec.theme && t.id !== "notte")?.name ?? "Minimal";
  return [
    `Ecco la mia proposta per "${spec.title}": ${kindName} di ${spec.pages.length} pagine nel tema ${theme.name} (${theme.mood.charAt(0).toLowerCase()}${theme.mood.slice(1, -1)}).`,
    ...lines,
    "",
    "Premi il pulsante per vederla in anteprima e crearla: poi testi e immagini sono tuoi.",
    "",
    `[[crea|${serializeDeck(spec)}]]`,
    `{{Cambia tema in ${otherTheme}}}`,
    `{{Fammi invece un quiz su ${spec.title.toLowerCase()}}}`,
    "{{Come aggiungo le immagini?}}",
  ].join("\n");
}

/** The outline proposed in the latest assistant message, if any. */
function lastDeck(history: ChatMessage[]): DeckSpec | null {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role !== "assistant") continue;
    const m = history[i].content.match(/\[\[crea\|([^\]]+)\]\]/);
    if (m) return parseDeck(m[1]);
  }
  return null;
}

function tryDeck(question: string, history: ChatMessage[]): string | null {
  const n = normalize(question);
  const theme = themeIn(question);
  const previous = lastDeck(history);

  // "cambia tema in Neon" right after a proposal: same outline, new theme.
  if (previous && theme && /\b(cambia|metti|usa|prova|tema|stile|invece)\b/.test(n) && !topicOf(question)) {
    return deckAnswer({ ...previous, theme }, "la stessa presentazione");
  }
  if (!(CREATE.test(n) && DECK_WORDS.test(n))) return null;

  const forced = KIND_WORDS.find(([re]) => re.test(n))?.[1] ?? {};
  const topic = topicOf(question) ?? previous?.title ?? (/\bstartup\b/.test(n) ? "La mia startup" : null);
  if (!topic) {
    return "Volentieri! Su che argomento? Scrivimi per esempio \"fammi una presentazione sulla fotosintesi\" o \"crea un pitch per la mia app\": scelgo io tema, modello e scaletta.\n{{Fammi una presentazione sul sistema solare}}\n{{Crea un pitch per la mia startup}}";
  }
  const spec = planDeck(topic, { ...forced, ...(theme ? { theme } : {}) });
  const kind = forced.kind ?? (spec.pages.some((p) => p.layout === "bivio") ? "storia" : spec.pages[1]?.layout === "titolo-testo" && spec.pages[2]?.heading === "La nostra soluzione" ? "pitch" : undefined);
  return deckAnswer(spec, kind ? KIND_NAMES[kind] : "una presentazione");
}

/* ---------- Answer ---------- */

const FOLLOW_UP = /^(e |ma |si|sì|ok|come|dove|perche|perché|spiegami|dimmi|altro|di piu|di più|e poi|quindi|cioe|cioè)/;

const format = (i: Intent, detail = false) =>
  [detail && i.more ? i.more : i.answer, i.action ? `\n${i.action}` : "", ...(i.next ?? []).slice(0, 3).map((q) => `{{${q}}}`)].filter(Boolean).join("\n");

export function brainAnswer(messages: ChatMessage[]): string {
  const question = messages[messages.length - 1]?.content ?? "";
  const history = messages.slice(0, -1);

  const deck = tryDeck(question, history);
  if (deck) return deck;

  const ranked = rank(question);
  const n = normalize(question).trim();

  // A short follow-up ("e come si fa?") continues the previous topic with more detail.
  if ((!ranked.length || (ranked[0].s < 2 && n.split(/\s+/).length <= 4)) && FOLLOW_UP.test(n)) {
    const prevQuestion = [...history].reverse().find((m) => m.role === "user");
    const prev = prevQuestion ? rank(prevQuestion.content)[0] : undefined;
    if (prev) return format(prev.i, true);
  }

  if (!ranked.length) {
    return "Bip bop… questa non l'ho capita del tutto. Posso aiutarti con tutto ciò che riguarda Lumora (temi, layout, animazioni, quiz, condivisione, account) e posso preparare una presentazione su qualsiasi argomento.\n[[/#viaggio|Esplora le funzioni]]\n{{Fammi una presentazione sul sistema solare}}\n{{Cosa sai fare?}}\n{{Quali temi ci sono?}}";
  }

  // Two topics in one question ("come cambio font e transizioni?"): answer both.
  const [first, second] = ranked;
  if (second && second.s >= Math.max(1, first.s * 0.75) && second.i.id !== first.i.id && !["saluto", "grazie"].includes(second.i.id)) {
    return [first.i.answer, "", second.i.answer, first.i.action ? `\n${first.i.action}` : "", second.i.action ?? "", ...[...(first.i.next ?? []).slice(0, 2), ...(second.i.next ?? []).slice(0, 1)].map((q) => `{{${q}}}`)]
      .filter((l, idx, all) => l !== "" || all[idx - 1] !== "")
      .join("\n")
      .trim();
  }
  return format(first.i);
}
