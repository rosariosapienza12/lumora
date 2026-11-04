import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";
import { FormMessage } from "@/components/ui";
import { safeNext } from "@/lib/validation";
import { GuestButton } from "../../prova/guest-button";

export const metadata: Metadata = { title: "Accedi" };

export default async function LoginPage({ searchParams }: PageProps<"/accedi">) {
  const params = await searchParams;
  const next = safeNext(params.dopo);
  const notice =
    params.verificata === "1"
      ? "Email confermata. Ora puoi accedere."
      : params.reimpostata === "1"
        ? "Password aggiornata. Accedi con la nuova password."
        : null;

  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight">Bentornato</h1>
      <p className="mb-6 mt-2 text-ink-soft">Accedi per continuare le tue presentazioni.</p>
      {notice && (
        <div className="mb-4">
          <FormMessage tone="ok">{notice}</FormMessage>
        </div>
      )}
      {params.ospite === "limite" && (
        <div className="mb-4">
          <FormMessage>Troppe prove da questa rete in poco tempo. Riprova più tardi oppure crea un account.</FormMessage>
        </div>
      )}
      <LoginForm next={next} />
      <p className="mt-6 text-center text-sm text-ink-soft">
        Non hai un account?{" "}
        <Link href={next ? `/registrati?dopo=${encodeURIComponent(next)}` : "/registrati"} className="font-semibold text-violet">
          Registrati gratis
        </Link>
      </p>
      <div className="mt-4 flex flex-col items-center gap-2 border-t border-line pt-4 text-sm text-ink-soft">
        <span>Vuoi solo dare un&apos;occhiata?</span>
        <GuestButton variant="outline" />
      </div>
    </>
  );
}
