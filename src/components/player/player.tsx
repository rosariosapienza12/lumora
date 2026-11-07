"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { AnimatePresence, motion, MotionConfig, useReducedMotion } from "motion/react";
import type { Element, PresentationDoc } from "@/lib/editor/schema";
import { ElementBody, elementBox, pageBackground, SHADOW } from "@/components/slide/element-view";
import { FitStage } from "@/components/slide/fit-stage";
import { buildSteps, morphMatches } from "@/lib/editor/effects";
import { emphasisLoop, enterFrom, enterTo, pageVariants } from "./motion-presets";

type Popup = { title: string; body: string };

/** Parsed https URL, or null: re-checked here even though the schema already enforces it. */
function safeUrl(url: string) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" ? u : null;
  } catch {
    return null;
  }
}

export function Player({
  doc,
  startIndex = 0,
  onClose,
  globalKeys = true,
  presenter = false,
}: {
  doc: PresentationDoc;
  startIndex?: number;
  onClose?: () => void;
  /** Arrow/space navigation on the whole window. Off when embedded in a scrolling page. */
  globalKeys?: boolean;
  /** Presenter mode: speaker notes, next page and a timer (only for the author, never in public views). */
  presenter?: boolean;
}) {
  // The page shown, the direction of travel and the page we came from (for the Morph transition).
  const [[index, direction, from], setPage] = useState<[number, number, number | null]>([Math.min(startIndex, doc.pages.length - 1), 1, null]);
  /** "One at a time" pages: how many blocks are shown. */
  const [step, setStep] = useState(0);
  /** Laser pointer or spotlight that follows the mouse while presenting (keys L and S). */
  const [pointer, setPointer] = useState<"none" | "laser" | "spot">("none");
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [popup, setPopup] = useState<Popup | null>(null);
  const [tooltip, setTooltip] = useState<{ id: string; text: string } | null>(null);
  // External links are confirmed first, showing the real destination domain.
  const [pendingLink, setPendingLink] = useState<URL | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const page = doc.pages[index];
  const [showNotes, setShowNotes] = useState(presenter);
  const [elapsed, setElapsed] = useState(0);
  const autoAdvance = doc.settings?.autoAdvance ?? 0;

  useEffect(() => {
    if (!presenter) return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [presenter]);

  const go = useCallback(
    (to: number) => {
      if (to < 0 || to >= doc.pages.length || to === index) return;
      setPage([to, to > index ? 1 : -1, index]);
      // Going back lands on a page fully built; going forward starts it from the first block.
      setStep(to > index ? 0 : Number.MAX_SAFE_INTEGER);
      setRevealed(new Set());
      setPopup(null);
      setTooltip(null);
    },
    [doc.pages.length, index],
  );

  const run = useCallback(
    (el: Element) => {
      const a = el.interaction?.action;
      if (!a) return;
      switch (a.kind) {
        case "popup":
          setPopup({ title: a.title, body: a.body });
          break;
        case "tooltip":
          setTooltip((t) => (t?.id === el.id ? null : { id: el.id, text: a.text }));
          break;
        case "goto":
          go(doc.pages.findIndex((p) => p.id === a.pageId));
          break;
        case "link":
          setPendingLink(safeUrl(a.url));
          break;
        case "reveal":
          setRevealed((s) => new Set(s).add(a.targetId));
          break;
      }
    },
    [doc.pages, go],
  );

  // "One at a time": the page's blocks, and which are visible now.
  const steps = useMemo(() => (page.build ? buildSteps(page) : null), [page]);
  const shownStep = steps ? Math.min(step, steps.length - 1) : 0;
  const visible = useMemo(() => (steps ? new Set(steps.slice(0, shownStep + 1).flat()) : null), [steps, shownStep]);
  const next = useCallback(() => {
    if (steps && shownStep < steps.length - 1) setStep(shownStep + 1);
    else go(index + 1);
  }, [steps, shownStep, go, index]);
  const prev = useCallback(() => {
    if (steps && shownStep > 0) setStep(shownStep - 1);
    else go(index - 1);
  }, [steps, shownStep, go, index]);
  const morph = useMemo(() => (page.transition === "morph" && from !== null && doc.pages[from] ? morphMatches(doc.pages[from], page) : null), [page, from, doc.pages]);

  // Auto-advance, paused while a window or a link confirmation is open.
  useEffect(() => {
    if (!autoAdvance || popup || pendingLink || index >= doc.pages.length - 1) return;
    const t = setTimeout(() => go(index + 1), autoAdvance * 1000);
    return () => clearTimeout(t);
  }, [autoAdvance, popup, pendingLink, index, doc.pages.length, go]);

  useEffect(() => {
    if (!globalKeys) return;
    const onKey = (e: KeyboardEvent) => {
      if (popup || pendingLink) {
        if (e.key === "Escape") {
          setPopup(null);
          setPendingLink(null);
        }
        return;
      }
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") next();
      else if (e.key === "ArrowLeft" || e.key === "PageUp") prev();
      else if (e.key === "Escape") {
        if (pointer !== "none") setPointer("none");
        else onClose?.();
      }
      else if (presenter && e.key.toLowerCase() === "n") setShowNotes((v) => !v);
      else if (e.key.toLowerCase() === "l") setPointer((m) => (m === "laser" ? "none" : "laser"));
      else if (e.key.toLowerCase() === "s") setPointer((m) => (m === "spot" ? "none" : "spot"));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [globalKeys, next, prev, onClose, popup, pendingLink, presenter, pointer]);

  const fullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else rootRef.current?.requestFullscreen?.();
  };

  const variants = pageVariants[page.transition];

  return (
    <MotionConfig reducedMotion="user">
      <div ref={rootRef} className="relative flex h-full w-full flex-col bg-[#0f0d22]">
        <div
          className="relative flex-1"
          style={{ perspective: 1600, cursor: pointer !== "none" ? "none" : undefined }}
          onPointerMove={(e) => {
            if (pointer === "none") return;
            const r = e.currentTarget.getBoundingClientRect();
            setPos({ x: e.clientX - r.left, y: e.clientY - r.top });
          }}
          onPointerLeave={() => setPos(null)}
        >
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={page.id}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: reduce ? 0 : 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0"
            >
              <FitStage background={pageBackground(page)} contain>
                {page.elements.map((el) => {
                  if (el.hidden && !revealed.has(el.id)) return null;
                  if (visible && !visible.has(el.id)) return null;
                  return <PlayerElement key={el.id} el={el} morphFrom={reduce ? undefined : morph?.get(el.id)} onRun={run} tooltip={tooltip?.id === el.id ? tooltip.text : null} setTooltip={setTooltip} />;
                })}
              </FitStage>
            </motion.div>
          </AnimatePresence>

          {/* Laser pointer and spotlight, to point at things while speaking. */}
          {pointer === "laser" && pos && (
            <div aria-hidden className="pointer-events-none absolute z-20 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ff3b3b]" style={{ left: pos.x, top: pos.y, boxShadow: "0 0 12px 5px rgba(255,59,59,0.7), 0 0 30px 12px rgba(255,59,59,0.35)" }} />
          )}
          {pointer === "spot" && pos && (
            <div aria-hidden className="pointer-events-none absolute inset-0 z-20" style={{ background: `radial-gradient(circle 170px at ${pos.x}px ${pos.y}px, transparent 0 96%, rgba(0,0,0,0.78) 100%)` }} />
          )}

          <AnimatePresence>
            {pendingLink && (
              <motion.div
                className="absolute inset-0 z-30 grid place-items-center bg-black/50 p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setPendingLink(null)}
              >
                <motion.div
                  role="alertdialog"
                  aria-modal="true"
                  aria-labelledby="link-title"
                  initial={{ scale: 0.92, y: 16 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  className="w-full max-w-sm rounded-3xl bg-paper p-6 text-ink shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h2 id="link-title" className="font-display text-xl font-bold">
                    Stai per lasciare la presentazione
                  </h2>
                  <p className="mt-2 text-sm text-ink-soft">Il link apre un sito esterno in una nuova scheda:</p>
                  <p className="mt-2 break-all rounded-xl bg-mist px-3 py-2 font-semibold">{pendingLink.hostname}</p>
                  <div className="mt-5 flex gap-2">
                    <button
                      autoFocus
                      onClick={() => {
                        window.open(pendingLink.href, "_blank", "noopener,noreferrer");
                        setPendingLink(null);
                      }}
                      className="rounded-full bg-violet px-5 py-2 text-sm font-semibold text-white"
                    >
                      Apri il sito
                    </button>
                    <button onClick={() => setPendingLink(null)} className="rounded-full px-5 py-2 text-sm font-semibold hover:bg-mist">
                      Annulla
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {popup && (
              <motion.div
                className="absolute inset-0 z-20 grid place-items-center bg-black/50 p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setPopup(null)}
              >
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="popup-title"
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  className="max-h-[80%] w-full max-w-lg overflow-auto rounded-3xl bg-paper p-6 text-ink shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h2 id="popup-title" className="font-display text-2xl font-bold">
                    {popup.title}
                  </h2>
                  <p className="mt-3 whitespace-pre-wrap text-ink-soft">{popup.body}</p>
                  <button autoFocus onClick={() => setPopup(null)} className="mt-5 rounded-full bg-violet px-5 py-2 text-sm font-semibold text-white">
                    Chiudi
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {autoAdvance > 0 && index < doc.pages.length - 1 && !popup && !pendingLink && (
          <div aria-hidden className="h-0.5 bg-white/10">
            <motion.div
              key={index}
              className="h-full bg-[#ffb547]"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: autoAdvance, ease: "linear" }}
            />
          </div>
        )}

        {presenter && showNotes && (
          <div className="grid gap-4 border-t border-white/10 bg-[#15122f] px-5 py-3 text-sm text-white/85 sm:grid-cols-[1fr_auto]">
            <div className="max-h-32 overflow-auto whitespace-pre-wrap">
              <p className="mb-1 text-xs font-medium text-white/50">Note del relatore</p>
              {page.notes?.trim() ? page.notes : <span className="text-white/40">Nessuna nota per questa pagina.</span>}
            </div>
            <div className="text-right text-xs text-white/60">
              <p className="font-mono text-2xl text-white">
                {String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")}
              </p>
              <p>{index < doc.pages.length - 1 ? `Prossima: ${doc.pages[index + 1].name}` : "Ultima pagina"}</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 px-4 py-2 text-sm text-white/80">
          <button onClick={prev} disabled={index === 0 && shownStep === 0} className="rounded-full px-3 py-1.5 hover:bg-white/10 disabled:opacity-30" aria-label="Indietro">
            ←
          </button>
          <span aria-live="polite">
            {index + 1} / {doc.pages.length}
          </span>
          <button onClick={next} disabled={index === doc.pages.length - 1 && (!steps || shownStep >= steps.length - 1)} className="rounded-full px-3 py-1.5 hover:bg-white/10 disabled:opacity-30" aria-label="Avanti">
            →
          </button>
          <div className="ml-auto flex gap-1">
            <button onClick={() => setPointer((m) => (m === "laser" ? "none" : "laser"))} aria-pressed={pointer === "laser"} className="rounded-full px-3 py-1.5 hover:bg-white/10 aria-pressed:bg-white/10" title="Puntatore laser (L)">
              Laser
            </button>
            <button onClick={() => setPointer((m) => (m === "spot" ? "none" : "spot"))} aria-pressed={pointer === "spot"} className="rounded-full px-3 py-1.5 hover:bg-white/10 aria-pressed:bg-white/10" title="Riflettore (S)">
              Riflettore
            </button>
            {presenter && (
              <button onClick={() => setShowNotes((v) => !v)} aria-pressed={showNotes} className="rounded-full px-3 py-1.5 hover:bg-white/10 aria-pressed:bg-white/10" title="Mostra o nascondi le note (N)">
                Note
              </button>
            )}
            <button onClick={fullscreen} className="rounded-full px-3 py-1.5 hover:bg-white/10">
              Schermo intero
            </button>
            {onClose && (
              <button onClick={onClose} className="rounded-full px-3 py-1.5 hover:bg-white/10">
                Esci
              </button>
            )}
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}

function PlayerElement({
  el,
  morphFrom,
  onRun,
  tooltip,
  setTooltip,
}: {
  el: Element;
  /** Morph: where this element was on the previous page; it glides from there. */
  morphFrom?: { x: number; y: number; w: number; h: number; rotation: number };
  onRun: (el: Element) => void;
  tooltip: string | null;
  setTooltip: (t: { id: string; text: string } | null) => void;
}) {
  const it = el.interaction;
  const interactive = Boolean(it);
  const hoverTooltip = it?.trigger === "hover" && it.action.kind === "tooltip" ? it.action.text : null;

  const handlers = interactive
    ? {
        role: it!.action.kind === "link" ? "link" : "button",
        tabIndex: 0,
        "aria-label": ariaFor(el),
        onClick: () => (it!.trigger === "click" || !hoverTooltip ? onRun(el) : undefined),
        onKeyDown: (e: ReactKeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onRun(el);
          }
        },
        onMouseEnter: hoverTooltip ? () => setTooltip({ id: el.id, text: hoverTooltip }) : it!.trigger === "hover" ? () => onRun(el) : undefined,
        onMouseLeave: hoverTooltip ? () => setTooltip(null) : undefined,
        onFocus: hoverTooltip ? () => setTooltip({ id: el.id, text: hoverTooltip }) : undefined,
        onBlur: hoverTooltip ? () => setTooltip(null) : undefined,
      }
    : {};

  return (
    <motion.div
      style={{ ...elementBox(el), cursor: interactive ? "pointer" : undefined, opacity: undefined, ...(morphFrom ? { transformOrigin: "0 0" } : {}) }}
      initial={
        morphFrom
          ? { x: morphFrom.x - el.x, y: morphFrom.y - el.y, scaleX: morphFrom.w / el.w, scaleY: morphFrom.h / el.h, rotate: morphFrom.rotation, opacity: el.opacity }
          : enterFrom[el.animation.enter]
      }
      animate={morphFrom ? { x: 0, y: 0, scaleX: 1, scaleY: 1, rotate: el.rotation, opacity: el.opacity } : { ...enterTo, opacity: el.opacity }}
      transition={morphFrom ? { duration: 0.75, ease: [0.65, 0, 0.35, 1] } : { duration: el.animation.duration, delay: el.animation.delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={interactive ? { scale: 1.04 } : undefined}
      whileTap={interactive ? { scale: 0.97 } : undefined}
      {...handlers}
    >
      {/* The outer filter animates the entrance blur, so the shadow lives on the inner layer. */}
      <motion.div className="h-full w-full" style={{ filter: el.shadow ? SHADOW : undefined }} animate={emphasisLoop[el.animation.emphasis]}>
        <ElementBody el={el} live />
      </motion.div>
      <AnimatePresence>
        {tooltip && (
          <motion.div
            role="tooltip"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute left-1/2 z-10 w-max max-w-[600px] -translate-x-1/2 whitespace-pre-wrap rounded-2xl bg-ink px-5 py-3 text-[26px] text-mist shadow-xl"
            style={{ bottom: "calc(100% + 16px)" }}
          >
            {tooltip}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ariaFor(el: Element) {
  const a = el.interaction?.action;
  const label = el.type === "text" ? el.text.slice(0, 60) : el.type === "button" ? el.label : el.type === "image" ? el.alt : "Elemento interattivo";
  switch (a?.kind) {
    case "popup":
      return `${label}: apri ${a.title}`;
    case "link":
      return `${label}: apre un sito esterno`;
    case "goto":
      return `${label}: vai a un'altra pagina`;
    default:
      return label;
  }
}
