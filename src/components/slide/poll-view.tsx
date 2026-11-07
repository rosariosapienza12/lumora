"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Element } from "@/lib/editor/schema";
import { FONT_FAMILY } from "@/lib/editor/schema";

type Poll = Extract<Element, { type: "poll" }>;

/** The public slug of the presentation being shown (null when it is not published). */
export const PollSlug = createContext<string | null>(null);

/** Live results, refreshed every two seconds while the poll is on screen. */
function useResults(slug: string | null, id: string, n: number, live: boolean) {
  const [counts, setCounts] = useState<number[]>(() => Array.from({ length: n }, () => 0));
  useEffect(() => {
    if (!live || !slug) return;
    let stop = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/sondaggio/${slug}/${id}`, { cache: "no-store" });
        if (res.ok && !stop) {
          const data = (await res.json()) as { counts?: number[] };
          if (Array.isArray(data.counts)) setCounts(data.counts);
        }
      } catch {
        // Offline for a moment: the next round tries again.
      }
    };
    void load();
    const t = setInterval(() => !document.hidden && void load(), 2000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [slug, id, live, n]);
  return counts;
}

function useQr(url: string | null) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!url) return;
    let alive = true;
    import("qrcode").then((QR) => QR.toDataURL(url, { margin: 1, width: 480 })).then((d) => alive && setSrc(d), () => {});
    return () => {
      alive = false;
    };
  }, [url]);
  return src;
}

/**
 * A live poll on the page. In the presentation (live) it shows a QR code that
 * opens the voting page on phones, and the bars move as votes arrive. In the
 * editor it shows the question and the answers.
 */
export function PollView({ el, live }: { el: Poll; live: boolean }) {
  const slug = useContext(PollSlug);
  const counts = useResults(slug, el.id, el.options.length, live);
  const url = live && slug && typeof window !== "undefined" ? `${window.location.origin}/p/${slug}/vota/${el.id}` : null;
  const qr = useQr(url);
  const total = counts.reduce((a, b) => a + b, 0);
  const max = Math.max(1, ...counts);
  const side = Math.min(el.h * 0.62, el.w * 0.3);
  const showQr = live && Boolean(slug);
  const fs = Math.max(18, Math.min(34, el.h / 18));

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", gap: el.w * 0.03, fontFamily: FONT_FAMILY[el.font ?? "clean"], color: el.color }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: fs * 0.6, minWidth: 0 }}>
        <div style={{ fontSize: fs * 1.6, fontWeight: 800, lineHeight: 1.1 }}>{el.question}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: fs * 0.55, flex: 1, justifyContent: "center" }}>
          {el.options.map((o, i) => {
            const share = total ? Math.round((counts[i] / total) * 100) : 0;
            return (
              <div key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: fs, marginBottom: fs * 0.2 }}>
                  <span style={{ fontWeight: 600 }}>{o}</span>
                  <span style={{ opacity: 0.75, fontVariantNumeric: "tabular-nums" }}>{live ? `${share}% · ${counts[i]}` : ""}</span>
                </div>
                <div style={{ height: fs * 0.9, borderRadius: fs, background: `${el.fill}22`, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${live ? (counts[i] / max) * 100 : 0}%`, minWidth: live && counts[i] ? fs : 0, background: el.fill, borderRadius: fs, transition: "width 0.8s cubic-bezier(0.22,1,0.36,1)" }} />
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: fs * 0.75, opacity: 0.7 }}>
          {!live ? "In presentazione il pubblico vota dal telefono con il QR code e i risultati si muovono dal vivo." : showQr ? `${total} ${total === 1 ? "voto" : "voti"}` : "Pubblica la presentazione (Condividi) per far votare il pubblico."}
        </div>
      </div>
      {showQr && (
        <div style={{ width: side, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: fs * 0.4 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- generated QR code (data URL) */}
          {qr ? <img src={qr} alt="QR code per votare" style={{ width: side, height: side, borderRadius: fs * 0.6, background: "#fff", padding: fs * 0.3 }} /> : <div style={{ width: side, height: side }} />}
          <div style={{ fontSize: fs * 0.8, fontWeight: 700, textAlign: "center" }}>Inquadra e vota</div>
        </div>
      )}
    </div>
  );
}
