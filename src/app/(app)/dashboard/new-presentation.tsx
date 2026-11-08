"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { buildTemplate, TEMPLATES, templateTheme, type TemplateId } from "@/lib/editor/templates";
import { SlideThumb } from "@/components/slide/element-view";
import { Button } from "@/components/ui";
import { WritingButton } from "@/components/writing-button";
import { ThemePicker } from "@/components/theme-picker";
import { DEFAULT_THEME, type ThemeId } from "@/lib/editor/themes";
import { buildDeck, planDeck } from "@/lib/editor/deck";
import { MOTIFS } from "@/lib/editor/motifs";
import { getTheme } from "@/lib/editor/themes";
import { createFromTopicAction, createPresentationAction } from "./actions";

function CreateButton() {
  return <WritingButton>Crea presentazione</WritingButton>;
}

/** "Nuova presentazione": pick a template, then the editor opens on it. */
export function NewPresentation() {
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<TemplateId>("vuota");
  const [theme, setTheme] = useState<ThemeId>(DEFAULT_THEME);
  const [mode, setMode] = useState<"topic" | "template">("topic");
  const [topic, setTopic] = useState("");
  const [photos, setPhotos] = useState(false);
  // Live preview of what "Da un argomento" will build (photos are added on creation).
  const plan = useMemo(() => (topic.trim().length >= 2 ? planDeck(topic, { photos }) : null), [topic, photos]);
  const planDoc = useMemo(() => (plan ? buildDeck(plan) : null), [plan]);
  // Preview pages, rebuilt on the client when the theme changes.
  // Every template is shown in the theme it was designed for; the chosen one in the theme picked above.
  const previews = useMemo(
    () => Object.fromEntries(TEMPLATES.map((t) => [t.id, buildTemplate(t.id, t.name, t.id === choice ? theme : t.theme)])),
    [theme, choice],
  );
  const pick = (id: TemplateId) => {
    setChoice(id);
    setTheme(templateTheme(id));
  };

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
              action={mode === "topic" ? createFromTopicAction : createPresentationAction}
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
                <div className="mt-3 inline-flex rounded-full bg-mist p-1 text-sm font-medium" role="tablist">
                  {(["topic", "template"] as const).map((m) => (
                    <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className="rounded-full px-4 py-1.5 aria-selected:bg-paper aria-selected:shadow-sm">
                      {m === "topic" ? "Da un argomento" : "Da un modello"}
                    </button>
                  ))}
                </div>
              </div>
              {mode === "topic" ? (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="new-topic" className="text-sm font-semibold">
                      Di cosa parla la presentazione?
                    </label>
                    <input
                      id="new-topic"
                      name="topic"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      maxLength={120}
                      required
                      minLength={2}
                      placeholder="Per esempio: il riciclo, la Rivoluzione francese, la mia startup"
                      className="rounded-xl border border-line bg-paper px-3.5 py-2.5 outline-none focus:border-violet"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="photos" checked={photos} onChange={(e) => setPhotos(e.target.checked)} className="accent-violet" />
                    Con immagini: aggiungi foto gratis da Wikimedia Commons (con autore e licenza)
                  </label>
                  {plan && planDoc && (
                    <div>
                      <p className="mb-2 text-sm text-ink-soft">
                        {planDoc.pages.length} pagine nel tema {getTheme(plan.theme).name}
                        {plan.motif ? `, decorazioni ${MOTIFS[plan.motif].name.toLowerCase()}` : ""}. Tutto si cambia dopo nell&apos;editor.
                      </p>
                      <ol className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {planDoc.pages.map((p) => (
                          <li key={p.id} className="overflow-hidden rounded-lg border border-line">
                            <SlideThumb page={p} />
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="template-topic" className="text-sm font-semibold">
                      Argomento <span className="font-normal text-ink-soft">(facoltativo)</span>
                    </label>
                    <input
                      id="template-topic"
                      name="topic"
                      maxLength={120}
                      placeholder="Per esempio: il riciclo, la mia startup, la Sicilia"
                      className="rounded-xl border border-line bg-paper px-3.5 py-2.5 outline-none focus:border-violet"
                    />
                    <p className="text-xs text-ink-soft">Se lo scrivi, Zib riempie il modello con contenuti veri su quell&apos;argomento, seguendo le sue pagine e il suo tema.</p>
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
                          <input type="radio" name="template" value={t.id} checked={choice === t.id} onChange={() => pick(t.id)} className="sr-only" />
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
                </>
              )}
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
