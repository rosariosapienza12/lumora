"use client";

import { useEffect, useReducer, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import QRCode from "qrcode";
import type { Element, ElementType, PresentationDoc } from "@/lib/editor/schema";
import { SlideThumb } from "@/components/slide/element-view";
import { LayoutPicker } from "./layout-picker";
import { Player } from "@/components/player/player";
import { Logo } from "@/components/ui";
import { GuestBanner } from "@/components/guest-banner";
import { Canvas } from "./canvas";
import { Inspector } from "./inspector";
import { ShapeMenu } from "./shape-menu";
import { currentPage, initState, reducer } from "./store";
import { publishAction, saveDocumentAction, unpublishAction } from "./actions";

type SaveStatus = "saved" | "dirty" | "saving" | "error";

const ADDABLE: { kind: ElementType; label: string; icon: string }[] = [
  { kind: "text", label: "Testo", icon: "T" },
  { kind: "shape", label: "Forma", icon: "■" },
  { kind: "image", label: "Immagine", icon: "▣" },
  { kind: "button", label: "Pulsante", icon: "◉" },
  { kind: "hotspot", label: "Hotspot", icon: "✦" },
];

export function Editor(props: {
  id: string;
  initialTitle: string;
  initialDoc: PresentationDoc;
  initialSlug: string | null;
  initialHasPassword: boolean;
  emailVerified: boolean;
  /** Temporary guest account: show a reminder and explain why sharing is off. */
  guest?: boolean;
  appUrl: string;
  /** Tip shown when arriving from a homepage planet shortcut. */
  hint?: string | null;
}) {
  const [state, dispatch] = useReducer(reducer, props.initialDoc, initState);
  const [hint, setHint] = useState(props.hint ?? null);
  const [title, setTitle] = useState(props.initialTitle);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [error, setError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const firstRender = useRef(true);
  const clipboard = useRef<Element | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) return setUploadMsg("L'immagine supera i 4 MB.");
    setUploadMsg("Caricamento dell'immagine…");
    const body = new FormData();
    body.append("file", file);
    try {
      const res = await fetch("/api/assets", { method: "POST", body });
      const data = (await res.json()) as { src?: string; error?: string };
      if (!res.ok || !data.src) return setUploadMsg(data.error ?? "Caricamento non riuscito.");
      dispatch({ type: "add-element", kind: "image", src: data.src, alt: file.name.replace(/\.[a-z0-9]+$/i, "").slice(0, 300) });
      setUploadMsg(null);
    } catch {
      setUploadMsg("Caricamento non riuscito: controlla la connessione.");
    }
  };
  const page = currentPage(state);
  const selected = page.elements.find((e) => e.id === state.selectedId) ?? null;

  // Debounced autosave.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setStatus("dirty");
    const t = setTimeout(async () => {
      setStatus("saving");
      const res = await saveDocumentAction(props.id, title.trim() || "Presentazione senza titolo", state.doc);
      if (res.ok) {
        setStatus("saved");
        setError(null);
      } else {
        setStatus("error");
        setError(res.error);
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [state.revision, title, props.id, state.doc]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (status !== "saved") e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [status]);

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (previewing || target.closest("input, textarea, select, [contenteditable]")) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        dispatch({ type: e.shiftKey ? "redo" : "undo" });
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        dispatch({ type: "redo" });
      } else if (state.selectedId && (e.key === "Delete" || e.key === "Backspace")) {
        e.preventDefault();
        dispatch({ type: "delete-element", id: state.selectedId });
      } else if (selected && mod && e.key.toLowerCase() === "c") {
        clipboard.current = structuredClone(selected);
      } else if (clipboard.current && mod && e.key.toLowerCase() === "v") {
        e.preventDefault();
        dispatch({ type: "paste", element: clipboard.current });
      } else if (state.selectedId && mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        dispatch({ type: "duplicate-element", id: state.selectedId });
      } else if (state.selectedId && e.key.startsWith("Arrow") && selected && !selected.locked) {
        e.preventDefault();
        const step = e.shiftKey ? 20 : 2;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        dispatch({ type: "update-element", id: state.selectedId, patch: { x: selected.x + dx, y: selected.y + dy } });
      } else if (e.key === "Escape") {
        dispatch({ type: "select", id: null });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [previewing, selected, state.selectedId]);

  const pageIndex = state.doc.pages.findIndex((p) => p.id === page.id);

  return (
    // Desktop: three fixed columns filling the screen. Phones and small tablets: one scrolling
    // column with the slide first, then the page strip, then the properties.
    <div className="flex min-h-screen flex-col lg:h-screen lg:overflow-hidden">
      {props.guest && <GuestBanner />}
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-paper px-4 py-2.5">
        <Logo className="shrink-0" compact />
        <Link href="/dashboard" className="hidden rounded-full px-3 py-1.5 text-sm hover:bg-mist md:inline">
          Le mie presentazioni
        </Link>
        <label htmlFor="title" className="sr-only">
          Titolo della presentazione
        </label>
        <input
          id="title"
          value={title}
          maxLength={120}
          onChange={(e) => setTitle(e.target.value)}
          className="order-last w-full min-w-0 rounded-lg bg-transparent px-2 py-1 font-display text-lg font-semibold outline-none hover:bg-mist focus:bg-mist sm:order-none sm:w-auto sm:flex-1"
        />
        <span className="hidden text-sm text-ink-soft sm:inline" aria-live="polite">
          {status === "saved" ? "Salvato" : status === "saving" ? "Salvataggio…" : status === "dirty" ? "Modifiche non salvate" : `Errore: ${error}`}
        </span>
        <div className="ml-auto flex items-center gap-1 sm:ml-0">
          <button onClick={() => dispatch({ type: "undo" })} disabled={!state.past.length} className="rounded-full px-2.5 py-1.5 hover:bg-mist disabled:opacity-30" title="Annulla (Ctrl+Z)" aria-label="Annulla">
            ↶
          </button>
          <button onClick={() => dispatch({ type: "redo" })} disabled={!state.future.length} className="rounded-full px-2.5 py-1.5 hover:bg-mist disabled:opacity-30" title="Ripeti (Ctrl+Y)" aria-label="Ripeti">
            ↷
          </button>
        </div>
        <a
          href={`/editor/${props.id}/stampa`}
          target="_blank"
          rel="noopener"
          className="hidden rounded-full px-3 py-2 text-sm font-semibold hover:bg-mist lg:inline"
          title="Apre una pagina pronta da salvare in PDF o stampare"
        >
          Esporta PDF
        </a>
        <button onClick={() => setPreviewing(true)} className="rounded-full border border-line px-3 py-2 text-sm font-semibold hover:border-violet sm:px-4">
          Presenta
        </button>
        <button onClick={() => setSharing(true)} className="rounded-full bg-violet px-3 py-2 text-sm font-semibold text-white hover:bg-violet-deep sm:px-4">
          Condividi
        </button>
      </header>

      <div className="flex flex-col lg:min-h-0 lg:flex-1 lg:flex-row">
        {/* Pages: a horizontal strip under the slide on phones, a column on the left on desktop */}
        <aside className="order-2 flex flex-col gap-3 border-b border-line bg-paper p-3 lg:order-none lg:w-48 lg:shrink-0 lg:overflow-y-auto lg:border-r lg:border-b-0" aria-label="Pagine">
          <ol className="flex gap-3 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            {state.doc.pages.map((p, i) => (
              <li key={p.id} className="group relative w-32 shrink-0 lg:w-auto">
                <button
                  onClick={() => dispatch({ type: "goto-page", pageId: p.id })}
                  aria-current={p.id === page.id ? "page" : undefined}
                  className="block w-full overflow-hidden rounded-xl border-2 border-transparent text-left aria-[current]:border-violet"
                >
                  <SlideThumb page={p} />
                  <span className="block truncate px-1 py-1 text-xs text-ink-soft">
                    {i + 1}. {p.name}
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <LayoutPicker theme={state.doc.settings?.theme} onPick={(layout) => dispatch({ type: "add-page", layout })} />
          <div className="flex flex-wrap gap-1 text-xs lg:mt-auto">
            <button onClick={() => dispatch({ type: "move-page", pageId: page.id, dir: -1 })} disabled={pageIndex === 0} className="rounded-full border border-line px-2 py-1 disabled:opacity-30">
              Su
            </button>
            <button onClick={() => dispatch({ type: "move-page", pageId: page.id, dir: 1 })} disabled={pageIndex === state.doc.pages.length - 1} className="rounded-full border border-line px-2 py-1 disabled:opacity-30">
              Giù
            </button>
            <button onClick={() => dispatch({ type: "duplicate-page", pageId: page.id })} className="rounded-full border border-line px-2 py-1">
              Duplica
            </button>
            <button onClick={() => dispatch({ type: "delete-page", pageId: page.id })} disabled={state.doc.pages.length <= 1} className="rounded-full border border-line px-2 py-1 text-danger disabled:opacity-30">
              Elimina
            </button>
          </div>
        </aside>

        {/* Canvas */}
        <section className="order-1 flex min-w-0 flex-col bg-mist lg:order-none lg:flex-1">
          <div className="flex flex-wrap items-center justify-center gap-1.5 border-b border-line bg-paper/60 px-3 py-2" role="toolbar" aria-label="Aggiungi elementi">
            {ADDABLE.map((a) =>
              a.kind === "shape" ? (
                <ShapeMenu key={a.kind} onPick={(shape) => dispatch({ type: "add-element", kind: "shape", shape })} />
              ) : (
              <button
                key={a.kind}
                onClick={() => (a.kind === "image" ? fileRef.current?.click() : dispatch({ type: "add-element", kind: a.kind }))}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium hover:bg-paper"
              >
                <span aria-hidden className={a.kind === "hotspot" ? "text-amber" : "text-violet"}>
                  {a.icon}
                </span>
                {a.label}
              </button>
              ),
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" tabIndex={-1} onChange={upload} />
          <AnimatePresence>
            {hint && (
              <motion.div
                role="note"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden bg-amber/15"
              >
                <div className="flex items-start gap-3 px-4 py-2.5 text-sm">
                  <span aria-hidden className="hotspot mt-0.5 shrink-0 scale-75">
                    ✦
                  </span>
                  <p className="flex-1">{hint}</p>
                  <button onClick={() => setHint(null)} className="rounded-full px-2.5 py-1 text-xs font-semibold hover:bg-amber/20">
                    Ho capito
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {uploadMsg && (
            <p role="status" className="bg-paper px-4 py-1.5 text-center text-sm text-ink-soft">
              {uploadMsg}
            </p>
          )}
          {/* On phones the page has no fixed height, so the slide area takes a 16:9 box. */}
          <div className="aspect-video p-3 lg:aspect-auto lg:min-h-0 lg:flex-1 lg:p-6">
            <Canvas page={page} selectedId={state.selectedId} dispatch={dispatch} />
          </div>
          <div className="border-t border-line bg-paper px-4 py-2">
            <label htmlFor="notes" className="text-xs font-medium text-ink-soft">
              Note del relatore per questa pagina (le vedi solo tu, in modalità presentatore)
            </label>
            <textarea
              id="notes"
              key={page.id}
              defaultValue={page.notes ?? ""}
              maxLength={5000}
              rows={2}
              placeholder="Cosa vuoi dire mentre mostri questa pagina?"
              onBlur={(e) => e.target.value !== (page.notes ?? "") && dispatch({ type: "update-page", patch: { notes: e.target.value } })}
              className="mt-1 w-full resize-y rounded-lg border border-line bg-mist px-3 py-2 text-sm outline-none focus:border-violet"
            />
          </div>
        </section>

        {/* Inspector */}
        <aside className="order-3 border-t border-line bg-paper lg:order-none lg:w-72 lg:shrink-0 lg:overflow-y-auto lg:border-t-0 lg:border-l" aria-label="Proprietà">
          <Inspector doc={state.doc} page={page} el={selected} dispatch={dispatch} />
        </aside>
      </div>

      <AnimatePresence>
        {previewing && (
          <motion.div className="fixed inset-0 z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Player doc={state.doc} startIndex={pageIndex} onClose={() => setPreviewing(false)} presenter />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sharing && (
          <ShareDialog
            id={props.id}
            appUrl={props.appUrl}
            emailVerified={props.emailVerified}
            guest={props.guest}
            initialSlug={props.initialSlug}
            initialHasPassword={props.initialHasPassword}
            onClose={() => setSharing(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ShareDialog(props: {
  id: string;
  appUrl: string;
  emailVerified: boolean;
  guest?: boolean;
  initialSlug: string | null;
  initialHasPassword: boolean;
  onClose: () => void;
}) {
  const [slug, setSlug] = useState(props.initialSlug);
  const [hasPassword, setHasPassword] = useState(props.initialHasPassword);
  const [usePassword, setUsePassword] = useState(props.initialHasPassword);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const url = slug ? `${props.appUrl}/p/${slug}` : null;
  const [qr, setQr] = useState<string | null>(null);
  useEffect(() => {
    if (!url) return;
    let alive = true;
    QRCode.toDataURL(url, { margin: 1, width: 240 }).then((d) => alive && setQr(d));
    return () => {
      alive = false;
    };
  }, [url]);
  const embed = slug
    ? `<iframe src="${props.appUrl}/embed/${slug}" width="960" height="580" style="border:0" allowfullscreen sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"></iframe>`
    : null;

  const publish = () =>
    start(async () => {
      const res = await publishAction(props.id, usePassword ? password : null);
      if (!res.ok) return setError(res.error);
      setError(null);
      setSlug(res.slug);
      setHasPassword(res.hasPassword);
      setPassword("");
    });

  const unpublish = () =>
    start(async () => {
      const res = await unpublishAction(props.id);
      if (!res.ok) return setError(res.error);
      setSlug(null);
      setHasPassword(false);
    });

  const copy = async (text: string, what: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(what);
    setTimeout(() => setCopied(null), 1800);
  };

  return (
    <motion.div className="fixed inset-0 z-40 grid place-items-center bg-ink/40 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={props.onClose}>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-title"
        initial={{ y: 24, scale: 0.97 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 12, opacity: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
        className="flex w-full max-w-lg flex-col gap-4 rounded-3xl bg-paper p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="share-title" className="font-display text-2xl font-bold">
          Condividi
        </h2>
        {props.guest ? (
          <p className="rounded-xl bg-amber/15 px-3.5 py-2.5 text-sm">
            Come ospite puoi creare e presentare, ma non pubblicare.{" "}
            <a href="/registrati" className="font-semibold text-violet">
              Crea un account gratis
            </a>{" "}
            per condividere le tue presentazioni con un link.
          </p>
        ) : !props.emailVerified ? (
          <p className="rounded-xl bg-amber/15 px-3.5 py-2.5 text-sm">Conferma la tua email per pubblicare. Ti abbiamo inviato il link al momento della registrazione.</p>
        ) : (
          <>
            <p className="text-sm text-ink-soft">
              {slug
                ? `Chi ha il link può vedere la presentazione${hasPassword ? " dopo aver inserito la password" : ""}. Non può modificarla.`
                : "La presentazione è privata: la vedi solo tu."}
            </p>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="accent-violet" checked={usePassword} onChange={(e) => setUsePassword(e.target.checked)} />
              Proteggi il link con una password
            </label>
            {usePassword && (
              <input
                type="password"
                autoComplete="new-password"
                placeholder={hasPassword ? "Reinserisci la password (o scegline una nuova)" : "Password per chi guarda"}
                value={password}
                minLength={10}
                maxLength={128}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-xl border border-line bg-paper px-3.5 py-2.5 outline-none focus:border-violet"
              />
            )}
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button onClick={publish} disabled={pending} className="rounded-full bg-violet px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                {slug ? "Aggiorna la pubblicazione" : "Pubblica con link"}
              </button>
              {slug && (
                <button onClick={unpublish} disabled={pending} className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold">
                  Rendi privata
                </button>
              )}
            </div>
            {url && embed && (
              <div className="flex flex-col gap-3 rounded-2xl bg-mist p-4 text-sm">
                <div className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate">{url}</code>
                  <button onClick={() => copy(url, "link")} className="rounded-full bg-paper px-3 py-1 font-medium">
                    {copied === "link" ? "Copiato" : "Copia link"}
                  </button>
                </div>
                {qr && (
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element -- generated data URL */}
                    <img src={qr} alt="Codice QR del link" width={96} height={96} className="rounded-lg bg-white p-1" />
                    <p className="text-ink-soft">Mostralo in aula o in riunione: chi lo inquadra apre subito la presentazione.</p>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate">{embed}</code>
                  <button onClick={() => copy(embed, "embed")} className="rounded-full bg-paper px-3 py-1 font-medium">
                    {copied === "embed" ? "Copiato" : "Copia codice"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        <button onClick={props.onClose} className="self-end text-sm font-medium text-violet">
          Chiudi
        </button>
      </motion.div>
    </motion.div>
  );
}
