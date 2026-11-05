"use client";

import { useEffect, useRef, useState } from "react";
import type { Element, PresentationDoc } from "@/lib/editor/schema";
import { lookOf, type Look3D } from "@/lib/three/styles";
import { Object3DView } from "@/components/slide/object3d";
import { FORM_NAMES, FORMS_3D, MATERIAL_NAMES, MATERIALS_3D, type Form3D, type Material3D } from "@/lib/three/ids";
import { buildComposition, COMPOSITIONS, type Palette3D } from "@/lib/three/compositions";

type Obj = Extract<Element, { type: "object3d" }>;

const chip = "rounded-full border border-line px-2.5 py-1 text-xs hover:border-violet aria-pressed:border-violet aria-pressed:bg-violet/10";
const tile = "grid place-items-center rounded-xl border border-line bg-mist/60 p-1 text-[10px] leading-tight text-ink-soft hover:border-violet aria-pressed:border-violet aria-pressed:bg-violet/10 aria-checked:border-violet aria-checked:bg-violet/10";

/** A stand-in element for previews (never saved). */
const preview = (o: Partial<Obj>): Obj => ({
  id: "preview",
  type: "object3d",
  x: 0,
  y: 0,
  w: 100,
  h: 100,
  rotation: 0,
  opacity: 1,
  hidden: false,
  locked: false,
  animation: { enter: "none", emphasis: "none", duration: 0.6, delay: 0 },
  interaction: null,
  form: "sfera",
  material: "vetro",
  fill: "#5b3df5",
  tiltX: -18,
  tiltY: 24,
  light: 0,
  ...o,
});

/** Drag on the big preview to turn the object; arrow keys work too. */
function TurnPad({ el, set }: { el: Obj; set: (p: Partial<Obj>) => void }) {
  const start = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const clamp = (v: number) => Math.max(-180, Math.min(180, Math.round(v)));
  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label="Ruota l'oggetto: trascina o usa le frecce"
      aria-valuenow={el.tiltY ?? 0}
      aria-valuemin={-180}
      aria-valuemax={180}
      aria-valuetext={`inclinazione ${el.tiltX ?? 0}°, rotazione ${el.tiltY ?? 0}°`}
      className="relative mx-auto aspect-square w-44 cursor-grab touch-none rounded-2xl bg-[radial-gradient(circle_at_50%_35%,#ffffff,#e4e2ee)] outline-none focus-visible:ring-2 focus-visible:ring-violet active:cursor-grabbing"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        start.current = { x: e.clientX, y: e.clientY, tx: el.tiltX ?? 0, ty: el.tiltY ?? 0 };
      }}
      onPointerMove={(e) => {
        const s = start.current;
        if (!s) return;
        set({ tiltY: clamp(s.ty + (e.clientX - s.x) * 0.8), tiltX: clamp(s.tx + (e.clientY - s.y) * 0.8) });
      }}
      onPointerUp={() => (start.current = null)}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 15 : 5;
        const moves: Record<string, Partial<Obj>> = {
          ArrowLeft: { tiltY: clamp((el.tiltY ?? 0) - step) },
          ArrowRight: { tiltY: clamp((el.tiltY ?? 0) + step) },
          ArrowUp: { tiltX: clamp((el.tiltX ?? 0) - step) },
          ArrowDown: { tiltX: clamp((el.tiltX ?? 0) + step) },
        };
        if (moves[e.key]) {
          e.preventDefault();
          set(moves[e.key]);
        }
      }}
    >
      <Object3DView el={el} />
      <span className="pointer-events-none absolute bottom-1.5 left-0 right-0 text-center text-[10px] text-ink-soft">Trascina per ruotare</span>
    </div>
  );
}

