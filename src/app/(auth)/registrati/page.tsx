import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Crea un account" };

export default function SignupPage() {
  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight">Crea il tuo account</h1>
      <p className="mb-6 mt-2 text-ink-soft">È gratis. Ti chiediamo solo l&apos;essenziale.</p>
      <SignupForm />
      <p className="mt-6 text-center text-sm text-ink-soft">
        Hai già un account?{" "}
        <Link href="/accedi" className="font-semibold text-violet">
          Accedi
        </Link>
      </p>
    </>
  );
}
