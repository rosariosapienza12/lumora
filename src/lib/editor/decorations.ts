/**
 * Page decorations, drawn in the background only (never as elements), so they
 * can never cover the content. They follow 2026 slide design: soft rounded
 * colour fields, layered planes for depth, glowing accents on dark themes, a
 * hairline frame or a soft wave for minimal decks. Every one keeps the outer
 * 5% of the page free, where projectors may crop.
 */

export const DECORATIONS = ["nessuna", "sfumature", "piani", "bagliore", "cornice", "onda"] as const;
export type Decoration = (typeof DECORATIONS)[number];

export const DECORATION_NAMES: Record<Decoration, string> = {
  nessuna: "Nessuna",
  sfumature: "Sfumature morbide",
  piani: "Piani sovrapposti",
  bagliore: "Bagliore",
  cornice: "Cornice sottile",
  onda: "Onda",
};

const hexA = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

const svg = (body: string) =>
  `url("data:image/svg+xml,${`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1600 900' preserveAspectRatio='none'>${body}</svg>`.replace(/"/g, "'").replace(/</g, "%3C").replace(/>/g, "%3E").replace(/#/g, "%23")}") 0 0/100% 100% no-repeat`;

/** CSS background layers for a decoration, in the decoration's two colours. Empty for none. */
export function decorationLayers(style: Decoration | undefined, color: string, color2: string): string {
  switch (style) {
    case "sfumature":
      return [
        `radial-gradient(42% 60% at 100% 0%, ${hexA(color, 0.22)}, transparent 70%)`,
        `radial-gradient(38% 55% at 0% 100%, ${hexA(color2, 0.18)}, transparent 70%)`,
      ].join(", ");
    case "piani":
      return svg(
        `<rect x='1180' y='-120' width='560' height='420' rx='60' fill='${color}' fill-opacity='0.08' transform='rotate(-8 1460 90)'/>` +
          `<rect x='1260' y='-60' width='480' height='360' rx='52' fill='${color2}' fill-opacity='0.1' transform='rotate(-8 1500 120)'/>` +
          `<rect x='-160' y='700' width='520' height='300' rx='52' fill='${color}' fill-opacity='0.07' transform='rotate(6 100 850)'/>`,
      );
    case "bagliore":
      return [
        `radial-gradient(30% 45% at 92% 6%, ${hexA(color, 0.45)}, transparent 70%)`,
        `radial-gradient(26% 40% at 6% 96%, ${hexA(color2, 0.35)}, transparent 70%)`,
        `linear-gradient(90deg, transparent 8%, ${hexA(color, 0.5)} 50%, transparent 92%) 0 96%/100% 2px no-repeat`,
      ].join(", ");
    case "cornice":
      return svg(`<rect x='40' y='32' width='1520' height='836' rx='18' fill='none' stroke='${color}' stroke-opacity='0.35' stroke-width='2'/>`);
    case "onda":
      return svg(
        `<path d='M0 820 C 300 770 520 880 820 830 S 1340 770 1600 820 L1600 900 L0 900 Z' fill='${color}' fill-opacity='0.12'/>` +
          `<path d='M0 860 C 360 820 640 900 980 862 S 1420 830 1600 860 L1600 900 L0 900 Z' fill='${color2}' fill-opacity='0.14'/>`,
      );
    default:
      return "";
  }
}
