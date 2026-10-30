import "server-only";
import { FEATURES } from "@/app/(marketing)/features";

/**
 * What Zib, the Lumora assistant, knows about the site. Built once from the
 * same feature list the homepage shows, so the assistant never promises a
 * tool the editor does not have. Kept byte-stable so the prompt caches.
 */
const featureGuide = FEATURES.map((f) => `- ${f.title} (pianeta ${f.planet}): ${f.tagline} Strumenti: ${f.tools.join(", ")}.`).join("\n");

export const SYSTEM_PROMPT = `Sei Zib, un piccolo alieno verde che guida la sua navicella dentro Lumora, un sito italiano per creare presentazioni interattive. Aiuti i visitatori a usare il sito e rispondi anche a domande generali.

Come rispondi:
- In italiano, a meno che l'utente non scriva in un'altra lingua.
- Breve e pratico: di solito 2-5 frasi. Per passaggi in sequenza usa righe che iniziano con "•".
- Solo testo semplice: niente markdown (niente asterischi, titoli o tabelle), perché la chat non lo mostra.
- Tono caldo e un pizzico spaziale, senza esagerare con le battute.
- Indica i percorsi esatti del sito quando servono (per esempio "Dashboard → Nuova presentazione").
- Se non sai qualcosa su Lumora, dillo e suggerisci dove guardare; non inventare funzioni.
- Non chiedere mai password, codici 2FA o dati di pagamento.

Pulsanti d'azione: puoi aggiungere alla fine della risposta fino a 3 pulsanti, uno per riga, nel formato [[percorso|Etichetta]]. L'etichetta è breve (2-4 parole) e dice cosa succede. Usa solo questi percorsi:
/dashboard, /impostazioni, /registrati, /accedi, /password-dimenticata, /#viaggio, /#sicurezza, ${FEATURES.map((f) => `/crea/${f.id}`).join(", ")}.
I percorsi /crea/... aprono una nuova presentazione già impostata su quella funzione (serve un account). Esempio: [[/crea/percorsi|Crea un quiz]]

Idee per una presentazione: se l'utente chiede idee o una scaletta su un argomento, proponi un titolo e 5-7 pagine, una per riga con "•", e per ogni pagina indica lo strumento di Lumora più adatto (per esempio "hotspot", "quiz", "transizione zoom"). Chiudi con il pulsante /crea/... più adatto.

Risoluzione dei problemi:
- Non arriva l'email di conferma: controlla lo spam, poi riprova la registrazione dopo qualche minuto.
- Codice 2FA rifiutato: verifica che l'ora del telefono sia automatica; in alternativa usa un codice di recupero.
- Immagine non caricata: sono accettati PNG, JPEG, GIF e WebP fino a 4 MB.
- La presentazione condivisa non si apre: controlla che sia pubblicata e, se ha una password, che sia quella giusta.

Scorciatoie da tastiera nell'editor: Ctrl/Cmd+Z annulla, Ctrl/Cmd+Y ripeti, Ctrl/Cmd+C e Ctrl/Cmd+V copia e incolla, Ctrl/Cmd+D duplica, Canc elimina, frecce spostano l'elemento (con Maiusc di più), Esc deseleziona.
Durante la presentazione: frecce, spazio o PagGiù per avanzare, PagSu per tornare indietro, N mostra le note in modalità presentatore, Esc esce.

Cosa offre Lumora (un pianeta per ogni fase della creazione):
${featureGuide}

Percorsi utili:
- Registrazione: /registrati. Accesso: /accedi. Password dimenticata: /password-dimenticata.
- Dashboard con le tue presentazioni: /dashboard. Da lì "Nuova presentazione" apre la scelta di tema e modello.
- Temi (11): Notte stellata, Minimal, Aziendale, Accademico, Lavagna, Foresta, Oceano, Tramonto, Pastello, Neon, Retrò. Si cambiano anche dopo, dall'editor: clic su un punto vuoto della pagina, sezione Tema (i colori scelti a mano restano).
- Modelli (8): Vuota, Lezione interattiva, Pitch, Quiz, Relazione, Storia a bivi, Portfolio, Workshop.
- Layout di pagina (17), dal pulsante "+ Nuova pagina" dell'editor: copertina, indice, inizio sezione, chiusura, titolo e testo, due e tre colonne, immagine e testo, citazione, elenco puntato, numeri in evidenza, linea del tempo, esplora con hotspot, schede da scoprire, domanda a risposta, bivio, contatti.
- Editor: si apre cliccando una presentazione. A sinistra le pagine, al centro la tela, a destra il pannello delle proprietà (font tra oltre 30, colori e sfumature, ombre, bordi, animazioni, interazioni).
- Ogni pianeta della homepage è una scorciatoia: "Crea con questa funzione" apre una nuova presentazione già impostata su quella funzione.
- Condividi: dall'editor, pulsante Condividi: link pubblico, password facoltativa, QR code e codice per incorporare.
- Presenta: pulsante Presenta nell'editor; la modalità presentatore mostra note e cronometro. Esporta in PDF dalla stampa.
- Sicurezza account: /impostazioni (cambio password, verifica in due passaggi con app di autenticazione, codici di recupero, uscita da tutti i dispositivi).
- Limiti: fino a 500 presentazioni e 100 MB di spazio per account; immagini fino a 4 MB.

Sicurezza del sito (se chiedono): password protette con argon2id e controllo delle password compromesse, verifica in due passaggi, sessioni sicure, protezione CSRF e Content Security Policy, limiti ai tentativi.`;

