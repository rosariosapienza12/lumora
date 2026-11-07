"use client";

import { isMotifId, MOTIF_IDS, MOTIFS } from "@/lib/editor/motifs";
import { isSvgShape, MENU_SHAPES, SHAPE_IDS, SHAPE_LABELS } from "@/lib/editor/shapes";
import { RELIEF_NAMES, RELIEFS } from "@/lib/three/ids";
import { Look3DControls, Object3DControls } from "./object3d-panel";
import { ChartControls, IconControls } from "./chart-panel";
import { ShapeIcon } from "@/components/slide/shape-icon";
import { ThemePicker } from "@/components/theme-picker";
import { DEFAULT_THEME, getTheme, PATTERNS, type Pattern } from "@/lib/editor/themes";
import { relatedLayouts, LAYOUT_NAMES, isLayoutId } from "@/lib/editor/layouts";
import { useState, type ReactNode } from "react";
import type { Element, Interaction, Page, PresentationDoc } from "@/lib/editor/schema";
import { EMPHASIS_ANIMATIONS, ENTER_ANIMATIONS, FONT_FAMILY, FONT_LABELS, FONTS, TRANSITIONS, type FontId } from "@/lib/editor/schema";
import type { Action, Align } from "./store";

const ENTER_LABELS: Record<(typeof ENTER_ANIMATIONS)[number], string> = {
  none: "Nessuna",
  fade: "Dissolvenza",
  "slide-up": "Sale dal basso",
  "slide-left": "Entra da destra",
  zoom: "Zoom",
  pop: "Pop",
  blur: "Messa a fuoco",
};
const EMPHASIS_LABELS: Record<(typeof EMPHASIS_ANIMATIONS)[number], string> = {
  none: "Nessuna",
  pulse: "Pulsa",
  wiggle: "Oscilla",
  float: "Galleggia",
  glow: "Bagliore",
};
const TRANSITION_LABELS: Record<(typeof TRANSITIONS)[number], string> = {
  none: "Nessuna",
  fade: "Dissolvenza",
  "slide-left": "Scorrimento orizzontale",
  "slide-up": "Scorrimento verticale",
  zoom: "Zoom",
  flip: "Rotazione 3D",
};

const inputCls = "w-full rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm outline-none focus:border-violet";
const chip = "rounded-full border border-line px-2.5 py-1 text-xs hover:border-violet aria-pressed:border-violet aria-pressed:bg-violet/10";

const ALIGN: { to: Align; label: string; icon: string }[] = [
  { to: "left", label: "Allinea a sinistra", icon: "⇤" },
  { to: "hcenter", label: "Centra in orizzontale", icon: "↔" },
  { to: "right", label: "Allinea a destra", icon: "⇥" },
  { to: "top", label: "Allinea in alto", icon: "⤒" },
  { to: "vcenter", label: "Centra in verticale", icon: "↕" },
  { to: "bottom", label: "Allinea in basso", icon: "⤓" },
];

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
      {label}
      {children}
    </label>
  );
}

function Num({ value, onChange, min, max, step = 1 }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) {
  return (
    <input
      type="number"
      className={inputCls}
      value={Number.isFinite(value) ? Math.round(value * 100) / 100 : 0}
      min={min}
      max={max}
      step={step}
      onChange={(e) => {
        const v = Number(e.target.value);
        if (Number.isFinite(v)) onChange(Math.min(max ?? Infinity, Math.max(min ?? -Infinity, v)));
      }}
    />
  );
}

const SWATCHES = ["#1d1a3a", "#ffffff", "#5b3df5", "#ffb547", "#ff7a2e", "#d22f4f", "#ff8fb1", "#18a689", "#2fd4cf", "#4f8bff"];

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <input type="color" className="h-9 w-full cursor-pointer rounded-lg border border-line bg-paper" value={value} onChange={(e) => onChange(e.target.value)} />
      <div className="flex flex-wrap gap-1">
        {SWATCHES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            aria-label={`Colore ${c}`}
            aria-pressed={value.toLowerCase() === c}
            className="size-4 rounded-full border border-line aria-pressed:ring-2 aria-pressed:ring-violet"
            style={{ background: c }}
          />
        ))}
      </div>
    </div>
  );
}

