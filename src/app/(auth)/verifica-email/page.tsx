import type { Metadata } from "next";
import Link from "next/link";
import { verifyEmailAction } from "../actions";
import { Button } from "@/components/ui";

export const metadata: Metadata = { title: "Conferma email", robots: { index: false } };

export default async function VerifyEmailPage({ searchParams }: PageProps<"/verifica-email">) {
  const { token, esito } = await searchParams;

  if (esito === "non-valido" || typeof token !== "string") {
    return (
      <>
        <h1 className="font-display text-3xl font-bold tracking-tight">Link non valido</h1>
        <p className="mt-3 text-ink-soft">
          Il link di conferma è scaduto o è già stato usato. Accedi: se l&apos;email non è ancora confermata potrai
          richiederne uno nuovo.
        </p>
        <Link href="/accedi" className="mt-6 inline-block font-semibold text-violet">
          Vai all&apos;accesso
        </Link>
      </>
    );
  }

  return (
    <form action={verifyEmailAction} className="flex flex-col gap-5">
      <h1 className="font-display text-3xl font-bold tracking-tight">Conferma la tua email</h1>
      <p className="text-ink-soft">Ultimo passo: conferma che questo indirizzo è tuo.</p>
      <input type="hidden" name="token" value={token} />
      <Button type="submit">Conferma email</Button>
    </form>
  );
}
