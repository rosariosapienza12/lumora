import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";
import { FormMessage } from "@/components/ui";

export const metadata: Metadata = { title: "Accedi" };

export default async function LoginPage({ searchParams }: PageProps<"/accedi">) {
  const params = await searchParams;
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
      <LoginForm />
      <p className="mt-6 text-center text-sm text-ink-soft">
        Non hai un account?{" "}
        <Link href="/registrati" className="font-semibold text-violet">
          Registrati gratis
        </Link>
      </p>
    </>
  );
}
