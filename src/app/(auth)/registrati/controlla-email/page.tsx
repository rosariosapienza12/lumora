import type { Metadata } from "next";
import Link from "next/link";
import { emailEnabled } from "@/lib/env";

export const metadata: Metadata = { title: "Controlla la tua email" };

export default function CheckEmailPage() {
  return (
    <div className="text-center">
      <span className="hotspot mx-auto mb-5" aria-hidden>
        ✉
      </span>
      {emailEnabled ? (
        <>
          <h1 className="font-display text-3xl font-bold tracking-tight">Controlla la tua email</h1>
          <p className="mt-3 text-ink-soft">
            Ti abbiamo inviato un link per confermare l&apos;indirizzo. Aprilo entro 24 ore, poi accedi al tuo account.
          </p>
        </>
      ) : (
        <>
          <h1 className="font-display text-3xl font-bold tracking-tight">Account creato</h1>
          <p className="mt-3 text-ink-soft">
            In questa versione dimostrativa l&apos;invio delle email è spento: puoi accedere e usare l&apos;editor, ma per
            pubblicare una presentazione serve confermare l&apos;email.
          </p>
        </>
      )}
      <Link href="/accedi" className="mt-6 inline-block font-semibold text-violet">
        Vai all&apos;accesso
      </Link>
    </div>
  );
}
