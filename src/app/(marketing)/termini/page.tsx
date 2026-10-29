import type { Metadata } from "next";
import { LegalPage } from "../legal";

export const metadata: Metadata = { title: "Termini di servizio" };

export default function TermsPage() {
  return (
    <LegalPage title="Termini di servizio">
      <p>Usando Lumora ti impegni a non pubblicare contenuti illegali, offensivi o che violano diritti di terzi.</p>
      <p>I contenuti che crei restano tuoi. Ci concedi solo i permessi necessari a conservarli e mostrarli alle persone con cui li condividi.</p>
    </LegalPage>
  );
}
