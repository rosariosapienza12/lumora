"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AlienShip } from "./alien";
import { parseDeck, serializeDeck } from "@/lib/editor/deck";

type Message = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Come creo la mia prima presentazione?",
  "Fammi una presentazione sul sistema solare",
  "Come aggiungo un quiz?",
  "Quali scorciatoie da tastiera ci sono?",
];
/** Where action buttons may lead: the same list the server prompt allows. */
const ACTION_PATH = /^\/(dashboard|impostazioni|registrati|accedi|password-dimenticata|#viaggio|#sicurezza|crea\/(modelli|layout|contenuti|animazioni|transizioni|interattivita|percorsi|condividi))$/;

/**
 * Splits an answer into text, action buttons and suggested questions:
 * [[crea|outline]] becomes "Crea questa presentazione" (validated outline only),
 * [[path|label]] a link to an allowed page, {{question}} a follow-up chip.
 */
function parseAnswer(content: string) {
  const actions: { href: string; label: string; primary?: boolean }[] = [];
  const suggestions: string[] = [];
  const text = content
    .replace(/\[\[crea\|([^\]]+)\]\]/g, (_, raw: string) => {
      const spec = parseDeck(raw.trim());
      if (spec) actions.unshift({ href: `/nuova?d=${encodeURIComponent(serializeDeck(spec))}`, label: "Crea questa presentazione", primary: true });
      return "";
    })
    .replace(/\{\{([^{}]{2,90})\}\}/g, (_, q: string) => {
      if (suggestions.length < 3) suggestions.push(q.trim());
      return "";
    })
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, (_, href: string, label: string) => {
      if (ACTION_PATH.test(href.trim()) && actions.length < 3) actions.push({ href: href.trim(), label: label.trim().slice(0, 40) });
      return "";
    })
    // Hide a half-streamed button or suggestion until it is complete.
    .replace(/\[\[[^\]]*$/, "")
    .replace(/\{\{[^}]*$/, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { text, actions: actions.slice(0, 4), suggestions };
}
const GREETING = "Ciao, sono Zib! 👽 Ti accompagno tra i pianeti di Lumora. Chiedimi come creare, animare o condividere una presentazione, o qualsiasi altra cosa.";
const STORAGE_KEY = "lumora-zib";

/**
 * Floating assistant: Zib's saucer hovers in the corner; clicking it opens a
 * chat that streams answers from /api/assistente. The conversation lives in
 * sessionStorage, so it survives page changes but not the browser closing.
 */
function loadConversation(): Message[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "[]") as unknown;
    return Array.isArray(saved) ? saved.filter((m): m is Message => (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string") : [];
  } catch {
    return [];
  }
}

/** Where the user dragged Zib, as an offset from its corner. Remembered in this browser only. */
const POSITION_KEY = "lumora-zib-position";
/** Movement (px) after which a press becomes a drag instead of a tap. */
const DRAG_THRESHOLD = 6;
const EDGE = 8;

type Offset = { x: number; y: number };

function readOffset(): Offset {
  try {
    const saved = JSON.parse(localStorage.getItem(POSITION_KEY) ?? "null") as unknown;
    if (saved && typeof saved === "object" && Number.isFinite((saved as Offset).x) && Number.isFinite((saved as Offset).y)) {
      return { x: (saved as Offset).x, y: (saved as Offset).y };
    }
  } catch {
    // Private mode or blocked storage: Zib simply starts in its corner.
  }
  return { x: 0, y: 0 };
}

/**
 * Lets the launcher be dragged anywhere on screen with a finger or the mouse, clamped to the
 * viewport. A short press is still a tap (opens the chat); a press that moves is a drag.
 */
function useDraggable(onDragStart: () => void) {
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ id: number; startX: number; startY: number; from: Offset; rect: DOMRect; moved: boolean } | null>(null);
  /** True right after a drag, so the click that ends it does not toggle the chat. */
  const justDragged = useRef(false);

  /** Keeps the whole launcher on screen. */
  const clamp = (next: Offset, rect: DOMRect, from: Offset): Offset => {
    // rect was measured at `from`; work out where the launcher would be at `next`.
    const left = rect.left + (next.x - from.x);
    const top = rect.top + (next.y - from.y);
    const maxLeft = window.innerWidth - rect.width - EDGE;
    const maxTop = window.innerHeight - rect.height - EDGE;
    return {
      x: next.x + (Math.min(Math.max(left, EDGE), maxLeft) - left),
      y: next.y + (Math.min(Math.max(top, EDGE), maxTop) - top),
    };
  };

  // Restore the saved spot, and keep Zib on screen when the window shrinks or the phone rotates.
  useEffect(() => {
    const fit = () =>
      setOffset((current) => {
        const rect = ref.current?.getBoundingClientRect();
        return rect ? clamp(current, rect, current) : current;
      });
    // After the first paint (the server cannot read localStorage): move Zib to its saved spot,
    // measured from the corner where it was just drawn.
    const frame = requestAnimationFrame(() =>
      setOffset((current) => {
        const rect = ref.current?.getBoundingClientRect();
        const saved = readOffset();
        return rect ? clamp(saved, rect, current) : saved;
      }),
    );
    window.addEventListener("resize", fit);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", fit);
    };
  }, []);

  const handlers = {
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0) return;
      // Capture at once: a fast first movement can leave the launcher before it counts as a drag.
      // The click still fires on release, because press and release both land on the launcher.
      e.currentTarget.setPointerCapture(e.pointerId);
      drag.current = { id: e.pointerId, startX: e.clientX, startY: e.clientY, from: offset, rect: e.currentTarget.getBoundingClientRect(), moved: false };
    },
    onPointerMove: (e: React.PointerEvent<HTMLButtonElement>) => {
      const d = drag.current;
      if (!d || d.id !== e.pointerId) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      if (!d.moved) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        d.moved = true;
        setDragging(true);
        onDragStart();
      }
      setOffset(clamp({ x: d.from.x + dx, y: d.from.y + dy }, d.rect, d.from));
    },
    onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => {
      const d = drag.current;
      drag.current = null;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
      if (!d?.moved) return;
      setDragging(false);
      justDragged.current = true;
      setOffset((final) => {
        try {
          localStorage.setItem(POSITION_KEY, JSON.stringify(final));
        } catch {
          // Not saved: Zib goes back to its corner on the next visit.
        }
        return final;
      });
    },
    onPointerCancel: () => {
      drag.current = null;
      setDragging(false);
    },
  };

  /** Call at the start of the click handler: true if this click only ended a drag. */
  const consumeDrag = () => {
    const was = justDragged.current;
    justDragged.current = false;
    return was;
  };

  return { ref, offset, dragging, handlers, consumeDrag };
}

