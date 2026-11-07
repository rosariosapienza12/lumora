"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ICON_IDS, ICONS, type IconId } from "@/lib/editor/icons";

export function IconGlyph({ icon, className = "" }: { icon: IconId; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={ICONS[icon].d} />
    </svg>
  );
}

/** Searchable grid of the line icons (by name or keyword, in Italian). */
export function IconGrid({ value, onPick }: { value?: IconId; onPick: (icon: IconId) => void }) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? ICON_IDS.filter((id) => ICONS[id].name.toLowerCase().includes(t) || ICONS[id].words.some((w) => w.includes(t))) : ICON_IDS;
  }, [q]);
  return (
    <div className="flex flex-col gap-2">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Cerca: crescita, team, costi…"
        aria-label="Cerca un'icona"
        className="w-full rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm outline-none focus:border-violet"
      />
      <div className="grid max-h-64 grid-cols-7 gap-1 overflow-auto" role="radiogroup" aria-label="Icone">
        {list.map((id) => (
          <button
            key={id}
            role="radio"
            aria-checked={value === id}
            title={ICONS[id].name}
            aria-label={ICONS[id].name}
            onClick={() => onPick(id)}
            className="grid aspect-square place-items-center rounded-lg text-ink hover:bg-violet/10 aria-checked:bg-violet/15 aria-checked:text-violet"
          >
            <IconGlyph icon={id} className="h-5 w-5" />
          </button>
        ))}
        {!list.length && <p className="col-span-7 py-3 text-center text-xs text-ink-soft">Nessuna icona: prova un&apos;altra parola.</p>}
      </div>
    </div>
  );
}

/** Toolbar button "Icona". */
export function IconMenu({ onPick }: { onPick: (icon: IconId) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !rootRef.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div ref={rootRef} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-haspopup="true" aria-expanded={open} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium hover:bg-paper">
        <IconGlyph icon="star" className="h-4 w-4 text-violet" />
        Icona
        <span aria-hidden className="text-xs text-ink/50">▾</span>
      </button>
      {open && (
        <div role="dialog" aria-label="Aggiungi un'icona" className="absolute left-1/2 top-full z-30 mt-2 w-[min(20rem,90vw)] -translate-x-1/2 rounded-2xl border border-line bg-paper p-3 shadow-xl">
          <IconGrid
            onPick={(id) => {
              onPick(id);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
