import type { Metadata } from "next";
import { LegalPage } from "../legal";

export const metadata: Metadata = { title: "Cookie" };

export default function CookiePage() {
  return (
    <LegalPage title="Cookie">
      <p>
        Lumora usa solo cookie tecnici, indispensabili per far funzionare il servizio. Non usiamo cookie di profilazione,
        statistiche di terze parti o strumenti di tracciamento, quindi non ti chiediamo alcun consenso.
      </p>

      <h2>Quali cookie</h2>
      <ul>
        <li>
          <strong>Sessione</strong> (<code>__Host-lumora_session</code>): ti tiene connesso al tuo account. Dura 14 giorni, si
          rinnova mentre usi Lumora fino a un massimo di 90 giorni e si cancella quando esci.
        </li>
        <li>
          <strong>Presentazione sbloccata</strong>: ricorda per 12 ore che hai inserito la password di una presentazione
          protetta, così non te la chiediamo a ogni pagina. Vale solo per quella presentazione.
        </li>
      </ul>

      <h2>Altri dati nel browser</h2>
      <p>
        La conversazione con l&apos;assistente Zib è conservata nella memoria della scheda del browser (sessionStorage) e si
        cancella quando la chiudi. Non viene inviata a nessuno, tranne le domande che fai quando chiedi una risposta.
      </p>
    </LegalPage>
  );
}
