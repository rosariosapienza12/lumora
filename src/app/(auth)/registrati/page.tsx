import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "./signup-form";
import { safeNext } from "@/lib/validation";

export const metadata: Metadata = { title: "Crea un account" };

export default async function SignupPage({ searchParams }: PageProps<"/registrati">) {
  const next = safeNext((await searchParams).dopo);
  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight">Crea il tuo account</h1>
      <p className="mb-6 mt-2 text-ink-soft">È gratis. Ti chiediamo solo l&apos;essenziale.</p>
      <SignupForm next={next} />
      <p className="mt-6 text-center text-sm text-ink-soft">
        Hai già un account?{" "}
        <Link href={next ? `/accedi?dopo=${encodeURIComponent(next)}` : "/accedi"} className="font-semibold text-violet">
          Accedi
        </Link>
      </p>
    </>
  );
}
