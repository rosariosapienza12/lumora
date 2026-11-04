import type { ReactNode } from "react";

export const LAST_UPDATED = "4 novembre 2026";

/** Shared shell for the legal pages. */
export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="mx-auto w-full max-w-2xl px-5 py-16">
      <h1 className="font-display text-4xl font-bold tracking-tight">{title}</h1>
      <p className="mt-3 text-sm text-ink-soft">Ultimo aggiornamento: {LAST_UPDATED}</p>
      <div className="mt-8 flex flex-col gap-4 leading-relaxed text-ink-soft [&_a]:font-semibold [&_a]:text-violet [&_h2]:mt-6 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-ink">
        {children}
      </div>
    </article>
  );
}

/** How to reach the person responsible for the service. */
export function Contact({ email }: { email?: string }) {
  return email ? (
    <a href={`mailto:${email}`}>{email}</a>
  ) : (
    <a href="https://github.com/rosariosapienza12" rel="noopener">
      github.com/rosariosapienza12
    </a>
  );
}
