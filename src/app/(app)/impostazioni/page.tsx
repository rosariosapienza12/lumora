import type { Metadata } from "next";
import { db } from "@/lib/db";
import { emailEnabled } from "@/lib/env";
import { requireUser } from "@/lib/auth/session";
import { Button } from "@/components/ui";
import { TwoFactorPanel } from "./two-factor-panel";
import { PasswordForm } from "./password-form";
import { DeleteAccountForm } from "./delete-account-form";
import { isGuestEmail } from "@/lib/guest";
import { revokeOtherSessionsAction } from "./actions";

export const metadata: Metadata = { title: "Sicurezza dell'account" };

const dateFmt = new Intl.DateTimeFormat("it-IT", { dateStyle: "medium", timeStyle: "short" });

export default async function SettingsPage() {
  const user = await requireUser();
  const sessions = await db.session.findMany({
    where: { userId: user.id, twoFactorPending: false, expiresAt: { gt: new Date() } },
    orderBy: { lastSeenAt: "desc" },
    select: { id: true, createdAt: true, userAgent: true },
    take: 20,
  });

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <h1 className="font-display text-3xl font-bold tracking-tight">Sicurezza dell&apos;account</h1>

      <section className="rounded-3xl border border-line bg-paper p-6">
        <h2 className="mb-1 font-display text-xl font-semibold">Profilo</h2>
        <p className="break-words text-ink-soft [overflow-wrap:anywhere]">
          {user.name} · {user.email}
        </p>
        {!user.emailVerifiedAt && (
          <p className="mt-3 rounded-xl bg-amber/15 px-3.5 py-2.5 text-sm">
            {emailEnabled
              ? "Email non ancora confermata: apri il link che ti abbiamo inviato. Serve per pubblicare le presentazioni."
              : "Email non confermata: in questa versione dimostrativa le email sono spente, quindi la pubblicazione non è disponibile."}
          </p>
        )}
      </section>

      <section className="rounded-3xl border border-line bg-paper p-6">
        <h2 className="mb-3 font-display text-xl font-semibold">Password</h2>
        <PasswordForm />
      </section>

      <section className="rounded-3xl border border-line bg-paper p-6">
        <h2 className="mb-3 font-display text-xl font-semibold">Verifica in due passaggi</h2>
        <TwoFactorPanel enabled={Boolean(user.totpEnabledAt)} />
      </section>

      <section className="rounded-3xl border border-line bg-paper p-6">
        <h2 className="mb-3 font-display text-xl font-semibold">Dispositivi connessi</h2>
        <ul className="mb-4 flex flex-col divide-y divide-line text-sm">
          {sessions.map((s) => (
            <li key={s.id} className="flex flex-col py-2.5">
              <span className="truncate">{s.userAgent || "Dispositivo sconosciuto"}</span>
              <span className="text-ink-soft">Accesso del {dateFmt.format(s.createdAt)}</span>
            </li>
          ))}
        </ul>
        <form action={revokeOtherSessionsAction}>
          <Button type="submit" variant="outline">
            Disconnetti tutti gli altri dispositivi
          </Button>
        </form>
      </section>

      <section className="rounded-3xl border border-danger/30 bg-paper p-6">
        <h2 className="mb-3 font-display text-xl font-semibold">Elimina account</h2>
        <DeleteAccountForm guest={isGuestEmail(user.email)} />
      </section>
    </div>
  );
}
