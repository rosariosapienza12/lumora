"use client";

import { useActionState } from "react";
import { resetPasswordAction } from "../actions";
import { Button, Field, FormMessage } from "@/components/ui";
import type { FormState } from "@/lib/validation";

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(resetPasswordAction, {});
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="token" value={token} />
      <Field
        label="Nuova password"
        name="password"
        type="password"
        autoComplete="new-password"
        hint="Almeno 12 caratteri."
        error={state.errors?.password}
        required
        minLength={12}
        maxLength={128}
      />
      <Field label="Ripeti la password" name="confirm" type="password" autoComplete="new-password" error={state.errors?.confirm} required />
      <FormMessage>{state.message}</FormMessage>
      <Button type="submit" disabled={pending}>
        {pending ? "Salvataggio…" : "Salva la nuova password"}
      </Button>
    </form>
  );
}
