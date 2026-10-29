"use client";

import type { ReactNode } from "react";
import type { Element, Interaction, Page, PresentationDoc } from "@/lib/editor/schema";
import { EMPHASIS_ANIMATIONS, ENTER_ANIMATIONS, TRANSITIONS } from "@/lib/editor/schema";
import type { Action } from "./store";

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

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input type="color" className="h-9 w-full cursor-pointer rounded-lg border border-line bg-paper" value={value} onChange={(e) => onChange(e.target.value)} />;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-b border-line px-4 py-4">
      <h3 className="font-display text-sm font-semibold text-ink">{title}</h3>
      {children}
    </section>
  );
}

export function Inspector({ doc, page, el, dispatch }: { doc: PresentationDoc; page: Page; el: Element | null; dispatch: (a: Action) => void }) {
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
          <Row label="Transizione d'ingresso">
            <select className={inputCls} value={page.transition} onChange={(e) => dispatch({ type: "update-page", patch: { transition: e.target.value as Page["transition"] } })}>
              {TRANSITIONS.map((t) => (
                <option key={t} value={t}>
                  {TRANSITION_LABELS[t]}
                </option>
              ))}
            </select>
          </Row>
        </Section>
        <p className="px-4 py-4 text-sm text-ink-soft">Seleziona un elemento sulla pagina per modificarne aspetto, animazioni e interazioni.</p>
      </div>
    );
  }

  const set = (patch: Partial<Element>) => dispatch({ type: "update-element", id: el.id, patch });

  return (
    <div>
      <Section title="Contenuto">
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
                <select className={inputCls} value={el.font} onChange={(e) => set({ font: e.target.value as "sans" | "display" })}>
                  <option value="display">Titolo</option>
                  <option value="sans">Testo</option>
                </select>
              </Row>
              <Row label="Spessore">
                <select className={inputCls} value={el.weight} onChange={(e) => set({ weight: e.target.value as "400" | "600" | "800" })}>
                  <option value="400">Normale</option>
                  <option value="600">Semi-grassetto</option>
                  <option value="800">Grassetto</option>
                </select>
              </Row>
            </div>
            <Row label="Allineamento">
              <select className={inputCls} value={el.align} onChange={(e) => set({ align: e.target.value as "left" | "center" | "right" })}>
                <option value="left">Sinistra</option>
                <option value="center">Centro</option>
                <option value="right">Destra</option>
              </select>
            </Row>
          </>
        )}
        {el.type === "shape" && (
          <div className="grid grid-cols-2 gap-2">
            <Row label="Forma">
              <select className={inputCls} value={el.shape} onChange={(e) => set({ shape: e.target.value as "rect" | "ellipse" })}>
                <option value="rect">Rettangolo</option>
                <option value="ellipse">Ellisse</option>
              </select>
            </Row>
            <Row label="Colore">
              <ColorInput value={el.fill} onChange={(fill) => set({ fill })} />
            </Row>
            {el.shape === "rect" && (
              <Row label="Angoli">
                <Num value={el.radius} min={0} max={800} onChange={(radius) => set({ radius })} />
              </Row>
            )}
          </div>
        )}
        {el.type === "image" && (
          <>
            <Row label="Indirizzo immagine (https)">
              <input className={inputCls} defaultValue={el.src} key={el.id} maxLength={2048} onBlur={(e) => /^https:\/\//.test(e.target.value) && set({ src: e.target.value })} />
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
            </div>
          </>
        )}
        {el.type === "button" && (
          <>
            <Row label="Etichetta">
              <input className={inputCls} value={el.label} maxLength={80} onChange={(e) => set({ label: e.target.value })} />
            </Row>
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
          <Row label="Opacità (%)">
            <Num value={el.opacity * 100} min={0} max={100} onChange={(v) => set({ opacity: v / 100 })} />
          </Row>
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
      return el.shape === "ellipse" ? "Ellisse" : "Rettangolo";
    case "image":
      return `Immagine${el.alt ? `: ${el.alt.slice(0, 20)}` : ""}`;
    case "button":
      return `Pulsante: ${el.label}`;
    case "hotspot":
      return `Hotspot ${el.label}`;
  }
}
