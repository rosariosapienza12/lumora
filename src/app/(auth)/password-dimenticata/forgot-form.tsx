"use client";

import { useActionState } from "react";
import Link from "next/link";
import { forgotPasswordAction } from "../actions";
import { Button, Field, FormMessage } from "@/components/ui";
import type { FormState } from "@/lib/validation";

export function ForgotForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(forgotPasswordAction, {});
  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight">Password dimenticata</h1>
      <p className="mb-6 mt-2 text-ink-soft">Inserisci l&apos;email del tuo account: ti mandiamo un link per sceglierne una nuova.</p>
      {state.ok ? (
        <FormMessage tone="ok">{state.message}</FormMessage>
      ) : (
        <form action={action} className="flex flex-col gap-4" noValidate>
          <Field label="Email" name="email" type="email" autoComplete="email" error={state.errors?.email} required />
          <FormMessage>{state.message}</FormMessage>
          <Button type="submit" disabled={pending}>
            {pending ? "Invio…" : "Invia il link"}
          </Button>
        </form>
      )}
      <Link href="/accedi" className="mt-6 inline-block text-sm font-semibold text-violet">
        Torna all&apos;accesso
      </Link>
    </>
  );
}
