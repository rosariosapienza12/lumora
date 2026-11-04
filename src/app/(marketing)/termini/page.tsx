import type { Metadata } from "next";
import Link from "next/link";
import { env } from "@/lib/env";
import { GUEST_HOURS } from "@/lib/guest";
import { Contact, LegalPage } from "../legal";

export const metadata: Metadata = { title: "Termini di servizio" };

export default function TermsPage() {
  return (
    <LegalPage title="Termini di servizio">
      <p>
        Lumora è un progetto personale e dimostrativo per creare presentazioni interattive, offerto gratuitamente. Usandolo
        accetti queste condizioni.
      </p>

      <h2>Account</h2>
      <ul>
        <li>Ti chiediamo dati veri e di custodire la tua password: sei responsabile di quello che succede con il tuo account.</li>
        <li>
          Puoi anche provare Lumora come ospite, senza registrarti: l&apos;account ospite non può pubblicare e viene cancellato
          dopo {GUEST_HOURS} ore con tutto quello che contiene.
        </li>
        <li>
          Puoi eliminare l&apos;account in qualsiasi momento dalla pagina <Link href="/impostazioni">Sicurezza dell&apos;account</Link>.
        </li>
      </ul>

      <h2>I tuoi contenuti</h2>
      <p>
        Le presentazioni e le immagini che crei restano tue. Ci concedi solo il permesso di conservarle e di mostrarle a te e
        alle persone con cui scegli di condividerle, nella misura necessaria a far funzionare il servizio.
      </p>

      <h2>Cosa non è permesso</h2>
      <ul>
        <li>contenuti illegali, offensivi, discriminatori o che violano diritti di altri, come immagini senza permesso;</li>
        <li>usare le presentazioni pubblicate per truffe, phishing o per diffondere programmi dannosi;</li>
        <li>cercare di aggirare le protezioni del servizio, accedere agli account di altri o sovraccaricarlo.</li>
      </ul>
      <p>
        Se un contenuto viola queste regole possiamo renderlo non visibile o eliminarlo, e nei casi gravi chiudere
        l&apos;account. Per segnalare un contenuto scrivi a <Contact email={env.CONTACT_EMAIL} />.
      </p>

      <h2>Il servizio</h2>
      <p>
        Lumora è offerto così com&apos;è, senza garanzie di disponibilità continua: è un progetto dimostrativo e può cambiare,
        interrompersi o chiudere. Tieni una copia delle presentazioni importanti, per esempio esportandole in PDF. Nei limiti
        consentiti dalla legge, non rispondiamo di danni indiretti dovuti all&apos;uso del servizio.
      </p>

      <h2>Modifiche e legge applicabile</h2>
      <p>
        Se cambiamo questi termini aggiorniamo la data in cima alla pagina. Si applica la legge italiana, fatti salvi i diritti
        che la legge ti riconosce come consumatore.
      </p>
    </LegalPage>
  );
}
