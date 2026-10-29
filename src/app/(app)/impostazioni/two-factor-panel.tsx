"use client";

import { useActionState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { confirmTotpAction, disableTotpAction, startTotpAction, type EnrollState } from "./actions";
import { Button, Field, FormMessage } from "@/components/ui";
import type { FormState } from "@/lib/validation";

export function TwoFactorPanel({ enabled }: { enabled: boolean }) {
  const [enrollment, start, starting] = useActionState<EnrollState, FormData>(startTotpAction, {});
  const [confirmState, confirm, confirming] = useActionState<EnrollState, FormData>(confirmTotpAction, {});
  const [disableState, disable, disabling] = useActionState<FormState, FormData>(disableTotpAction, {});

  if (confirmState.recoveryCodes) {
    return (
      <div className="flex flex-col gap-4">
        <FormMessage tone="ok">Verifica in due passaggi attiva.</FormMessage>
        <p className="text-sm">
          Salva questi codici di emergenza in un posto sicuro. Ognuno funziona una sola volta e ti fa accedere se perdi il
          telefono. Non li mostreremo più.
        </p>
        <ul className="grid grid-cols-2 gap-2 rounded-2xl bg-mist p-4 font-mono text-sm">
          {confirmState.recoveryCodes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </div>
    );
  }

  if (enabled) {
    return (
      <form action={disable} className="flex flex-col gap-4">
        <p className="text-sm text-ink-soft">
          Attiva. Per disattivarla conferma password e un codice dell&apos;app.
        </p>
        <Field label="Password" name="password" type="password" autoComplete="current-password" required />
        <Field label="Codice a 6 cifre" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} required />
        <FormMessage tone={disableState.ok ? "ok" : "error"}>{disableState.message}</FormMessage>
        <Button type="submit" variant="outline" disabled={disabling}>
          Disattiva la verifica in due passaggi
        </Button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-ink-soft">
        Oltre alla password ti chiederemo un codice dall&apos;app di autenticazione (Google Authenticator, Authy, 1Password…).
      </p>
      <AnimatePresence mode="wait">
        {!enrollment.qrDataUrl ? (
          <motion.form key="start" action={start} exit={{ opacity: 0 }} className="flex flex-col gap-4">
            <Field label="Conferma la tua password" name="password" type="password" autoComplete="current-password" required />
            <FormMessage>{enrollment.message}</FormMessage>
            <Button type="submit" disabled={starting}>
              Attiva la verifica in due passaggi
            </Button>
          </motion.form>
        ) : (
          <motion.form
            key="confirm"
            action={confirm}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-mist p-4 sm:flex-row sm:items-start">
              {/* eslint-disable-next-line @next/next/no-img-element -- data URL generated server-side */}
              <img src={enrollment.qrDataUrl} alt="Codice QR da scansionare con l'app di autenticazione" width={160} height={160} className="rounded-xl bg-white p-1" />
              <div className="text-sm">
                <p>Scansiona il codice con l&apos;app. Se non puoi, inserisci questa chiave:</p>
                <code className="mt-2 block break-all rounded-lg bg-paper px-2 py-1.5 font-mono text-xs">{enrollment.secret}</code>
              </div>
            </div>
            <Field label="Codice a 6 cifre mostrato dall'app" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} error={confirmState.errors?.code} required autoFocus />
            <FormMessage>{confirmState.message}</FormMessage>
            <Button type="submit" disabled={confirming}>
              Conferma e attiva
            </Button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
