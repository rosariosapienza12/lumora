"use client";

import { useActionState, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { signupAction } from "../actions";
import { Button, Field, FormMessage } from "@/components/ui";
import type { FormState } from "@/lib/validation";

const KINDS = [
  { value: "EDUCATION", label: "Insegno", detail: "Scuola, università o formazione" },
  { value: "BUSINESS", label: "Lavoro in azienda", detail: "Marketing, HR, vendite, design" },
  { value: "STUDENT", label: "Studio", detail: "Progetti, tesine ed esposizioni" },
] as const;

export function SignupForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(signupAction, {});
  const [kind, setKind] = useState(state.values?.kind ?? "");

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Per cosa userai Lumora?</legend>
        {KINDS.map((k) => (
          <label
            key={k.value}
            className="flex cursor-pointer items-center gap-3 rounded-2xl border border-line px-4 py-3 transition-colors has-checked:border-violet has-checked:bg-violet/5"
          >
            <input
              type="radio"
              name="kind"
              value={k.value}
              checked={kind === k.value}
              onChange={() => setKind(k.value)}
              className="accent-violet"
            />
            <span className="flex flex-col">
              <span className="font-semibold">{k.label}</span>
              <span className="text-sm text-ink-soft">{k.detail}</span>
            </span>
          </label>
        ))}
        {state.errors?.kind && <p className="text-sm text-danger">{state.errors.kind}</p>}
      </fieldset>

      <AnimatePresence initial={false}>
        {kind && (
          <motion.div
            key="details"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="flex flex-col gap-4 overflow-hidden"
          >
            <Field label="Nome" name="name" autoComplete="name" defaultValue={state.values?.name} error={state.errors?.name} required maxLength={80} />
            <Field label="Email" name="email" type="email" autoComplete="email" defaultValue={state.values?.email} error={state.errors?.email} required />
            <Field
              label="Password"
              name="password"
              type="password"
              autoComplete="new-password"
              error={state.errors?.password}
              hint="Almeno 12 caratteri. Una frase lunga è più sicura e facile da ricordare."
              required
              minLength={12}
              maxLength={128}
            />
            <label className="flex items-start gap-2.5 text-sm">
              <input type="checkbox" name="terms" className="mt-0.5 accent-violet" required />
              <span>
                Accetto i <Link href="/termini" className="underline">termini di servizio</Link> e l&apos;
                <Link href="/privacy" className="underline">informativa privacy</Link>.
              </span>
            </label>
            {state.errors?.terms && <p className="text-sm text-danger">{state.errors.terms}</p>}
          </motion.div>
        )}
      </AnimatePresence>

      <FormMessage>{state.message}</FormMessage>
      <Button type="submit" disabled={pending || !kind}>
        {pending ? "Creazione in corso…" : "Crea account"}
      </Button>
    </form>
  );
}
