"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { SlideThumb } from "@/components/slide/element-view";
import { buildLayout, LAYOUT_GROUPS, type LayoutId } from "@/lib/editor/layouts";
import { blankPage } from "@/lib/editor/schema";
import { getTheme, type ThemeId } from "@/lib/editor/themes";

/** "+ Nuova pagina": choose a ready-made layout (in the presentation's theme) or an empty page. */
export function LayoutPicker({ theme, onPick }: { theme: ThemeId | undefined; onPick: (layout: LayoutId | undefined) => void }) {
  const [open, setOpen] = useState(false);
  // Previews are drawn once per theme, only while the menu is open.
  const previews = useMemo(() => {
    if (!open) return null;
    const t = getTheme(theme);
    return Object.fromEntries(LAYOUT_GROUPS.flatMap((g) => g.layouts.map((l) => [l.id, buildLayout(l.id, t)])));
  }, [open, theme]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const pick = (layout: LayoutId | undefined) => {
    onPick(layout);
    setOpen(false);
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded-xl border border-dashed border-line py-3 text-sm font-medium hover:border-violet">
        + Nuova pagina
      </button>
      <AnimatePresence>
        {open && previews && (
          <motion.div
            className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="layout-title"
              initial={{ y: 24, scale: 0.97 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 12, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              className="flex max-h-[88vh] w-full max-w-4xl flex-col gap-5 overflow-auto rounded-3xl bg-paper p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 id="layout-title" className="font-display text-2xl font-bold">
                    Aggiungi una pagina
                  </h2>
                  <p className="mt-1 text-sm text-ink-soft">Layout già impaginati e animati, nei colori del tema della presentazione.</p>
                </div>
                <button onClick={() => pick(undefined)} className="shrink-0 rounded-full border border-line px-3 py-1.5 text-sm font-medium hover:border-violet">
                  Pagina vuota
                </button>
              </div>
              {LAYOUT_GROUPS.map((g) => (
                <section key={g.feature}>
                  <h3 className="mb-2 text-sm font-semibold text-ink-soft">{g.title}</h3>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {g.layouts.map((l) => (
                      <button
                        key={l.id}
                        autoFocus={l.id === "titolo-testo"}
                        onClick={() => pick(l.id)}
                        className="overflow-hidden rounded-xl border-2 border-line text-left transition-colors hover:border-violet focus-visible:border-violet focus-visible:outline-none"
                      >
                        <SlideThumb page={previews[l.id] ?? blankPage()} />
                        <span className="block px-2 py-1.5 text-[13px] font-medium">{l.name}</span>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
