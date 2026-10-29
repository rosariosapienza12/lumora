"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

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

function PopupDemo({ accent }: { accent: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Frame accent={accent}>
      <p className="text-sm text-white/80">Le maree dipendono dalla Luna.</p>
      <button onClick={() => setOpen(true)} className={`${btn} mt-3 text-[#03252a]`} style={{ background: accent }}>
        Perché?
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className="absolute inset-0 grid place-items-center bg-black/40 p-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div
              role="dialog"
              aria-label="Finestra di esempio"
              initial={{ scale: 0.85, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="w-full rounded-xl bg-white p-3 text-[#1d1a3a]"
            >
              <p className="font-display font-bold">La forza di gravità</p>
              <p className="mt-1 text-sm text-[#5d5a7a]">La Luna attira l&apos;acqua degli oceani verso di sé.</p>
              <button autoFocus onClick={() => setOpen(false)} className={`${btn} mt-2 bg-[#1d1a3a] text-white`}>
                Chiudi
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Frame>
  );
}

function RevealDemo({ accent }: { accent: string }) {
  const [shown, setShown] = useState(false);
  return (
    <Frame accent={accent}>
      <p className="text-sm text-white/80">Quanto fa 7 × 8?</p>
      <AnimatePresence mode="wait">
        {shown ? (
          <motion.p
            key="a"
            initial={{ opacity: 0, filter: "blur(10px)", scale: 1.2 }}
            animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
            className="mt-3 font-display text-4xl font-bold"
            style={{ color: accent, textShadow: `0 0 24px ${accent}` }}
          >
            56
          </motion.p>
        ) : (
          <motion.button key="b" exit={{ opacity: 0 }} onClick={() => setShown(true)} className={`${btn} mt-3 bg-white/10 text-white hover:bg-white/20`}>
            Mostra la risposta
          </motion.button>
        )}
      </AnimatePresence>
      {shown && (
        <button onClick={() => setShown(false)} className="absolute bottom-3 right-3 text-xs text-white/60 underline">
          Nascondi
        </button>
      )}
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

function SecurityDemo({ accent }: { accent: string }) {
  const [step, setStep] = useState(0);
  const reduce = useReducedMotion();
  const code = "482913";
  useEffect(() => {
    if (step === 0 || step > code.length) return;
    const t = setTimeout(() => setStep((s) => s + 1), reduce ? 0 : 160);
    return () => clearTimeout(t);
  }, [step, reduce]);
  const done = step > code.length;
  return (
    <Frame accent={accent}>
      <p className="text-sm text-white/80">Codice dall&apos;app del telefono</p>
      <div className="mt-3 flex gap-1.5">
        {code.split("").map((d, i) => (
          <span
            key={i}
            className="grid h-10 w-8 place-items-center rounded-lg border font-mono text-lg font-bold text-white transition-colors"
            style={{ borderColor: i < step ? accent : "rgba(255,255,255,0.15)", background: i < step ? `${accent}30` : "transparent" }}
          >
            {i < step ? d : ""}
          </span>
        ))}
      </div>
      <div className="mt-3 h-8">
        {done ? (
          <motion.p initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2 text-sm font-semibold" style={{ color: accent }}>
            <span aria-hidden className="grid size-6 place-items-center rounded-full text-[#0a0f30]" style={{ background: accent }}>
              ✓
            </span>
            Accesso verificato
            <button onClick={() => setStep(0)} className="ml-2 text-xs font-normal text-white/60 underline">
              Riprova
            </button>
          </motion.p>
        ) : (
          <button onClick={() => setStep(1)} disabled={step > 0} className={`${btn} text-[#0a0f30] disabled:opacity-60`} style={{ background: accent }}>
            Verifica
          </button>
        )}
      </div>
    </Frame>
  );
}

const DEMOS: Record<string, (p: { accent: string }) => ReactNode> = {
  hotspot: HotspotDemo,
  animazioni: AnimationsDemo,
  popup: PopupDemo,
  rivela: RevealDemo,
  percorsi: PathsDemo,
  transizioni: TransitionsDemo,
  condividi: ShareDemo,
  sicurezza: SecurityDemo,
};

export function FeatureDemo({ id, accent }: { id: string; accent: string }) {
  const Demo = DEMOS[id];
  return Demo ? <Demo accent={accent} /> : null;
}
