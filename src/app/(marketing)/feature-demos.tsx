"use client";

import { useEffect, useState, type ReactNode } from "react";
import { animate, AnimatePresence, motion, useMotionValue, useReducedMotion } from "motion/react";

/** Small, working samples of each feature, shown beside its planet in the tour. */

function Frame({ children, accent }: { children: ReactNode; accent: string }) {
  return (
    <div className="relative h-40 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4" style={{ boxShadow: `inset 0 0 40px -20px ${accent}` }}>
      {children}
    </div>
  );
}

const btn = "rounded-full px-3.5 py-1.5 text-sm font-semibold transition-transform active:scale-95";

function HotspotDemo({ accent }: { accent: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Frame accent={accent}>
      <div aria-hidden className="absolute inset-0" style={{ background: "radial-gradient(70% 90% at 30% 100%, #3a2a1a, transparent), radial-gradient(60% 80% at 80% 90%, #2a1d14, transparent)" }} />
      <p className="relative text-xs text-white/60">Tocca il punto luminoso</p>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Hotspot di esempio"
        className="hotspot absolute left-[58%] top-[52%]"
        style={{ background: accent }}
      >
        +
      </button>
      <AnimatePresence>
        {open && (
          <motion.p
            role="status"
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-3 left-3 right-3 rounded-xl bg-white/90 px-3 py-2 text-sm text-[#1d1a3a]"
          >
            Un cratere di 40 km: qui è caduto un meteorite.
          </motion.p>
        )}
      </AnimatePresence>
    </Frame>
  );
}

function AnimationsDemo({ accent }: { accent: string }) {
  const [run, setRun] = useState(0);
  const reduce = useReducedMotion();
  const items = [
    { label: "Dissolvenza", from: { opacity: 0 } },
    { label: "Sale dal basso", from: { opacity: 0, y: 30 } },
    { label: "Pop", from: { opacity: 0, scale: 0.3 } },
  ];
  return (
    <Frame accent={accent}>
      <div className="flex h-full flex-col justify-between">
        <div key={run} className="flex flex-wrap gap-2">
          {items.map((it, i) => (
            <motion.span
              key={it.label}
              initial={reduce ? false : it.from}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.15 + i * 0.35, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-full px-3 py-1.5 text-sm font-semibold text-white"
              style={{ background: `${accent}55`, border: `1px solid ${accent}` }}
            >
              {it.label}
            </motion.span>
          ))}
        </div>
        <button onClick={() => setRun((r) => r + 1)} className={`${btn} self-start bg-white/10 text-white hover:bg-white/20`}>
          Riproduci
        </button>
      </div>
    </Frame>
  );
}

function PathsDemo({ accent }: { accent: string }) {
  const [choice, setChoice] = useState<"fiume" | "grotta" | null>(null);
  return (
    <Frame accent={accent}>
      <AnimatePresence mode="wait">
        {choice === null ? (
          <motion.div key="q" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <p className="text-sm text-white/80">Il sentiero si divide. Dove vai?</p>
            <div className="mt-3 flex gap-2">
              <button onClick={() => setChoice("fiume")} className={`${btn} text-[#02240f]`} style={{ background: accent }}>
                Verso il fiume
              </button>
              <button onClick={() => setChoice("grotta")} className={`${btn} bg-white/10 text-white hover:bg-white/20`}>
                Nella grotta
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div key={choice} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <p className="text-sm text-white/80">
              {choice === "fiume" ? "Trovi una barca: la pagina 4 ti aspetta." : "Al buio brillano dei cristalli: vai alla pagina 7."}
            </p>
            <button onClick={() => setChoice(null)} className={`${btn} mt-3 bg-white/10 text-white hover:bg-white/20`}>
              Torna al bivio
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </Frame>
  );
}

function TransitionsDemo({ accent }: { accent: string }) {
  const [page, setPage] = useState(0);
  const pages = ["Pagina 1", "Pagina 2", "Pagina 3"];
  return (
    <Frame accent={accent}>
      <div className="flex h-full items-center gap-4" style={{ perspective: 600 }}>
        <div className="relative h-full flex-1">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={page}
              initial={{ rotateY: 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: -90, opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 grid place-items-center rounded-xl font-display text-lg font-bold text-[#2a1a00]"
              style={{ background: `linear-gradient(135deg, ${accent}, #fff1c2)` }}
            >
              {pages[page]}
            </motion.div>
          </AnimatePresence>
        </div>
        <button onClick={() => setPage((p) => (p + 1) % pages.length)} className={`${btn} bg-white/10 text-white hover:bg-white/20`}>
          Avanti
        </button>
      </div>
    </Frame>
  );
}

function ShareDemo({ accent }: { accent: string }) {
  const [copied, setCopied] = useState(false);
  const [locked, setLocked] = useState(true);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);
  return (
    <Frame accent={accent}>
      <div className="flex items-center gap-2 rounded-xl bg-black/30 px-3 py-2 text-sm">
        <span className="min-w-0 flex-1 truncate font-mono text-white/80">lumora.app/p/k7Qm2xR9vT</span>
        <button onClick={() => setCopied(true)} className={`${btn} shrink-0 text-[#3a0a1a]`} style={{ background: accent }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={String(copied)} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="block">
              {copied ? "Copiato" : "Copia"}
            </motion.span>
          </AnimatePresence>
        </button>
      </div>
      <label className="mt-4 flex items-center gap-3 text-sm text-white/80">
        <button
          role="switch"
          aria-checked={locked}
          onClick={() => setLocked((l) => !l)}
          className="relative h-6 w-11 rounded-full transition-colors"
          style={{ background: locked ? accent : "rgba(255,255,255,0.2)" }}
        >
          <motion.span layout className="absolute top-0.5 size-5 rounded-full bg-white" style={{ left: locked ? 22 : 2 }} />
        </button>
        Protetta da password
      </label>
    </Frame>
  );
}


function TemplatesDemo({ accent }: { accent: string }) {
  const options = [
    { id: "Lezione", bg: "#1d1a3a", fg: "#ffffff", deco: accent },
    { id: "Pitch", bg: "#ffffff", fg: "#1d1a3a", deco: "#d22f4f" },
    { id: "Quiz", bg: "#f4f2ff", fg: "#1d1a3a", deco: "#5b3df5" },
  ];
  const [pick, setPick] = useState(0);
  const o = options[pick];
  return (
    <Frame accent={accent}>
      <div className="flex h-full gap-3">
        <div className="flex flex-col gap-1.5">
          {options.map((opt, i) => (
            <button
              key={opt.id}
              onClick={() => setPick(i)}
              aria-pressed={i === pick}
              className={`${btn} bg-white/10 text-left text-white hover:bg-white/20 aria-pressed:text-[#2a1a00]`}
              style={i === pick ? { background: accent } : undefined}
            >
              {opt.id}
            </button>
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={o.id}
            initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.35 }}
            className="relative flex-1 overflow-hidden rounded-xl p-3"
            style={{ background: o.bg }}
          >
            <span className="absolute -right-4 -top-4 size-16 rounded-full" style={{ background: o.deco }} />
            <p className="relative font-display text-lg font-bold" style={{ color: o.fg }}>
              {o.id}
            </p>
            <span className="relative mt-2 block h-1.5 w-2/3 rounded-full" style={{ background: o.fg, opacity: 0.25 }} />
            <span className="relative mt-1.5 block h-1.5 w-1/2 rounded-full" style={{ background: o.fg, opacity: 0.25 }} />
          </motion.div>
        </AnimatePresence>
      </div>
    </Frame>
  );
}

function LayoutDemo({ accent }: { accent: string }) {
  const x = useMotionValue(70);
  const [centered, setCentered] = useState(false);
  return (
    <Frame accent={accent}>
      <p className="relative text-xs text-white/60">Trascina il riquadro verso il centro</p>
      <div className="absolute inset-x-4 bottom-4 top-9">
        <span aria-hidden className="absolute inset-y-0 left-1/2 w-px transition-opacity" style={{ background: accent, opacity: centered ? 1 : 0.15 }} />
        <motion.div
          drag
          dragMomentum={false}
          dragConstraints={{ left: -120, right: 120, top: -30, bottom: 30 }}
          onDrag={() => setCentered(Math.abs(x.get()) < 14)}
          onDragEnd={() => {
            // Snap to the guide, like the editor does.
            if (Math.abs(x.get()) < 14) animate(x, 0, { type: "spring", stiffness: 500, damping: 30 });
          }}
          whileDrag={{ scale: 1.05 }}
          className="absolute left-1/2 top-1/2 -ml-10 -mt-6 grid h-12 w-20 cursor-grab place-items-center rounded-lg text-xs font-semibold text-white active:cursor-grabbing"
          style={{ x, background: `${accent}aa`, border: `1px solid ${accent}` }}
        >
          {centered ? "Centrato" : "Titolo"}
        </motion.div>
      </div>
    </Frame>
  );
}

function ContentDemo({ accent }: { accent: string }) {
  const [style, setStyle] = useState({ italic: false, shadow: false, border: false, color: false });
  const toggle = (k: keyof typeof style) => setStyle((s) => ({ ...s, [k]: !s[k] }));
  return (
    <Frame accent={accent}>
      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ["italic", "Corsivo"],
            ["shadow", "Ombra"],
            ["border", "Cornice"],
            ["color", "Colore"],
          ] as const
        ).map(([k, label]) => (
          <button key={k} onClick={() => toggle(k)} aria-pressed={style[k]} className={`${btn} bg-white/10 px-3 py-1 text-xs text-white aria-pressed:text-[#3a0a1a]`} style={style[k] ? { background: accent } : undefined}>
            {label}
          </button>
        ))}
      </div>
      <motion.p
        layout
        className="mt-4 inline-block rounded-lg px-3 py-1.5 font-display text-2xl font-bold"
        style={{
          fontStyle: style.italic ? "italic" : "normal",
          color: style.color ? accent : "#ffffff",
          textShadow: style.shadow ? `0 6px 18px ${accent}` : "none",
          outline: style.border ? `2px solid ${accent}` : "2px solid transparent",
        }}
      >
        Il mio titolo
      </motion.p>
    </Frame>
  );
}

const DEMOS: Record<string, (p: { accent: string }) => ReactNode> = {
  modelli: TemplatesDemo,
  layout: LayoutDemo,
  contenuti: ContentDemo,
  animazioni: AnimationsDemo,
  transizioni: TransitionsDemo,
  interattivita: HotspotDemo,
  percorsi: PathsDemo,
  condividi: ShareDemo,
};

export function FeatureDemo({ id, accent }: { id: string; accent: string }) {
  const Demo = DEMOS[id];
  return Demo ? <Demo accent={accent} /> : null;
}
