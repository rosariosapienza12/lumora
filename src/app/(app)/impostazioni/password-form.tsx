"use client";

import { useActionState } from "react";
import { Button, Field, FormMessage } from "@/components/ui";
import type { FormState } from "@/lib/validation";
import { changePasswordAction } from "./actions";

export function PasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(changePasswordAction, {});
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.ok && <FormMessage tone="ok">Password cambiata. Gli altri dispositivi sono stati disconnessi.</FormMessage>}
      <FormMessage>{state.message}</FormMessage>
      <Field label="Password attuale" name="current" type="password" autoComplete="current-password" required error={state.errors?.current} />
      <Field label="Nuova password" name="next" type="password" autoComplete="new-password" required minLength={12} maxLength={128} error={state.errors?.next} hint="Almeno 12 caratteri. Controlliamo che non sia comparsa in violazioni di dati note." />
      <Field label="Ripeti la nuova password" name="confirm" type="password" autoComplete="new-password" required error={state.errors?.confirm} />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Salvataggio…" : "Cambia password"}
        </Button>
      </div>
    </form>
  );
}
