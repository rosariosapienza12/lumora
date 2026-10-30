"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { buildTemplate, TEMPLATES, type TemplateId } from "@/lib/editor/templates";
import { SlideThumb } from "@/components/slide/element-view";
import { Button } from "@/components/ui";
import { ThemePicker } from "@/components/theme-picker";
import { DEFAULT_THEME, type ThemeId } from "@/lib/editor/themes";
import { createPresentationAction } from "./actions";

function CreateButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Creazione…" : "Crea presentazione"}
    </Button>
  );
}

/** "Nuova presentazione": pick a template, then the editor opens on it. */
export function NewPresentation() {
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<TemplateId>("vuota");
  const [theme, setTheme] = useState<ThemeId>(DEFAULT_THEME);
  // Preview pages, rebuilt on the client when the theme changes.
  const previews = useMemo(() => Object.fromEntries(TEMPLATES.map((t) => [t.id, buildTemplate(t.id, t.name, theme)])), [theme]);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Nuova presentazione</Button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          >
            <motion.form
              action={createPresentationAction}
              role="dialog"
              aria-modal="true"
              aria-labelledby="new-title"
              initial={{ y: 24, scale: 0.97 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 12, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              className="flex max-h-[90vh] w-full max-w-4xl flex-col gap-5 overflow-auto rounded-3xl bg-paper p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <h2 id="new-title" className="font-display text-2xl font-bold">
                  Scegli da dove partire
                </h2>
                <p className="mt-1 text-sm text-ink-soft">Scegli un tema e un modello: si modificano liberamente, e il tema si può cambiare anche dopo nell&apos;editor.</p>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold">Tema</h3>
                <ThemePicker name="theme" value={theme} onChange={setTheme} />
              </div>
              <h3 className="-mb-2 text-sm font-semibold">Modello</h3>
              <fieldset className="grid gap-3 sm:grid-cols-2">
                <legend className="sr-only">Modello</legend>
                {TEMPLATES.map((t) => {
                  const doc = previews[t.id];
                  return (
                    <label
                      key={t.id}
                      className="group cursor-pointer overflow-hidden rounded-2xl border-2 border-line transition-colors has-checked:border-violet has-focus-visible:ring-2 has-focus-visible:ring-violet"
                    >
                      <input type="radio" name="template" value={t.id} checked={choice === t.id} onChange={() => setChoice(t.id)} className="sr-only" />
                      <SlideThumb page={doc.pages[0]} />
                      <span className="flex items-start justify-between gap-3 p-3">
                        <span>
                          <span className="block font-semibold">{t.name}</span>
                          <span className="block text-sm text-ink-soft">{t.description}</span>
                        </span>
                        <span className="shrink-0 rounded-full bg-mist px-2 py-0.5 text-xs text-ink-soft">
                          {doc.pages.length} {doc.pages.length === 1 ? "pagina" : "pagine"}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </fieldset>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Annulla
                </Button>
                <CreateButton />
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
