import type { Element } from "@/lib/editor/schema";
import { FONT_FAMILY } from "@/lib/editor/schema";
import { formatValue, isPieKind, niceScale, pieSlices, valuesOf } from "@/lib/editor/chart";

type ChartElement = Extract<Element, { type: "chart" }>;

/**
 * A chart drawn in the element's own units (the SVG viewBox is the element's
 * size), so text keeps its proportions however the box is stretched.
 */
export function ChartView({ el }: { el: ChartElement }) {
  const W = Math.max(40, Math.round(el.w));
  const H = Math.max(40, Math.round(el.h));
  const d = el.data;
  const fs = Math.max(13, Math.min(28, Math.min(W, H) / 17));
  const ink = el.color;
  const grid = el.gridColor ?? "#d4d4d8";
  const unit = d.unit ?? "";
  const font = FONT_FAMILY[el.font ?? "clean"];
  const multi = d.series.length > 1;
  const legend = !isPieKind(d.kind) && (multi || d.showLegend);
  const legendH = legend ? fs * 2 : 0;
  const n = d.labels.length;

  const legendRow = legend && (
    <g>
      {d.series.map((s, i) => (
        <g key={i} transform={`translate(${i * (W / d.series.length)}, 0)`}>
          <rect x={0} y={fs * 0.25} width={fs * 0.8} height={fs * 0.8} rx={fs * 0.2} fill={s.color} />
          <text x={fs * 1.2} y={fs} fontSize={fs * 0.85} fill={ink}>
            {s.name}
          </text>
        </g>
      ))}
    </g>
  );

  if (isPieKind(d.kind)) {
    const vals = valuesOf(d, 0);
    const slices = pieSlices(vals);
    // Slices take the series colours first, then tints of the first one.
    const colors = (i: number) => (i < d.series.length ? d.series[i].color : shade(d.series[0].color, i));
    const r = Math.max(10, Math.min(H / 2 - fs * 0.6, W * 0.28));
    const cx = r + fs * 0.6;
    const cy = H / 2;
    const inner = d.kind === "ciambella" ? r * 0.6 : 0;
    const total = vals.reduce((a, b) => a + Math.max(0, b), 0);
    const lx = cx + r + fs * 1.6;
    const rowH = Math.min(fs * 2, (H - fs) / n);
    const top = cy - (rowH * n) / 2;
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ display: "block", overflow: "visible", fontFamily: font }} role="img" aria-label={describe(el)}>
        {slices.map((sl, i) =>
          sl.share <= 0 ? null : sl.share >= 0.9999 ? (
            <circle key={i} cx={cx} cy={cy} r={(r + inner) / 2} fill="none" stroke={colors(i)} strokeWidth={r - inner || r * 2} />
          ) : (
            <path key={i} d={arcPath(cx, cy, r, inner, sl.start, sl.end)} fill={colors(i)} stroke={el.gridColor ?? "#ffffff"} strokeWidth={Math.max(1, r * 0.012)} />
          ),
        )}
        {inner > 0 && (
          <text x={cx} y={cy + fs * 0.4} textAnchor="middle" fontSize={fs * 1.3} fontWeight={700} fill={ink}>
            {formatValue(total, unit)}
          </text>
        )}
        {d.labels.map((label, i) => (
          <g key={i} transform={`translate(${lx}, ${top + i * rowH})`}>
            <rect x={0} y={rowH / 2 - fs * 0.45} width={fs * 0.9} height={fs * 0.9} rx={fs * 0.2} fill={colors(i)} />
            <text x={fs * 1.4} y={rowH / 2 + fs * 0.32} fontSize={fs * 0.9} fill={ink}>
              <tspan fontWeight={700}>{Math.round(slices[i].share * 100)}%</tspan>
              <tspan dx={fs * 0.5} opacity={0.8}>
                {label}
              </tspan>
            </text>
          </g>
        ))}
      </svg>
    );
  }

  const all = d.series.flatMap((_, s) => valuesOf(d, s));
  const lo0 = Math.min(0, ...all);
  const hi0 = Math.max(0, ...all);
  const { step } = niceScale(hi0 - lo0 || 1);
  const lo = Math.floor(lo0 / step) * step;
  const hi = Math.max(lo + step, Math.ceil(hi0 / step) * step);
  const ticks = Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, i) => lo + i * step);
  const horizontal = d.kind === "barre";

  if (horizontal) {
    const labelW = Math.min(W * 0.28, fs * 8);
    const left = labelW + fs * 0.5;
    const right = W - fs * 3.5;
    const top = legendH + fs * 0.5;
    const bottom = H - fs * 1.8;
    const band = (bottom - top) / n;
    const x = (v: number) => left + ((v - lo) / (hi - lo)) * (right - left);
    const barH = (band * 0.7) / d.series.length;
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ display: "block", overflow: "visible", fontFamily: font }} role="img" aria-label={describe(el)}>
        {legendRow}
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={x(t)} x2={x(t)} y1={top} y2={bottom} stroke={grid} strokeWidth={1} />
            <text x={x(t)} y={bottom + fs * 1.2} textAnchor="middle" fontSize={fs * 0.75} fill={ink} opacity={0.6}>
              {formatValue(t, unit)}
            </text>
          </g>
        ))}
        {d.labels.map((label, i) => (
          <g key={i}>
            <text x={labelW} y={top + band * i + band / 2 + fs * 0.32} textAnchor="end" fontSize={fs * 0.85} fill={ink}>
              {label}
            </text>
            {d.series.map((s, k) => {
              const v = valuesOf(d, k)[i];
              const y = top + band * i + band * 0.15 + k * barH;
              const x0 = x(0);
              const x1 = x(v);
              return (
                <g key={k}>
                  <rect x={Math.min(x0, x1)} y={y} width={Math.max(1, Math.abs(x1 - x0))} height={barH * 0.92} rx={Math.min(6, barH * 0.2)} fill={s.color} />
                  {d.showValues !== false && (
                    <text x={Math.max(x0, x1) + fs * 0.35} y={y + barH * 0.46 + fs * 0.3} fontSize={fs * 0.75} fontWeight={700} fill={ink}>
                      {formatValue(v, unit)}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        ))}
      </svg>
    );
  }

  const left = fs * 3.6;
  const right = W - fs * 0.5;
  const top = legendH + fs * 0.8;
  const bottom = H - fs * 2;
  const band = (right - left) / n;
  const y = (v: number) => bottom - ((v - lo) / (hi - lo)) * (bottom - top);
  const cxAt = (i: number) => left + band * i + band / 2;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ display: "block", overflow: "visible", fontFamily: font }} role="img" aria-label={describe(el)}>
      {legendRow}
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={left} x2={right} y1={y(t)} y2={y(t)} stroke={grid} strokeWidth={t === 0 ? 2 : 1} />
          <text x={left - fs * 0.4} y={y(t) + fs * 0.3} textAnchor="end" fontSize={fs * 0.75} fill={ink} opacity={0.6}>
            {formatValue(t, unit)}
          </text>
        </g>
      ))}
      {d.labels.map((label, i) => (
        <text key={i} x={cxAt(i)} y={bottom + fs * 1.3} textAnchor="middle" fontSize={fs * 0.85} fill={ink}>
          {label}
        </text>
      ))}
      {d.kind === "colonne" &&
        d.series.map((s, k) => {
          const barW = (band * 0.66) / d.series.length;
          return valuesOf(d, k).map((v, i) => {
            const x = left + band * i + band * 0.17 + k * barW;
            const y0 = y(0);
            const y1 = y(v);
            return (
              <g key={`${k}-${i}`}>
                <rect x={x} y={Math.min(y0, y1)} width={barW * 0.9} height={Math.max(1, Math.abs(y1 - y0))} rx={Math.min(8, barW * 0.15)} fill={s.color} />
                {d.showValues !== false && (
                  <text x={x + barW * 0.45} y={Math.min(y0, y1) - fs * 0.35} textAnchor="middle" fontSize={fs * 0.75} fontWeight={700} fill={ink}>
                    {formatValue(v, unit)}
                  </text>
                )}
              </g>
            );
          });
        })}
      {(d.kind === "linea" || d.kind === "area") &&
        d.series.map((s, k) => {
          const pts = valuesOf(d, k).map((v, i) => [cxAt(i), y(v)] as const);
          const line = pts.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(" ");
          return (
            <g key={k}>
              {d.kind === "area" && <polygon points={`${cxAt(0)},${y(Math.max(lo, 0))} ${line} ${cxAt(n - 1)},${y(Math.max(lo, 0))}`} fill={s.color} opacity={0.18} />}
              <polyline points={line} fill="none" stroke={s.color} strokeWidth={Math.max(2, fs * 0.18)} strokeLinejoin="round" strokeLinecap="round" />
              {pts.map(([px, py], i) => (
                <g key={i}>
                  <circle cx={px} cy={py} r={Math.max(3, fs * 0.22)} fill={s.color} stroke={el.gridColor ?? "#ffffff"} strokeWidth={2} />
                  {d.showValues !== false && !multi && (
                    <text x={px} y={py - fs * 0.6} textAnchor="middle" fontSize={fs * 0.75} fontWeight={700} fill={ink}>
                      {formatValue(valuesOf(d, k)[i], unit)}
                    </text>
                  )}
                </g>
              ))}
            </g>
          );
        })}
    </svg>
  );
}