export function Assistant() {
  const [open, setOpen] = useState(false);
  // The panel starts closed, so reading storage here cannot cause a hydration mismatch.
  const [messages, setMessages] = useState<Message[]>(loadConversation);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const reduce = useReducedMotion();
  const pathname = usePathname();

  // Greet visitors who have not chatted yet with a small bubble.
  useEffect(() => {
    if (loadConversation().length) return;
    const show = setTimeout(() => setHint(true), 2500);
    const hide = setTimeout(() => setHint(false), 9500);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-16)));
    } catch {}
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [messages, reduce]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const send = async (text: string) => {
    const question = text.trim().slice(0, 1200);
    if (!question || busy) return;
    const history: Message[] = [...messages, { role: "user", content: question }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    const controller = new AbortController();
    abortRef.current = controller;
    const append = (chunk: string) =>
      setMessages((m) => {
        const next = m.slice();
        const last = next[next.length - 1];
        next[next.length - 1] = { ...last, content: last.content + chunk };
        return next;
      });
    try {
      const res = await fetch("/api/assistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Only the recent turns: enough context, small requests.
        body: JSON.stringify({ page: pathname.slice(0, 80), messages: history.slice(-12).filter((m) => m.content) }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        append(data?.error ?? "Non riesco a rispondere adesso. Riprova tra poco.");
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        append(decoder.decode(value, { stream: true }));
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) append("La navicella ha perso il segnale. Controlla la connessione e riprova.");
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  };

  const reset = () => {
    abortRef.current?.abort();
    setMessages([]);
  };

  const { ref: launcherRef, offset, dragging, handlers, consumeDrag } = useDraggable(() => setHint(false));
  // While the chat is open Zib sits in its corner, so the panel above it always fits on screen.
  const shift = open ? { x: 0, y: 0 } : offset;

  return (
    <div
      className="fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-3 sm:bottom-6 sm:right-6"
      // Follows the finger exactly while dragging; glides when going to or from the corner.
      style={{ transform: `translate(${shift.x}px, ${shift.y}px)`, transition: dragging || reduce ? "none" : "transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)" }}
    >
      <AnimatePresence>
        {open && (
          <motion.section
            role="dialog"
            aria-label="Zib, l'assistente di Lumora"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            style={{ transformOrigin: "bottom right" }}
            className="zib-panel zib-stars flex h-[min(580px,calc(100svh-9rem))] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl text-white"
          >
            <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
              <span className="zib-avatar relative grid h-12 w-12 shrink-0 place-items-center rounded-full">
                <AlienShip className="h-11 w-11" thinking={busy} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-base font-bold leading-tight">Zib</p>
                <p className="flex items-center gap-1.5 text-xs text-white/65">
                  <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${busy ? "animate-pulse bg-[#ffd36b]" : "bg-[#7fffd4]"}`} />
                  {busy ? "Sta pensando…" : "Pronto ad aiutarti"}
                </p>
              </div>
              {messages.length > 0 && (
                <button type="button" onClick={reset} className="rounded-full px-2.5 py-1 text-xs text-white/70 transition-colors hover:bg-white/10 hover:text-white">
                  Nuova chat
                </button>
              )}
              <button type="button" onClick={() => setOpen(false)} aria-label="Chiudi l'assistente" className="grid h-8 w-8 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white">
                <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden>
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </header>

            <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
              <Bubble role="assistant" content={GREETING} />
              {messages.map((m, i) => (
                <Bubble
                  key={i}
                  role={m.role}
                  content={m.content}
                  typing={busy && i === messages.length - 1 && !m.content}
                  onNavigate={() => setOpen(false)}
                  // Follow-up chips only under the latest answer, once it has finished.
                  onAsk={!busy && i === messages.length - 1 ? send : undefined}
                />
              ))}
              {messages.length === 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} type="button" onClick={() => send(s)} className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-left text-[13px] text-white/85 transition-colors hover:border-[#7fffd4]/50 hover:bg-white/10">
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-end gap-2 border-t border-white/10 p-3"
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                rows={1}
                maxLength={1200}
                placeholder="Scrivi una domanda…"
                aria-label="La tua domanda per Zib"
                className="max-h-28 min-h-10 flex-1 resize-none rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-[#7fffd4]/60 focus:outline-none"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                aria-label="Invia"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#7fffd4] to-[#5b3df5] text-[#0b0820] transition-[transform,opacity] hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
              >
                <svg viewBox="0 0 20 20" className="h-4.5 w-4.5" aria-hidden>
                  <path d="M3 10l14-6-5 14-2.5-5.5L3 10z" fill="currentColor" />
                </svg>
              </button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>

      <div className="relative">
        <AnimatePresence>
          {hint && !open && (
            <motion.button
              type="button"
              onClick={() => {
                setHint(false);
                setOpen(true);
              }}
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="zib-hint zib-panel absolute bottom-full right-2 mb-2 whitespace-nowrap rounded-2xl rounded-br-sm px-3.5 py-2 text-sm font-medium text-white"
            >
              Ciao! Serve una mano? 👋
            </motion.button>
          )}
        </AnimatePresence>
        <button
          ref={launcherRef}
          type="button"
          {...handlers}
          onClick={() => {
            if (consumeDrag()) return;
            setHint(false);
            setOpen((o) => !o);
          }}
          aria-expanded={open}
          aria-label={open ? "Chiudi l'assistente Zib" : "Apri l'assistente Zib (puoi anche trascinarlo)"}
          title="Tocca per parlare con Zib, trascina per spostarlo"
          // touch-none: dragging Zib with a finger must not scroll the page underneath.
          className="zib-button group relative h-20 w-20 touch-none select-none transition-transform hover:scale-105 active:scale-95 sm:h-24 sm:w-24"
        >
          <AlienShip className="h-full w-full drop-shadow-[0_8px_18px_rgba(91,61,245,0.45)]" beam={open} thinking={busy} />
        </button>
      </div>
    </div>
  );
}

function Bubble({ role, content, typing = false, onNavigate, onAsk }: Message & { typing?: boolean; onNavigate?: () => void; onAsk?: (q: string) => void }) {
  const [copied, setCopied] = useState(false);
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-gradient-to-br from-[#7a62ff] to-[#5b3df5] px-3.5 py-2.5 text-[14px] leading-relaxed text-white shadow-[0_4px_14px_rgba(91,61,245,0.35)]">
          {content}
        </p>
      </div>
    );
  }
  const { text, actions, suggestions } = parseAnswer(content);
  const lines = text.split("\n");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <div className="group/msg flex items-start gap-2">
      <span aria-hidden className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/[0.07] ring-1 ring-white/10">
        <AlienShip className="h-6 w-6" still />
      </span>
      <div className="min-w-0 max-w-[85%]">
        <div className="rounded-2xl rounded-tl-md bg-white/[0.07] px-3.5 py-2.5 text-[14px] leading-relaxed text-white/90 ring-1 ring-white/[0.06]">
          {typing ? (
            <span className="zib-typing inline-flex gap-1 py-1" aria-label="Zib sta scrivendo">
              <span />
              <span />
              <span />
            </span>
          ) : (
            lines.map((line, i) =>
              line.startsWith("•") ? (
                <p key={i} className="flex gap-2 pl-0.5">
                  <span aria-hidden className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#7fffd4]" />
                  <span className="break-words">{line.slice(1).trim()}</span>
                </p>
              ) : line ? (
                <p key={i} className="break-words">{line}</p>
              ) : (
                <span key={i} className="block h-2" />
              ),
            )
          )}
        </div>
        {actions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {actions.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                onClick={onNavigate}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold text-[#120d2e] transition-transform hover:scale-[1.03] ${
                  a.primary
                    ? "bg-gradient-to-r from-[#ffd36b] via-[#7fffd4] to-[#9d8bff] shadow-[0_2px_14px_rgba(255,211,107,0.35)]"
                    : "bg-gradient-to-r from-[#7fffd4] to-[#9d8bff] shadow-[0_2px_10px_rgba(127,255,212,0.25)]"
                }`}
              >
                {a.label}
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
                  <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            ))}
          </div>
        )}
        {onAsk && suggestions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {suggestions.map((q) => (
              <button key={q} type="button" onClick={() => onAsk(q)} className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-left text-[12.5px] text-white/85 transition-colors hover:border-[#7fffd4]/50 hover:bg-white/10">
                {q}
              </button>
            ))}
          </div>
        )}
        {!typing && text && (
          <button type="button" onClick={copy} className="mt-1 text-[11px] text-white/40 opacity-0 transition-opacity hover:text-white/80 focus-visible:opacity-100 group-hover/msg:opacity-100">
            {copied ? "Copiato" : "Copia risposta"}
          </button>
        )}
      </div>
    </div>
  );
}
