"use client";

import { useActionState } from "react";
import { Button, Field, FormMessage } from "@/components/ui";
import type { FormState } from "@/lib/validation";
import { deleteAccountAction } from "./actions";

export function DeleteAccountForm({ guest }: { guest: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(deleteAccountAction, {});
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <p className="text-sm text-ink-soft">
        Cancella per sempre {guest ? "i dati di prova" : "il tuo account"}: tutte le presentazioni, anche quelle pubblicate, e le
        immagini caricate. Non si può annullare.
      </p>
      <FormMessage>{state.message}</FormMessage>
      {!guest && (
        <Field label="Password" name="password" type="password" autoComplete="current-password" required error={state.errors?.password} />
      )}
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="confirm" className="mt-0.5 accent-danger" required />
        <span>Ho capito: voglio eliminare tutto definitivamente.</span>
      </label>
      {state.errors?.confirm && <p className="text-sm text-danger">{state.errors.confirm}</p>}
      <div>
        <Button type="submit" variant="danger" disabled={pending}>
          {pending ? "Eliminazione…" : guest ? "Elimina i dati di prova" : "Elimina l'account"}
        </Button>
      </div>
    </form>
  );
}