/** "Sfumatura": a second colour and an angle, shown when enabled. */
function GradientControls({ color2, angle, base, onChange }: { color2?: string; angle?: number; base: string; onChange: (p: { color2?: string; angle?: number }) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="accent-violet" checked={Boolean(color2)} onChange={(e) => onChange(e.target.checked ? { color2: base === "#ffffff" ? "#5b3df5" : "#ffffff", angle: angle ?? 135 } : { color2: undefined })} />
        Sfumatura
      </label>
      {color2 && (
        <div className="grid grid-cols-2 gap-2">
          <Row label="Secondo colore">
            <ColorInput value={color2} onChange={(c) => onChange({ color2: c })} />
          </Row>
          <Row label="Direzione (°)">
            <Num value={angle ?? 135} min={0} max={360} step={15} onChange={(a) => onChange({ angle: a })} />
          </Row>
        </div>
      )}
    </div>
  );
}

function FontSelect({ value, onChange }: { value: FontId; onChange: (v: FontId) => void }) {
  return (
    <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value as FontId)} style={{ fontFamily: FONT_FAMILY[value] }}>
      {FONTS.map((f) => (
        <option key={f} value={f} style={{ fontFamily: FONT_FAMILY[f] }}>
          {FONT_LABELS[f]}
        </option>
      ))}
    </select>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-b border-line px-4 py-4">
      <h3 className="font-display text-sm font-semibold text-ink">{title}</h3>
      {children}
    </section>
  );
}

