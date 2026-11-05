"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import type { FreePhoto } from "@/lib/editor/photos";

/** "Cerca foto gratis": searches Wikimedia Commons through /api/immagini and returns the chosen photo. */
export function PhotoSearch({ initialQuery = "", onPick, onClose }: { initialQuery?: string; onPick: (p: FreePhoto) => void; onClose: () => void }) {
  const [q, setQ] = useState(initialQuery);
  const [photos, setPhotos] = useState<FreePhoto[] | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const search = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (q.trim().length < 2) return setStatus("Scrivi almeno 2 caratteri.");
    setStatus("Cerco foto libere…");
    try {
      const res = await fetch(`/api/immagini?q=${encodeURIComponent(q.trim())}`);
      const data = (await res.json()) as { photos?: FreePhoto[]; error?: string };
      if (!res.ok || !data.photos) return setStatus(data.error ?? "Ricerca non riuscita.");
      setPhotos(data.photos);
      setStatus(data.photos.length ? null : "Nessuna foto trovata: prova con parole più semplici.");
    } catch {
      setStatus("Ricerca non riuscita: controlla la connessione.");
    }
  };

  return (
    <motion.div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="photo-title"
        initial={{ y: 24, scale: 0.97 }}
        animate={{ y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
        className="flex max-h-[88vh] w-full max-w-4xl flex-col gap-4 overflow-hidden rounded-3xl bg-paper p-5 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h2 id="photo-title" className="font-display text-2xl font-bold">
            Cerca foto gratis
          </h2>
          <p className="mt-1 text-sm text-ink-soft">Foto con licenza libera da Wikimedia Commons. Autore e licenza restano scritti sulla foto, come chiede la licenza.</p>
        </div>
        <form onSubmit={search} className="flex gap-2">
          <label htmlFor="photo-q" className="sr-only">
            Cosa cerchi
          </label>
          <input
            id="photo-q"
            ref={inputRef}
            value={q}
            maxLength={80}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Per esempio: foresta, Colosseo, balena"
            className="min-w-0 flex-1 rounded-xl border border-line bg-paper px-3.5 py-2.5 outline-none focus:border-violet"
          />
          <button type="submit" className="rounded-full bg-violet px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-deep">
            Cerca
          </button>
        </form>
        {status && (
          <p role="status" className="text-sm text-ink-soft">
            {status}
          </p>
        )}
        {photos && photos.length > 0 && (
          <ul className="grid grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 md:grid-cols-4">
            {photos.map((p) => (
              <li key={p.pageUrl}>
                <button onClick={() => onPick(p)} className="group block w-full overflow-hidden rounded-xl border-2 border-line text-left hover:border-violet focus-visible:border-violet focus-visible:outline-none">
                  {/* eslint-disable-next-line @next/next/no-img-element -- Wikimedia thumbnails, CSP allows https images */}
                  <img src={p.thumb} alt={p.title} loading="lazy" referrerPolicy="no-referrer" width={500} height={Math.round((500 * p.height) / p.width)} className="aspect-[4/3] w-full object-cover" />
                  <span className="block truncate px-2 py-1 text-[11px] text-ink-soft">
                    {p.author} · {p.license}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <button onClick={onClose} className="self-end text-sm font-medium text-violet">
          Chiudi
        </button>
      </motion.div>
    </motion.div>
  );
}
