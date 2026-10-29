import type { ReactNode } from "react";

/** Shared shell for legal pages. Content is a placeholder to be replaced with text reviewed by a lawyer. */
export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="mx-auto w-full max-w-2xl px-5 py-16">
      <h1 className="font-display text-4xl font-bold tracking-tight">{title}</h1>
      <p className="mt-4 rounded-xl bg-amber/15 px-4 py-3 text-sm">
        Bozza provvisoria: questo testo va sostituito con la versione definitiva prima della pubblicazione del servizio.
      </p>
      <div className="mt-8 flex flex-col gap-4 leading-relaxed text-ink-soft">{children}</div>
    </article>
  );
}
