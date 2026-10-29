import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { TwoFactorForm } from "./two-factor-form";

export const metadata: Metadata = { title: "Verifica in due passaggi" };

export default async function TwoFactorPage() {
  const session = await getSession();
  if (!session?.twoFactorPending) redirect("/accedi");

  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight">Verifica in due passaggi</h1>
      <p className="mb-6 mt-2 text-ink-soft">Apri l&apos;app di autenticazione e inserisci il codice a 6 cifre.</p>
      <TwoFactorForm />
    </>
  );
}
