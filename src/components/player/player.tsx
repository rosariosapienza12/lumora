"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { AnimatePresence, motion, MotionConfig, useReducedMotion } from "motion/react";
import type { Element, PresentationDoc } from "@/lib/editor/schema";
import { ElementBody, elementBox } from "@/components/slide/element-view";
import { FitStage } from "@/components/slide/fit-stage";
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
}: {
  doc: PresentationDoc;
  startIndex?: number;
  onClose?: () => void;
  /** Arrow/space navigation on the whole window. Off when embedded in a scrolling page. */
  globalKeys?: boolean;
}) {
  const [[index, direction], setPage] = useState<[number, number]>([Math.min(startIndex, doc.pages.length - 1), 1]);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [popup, setPopup] = useState<Popup | null>(null);
  const [tooltip, setTooltip] = useState<{ id: string; text: string } | null>(null);
  // External links are confirmed first, showing the real destination domain.
  const [pendingLink, setPendingLink] = useState<URL | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const page = doc.pages[index];

  const go = useCallback(
    (to: number) => {
      if (to < 0 || to >= doc.pages.length || to === index) return;
      setPage([to, to > index ? 1 : -1]);
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
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") go(index + 1);
      else if (e.key === "ArrowLeft" || e.key === "PageUp") go(index - 1);
      else if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [globalKeys, go, index, onClose, popup, pendingLink]);

  const fullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else rootRef.current?.requestFullscreen?.();
  };

  const variants = pageVariants[page.transition];

  return (
    <MotionConfig reducedMotion="user">
      <div ref={rootRef} className="relative flex h-full w-full flex-col bg-[#0f0d22]">
        <div className="relative flex-1" style={{ perspective: 1600 }}>
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
              <FitStage background={page.background} contain>
                {page.elements.map((el) => {
                  if (el.hidden && !revealed.has(el.id)) return null;
                  return <PlayerElement key={el.id} el={el} onRun={run} tooltip={tooltip?.id === el.id ? tooltip.text : null} setTooltip={setTooltip} />;
                })}
              </FitStage>
            </motion.div>
          </AnimatePresence>

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

        <div className="flex items-center gap-2 px-4 py-2 text-sm text-white/80">
          <button onClick={() => go(index - 1)} disabled={index === 0} className="rounded-full px-3 py-1.5 hover:bg-white/10 disabled:opacity-30" aria-label="Pagina precedente">
            ←
          </button>
          <span aria-live="polite">
            {index + 1} / {doc.pages.length}
          </span>
          <button onClick={() => go(index + 1)} disabled={index === doc.pages.length - 1} className="rounded-full px-3 py-1.5 hover:bg-white/10 disabled:opacity-30" aria-label="Pagina successiva">
            →
          </button>
          <div className="ml-auto flex gap-1">
            <button onClick={fullscreen} className="rounded-full px-3 py-1.5 hover:bg-white/10">
              Schermo intero
            </button>
            {onClose && (
              <button onClick={onClose} className="rounded-full px-3 py-1.5 hover:bg-white/10">
                Chiudi anteprima
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
  onRun,
  tooltip,
  setTooltip,
}: {
  el: Element;
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
      style={{ ...elementBox(el), cursor: interactive ? "pointer" : undefined, opacity: undefined }}
      initial={enterFrom[el.animation.enter]}
      animate={{ ...enterTo, opacity: el.opacity }}
      transition={{ duration: el.animation.duration, delay: el.animation.delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={interactive ? { scale: 1.04 } : undefined}
      whileTap={interactive ? { scale: 0.97 } : undefined}
      {...handlers}
    >
      <motion.div className="h-full w-full" animate={emphasisLoop[el.animation.emphasis]}>
        <ElementBody el={el} />
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