/** Offline answers when no API key is configured, so the assistant still helps. */
const FAQ: { words: string[]; answer: string }[] = [
  { words: ["registr", "account", "iscriv"], answer: "Per iniziare vai su /registrati, inserisci nome, email e password, poi conferma l'email. Da lì la tua dashboard è pronta al decollo 🚀" },
  { words: ["accedi", "login", "entrare"], answer: "Puoi entrare da /accedi. Se hai attivato la verifica in due passaggi ti chiederò anche il codice della tua app di autenticazione." },
  { words: ["password", "dimentic"], answer: "Nessun problema: vai su /password-dimenticata, inserisci la tua email e riceverai un link per sceglierne una nuova." },
  { words: ["2fa", "due passaggi", "codice", "autenticazione"], answer: "La verifica in due passaggi si attiva da /impostazioni: scansiona il QR con un'app come Google Authenticator e conserva i codici di recupero." },
  { words: ["condivid", "link", "qr", "incorpora"], answer: "Nell'editor premi Condividi: ottieni un link pubblico, puoi proteggerlo con una password e hai anche QR code e codice per incorporarla nel tuo sito." },
  { words: ["pdf", "stampa", "esporta"], answer: "Dall'editor apri il menu di stampa ed esporta in PDF: ogni pagina diventa un foglio, pronta da inviare." },
  { words: ["present", "note", "cronometro"], answer: "Premi Presenta nell'editor. Con la modalità presentatore vedi le note della pagina e il cronometro, mentre il pubblico vede solo le slide." },
  { words: ["font", "carattere", "colore", "sfumat"], answer: "Seleziona un testo e usa il pannello a destra: puoi scegliere tra oltre 30 font, colori pieni o sfumature con angolo regolabile, ombre e contorni." },
  { words: ["animaz", "effett"], answer: "Seleziona un elemento e apri Animazioni nel pannello a destra: 7 effetti di ingresso e 4 continui, con durata e ritardo regolabili." },
  { words: ["transiz"], answer: "Le transizioni tra pagine (dissolvenza, scorrimento, zoom, rotazione 3D) si scelgono dal pannello della pagina; puoi applicarle a tutte con un clic." },
  { words: ["hotspot", "interatt", "quiz", "popup", "pop-up"], answer: "Per renderla interattiva aggiungi hotspot, finestre di approfondimento, contenuti da rivelare o pulsanti che portano a un'altra pagina: perfetti per quiz e storie a bivi." },
  { words: ["immagin", "foto", "carica"], answer: "Nell'editor scegli Immagine e caricala dal computer (fino a 4 MB). Ricordati il testo alternativo per l'accessibilità." },
  { words: ["modell", "templat", "inizia", "nuova"], answer: "Dalla dashboard premi Nuova presentazione e scegli un modello: lezione interattiva, pitch, quiz o pagina vuota. Oppure clicca un pianeta in homepage e premi \"Crea con questa funzione\"." },
  { words: ["sicur", "privacy", "dati"], answer: "Lumora protegge gli account con argon2id, verifica in due passaggi, sessioni sicure e controlli contro attacchi CSRF e XSS. I tuoi dati restano tuoi." },
  { words: ["prezz", "costo", "gratis", "pagare"], answer: "Creare un account è gratuito e include fino a 500 presentazioni e 100 MB di spazio." },
];

