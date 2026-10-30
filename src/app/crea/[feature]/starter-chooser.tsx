"use client";

import { useMemo, useState } from "react";
import { SlideThumb } from "@/components/slide/element-view";
import { ThemePicker } from "@/components/theme-picker";
import { Button, ButtonLink } from "@/components/ui";
import { buildStarter, type StarterId } from "@/lib/editor/starters";
import { DEFAULT_THEME, type ThemeId } from "@/lib/editor/themes";
import { createFromStarterAction } from "./actions";

/** Theme choice with a live preview, then one click to create the presentation. */
export function StarterChooser({ feature, glow, signedIn }: { feature: StarterId; glow: string; signedIn: boolean }) {
  const [theme, setTheme] = useState<ThemeId>(DEFAULT_THEME);
  const pages = useMemo(() => buildStarter(feature, theme).doc.pages, [feature, theme]);
  const back = encodeURIComponent(`/crea/${feature}`);

  return (
    <div className="grid gap-10 md:grid-cols-2 md:items-center">
      <form action={createFromStarterAction} className="flex flex-col gap-5">
        <input type="hidden" name="feature" value={feature} />
        <div>
          <h2 className="mb-2 text-sm font-semibold text-white/80">Scegli il tema</h2>
          <ThemePicker name="theme" value={theme} onChange={setTheme} compact />
        </div>
        <div className="flex flex-wrap gap-3">
          {signedIn ? (
            <Button type="submit" className="px-6 py-3 text-base" style={{ background: glow, color: "#120d26" }}>
              Crea e apri l&apos;editor
            </Button>
          ) : (
            <>
              <ButtonLink href={`/registrati?dopo=${back}`} className="px-6 py-3 text-base" style={{ background: glow, color: "#120d26" }}>
                Registrati e inizia
              </ButtonLink>
              <ButtonLink href={`/accedi?dopo=${back}`} variant="ghost" className="px-6 py-3 text-base text-white hover:bg-white/10">
                Ho già un account
              </ButtonLink>
            </>
          )}
        </div>
      </form>
      <div>
        <div className="overflow-hidden rounded-3xl border border-white/10 shadow-2xl" style={{ boxShadow: `0 40px 80px -30px ${glow}80` }}>
          <SlideThumb page={pages[0]} />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {pages.slice(1, 4).map((p) => (
            <div key={p.id} className="overflow-hidden rounded-xl border border-white/10">
              <SlideThumb page={p} />
            </div>
          ))}
        </div>
        <p className="mt-2 text-sm text-white/60">
          {pages.length} {pages.length === 1 ? "pagina" : "pagine"}, nei colori del tema scelto.
        </p>
      </div>
    </div>
  );
}
