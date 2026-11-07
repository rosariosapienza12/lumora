"use client";

import type { Element } from "@/lib/editor/schema";
import { CHART_KINDS, CHART_NAMES, isPieKind, type ChartData } from "@/lib/editor/chart";
import { IconGrid } from "./icon-menu";

type Chart = Extract<Element, { type: "chart" }>;
type Icon = Extract<Element, { type: "icon" }>;

const input = "w-full min-w-0 rounded-md border border-line bg-paper px-2 py-1 text-sm outline-none focus:border-violet";
const chip = "rounded-full border border-line px-2.5 py-1 text-xs hover:border-violet aria-pressed:border-violet aria-pressed:bg-violet/10";
const SERIES_COLORS = ["#5b3df5", "#ffb547", "#18a689"];

export function IconControls({ el, set }: { el: Icon; set: (p: Partial<Icon>) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <IconGrid value={el.icon} onPick={(icon) => set({ icon })} />
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
          Colore
          <input type="color" value={el.color} onChange={(e) => set({ color: e.target.value })} className="h-9 w-full cursor-pointer rounded-lg border border-line bg-paper" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
          Spessore linea
          <input type="range" min={1} max={3.5} step={0.25} value={el.strokeWidth ?? 2} onChange={(e) => set({ strokeWidth: Number(e.target.value) })} className="accent-violet" />
        </label>
      </div>
    </div>
  );
}

