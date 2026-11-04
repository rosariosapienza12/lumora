import type { Metadata } from "next";
import Link from "next/link";
import { env } from "@/lib/env";
import { GUEST_HOURS } from "@/lib/guest";
import { Contact, LegalPage } from "../legal";

export const metadata: Metadata = { title: "Informativa privacy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Informativa privacy">
      <p>
        Lumora è un progetto personale e dimostrativo, senza scopo di lucro. Questa pagina spiega quali dati tratta, perché e
        quali sono i tuoi diritti, secondo il Regolamento europeo 2016/679 (GDPR).
      </p>

      <h2>Chi tratta i dati</h2>
      <p>
        Il titolare del trattamento è Rosario Sapienza, autore di Lumora. Per qualsiasi richiesta sui tuoi dati scrivi a{" "}
        <Contact email={env.CONTACT_EMAIL} />.
      </p>

      <h2>Quali dati</h2>
      <ul>
        <li>
          <strong>Account:</strong> nome, email, tipo di account. La password non viene mai salvata: conserviamo solo
          un&apos;impronta (hash argon2id) da cui non si può risalire alla password.
        </li>
        <li>
          <strong>Contenuti:</strong> le presentazioni che crei e le immagini che carichi.
        </li>
        <li>
          <strong>Dati di sicurezza:</strong> indirizzo IP e browser delle sessioni attive, tentativi di accesso ed eventi
          importanti dell&apos;account (registro di sicurezza). Se attivi la verifica in due passaggi, il suo segreto è
          conservato cifrato.
        </li>
        <li>
          <strong>Assistente Zib:</strong> le domande che gli scrivi, usate solo per rispondere. La conversazione resta nel tuo
          browser e si cancella quando chiudi la scheda.
        </li>
      </ul>

      <h2>Perché e su quale base</h2>
      <ul>
        <li>Fornirti il servizio che hai chiesto: account, editor, condivisione (esecuzione del contratto, art. 6.1.b GDPR).</li>
        <li>
          Proteggere gli account e il servizio da abusi, per esempio bloccando chi prova troppe password (legittimo interesse,
          art. 6.1.f).
        </li>
        <li>Mandarti le email di servizio: conferma dell&apos;indirizzo e recupero della password.</li>
      </ul>
      <p>Non vendiamo i dati, non li usiamo per pubblicità e non facciamo profilazione.</p>

      <h2>Chi altro li riceve</h2>
      <p>Solo i fornitori tecnici che servono a far funzionare Lumora, che li trattano per nostro conto:</p>
      <ul>
        <li>il servizio di hosting dell&apos;applicazione e quello del database;</li>
        <li>il servizio di invio email, quando è attivo;</li>
        <li>Anthropic, solo per le domande rivolte a Zib quando è attiva la sua intelligenza artificiale;</li>
        <li>
          Have I Been Pwned, per controllare che una nuova password non sia comparsa in violazioni note: riceve solo i primi
          5 caratteri di un&apos;impronta della password, mai la password.
        </li>
      </ul>
      <p>
        Alcuni fornitori possono trattare dati fuori dall&apos;Unione europea: in quel caso il trasferimento si basa sulle
        garanzie previste dal GDPR, come le clausole contrattuali standard.
      </p>

      <h2>Per quanto tempo</h2>
      <ul>
        <li>Account e contenuti: finché non elimini l&apos;account.</li>
        <li>Account ospite: {GUEST_HOURS} ore, poi viene cancellato con tutto quello che contiene.</li>
        <li>Sessioni: al massimo 90 giorni, oppure fino a quando esci.</li>
        <li>
          Registro di sicurezza: le voci restano anche dopo l&apos;eliminazione dell&apos;account, ma senza più collegamento al tuo
          profilo.
        </li>
      </ul>

      <h2>I tuoi diritti</h2>
      <p>
        Puoi chiedere di accedere ai tuoi dati, correggerli, cancellarli, limitarne il trattamento, riceverli in un formato
        leggibile od opporti al trattamento. Puoi eliminare da solo l&apos;account e tutti i contenuti dalla pagina{" "}
        <Link href="/impostazioni">Sicurezza dell&apos;account</Link>. Se pensi che i tuoi dati siano trattati in modo non
        corretto, puoi presentare un reclamo al{" "}
        <a href="https://www.garanteprivacy.it" rel="noopener">
          Garante per la protezione dei dati personali
        </a>
        .
      </p>

      <h2>Minori</h2>
      <p>Se hai meno di 14 anni puoi usare Lumora solo con il consenso di un genitore o di chi ne fa le veci.</p>

      <h2>Cookie</h2>
      <p>
        Lumora usa solo cookie tecnici: trovi i dettagli nella <Link href="/cookie">pagina sui cookie</Link>.
      </p>
    </LegalPage>
  );
}
