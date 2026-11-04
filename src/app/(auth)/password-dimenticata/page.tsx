import type { Metadata } from "next";
import Link from "next/link";
import { emailEnabled } from "@/lib/env";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "Password dimenticata" };

export default function ForgotPasswordPage() {
  if (emailEnabled) return <ForgotForm />;
  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight">Password dimenticata</h1>
      <p className="mt-2 text-ink-soft">
        In questa versione dimostrativa l&apos;invio delle email è spento, quindi il link per reimpostare la password non
        può arrivare. Puoi creare un nuovo account o provare Lumora senza registrarti.
      </p>
      <Link href="/accedi" className="mt-6 inline-block text-sm font-semibold text-violet">
        Torna all&apos;accesso
      </Link>
    </>
  );
}