/** Edit a chart like a small spreadsheet: one row per label, one column per series. */
export function ChartControls({ el, set }: { el: Chart; set: (p: Partial<Chart>) => void }) {
  const d = el.data;
  const update = (patch: Partial<ChartData>) => set({ data: { ...d, ...patch } });
  const pie = isPieKind(d.kind);
  const series = pie ? d.series.slice(0, 1) : d.series;
  const setValue = (s: number, i: number, raw: string) => {
    const v = Number(raw.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(v)) return;
    update({ series: d.series.map((sr, k) => (k === s ? { ...sr, values: d.labels.map((_, j) => (j === i ? v : (sr.values[j] ?? 0))) } : sr)) });
  };
  return (
    <div className="flex flex-col gap-3">
      <div>
        <span className="mb-1 block text-xs font-medium text-ink-soft">Tipo di grafico</span>
        <div className="flex flex-wrap gap-1.5">
          {CHART_KINDS.map((k) => (
            <button key={k} aria-pressed={d.kind === k} onClick={() => update({ kind: k })} className={chip}>
              {CHART_NAMES[k]}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-1 text-sm">
          <thead>
            <tr>
              <th className="text-left text-xs font-medium text-ink-soft">Etichetta</th>
              {series.map((s, k) => (
                <th key={k} className="text-left">
                  <div className="flex items-center gap-1">
                    <input type="color" aria-label={`Colore di ${s.name}`} value={s.color} onChange={(e) => update({ series: d.series.map((sr, j) => (j === k ? { ...sr, color: e.target.value } : sr)) })} className="h-6 w-6 shrink-0 cursor-pointer rounded border border-line" />
                    <input aria-label="Nome della serie" value={s.name} maxLength={40} onChange={(e) => update({ series: d.series.map((sr, j) => (j === k ? { ...sr, name: e.target.value } : sr)) })} className={input} />
                  </div>
                </th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {d.labels.map((label, i) => (
              <tr key={i}>
                <td>
                  <input aria-label={`Etichetta ${i + 1}`} value={label} maxLength={40} onChange={(e) => update({ labels: d.labels.map((l, j) => (j === i ? e.target.value : l)) })} className={input} />
                </td>
                {series.map((s, k) => (
                  <td key={k}>
                    <input
                      aria-label={`${s.name}, ${label}`}
                      inputMode="decimal"
                      defaultValue={String(s.values[i] ?? 0).replace(".", ",")}
                      key={`${k}-${i}-${s.values[i]}`}
                      onBlur={(e) => setValue(k, i, e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                      className={`${input} text-right tabular-nums`}
                    />
                  </td>
                ))}
                <td>
                  <button
                    aria-label={`Togli la riga ${label}`}
                    disabled={d.labels.length <= 1}
                    onClick={() => update({ labels: d.labels.filter((_, j) => j !== i), series: d.series.map((sr) => ({ ...sr, values: sr.values.filter((_, j) => j !== i) })) })}
                    className="rounded px-1.5 text-ink-soft hover:text-danger disabled:opacity-30"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button
          disabled={d.labels.length >= 12}
          onClick={() => update({ labels: [...d.labels, `Voce ${d.labels.length + 1}`], series: d.series.map((sr) => ({ ...sr, values: [...d.labels.map((_, j) => sr.values[j] ?? 0), 0] })) })}
          className={chip}
        >
          + Riga
        </button>
        {!pie && (
          <button
            disabled={d.series.length >= 3}
            onClick={() => update({ series: [...d.series, { name: `Serie ${d.series.length + 1}`, values: d.labels.map(() => 0), color: SERIES_COLORS[d.series.length % 3] }] })}
            className={chip}
          >
            + Serie
          </button>
        )}
        {!pie && d.series.length > 1 && (
          <button onClick={() => update({ series: d.series.slice(0, -1) })} className={chip}>
            − Ultima serie
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
          Unità (%, €, km…)
          <input value={d.unit ?? ""} maxLength={6} onChange={(e) => update({ unit: e.target.value || undefined })} className={input} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
          Colore del testo
          <input type="color" value={el.color} onChange={(e) => set({ color: e.target.value })} className="h-8 w-full cursor-pointer rounded-lg border border-line bg-paper" />
        </label>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button aria-pressed={d.showValues !== false} onClick={() => update({ showValues: d.showValues === false })} className={chip}>
          Mostra i valori
        </button>
        {!pie && (
          <button aria-pressed={Boolean(d.showLegend) || d.series.length > 1} onClick={() => update({ showLegend: !d.showLegend })} className={chip}>
            Legenda
          </button>
        )}
      </div>
    </div>
  );
}

type PollEl = Extract<Element, { type: "poll" }>;

/** Question and answers of a live poll (2 to 6 answers). */
export function PollControls({ el, set }: { el: PollEl; set: (p: Partial<PollEl>) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
        Domanda
        <input value={el.question} maxLength={160} onChange={(e) => set({ question: e.target.value })} className={input} />
      </label>
      <span className="text-xs font-medium text-ink-soft">Risposte</span>
      {el.options.map((o, i) => (
        <div key={i} className="flex gap-1">
          <input aria-label={`Risposta ${i + 1}`} value={o} maxLength={60} onChange={(e) => set({ options: el.options.map((x, j) => (j === i ? e.target.value : x)) })} className={input} />
          <button aria-label={`Togli la risposta ${i + 1}`} disabled={el.options.length <= 2} onClick={() => set({ options: el.options.filter((_, j) => j !== i) })} className="rounded px-2 text-ink-soft hover:text-danger disabled:opacity-30">
            ×
          </button>
        </div>
      ))}
      <button disabled={el.options.length >= 6} onClick={() => set({ options: [...el.options, `Risposta ${el.options.length + 1}`] })} className={chip}>
        + Risposta
      </button>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
          Colore delle barre
          <input type="color" value={el.fill} onChange={(e) => set({ fill: e.target.value })} className="h-8 w-full cursor-pointer rounded-lg border border-line bg-paper" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
          Colore del testo
          <input type="color" value={el.color} onChange={(e) => set({ color: e.target.value })} className="h-8 w-full cursor-pointer rounded-lg border border-line bg-paper" />
        </label>
      </div>
      <p className="text-xs text-ink-soft">In presentazione appare un QR code: il pubblico vota dal telefono, senza account, e le barre si aggiornano dal vivo. Serve che la presentazione sia pubblicata (Condividi).</p>
    </div>
  );
}
