"use client";

import { THEMES, type Palette, type ThemeId } from "@/lib/editor/themes";

/**
 * Theme swatches: each shows the cover colours, the two accents and the name.
 * Inside a form, `name` submits the chosen theme id.
 */
export function ThemePicker({ value, onChange, name, compact = false }: { value: ThemeId; onChange: (id: ThemeId) => void; name?: string; compact?: boolean }) {
  return (
    <fieldset className={`grid gap-2 ${compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4"}`}>
      <legend className="sr-only">Tema</legend>
      {THEMES.map((t) => {
        const p: Palette = t.palette;
        return (
          <label
            key={t.id}
            title={t.mood}
            className="group flex cursor-pointer items-center gap-2 rounded-xl border-2 border-line bg-paper p-1.5 pr-2 text-left transition-colors hover:border-violet/50 has-checked:border-violet has-focus-visible:ring-2 has-focus-visible:ring-violet"
          >
            <input type="radio" name={name} value={t.id} checked={value === t.id} onChange={() => onChange(t.id)} className="sr-only" />
            <span
              aria-hidden
              className="relative grid h-9 w-12 shrink-0 place-items-center overflow-hidden rounded-lg"
              style={{ background: p.coverBg2 ? `linear-gradient(135deg, ${p.coverBg}, ${p.coverBg2})` : p.coverBg }}
            >
              <span className="text-[13px] font-bold leading-none" style={{ color: p.coverTitle }}>
                Aa
              </span>
              <span className="absolute bottom-1 right-1 flex gap-0.5">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.accent }} />
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.accent2 }} />
              </span>
            </span>
            <span className="min-w-0 truncate text-[13px] font-medium text-ink">{t.name}</span>
          </label>
        );
      })}
    </fieldset>
  );
}