export function Inspector({ doc, page, el, dispatch, onFindPhoto, onUploadPhoto }: { doc: PresentationDoc; page: Page; el: Element | null; dispatch: (a: Action) => void; onFindPhoto?: () => void; onUploadPhoto?: () => void }) {
  if (!el) {
    return (
      <div>
        <Section title="Pagina">
          <Row label="Nome">
            <input className={inputCls} value={page.name} maxLength={80} onChange={(e) => dispatch({ type: "update-page", patch: { name: e.target.value } })} />
          </Row>
          <Row label="Sfondo">
            <ColorInput value={page.background} onChange={(background) => dispatch({ type: "update-page", patch: { background } })} />
          </Row>
          <GradientControls color2={page.color2} angle={page.angle} base={page.background} onChange={(patch) => dispatch({ type: "update-page", patch })} />
          <Row label="Transizione d'ingresso">
            <select className={inputCls} value={page.transition} onChange={(e) => dispatch({ type: "update-page", patch: { transition: e.target.value as Page["transition"] } })}>
              {TRANSITIONS.map((t) => (
                <option key={t} value={t}>
                  {TRANSITION_LABELS[t]}
                </option>
              ))}
            </select>
          </Row>
          <button onClick={() => dispatch({ type: "transition-all", transition: page.transition })} className={chip}>
            Usa questa transizione per tutte le pagine
          </button>
          <Row label="Motivo di sfondo">
            <select className={inputCls} value={page.pattern ?? "none"} onChange={(e) => dispatch({ type: "pattern", pattern: e.target.value as Pattern })}>
              {PATTERNS.map((pt) => (
                <option key={pt} value={pt}>
                  {PATTERN_LABELS[pt]}
                </option>
              ))}
            </select>
          </Row>
          <button onClick={() => dispatch({ type: "pattern", pattern: page.pattern ?? "none", all: true })} className={chip}>
            Usa questo motivo per tutte le pagine
          </button>
          {page.source && relatedLayouts(page.source.layout).length > 1 && (
            <button onClick={() => dispatch({ type: "relayout" })} className="mt-1 rounded-full bg-violet px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-deep">
              Cambia impaginazione
              {(() => {
                const fam = relatedLayouts(page.source.layout);
                const next = fam[(fam.indexOf(page.source.layout as never) + 1) % fam.length];
                return isLayoutId(next) ? `: ${LAYOUT_NAMES[next]}` : "";
              })()}
            </button>
          )}
        </Section>
        <Section title="Tema">
          <p className="text-xs text-ink-soft">Cambia colori e caratteri di tutte le pagine. I colori scelti a mano restano come sono; puoi sempre annullare.</p>
          <ThemePicker compact value={doc.settings?.theme ?? DEFAULT_THEME} onChange={(theme) => dispatch({ type: "apply-theme", theme })} />
          <div className="grid grid-cols-2 gap-2">
            {(["accent", "accent2"] as const).map((role) => (
              <Row key={role} label={role === "accent" ? "Colore principale" : "Secondo colore"}>
                <ColorInput
                  value={doc.settings?.colors?.[role] ?? getTheme(doc.settings?.theme).palette[role]}
                  onChange={(color) => dispatch({ type: "main-color", role, color })}
                />
              </Row>
            ))}
          </div>
          <p className="text-xs text-ink-soft">Cambiano ovunque sono usati, in tutte le pagine.</p>
        </Section>
        <Section title="Stile 3D">
          <Look3DControls doc={doc} onLook={(look) => dispatch({ type: "look-3d", look })} />
        </Section>
        <Section title="Argomento">
          <p className="text-xs text-ink-soft">Illustrazioni ai margini delle pagine, scelte per l&apos;argomento. Non coprono i contenuti.</p>
          <select
            aria-label="Argomento"
            className={inputCls}
            value={doc.settings?.motif ?? (doc.settings?.decor?.length ? "zib" : "")}
            onChange={(e) => e.target.value !== "zib" && dispatch({ type: "apply-motif", motif: isMotifId(e.target.value) ? e.target.value : undefined })}
          >
            {doc.settings?.decor?.length && !doc.settings.motif ? <option value="zib">Scelte da Zib per il tuo argomento</option> : null}
            <option value="">Nessuna decorazione</option>
            {MOTIF_IDS.map((id) => (
              <option key={id} value={id}>
                {MOTIFS[id].name}
              </option>
            ))}
          </select>
          <Row label="Quante decorazioni">
            <select className={inputCls} value={doc.settings?.decorDensity ?? 2} onChange={(e) => dispatch({ type: "decor-density", density: Number(e.target.value) })}>
              <option value={0}>Nessuna</option>
              <option value={1}>Poche</option>
              <option value={2}>Normali</option>
              <option value={3}>Tante</option>
            </select>
          </Row>
        </Section>
        <Section title="Presentazione">
          <Row label="Avanza da sola dopo (secondi, 0 = mai)">
            <Num value={doc.settings?.autoAdvance ?? 0} min={0} max={300} onChange={(autoAdvance) => dispatch({ type: "settings", autoAdvance })} />
          </Row>
          <p className="text-xs text-ink-soft">Utile per chioschi, vetrine e presentazioni che scorrono da sole.</p>
        </Section>
        <p className="px-4 py-4 text-sm text-ink-soft">Seleziona un elemento sulla pagina per modificarne aspetto, animazioni e interazioni.</p>
      </div>
    );
  }

  const set = (patch: Partial<Element>) => dispatch({ type: "update-element", id: el.id, patch });

  return (
    <div>
      <Section title="Contenuto">
        {((el.type === "shape" && el.photoSlot) || el.type === "image") && (
          <div className="flex flex-col gap-2">
            {el.type === "shape" && <p className="text-xs text-ink-soft">Spazio per una foto: scegline una e prenderà il suo posto, con la stessa misura.</p>}
            <div className="flex flex-wrap gap-1.5">
              <button onClick={onFindPhoto} className={chip}>
                Cerca foto gratis
              </button>
              <button onClick={onUploadPhoto} className={chip}>
                Carica dal computer
              </button>
            </div>
            {el.type === "image" && el.credit && (
              <p className="text-xs text-ink-soft">
                {el.credit}
                {el.creditUrl && (
                  <>
                    {" "}
                    <a href={el.creditUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-violet underline">
                      Licenza e autore
                    </a>
                  </>
                )}
              </p>
            )}
          </div>
        )}
        {el.type === "shape" && el.shape === "arc" && (
          <Row label="Percentuale disegnata">
            <Num value={el.progress ?? 75} min={0} max={100} onChange={(progress) => set({ progress })} />
          </Row>
        )}
        {el.type === "object3d" && <Object3DControls el={el} set={set} />}
        {el.type === "icon" && <IconControls el={el} set={set} />}
        {el.type === "chart" && <ChartControls el={el} set={set} />}
        {el.type === "shape" && !el.photoSlot && isSvgShape(el.shape) && (
          <Row label="Rilievo 3D">
            <div className="flex flex-wrap gap-1.5">
              {RELIEFS.map((r) => (
                <button key={r} aria-pressed={(el.relief ?? "none") === r} onClick={() => set({ relief: r === "none" ? undefined : r })} className={chip}>
                  {RELIEF_NAMES[r]}
                </button>
              ))}
            </div>
          </Row>
        )}
        {el.type === "text" && <ZibOnText text={el.text} context={page.source?.content.heading ?? page.name} onText={(text) => set({ text })} />}
        {el.type === "text" && (
          <>
            <Row label="Testo">
              <textarea className={`${inputCls} min-h-24`} value={el.text} maxLength={5000} onChange={(e) => set({ text: e.target.value })} />
            </Row>
            <div className="grid grid-cols-2 gap-2">
              <Row label="Dimensione">
                <Num value={el.fontSize} min={8} max={400} onChange={(fontSize) => set({ fontSize })} />
              </Row>
              <Row label="Colore">
                <ColorInput value={el.color} onChange={(color) => set({ color })} />
              </Row>
              <Row label="Carattere">
                <FontSelect value={el.font} onChange={(font) => set({ font })} />
              </Row>
              <Row label="Spessore">
                <select className={inputCls} value={el.weight} onChange={(e) => set({ weight: e.target.value as "400" | "600" | "800" })}>
                  <option value="400">Normale</option>
                  <option value="600">Semi-grassetto</option>
                  <option value="800">Grassetto</option>
                </select>
              </Row>
            </div>
            <GradientControls color2={el.color2} angle={el.angle} base={el.color} onChange={(p) => set(p)} />
            <Row label="Allineamento">
              <select className={inputCls} value={el.align} onChange={(e) => set({ align: e.target.value as "left" | "center" | "right" })}>
                <option value="left">Sinistra</option>
                <option value="center">Centro</option>
                <option value="right">Destra</option>
              </select>
            </Row>
            <div className="flex gap-1.5">
              <button aria-pressed={Boolean(el.italic)} onClick={() => set({ italic: !el.italic })} className={`${chip} italic`}>
                Corsivo
              </button>
              <button aria-pressed={Boolean(el.underline)} onClick={() => set({ underline: !el.underline })} className={`${chip} underline`}>
                Sottolineato
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Row label="Interlinea">
                <Num value={el.lineHeight ?? 1.15} min={0.8} max={3} step={0.05} onChange={(lineHeight) => set({ lineHeight })} />
              </Row>
              <Row label="Spaziatura">
                <Num value={el.letterSpacing ?? 0} min={-10} max={50} step={0.5} onChange={(letterSpacing) => set({ letterSpacing })} />
              </Row>
            </div>
          </>
        )}
        {el.type === "shape" && (
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <span className="mb-1 block text-xs font-medium text-ink-soft">Forma</span>
              <div className="grid grid-cols-7 gap-1" role="radiogroup" aria-label="Forma">
                {SHAPE_IDS.filter((sh) => MENU_SHAPES.includes(sh) || sh === el.shape).map((shape) => (
                  <button
                    key={shape}
                    role="radio"
                    aria-checked={el.shape === shape}
                    title={SHAPE_LABELS[shape]}
                    aria-label={SHAPE_LABELS[shape]}
                    onClick={() => set({ shape })}
                    className="grid aspect-square place-items-center rounded-lg border border-line text-violet hover:border-violet aria-checked:border-violet aria-checked:bg-violet/10"
                  >
                    <ShapeIcon shape={shape} className="size-5" />
                  </button>
                ))}
              </div>
            </div>
            <Row label="Colore">
              <ColorInput value={el.fill} onChange={(fill) => set({ fill })} />
            </Row>
            {el.shape === "rect" && (
              <Row label="Angoli">
                <Num value={el.radius} min={0} max={800} onChange={(radius) => set({ radius })} />
              </Row>
            )}
            <div className="col-span-2">
              <GradientControls color2={el.color2} angle={el.angle} base={el.fill} onChange={(p) => set(p)} />
            </div>
            <Row label="Bordo">
              <ColorInput value={el.stroke ?? "#1d1a3a"} onChange={(stroke) => set({ stroke, strokeWidth: el.strokeWidth || 4 })} />
            </Row>
            <Row label="Spessore bordo">
              <Num value={el.strokeWidth ?? 0} min={0} max={60} onChange={(strokeWidth) => set({ strokeWidth, stroke: el.stroke ?? "#1d1a3a" })} />
            </Row>
          </div>
        )}
        {el.type === "image" && (
          <>
            <Row label="Indirizzo immagine (https) o carica dal pulsante Immagine">
              <input className={inputCls} defaultValue={el.src.startsWith("/a/") ? "" : el.src} placeholder={el.src.startsWith("/a/") ? "Immagine caricata" : ""} key={el.src} maxLength={2048} onBlur={(e) => /^https:\/\//.test(e.target.value) && set({ src: e.target.value })} />
            </Row>
            <Row label="Testo alternativo (per chi usa lettori di schermo)">
              <input className={inputCls} value={el.alt} maxLength={300} onChange={(e) => set({ alt: e.target.value })} />
            </Row>
            <div className="grid grid-cols-2 gap-2">
              <Row label="Adattamento">
                <select className={inputCls} value={el.fit} onChange={(e) => set({ fit: e.target.value as "cover" | "contain" })}>
                  <option value="cover">Riempi</option>
                  <option value="contain">Contieni</option>
                </select>
              </Row>
              <Row label="Angoli">
                <Num value={el.radius} min={0} max={800} onChange={(radius) => set({ radius })} />
              </Row>
              <Row label="Cornice">
                <ColorInput value={el.stroke ?? "#ffffff"} onChange={(stroke) => set({ stroke, strokeWidth: el.strokeWidth || 8 })} />
              </Row>
              <Row label="Spessore cornice">
                <Num value={el.strokeWidth ?? 0} min={0} max={60} onChange={(strokeWidth) => set({ strokeWidth, stroke: el.stroke ?? "#ffffff" })} />
              </Row>
            </div>
          </>
        )}
        {el.type === "button" && (
          <>
            <Row label="Etichetta">
              <input className={inputCls} value={el.label} maxLength={80} onChange={(e) => set({ label: e.target.value })} />
            </Row>
            <Row label="Carattere">
              <FontSelect value={el.font ?? "sans"} onChange={(font) => set({ font })} />
            </Row>
            <GradientControls color2={el.color2} angle={el.angle} base={el.fill} onChange={(p) => set(p)} />
            <div className="grid grid-cols-3 gap-2">
              <Row label="Sfondo">
                <ColorInput value={el.fill} onChange={(fill) => set({ fill })} />
              </Row>
              <Row label="Testo">
                <ColorInput value={el.color} onChange={(color) => set({ color })} />
              </Row>
              <Row label="Dimensione">
                <Num value={el.fontSize} min={8} max={200} onChange={(fontSize) => set({ fontSize })} />
              </Row>
            </div>
          </>
        )}
        {el.type === "hotspot" && (
          <div className="grid grid-cols-2 gap-2">
            <Row label="Simbolo">
              <input className={inputCls} value={el.label} maxLength={3} onChange={(e) => set({ label: e.target.value })} />
            </Row>
            <Row label="Colore">
              <ColorInput value={el.fill} onChange={(fill) => set({ fill })} />
            </Row>
          </div>
        )}
      </Section>

      <Section title="Posizione">
        <div className="grid grid-cols-2 gap-2">
          <Row label="X">
            <Num value={el.x} onChange={(x) => set({ x })} />
          </Row>
          <Row label="Y">
            <Num value={el.y} onChange={(y) => set({ y })} />
          </Row>
          <Row label="Larghezza">
            <Num value={el.w} min={1} onChange={(w) => set({ w })} />
          </Row>
          <Row label="Altezza">
            <Num value={el.h} min={1} onChange={(h) => set({ h })} />
          </Row>
          <Row label="Rotazione (°)">
            <Num value={el.rotation} min={-360} max={360} onChange={(rotation) => set({ rotation })} />
          </Row>
          <div className="col-span-2">
            <input
              type="range"
              min={-180}
              max={180}
              value={Math.max(-180, Math.min(180, el.rotation))}
              onChange={(e) => set({ rotation: Number(e.target.value) })}
              aria-label="Rotazione"
              className="w-full accent-violet"
            />
            <div className="mt-1 flex flex-wrap gap-1">
              {[
                { label: "↺ 15°", value: el.rotation - 15 },
                { label: "↻ 15°", value: el.rotation + 15 },
                { label: "↻ 90°", value: el.rotation + 90 },
                { label: "Dritto", value: 0 },
              ].map((b) => (
                <button
                  key={b.label}
                  onClick={() => set({ rotation: ((((b.value + 180) % 360) + 360) % 360) - 180 })}
                  className="rounded-full border border-line px-2.5 py-1 text-xs font-medium hover:border-violet"
                >
                  {b.label}
                </button>
              ))}
              <button
                onClick={() => set({ flipX: !el.flipX })}
                aria-pressed={Boolean(el.flipX)}
                className="rounded-full border border-line px-2.5 py-1 text-xs font-medium hover:border-violet aria-pressed:border-violet aria-pressed:bg-violet/10"
              >
                ⇋ Specchia
              </button>
              <button
                onClick={() => set({ flipY: !el.flipY })}
                aria-pressed={Boolean(el.flipY)}
                className="rounded-full border border-line px-2.5 py-1 text-xs font-medium hover:border-violet aria-pressed:border-violet aria-pressed:bg-violet/10"
              >
                ⇵ Capovolgi
              </button>
            </div>
          </div>
          <Row label="Opacità (%)">
            <Num value={el.opacity * 100} min={0} max={100} onChange={(v) => set({ opacity: v / 100 })} />
          </Row>
        </div>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Allinea alla pagina">
          {ALIGN.map((a) => (
            <button key={a.to} onClick={() => dispatch({ type: "align", id: el.id, to: a.to })} title={a.label} aria-label={a.label} className="grid size-8 place-items-center rounded-lg border border-line text-base hover:border-violet">
              {a.icon}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs">
          {(
            [
              ["front", "In primo piano"],
              ["forward", "Avanti"],
              ["backward", "Indietro"],
              ["back", "In fondo"],
            ] as const
          ).map(([to, label]) => (
            <button key={to} onClick={() => dispatch({ type: "reorder-element", id: el.id, to })} className="rounded-full border border-line px-2.5 py-1 hover:border-violet">
              {label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="accent-violet" checked={el.locked} onChange={(e) => set({ locked: e.target.checked })} />
          Blocca posizione
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="accent-violet" checked={Boolean(el.shadow)} onChange={(e) => set({ shadow: e.target.checked })} />
          Ombra
        </label>
      </Section>

      <Section title="Animazione">
        <Row label="Ingresso">
          <select className={inputCls} value={el.animation.enter} onChange={(e) => set({ animation: { ...el.animation, enter: e.target.value as Element["animation"]["enter"] } })}>
            {ENTER_ANIMATIONS.map((a) => (
              <option key={a} value={a}>
                {ENTER_LABELS[a]}
              </option>
            ))}
          </select>
        </Row>
        <Row label="Enfasi continua">
          <select className={inputCls} value={el.animation.emphasis} onChange={(e) => set({ animation: { ...el.animation, emphasis: e.target.value as Element["animation"]["emphasis"] } })}>
            {EMPHASIS_ANIMATIONS.map((a) => (
              <option key={a} value={a}>
                {EMPHASIS_LABELS[a]}
              </option>
            ))}
          </select>
        </Row>
        <div className="grid grid-cols-2 gap-2">
          <Row label="Durata (s)">
            <Num value={el.animation.duration} min={0.1} max={10} step={0.1} onChange={(duration) => set({ animation: { ...el.animation, duration } })} />
          </Row>
          <Row label="Ritardo (s)">
            <Num value={el.animation.delay} min={0} max={30} step={0.1} onChange={(delay) => set({ animation: { ...el.animation, delay } })} />
          </Row>
        </div>
      </Section>

      <InteractionSection doc={doc} page={page} el={el} set={set} />

      <div className="flex gap-2 px-4 py-4">
        <button onClick={() => dispatch({ type: "duplicate-element", id: el.id })} className="flex-1 rounded-full border border-line py-2 text-sm font-medium hover:border-violet">
          Duplica
        </button>
        <button onClick={() => dispatch({ type: "delete-element", id: el.id })} className="flex-1 rounded-full border border-danger/40 py-2 text-sm font-medium text-danger hover:bg-danger/10">
          Elimina
        </button>
      </div>
    </div>
  );
}

type Kind = Interaction["action"]["kind"] | "none";

function InteractionSection({ doc, page, el, set }: { doc: PresentationDoc; page: Page; el: Element; set: (p: Partial<Element>) => void }) {
  const it = el.interaction;
  const kind: Kind = it?.action.kind ?? "none";
  const others = page.elements.filter((e) => e.id !== el.id);

  const choose = (k: Kind) => {
    const trigger = it?.trigger ?? "click";
    switch (k) {
      case "none":
        return set({ interaction: null });
      case "tooltip":
        return set({ interaction: { trigger: "hover", action: { kind: "tooltip", text: "Informazione aggiuntiva" } } });
      case "popup":
        return set({ interaction: { trigger, action: { kind: "popup", title: "Titolo", body: "Contenuto della finestra" } } });
      case "goto":
        return set({ interaction: { trigger: "click", action: { kind: "goto", pageId: doc.pages.find((p) => p.id !== page.id)?.id ?? page.id } } });
      case "link":
        return set({ interaction: { trigger: "click", action: { kind: "link", url: "https://" } } });
      case "reveal": {
        const target = others[0];
        if (!target) return;
        return set({ interaction: { trigger: "click", action: { kind: "reveal", targetId: target.id } } });
      }
    }
  };

  const setAction = (action: Interaction["action"]) => it && set({ interaction: { ...it, action } });

  return (
    <Section title="Interazione">
      <Row label="Quando si interagisce con l'elemento">
        <select className={inputCls} value={kind} onChange={(e) => choose(e.target.value as Kind)}>
          <option value="none">Nessuna interazione</option>
          <option value="tooltip">Mostra un suggerimento</option>
          <option value="popup">Apri una finestra</option>
          <option value="goto">Vai a un&apos;altra pagina</option>
          <option value="link">Apri un sito esterno</option>
          <option value="reveal" disabled={others.length === 0}>
            Rivela un elemento nascosto
          </option>
        </select>
      </Row>
      {it && (
        <Row label="Attivazione">
          <select className={inputCls} value={it.trigger} onChange={(e) => set({ interaction: { ...it, trigger: e.target.value as "click" | "hover" } })}>
            <option value="click">Al clic</option>
            <option value="hover">Al passaggio del mouse</option>
          </select>
        </Row>
      )}
      {it?.action.kind === "tooltip" && (
        <Row label="Testo del suggerimento">
          <textarea className={inputCls} value={it.action.text} maxLength={500} onChange={(e) => setAction({ kind: "tooltip", text: e.target.value })} />
        </Row>
      )}
      {it?.action.kind === "popup" && (
        <>
          <Row label="Titolo della finestra">
            <input className={inputCls} value={it.action.title} maxLength={120} onChange={(e) => setAction({ ...(it.action as { kind: "popup"; title: string; body: string }), title: e.target.value })} />
          </Row>
          <Row label="Contenuto">
            <textarea className={`${inputCls} min-h-24`} value={it.action.body} maxLength={4000} onChange={(e) => setAction({ ...(it.action as { kind: "popup"; title: string; body: string }), body: e.target.value })} />
          </Row>
        </>
      )}
      {it?.action.kind === "goto" && (
        <Row label="Pagina di destinazione">
          <select className={inputCls} value={it.action.pageId} onChange={(e) => setAction({ kind: "goto", pageId: e.target.value })}>
            {doc.pages.map((p, i) => (
              <option key={p.id} value={p.id}>
                {i + 1}. {p.name}
              </option>
            ))}
          </select>
        </Row>
      )}
      {it?.action.kind === "link" && (
        <Row label="Indirizzo (deve iniziare con https://)">
          <input
            className={inputCls}
            defaultValue={it.action.url}
            key={el.id}
            maxLength={2048}
            onBlur={(e) => {
              const url = e.target.value.trim();
              if (/^https:\/\/[^\s]+\.[^\s]+/.test(url)) setAction({ kind: "link", url });
            }}
          />
        </Row>
      )}
      {it?.action.kind === "reveal" && (
        <>
          <Row label="Elemento da rivelare">
            <select className={inputCls} value={it.action.targetId} onChange={(e) => setAction({ kind: "reveal", targetId: e.target.value })}>
              {others.map((o) => (
                <option key={o.id} value={o.id}>
                  {describe(o)}
                </option>
              ))}
            </select>
          </Row>
          <p className="text-xs text-ink-soft">Ricorda di nascondere l&apos;elemento di destinazione (sotto).</p>
        </>
      )}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="accent-violet" checked={el.hidden} onChange={(e) => set({ hidden: e.target.checked })} />
        Nascondi finché non viene rivelato
      </label>
    </Section>
  );
}

export function describe(el: Element) {
  switch (el.type) {
    case "text":
      return `Testo: ${el.text.slice(0, 24) || "vuoto"}`;
    case "shape":
      return SHAPE_LABELS[el.shape];
    case "image":
      return `Immagine${el.alt ? `: ${el.alt.slice(0, 20)}` : ""}`;
    case "button":
      return `Pulsante: ${el.label}`;
    case "hotspot":
      return `Hotspot ${el.label}`;
  }
}

const PATTERN_LABELS: Record<Pattern, string> = { none: "Nessuno", dots: "Puntini", grid: "Griglia", lines: "Righe oblique", stars: "Stelle", grain: "Grana della carta" };

const ZIB_ACTIONS = [
  ["riscrivi", "Riscrivi"],
  ["accorcia", "Accorcia"],
  ["semplifica", "Semplifica"],
  ["allunga", "Arricchisci"],
  ["inglese", "In inglese"],
] as const;

/** "Zib sulla pagina": rewrites the selected text with AI; Ctrl+Z brings the old one back. */
function ZibOnText({ text, context, onText }: { text: string; context: string; onText: (t: string) => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const run = async (action: string) => {
    setBusy(action);
    setMsg(null);
    try {
      const res = await fetch("/api/zib/testo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, action, context: context.slice(0, 200) }) });
      const data = (await res.json()) as { text?: string; error?: string };
      if (!res.ok || !data.text) setMsg(data.error ?? "Non è andata, riprova.");
      else onText(data.text);
    } catch {
      setMsg("Controlla la connessione e riprova.");
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="mb-3 rounded-xl bg-mist p-2.5">
      <p className="mb-1.5 text-xs font-semibold">Zib sulla pagina</p>
      <div className="flex flex-wrap gap-1.5">
        {ZIB_ACTIONS.map(([id, label]) => (
          <button key={id} disabled={Boolean(busy) || !text.trim()} onClick={() => run(id)} className={`${chip} disabled:opacity-50`}>
            {busy === id ? "Zib scrive…" : label}
          </button>
        ))}
      </div>
      {msg && (
        <p role="status" className="mt-1.5 text-xs text-ink-soft">
          {msg}
        </p>
      )}
    </div>
  );
}