export function Object3DControls({ el, set }: { el: Obj; set: (p: Partial<Obj>) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <TurnPad el={el} set={set} />
      <div>
        <span className="mb-1 block text-xs font-medium text-ink-soft">Materiale</span>
        <div className="grid grid-cols-4 gap-1" role="radiogroup" aria-label="Materiale">
          {MATERIALS_3D.map((m) => (
            <button key={m} role="radio" aria-checked={el.material === m} onClick={() => set({ material: m })} className={tile} title={MATERIAL_NAMES[m]}>
              <span className="block aspect-square w-full">
                <Object3DView el={preview({ form: "sfera", material: m, fill: el.fill, color2: el.color2 })} />
              </span>
              {MATERIAL_NAMES[m]}
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className="mb-1 block text-xs font-medium text-ink-soft">Forma</span>
        <div className="grid grid-cols-4 gap-1" role="radiogroup" aria-label="Forma 3D">
          {FORMS_3D.map((f) => (
            <button key={f} role="radio" aria-checked={el.form === f} onClick={() => set({ form: f })} className={tile} title={FORM_NAMES[f]}>
              <span className="block aspect-square w-full">
                <Object3DView el={preview({ form: f, material: el.material, fill: el.fill, color2: el.color2 })} />
              </span>
              {FORM_NAMES[f]}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
          Colore
          <input type="color" value={el.fill} onChange={(e) => set({ fill: e.target.value })} className="h-9 w-full cursor-pointer rounded-lg border border-line bg-paper" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
          Secondo colore
          <input type="color" value={el.color2 ?? "#ffffff"} onChange={(e) => set({ color2: e.target.value })} className="h-9 w-full cursor-pointer rounded-lg border border-line bg-paper" />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
        Da dove arriva la luce
        <input type="range" min={0} max={360} step={5} value={el.light ?? 0} onChange={(e) => set({ light: Number(e.target.value) })} className="accent-violet" />
      </label>
      <div className="flex flex-wrap gap-1.5">
        <button aria-pressed={Boolean(el.spin)} onClick={() => set({ spin: !el.spin })} className={chip}>
          Gira durante la presentazione
        </button>
        <button onClick={() => set({ tiltX: -18, tiltY: 24, light: 0 })} className={chip}>
          Posa iniziale
        </button>
      </div>
      <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
        Descrizione per chi non vede
        <input value={el.alt ?? ""} maxLength={200} onChange={(e) => set({ alt: e.target.value })} placeholder="Per esempio: una sfera di vetro blu" className="w-full rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm outline-none focus:border-violet" />
      </label>
    </div>
  );
}

/** Ready-made looks for the whole presentation, plus free choice of the two materials. */
const LOOKS: { name: string; look: Look3D }[] = [
  { name: "Vetro e cristallo", look: { material: "vetro", second: "iridescente", forms: ["sfera", "gemma", "goccia"] } },
  { name: "Studio di scultura", look: { material: "marmo", second: "gesso", forms: ["torsione", "piramide", "sfera"] } },
  { name: "Gioielleria", look: { material: "metallo", second: "cromo", forms: ["anello", "gemma", "moneta"] } },
  { name: "Giocattoli", look: { material: "gomma", second: "plastica", forms: ["blob", "toro", "capsula"] } },
  { name: "Insegna al neon", look: { material: "luminoso", second: "cromo", forms: ["nodo", "anello", "toro"] } },
  { name: "Laboratorio di ceramica", look: { material: "ceramica", second: "argilla", forms: ["goccia", "cilindro", "arco"] } },
  { name: "Futuro olografico", look: { material: "iridescente", second: "vetro", forms: ["molecola", "gemma", "nodo"] } },
  { name: "Ufficio d'acciaio", look: { material: "satinato", second: "cromo", forms: ["cubo", "cilindro", "torsione"] } },
];

export function Look3DControls({ doc, onLook }: { doc: PresentationDoc; onLook: (look: Look3D) => void }) {
  const current = lookOf(doc);
  const count = doc.pages.reduce((n, p) => n + p.elements.filter((e) => e.type === "object3d").length, 0);
  const same = (a: Look3D, b: Look3D) => a.material === b.material && a.second === b.second && a.forms.join() === b.forms.join();
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-ink-soft">
        Materiali e forme degli oggetti 3D di tutta la presentazione ({count} {count === 1 ? "oggetto" : "oggetti"}). Quelli cambiati a mano restano come sono.
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {LOOKS.map((l) => (
          <button key={l.name} aria-pressed={same(current, l.look)} onClick={() => onLook(l.look)} className={`${tile} !grid-cols-[2.25rem_1fr] !place-items-start gap-1.5 text-left text-xs`} style={{ display: "grid" }}>
            <span className="block aspect-square w-9">
              <Object3DView el={preview({ form: l.look.forms[0], material: l.look.material, fill: "#7c6cf2" })} />
            </span>
            <span className="self-center">{l.name}</span>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {(["material", "second"] as const).map((k) => (
          <label key={k} className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
            {k === "material" ? "Materiale principale" : "Materiale secondario"}
            <select value={current[k]} onChange={(e) => onLook({ ...current, [k]: e.target.value as Material3D })} className="w-full rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm outline-none focus:border-violet">
              {MATERIALS_3D.map((m) => (
                <option key={m} value={m}>
                  {MATERIAL_NAMES[m]}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </div>
  );
}

/** Toolbar button "Oggetto 3D": single objects in every material, or whole compositions. */
export function Object3DMenu({ palette, onAdd }: { palette: Palette3D; onAdd: (elements: Element[]) => void }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"oggetti" | "scene">("oggetti");
  const [material, setMaterial] = useState<Material3D>(palette.main);
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

  const addOne = (form: Form3D) => {
    const [el] = buildComposition("pianeta", palette).slice(0, 1);
    onAdd([{ ...el, form, material, x: 620, y: 270, w: 360, h: 360, spin: false } as Element]);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-haspopup="true" aria-expanded={open} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium hover:bg-paper">
        <span aria-hidden className="text-violet">◆</span>
        Oggetto 3D
        <span aria-hidden className="text-xs text-ink/50">▾</span>
      </button>
      {open && (
        <div role="dialog" aria-label="Aggiungi un oggetto 3D" className="absolute left-1/2 top-full z-30 mt-2 w-[min(24rem,92vw)] -translate-x-1/2 rounded-2xl border border-line bg-paper p-3 shadow-xl">
          <div className="mb-2 inline-flex rounded-full bg-mist p-1 text-xs font-medium" role="tablist">
            {(["oggetti", "scene"] as const).map((t) => (
              <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className="rounded-full px-3 py-1 aria-selected:bg-paper aria-selected:shadow-sm">
                {t === "oggetti" ? "Oggetti" : "Composizioni"}
              </button>
            ))}
          </div>
          {tab === "oggetti" ? (
            <>
              <div className="mb-2 flex flex-wrap gap-1">
                {MATERIALS_3D.map((m) => (
                  <button key={m} aria-pressed={material === m} onClick={() => setMaterial(m)} className={chip}>
                    {MATERIAL_NAMES[m]}
                  </button>
                ))}
              </div>
              <div className="grid max-h-72 grid-cols-4 gap-1 overflow-auto">
                {FORMS_3D.map((f) => (
                  <button key={f} onClick={() => addOne(f)} className={tile} title={`Aggiungi: ${FORM_NAMES[f]}`}>
                    <span className="block aspect-square w-full">
                      <Object3DView el={preview({ form: f, material, fill: palette.accent, color2: palette.tint })} />
                    </span>
                    {FORM_NAMES[f]}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <ul className="grid max-h-80 grid-cols-2 gap-2 overflow-auto">
              {COMPOSITIONS.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => {
                      onAdd(buildComposition(c.id, palette));
                      setOpen(false);
                    }}
                    className="w-full rounded-xl border border-line p-2 text-left hover:border-violet"
                  >
                    <span className="block text-sm font-semibold">{c.name}</span>
                    <span className="block text-xs text-ink-soft">{c.hint}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
