"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AlienShip } from "./alien";

type Message = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Come creo la mia prima presentazione?",
  "Idee per una presentazione sul sistema solare",
  "Come aggiungo un quiz?",
  "Quali scorciatoie da tastiera ci sono?",
];
/** Where action buttons may lead: the same list the server prompt allows. */
const ACTION_PATH = /^\/(dashboard|impostazioni|registrati|accedi|password-dimenticata|#viaggio|#sicurezza|crea\/(modelli|layout|contenuti|animazioni|transizioni|interattivita|percorsi|condividi))$/;

/** Splits an answer into text and [[path|label]] action buttons (unknown paths are dropped). */
function parseAnswer(content: string) {
  const actions: { href: string; label: string }[] = [];
  const text = content
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, (_, href: string, label: string) => {
      if (ACTION_PATH.test(href.trim()) && actions.length < 3) actions.push({ href: href.trim(), label: label.trim().slice(0, 40) });
      return "";
    })
    // Hide a half-streamed button until it is complete.
    .replace(/\[\[[^\]]*$/, "")
    .trim();
  return { text, actions };
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

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
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
                <Bubble key={i} role={m.role} content={m.content} typing={busy && i === messages.length - 1 && !m.content} onNavigate={() => setOpen(false)} />
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
              className="zib-panel absolute bottom-full right-2 mb-2 whitespace-nowrap rounded-2xl rounded-br-sm px-3.5 py-2 text-sm font-medium text-white"
            >
              Ciao! Serve una mano? 👋
            </motion.button>
          )}
        </AnimatePresence>
        <button
          type="button"
          onClick={() => {
            setHint(false);
            setOpen((o) => !o);
          }}
          aria-expanded={open}
          aria-label={open ? "Chiudi l'assistente Zib" : "Apri l'assistente Zib"}
          className="zib-button group relative h-20 w-20 transition-transform hover:scale-105 active:scale-95 sm:h-24 sm:w-24"
        >
          <AlienShip className="h-full w-full drop-shadow-[0_8px_18px_rgba(91,61,245,0.45)]" beam={open} thinking={busy} />
        </button>
      </div>
    </div>
  );
}

function Bubble({ role, content, typing = false, onNavigate }: Message & { typing?: boolean; onNavigate?: () => void }) {
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
  const { text, actions } = parseAnswer(content);
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
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#7fffd4] to-[#9d8bff] px-3 py-1.5 text-[13px] font-semibold text-[#120d2e] shadow-[0_2px_10px_rgba(127,255,212,0.25)] transition-transform hover:scale-[1.03]"
              >
                {a.label}
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
                  <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
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
