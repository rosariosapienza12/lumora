# Sicurezza

## Segnalare una vulnerabilità

Non aprire una issue pubblica. Usa **Security → Report a vulnerability** in questo repository (segnalazione privata di GitHub). Riceverai una risposta entro 7 giorni.

## Come è stato verificato

Oltre ai test automatici (CodeQL, `npm audit`, lint, tipi e test unitari a ogni push), il progetto è stato sottoposto a un test di penetrazione sulla build di produzione in locale:

- pagine private e API senza sessione: reindirizzate all'accesso o rifiutate (401);
- richieste da altri siti, con `Origin` assente, `null`, simile al dominio o con `X-Forwarded-Host` falsificato: rifiutate (403);
- SQL injection, XSS riflesso, path traversal e redirect aperti tramite `?dopo=`: nessun effetto;
- accesso e modifica delle presentazioni di un altro utente (IDOR), anche manomettendo i moduli: 404, dati intatti;
- upload di SVG con script camuffato da PNG e di HTML: rifiutati (415);
- forza bruta sul login: blocco dopo 10 tentativi; stessi messaggi e tempi per email esistenti e inesistenti;
- corpo delle richieste troppo grande (413), metodi HTTP non previsti (405), file `.env` e segreti non raggiungibili, nessuno stack trace negli errori.

## Configurazione in produzione

- Servire il sito solo in HTTPS (l'intestazione HSTS è attiva in produzione).
- Generare `ENCRYPTION_KEY` casuale e conservarla in un gestore di segreti, mai nel repository.
- La chiave `ANTHROPIC_API_KEY` vive solo nelle variabili d'ambiente del server: non è nel repository, non è nel codice inviato al browser (verificato compilando con una chiave finta e cercandola nei file pubblici) e non compare mai nelle risposte o nei log. Contro l'abuso dei costi l'assistente ha un limite per indirizzo (30 domande l'ora) e un tetto giornaliero di risposte AI per tutto il sito, oltre il quale risponde con il motore integrato gratuito. Consigliato: una chiave dedicata con limite di spesa nella Console Anthropic.
- Impostare `TRUSTED_PROXY_HOPS` al numero di reverse proxy davanti all'app: solo allora vengono considerati `X-Forwarded-For` e `X-Forwarded-Host`.
