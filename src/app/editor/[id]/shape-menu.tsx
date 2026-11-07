"use client";

import { useEffect, useRef, useState } from "react";
import { SHAPE_LABELS, SHAPE_MENU, type ShapeId } from "@/lib/editor/shapes";
import { ShapeIcon } from "@/components/slide/shape-icon";

/** Toolbar button "Forma": opens a grid with every shape to add. */
export function ShapeMenu({ onPick }: { onPick: (shape: ShapeId) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium hover:bg-paper"
      >
        <span aria-hidden className="text-violet">■</span>
        Forma
        <span aria-hidden className="text-xs text-ink/50">▾</span>
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Scegli una forma"
          className="absolute left-1/2 top-full z-30 mt-2 w-[19rem] -translate-x-1/2 rounded-2xl border border-line bg-paper p-2 shadow-xl"
        >
          {SHAPE_MENU.map((g) => (
            <div key={g.title} className="mb-1.5 last:mb-0">
              <p className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">{g.title}</p>
              <div className="grid grid-cols-7 gap-1">
                {g.shapes.map((s) => (
                  <button
                    key={s}
                    role="menuitem"
                    title={SHAPE_LABELS[s]}
                    aria-label={SHAPE_LABELS[s]}
                    onClick={() => {
                      onPick(s);
                      setOpen(false);
                    }}
                    className="grid aspect-square place-items-center rounded-lg text-violet hover:bg-violet/10 focus-visible:bg-violet/10"
                  >
                    <ShapeIcon shape={s} className="h-6 w-6" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
