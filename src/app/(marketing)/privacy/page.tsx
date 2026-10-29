import type { Metadata } from "next";
import { LegalPage } from "../legal";

export const metadata: Metadata = { title: "Informativa privacy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Informativa privacy">
      <p>Lumora tratta i dati necessari a fornire il servizio: nome, email, contenuti delle presentazioni e dati tecnici di accesso (indirizzo IP e browser) usati per la sicurezza dell&apos;account.</p>
      <p>Non vendiamo i dati personali e non li usiamo per pubblicità. Le password sono conservate solo in forma cifrata.</p>
      <p>Puoi chiedere in qualsiasi momento l&apos;accesso, la correzione o la cancellazione dei tuoi dati.</p>
    </LegalPage>
  );
}
