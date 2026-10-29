import type { Metadata } from "next";
import { LegalPage } from "../legal";

export const metadata: Metadata = { title: "Cookie" };

export default function CookiePage() {
  return (
    <LegalPage title="Cookie">
      <p>Lumora usa solo cookie tecnici indispensabili: uno per mantenerti connesso al tuo account e uno, temporaneo, per ricordare che hai inserito la password di una presentazione protetta.</p>
      <p>Non usiamo cookie di profilazione né strumenti di tracciamento di terze parti, quindi non ti chiediamo alcun consenso.</p>
    </LegalPage>
  );
}