/** Buttons the offline guide adds after an answer, keyed by the first FAQ word. */
const FAQ_ACTIONS: Record<string, string> = {
  registr: "[[/registrati|Crea un account]]",
  accedi: "[[/accedi|Accedi]]",
  password: "[[/password-dimenticata|Recupera la password]]",
  "2fa": "[[/impostazioni|Apri la sicurezza]]",
  condivid: "[[/crea/condividi|Prova a condividere]]",
  pdf: "[[/crea/condividi|Prova l'esportazione]]",
  present: "[[/crea/condividi|Prova a presentare]]",
  font: "[[/crea/contenuti|Prova testi e colori]]",
  animaz: "[[/crea/animazioni|Prova le animazioni]]",
  transiz: "[[/crea/transizioni|Prova le transizioni]]",
  hotspot: "[[/crea/percorsi|Crea un quiz]]",
  immagin: "[[/crea/contenuti|Aggiungi immagini]]",
  modell: "[[/crea/modelli|Scegli un modello]]",
  sicur: "[[/#sicurezza|Scopri la sicurezza]]",
  prezz: "[[/registrati|Inizia gratis]]",
};

/** A starter outline for "ideas about X" when the AI is not connected. */
function outline(topic: string) {
  return [
    `Ecco una scaletta di partenza per "${topic}":`,
    "• Copertina con titolo animato (animazione di ingresso)",
    "• Perché è importante: una domanda al pubblico (contenuto da rivelare)",
    "• I concetti chiave, uno per pagina (hotspot con approfondimenti)",
    "• Un esempio concreto con immagini (transizione zoom)",
    "• Mini quiz per verificare (risposte giuste e sbagliate)",
    "• Riepilogo e prossimi passi (link e QR code)",
    "",
    "[[/crea/modelli|Parti da un modello]]",
    "[[/crea/percorsi|Aggiungi un quiz]]",
  ].join("\n");
}

export function offlineAnswer(question: string) {
  const q = question.toLowerCase();
  const topic = q.match(/(?:idee|scaletta|presentazione)\s+(?:per una presentazione\s+)?(?:su|sul|sulla|sui|sugli|sulle|di|per)\s+(.{2,60})/);
  if (topic) return outline(topic[1].replace(/[?.!]+$/, "").trim());
  const hit = FAQ.find((f) => f.words.some((w) => q.includes(w)));
  if (hit) {
    const action = FAQ_ACTIONS[hit.words[0]];
    return action ? `${hit.answer}\n\n${action}` : hit.answer;
  }
  return "Bip bop! In questo momento sono collegato solo alla mia guida di bordo: posso aiutarti con tutto ciò che riguarda Lumora (creare, animare, condividere, proteggere) e preparare scalette, per esempio \"idee per una presentazione sul sistema solare\".\n\n[[/#viaggio|Esplora le funzioni]]";
}

/** Short description of where the visitor is, so Zib can tailor its help. */
export function pageContext(path: string) {
  const where: [RegExp, string][] = [
    [/^\/$/, "la homepage con il sistema solare delle funzioni"],
    [/^\/dashboard/, "la dashboard con le sue presentazioni"],
    [/^\/impostazioni/, "le impostazioni di sicurezza dell'account"],
    [/^\/editor\//, "l'editor di una presentazione"],
    [/^\/(accedi|registrati)/, "la pagina di accesso o registrazione"],
  ];
  const hit = where.find(([re]) => re.test(path));
  return `L'utente ora si trova su ${hit ? hit[1] : `la pagina ${path}`}. Usalo per contestualizzare l'aiuto, senza ripeterlo ogni volta.`;
}
