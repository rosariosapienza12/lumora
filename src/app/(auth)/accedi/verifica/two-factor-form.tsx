"use client";

import { useActionState, useState } from "react";
import { twoFactorAction } from "../../actions";
import { Button, Field, FormMessage } from "@/components/ui";
import type { FormState } from "@/lib/validation";

export function TwoFactorForm({ next }: { next?: string | null }) {
  const [state, action, pending] = useActionState<FormState, FormData>(twoFactorAction, {});
  const [mode, setMode] = useState<"totp" | "recovery">("totp");

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="mode" value={mode} />
      {next && <input type="hidden" name="dopo" value={next} />}
      {mode === "totp" ? (
        <Field
          key="totp"
          label="Codice dell'app di autenticazione"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]*"
          maxLength={7}
          autoFocus
          error={state.errors?.code}
          required
        />
      ) : (
        <Field key="recovery" label="Codice di emergenza" name="code" autoComplete="off" maxLength={20} autoFocus error={state.errors?.code} required />
      )}
      <FormMessage>{state.message}</FormMessage>
      <Button type="submit" disabled={pending}>
        {pending ? "Verifica…" : "Verifica"}
      </Button>
      <button
        type="button"
        onClick={() => setMode(mode === "totp" ? "recovery" : "totp")}
        className="text-sm font-medium text-violet"
      >
        {mode === "totp" ? "Non hai il telefono? Usa un codice di emergenza" : "Usa l'app di autenticazione"}
      </button>
    </form>
  );
}
