"use client";

import { useState, useTransition } from "react";
import { voteAction, type VoteState } from "./actions";

export function VoteForm({ slug, el, options }: { slug: string; el: string; options: string[] }) {
  const [state, setState] = useState<VoteState | null>(null);
  const [pending, start] = useTransition();
  const total = state?.counts?.reduce((a, b) => a + b, 0) ?? 0;
  return (
    <div className="flex flex-col gap-3">
      {options.map((o, i) => {
        const chosen = state?.option === i;
        const share = state?.counts && total ? Math.round((state.counts[i] / total) * 100) : null;
        return (
          <button
            key={i}
            disabled={pending}
            onClick={() => start(async () => setState(await voteAction(slug, el, i)))}
            aria-pressed={chosen}
            className="relative overflow-hidden rounded-2xl border-2 border-line bg-paper px-4 py-4 text-left text-lg font-semibold transition-colors aria-pressed:border-violet disabled:opacity-60"
          >
            {share !== null && <span aria-hidden className="absolute inset-y-0 left-0 bg-violet/15 transition-[width] duration-700" style={{ width: `${share}%` }} />}
            <span className="relative flex items-center justify-between gap-3">
              {o}
              {share !== null && <span className="text-sm font-medium text-ink-soft">{share}%</span>}
            </span>
          </button>
        );
      })}
      <p role="status" className="min-h-6 text-center text-sm text-ink-soft">
        {pending ? "Invio il voto…" : state?.ok ? "Grazie! Puoi cambiare risposta quando vuoi." : (state?.message ?? "Tocca una risposta per votare.")}
      </p>
    </div>
  );
}
