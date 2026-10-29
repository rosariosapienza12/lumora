"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction } from "../actions";
import { Button, Field, FormMessage } from "@/components/ui";
import type { FormState } from "@/lib/validation";

export function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(loginAction, {});
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Field label="Email" name="email" type="email" autoComplete="email" defaultValue={state.values?.email} error={state.errors?.email} required />
      <Field label="Password" name="password" type="password" autoComplete="current-password" error={state.errors?.password} required />
      <Link href="/password-dimenticata" className="-mt-1 self-end text-sm font-medium text-violet">
        Password dimenticata?
      </Link>
      <FormMessage>{state.message}</FormMessage>
      <Button type="submit" disabled={pending}>
        {pending ? "Accesso in corso…" : "Accedi"}
      </Button>
    </form>
  );
}