/** A pie or donut slice between two angles (from 12 o'clock, clockwise). */
function arcPath(cx: number, cy: number, r: number, inner: number, a0: number, a1: number) {
  const p = (rad: number, a: number) => [cx + rad * Math.sin(a), cy - rad * Math.cos(a)].map((v) => v.toFixed(2)).join(" ");
  const large = a1 - a0 > Math.PI ? 1 : 0;
  if (inner <= 0) return `M${cx} ${cy}L${p(r, a0)}A${r} ${r} 0 ${large} 1 ${p(r, a1)}Z`;
  return `M${p(r, a0)}A${r} ${r} 0 ${large} 1 ${p(r, a1)}L${p(inner, a1)}A${inner} ${inner} 0 ${large} 0 ${p(inner, a0)}Z`;
}

/** Tints of one colour for pie slices beyond the series colours. */
function shade(hex: string, i: number) {
  const n = parseInt(hex.slice(1), 16);
  const k = [1, 0.75, 0.55, 0.4, 0.85, 0.65, 0.3, 0.95, 0.5, 0.7, 0.45, 0.6][i % 12];
  const mix = (c: number) => Math.round(c * k + 255 * (1 - k));
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(mix);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/** What the chart says, for screen readers. */
function describe(el: ChartElement) {
  const d = el.data;
  return `Grafico: ${d.series.map((s, k) => `${s.name}: ${d.labels.map((l, i) => `${l} ${formatValue(valuesOf(d, k)[i], d.unit ?? "")}`).join(", ")}`).join("; ")}`;
}
