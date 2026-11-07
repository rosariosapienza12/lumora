"use client";

import { useState } from "react";
import type { Page } from "@/lib/editor/schema";
import type { Item, PageContent } from "@/lib/editor/content";
import { isLayoutId, LAYOUT_FIELDS, LAYOUT_NAMES } from "@/lib/editor/layouts";

const input = "w-full rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm outline-none focus:border-violet";
const small = "rounded-md px-1.5 py-0.5 text-xs text-ink-soft hover:bg-mist hover:text-ink disabled:opacity-30";
const LABELS = { heading: "Titolo", subtitle: "Sottotitolo", body: "Testo", highlight: "Frase da ricordare" } as const;

/** A text field that sends its value when it loses focus (one undo step per edit, not per key). */
function Field({ label, value, multiline, onCommit, placeholder }: { label: string; value: string; multiline?: boolean; onCommit: (v: string) => void; placeholder?: string }) {
  const [draft, setDraft] = useState(value);
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    setDraft(value);
  }
  const commit = () => draft !== value && onCommit(draft);
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
      {label}
      {multiline ? (
        <textarea className={`${input} min-h-20`} value={draft} placeholder={placeholder} onChange={(e) => setDraft(e.target.value)} onBlur={commit} />
      ) : (
        <input className={input} value={draft} placeholder={placeholder} onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} />
      )}
    </label>
  );
}

/**
 * Smart layout panel: the page's words as a form. Every change re-composes the
 * page in its layout — add a point and the others make room, remove one and
 * the rest spread out.
 */
export function ContentPanel({ page, onContent }: { page: Page; onContent: (c: PageContent) => void }) {
  const src = page.source;
  if (!src || !isLayoutId(src.layout)) return null;
  const f = LAYOUT_FIELDS[src.layout];
  const c = src.content;
  const set = (patch: Partial<PageContent>) => onContent({ ...c, ...patch });
  const items: Item[] = c.items?.length ? c.items : f.items ? Array.from({ length: f.items.min }, (_, i) => ({ title: `Punto ${i + 1}`, ...(f.items!.withText ? { text: "" } : {}) })) : [];
  const setItems = (next: Item[]) => set({ items: next });
  const move = (i: number, d: -1 | 1) => {
    const next = [...items];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    setItems(next);
  };
  const stats = c.stats?.length ? c.stats : f.stats ? Array.from({ length: f.stats.min }, () => ({ value: "", label: "" })) : [];

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-ink-soft">
        Impaginazione «{LAYOUT_NAMES[src.layout]}»: scrivi qui e la pagina si risistema da sola. Quello che hai aggiunto a mano resta dov&apos;è.
      </p>
      {f.text.map((k) => (
        <Field key={k} label={LABELS[k]} value={c[k] ?? ""} multiline={k === "body"} onCommit={(v) => set({ [k]: v || undefined })} placeholder="Come sulla pagina" />
      ))}

      {f.items && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-ink">{f.items.label}</span>
          <ol className="flex flex-col gap-2">
            {items.map((it, i) => (
              <li key={i} className="rounded-xl border border-line p-2">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink-soft">{i + 1}</span>
                  <span className="flex gap-0.5">
                    <button className={small} aria-label={`Sposta su il punto ${i + 1}`} disabled={i === 0} onClick={() => move(i, -1)}>
                      ↑
                    </button>
                    <button className={small} aria-label={`Sposta giù il punto ${i + 1}`} disabled={i === items.length - 1} onClick={() => move(i, 1)}>
                      ↓
                    </button>
                    <button className={small} aria-label={`Togli il punto ${i + 1}`} disabled={items.length <= f.items!.min} onClick={() => setItems(items.filter((_, j) => j !== i))}>
                      ×
                    </button>
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Field label="Titolo" value={it.title} onCommit={(v) => setItems(items.map((x, j) => (j === i ? { ...x, title: v } : x)))} />
                  {f.items!.withText && <Field label="Descrizione" value={it.text ?? ""} multiline onCommit={(v) => setItems(items.map((x, j) => (j === i ? { ...x, text: v || undefined } : x)))} />}
                </div>
              </li>
            ))}
          </ol>
          <button
            disabled={items.length >= f.items.max}
            onClick={() => setItems([...items, { title: `Nuovo punto`, ...(f.items!.withText ? { text: "Una frase che lo spiega." } : {}) }])}
            className="rounded-full border border-dashed border-line px-3 py-1.5 text-sm font-medium hover:border-violet disabled:opacity-40"
          >
            + Aggiungi {f.items.max === items.length ? `(massimo ${f.items.max})` : "un punto"}
          </button>
        </div>
      )}

      {f.stats && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-ink">Numeri</span>
          {stats.map((s, i) => (
            <div key={i} className="grid grid-cols-[6rem_1fr_auto] items-end gap-1.5">
              <Field label="Valore" value={s.value} onCommit={(v) => set({ stats: stats.map((x, j) => (j === i ? { ...x, value: v } : x)) })} />
              <Field label="Cosa misura" value={s.label} onCommit={(v) => set({ stats: stats.map((x, j) => (j === i ? { ...x, label: v } : x)) })} />
              <button className={small} aria-label={`Togli il numero ${i + 1}`} disabled={stats.length <= f.stats!.min} onClick={() => set({ stats: stats.filter((_, j) => j !== i) })}>
                ×
              </button>
            </div>
          ))}
          {stats.length < f.stats.max && (
            <button onClick={() => set({ stats: [...stats, { value: "0", label: "Nuovo dato" }] })} className="rounded-full border border-dashed border-line px-3 py-1.5 text-sm font-medium hover:border-violet">
              + Aggiungi un numero
            </button>
          )}
        </div>
      )}

      {f.quote && (
        <>
          <Field label="Citazione" multiline value={c.quote?.text ?? ""} onCommit={(v) => set({ quote: { text: v, author: c.quote?.author ?? "" } })} />
          <Field label="Autore" value={c.quote?.author ?? ""} onCommit={(v) => set({ quote: { text: c.quote?.text ?? "", author: v } })} />
        </>
      )}

      {f.question && (
        <>
          <Field label="Domanda" value={c.question?.text ?? ""} onCommit={(v) => set({ question: { text: v, right: c.question?.right ?? "Sì", wrong: c.question?.wrong ?? "No", explanation: c.question?.explanation } })} />
          <div className="grid grid-cols-2 gap-1.5">
            <Field label="Risposta giusta" value={c.question?.right ?? ""} onCommit={(v) => set({ question: { text: c.question?.text ?? "", right: v, wrong: c.question?.wrong ?? "", explanation: c.question?.explanation } })} />
            <Field label="Risposta sbagliata" value={c.question?.wrong ?? ""} onCommit={(v) => set({ question: { text: c.question?.text ?? "", right: c.question?.right ?? "", wrong: v, explanation: c.question?.explanation } })} />
          </div>
          <Field label="Spiegazione" multiline value={c.question?.explanation ?? ""} onCommit={(v) => set({ question: { text: c.question?.text ?? "", right: c.question?.right ?? "", wrong: c.question?.wrong ?? "", explanation: v || undefined } })} />
        </>
      )}
    </div>
  );
}
