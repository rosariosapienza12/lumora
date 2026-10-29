import type { Metadata } from "next";
import Link from "next/link";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Reimposta la password", robots: { index: false } };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reimposta-password">) {
  const { token } = await searchParams;
  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight">Scegli una nuova password</h1>
      <p className="mb-6 mt-2 text-ink-soft">Dopo il salvataggio verrai disconnesso da tutti i dispositivi.</p>
      {typeof token === "string" ? (
        <ResetForm token={token} />
      ) : (
        <p className="text-ink-soft">
          Link non valido. <Link href="/password-dimenticata" className="font-semibold text-violet">Richiedine uno nuovo</Link>.
        </p>
      )}
    </>
  );
}
