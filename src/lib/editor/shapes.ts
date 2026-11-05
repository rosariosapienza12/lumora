/**
 * Shapes a presentation can use. "rect" and "ellipse" are drawn with CSS (rounded corners);
 * all the others are SVG paths in a 100×100 box, stretched to the element's size, so any
 * shape can be resized, rotated, flipped, filled with a colour or a gradient and outlined.
 */

export const SVG_SHAPES = {
  triangle: { label: "Triangolo", d: "M50 3 L97 97 L3 97 Z" },
  "right-triangle": { label: "Triangolo rettangolo", d: "M3 3 L97 97 L3 97 Z" },
  diamond: { label: "Rombo", d: "M50 2 L98 50 L50 98 L2 50 Z" },
  pentagon: { label: "Pentagono", d: "M50 2 L98 38 L80 97 L20 97 L2 38 Z" },
  hexagon: { label: "Esagono", d: "M25 4 L75 4 L98 50 L75 96 L25 96 L2 50 Z" },
  octagon: { label: "Ottagono", d: "M30 2 L70 2 L98 30 L98 70 L70 98 L30 98 L2 70 L2 30 Z" },
  parallelogram: { label: "Parallelogramma", d: "M25 5 L98 5 L75 95 L2 95 Z" },
  trapezoid: { label: "Trapezio", d: "M22 5 L78 5 L98 95 L2 95 Z" },
  star: { label: "Stella", d: "M50 2 L62 36 L98 37 L69 59 L79 95 L50 74 L21 95 L31 59 L2 37 L38 36 Z" },
  burst: {
    label: "Esplosione",
    d: "M50 0 L58 22 L80 10 L74 34 L98 36 L80 52 L96 72 L72 70 L72 96 L54 80 L40 100 L34 76 L10 86 L20 62 L0 54 L22 42 L8 20 L32 24 L36 0 L46 18 Z",
  },
  arrow: { label: "Freccia", d: "M2 35 L60 35 L60 10 L98 50 L60 90 L60 65 L2 65 Z" },
  "double-arrow": { label: "Doppia freccia", d: "M2 50 L28 15 L28 35 L72 35 L72 15 L98 50 L72 85 L72 65 L28 65 L28 85 Z" },
  chevron: { label: "Chevron", d: "M2 5 L68 5 L98 50 L68 95 L2 95 L32 50 Z" },
  heart: { label: "Cuore", d: "M50 92 C20 70 2 52 2 30 C2 13 15 3 29 3 C39 3 46 9 50 17 C54 9 61 3 71 3 C85 3 98 13 98 30 C98 52 80 70 50 92 Z" },
  bubble: { label: "Fumetto", d: "M10 4 L90 4 Q98 4 98 12 L98 64 Q98 72 90 72 L42 72 L20 96 L24 72 L10 72 Q2 72 2 64 L2 12 Q2 4 10 4 Z" },
  cloud: {
    label: "Nuvola",
    d: "M25 85 C10 85 2 74 2 62 C2 50 11 42 22 42 C22 26 35 14 51 14 C65 14 76 23 80 36 C91 37 98 46 98 58 C98 73 88 85 73 85 Z",
  },
  blob: { label: "Macchia", d: "M52 4 C74 4 96 18 97 42 C98 66 84 94 56 96 C30 98 4 84 3 58 C2 30 28 4 52 4 Z" },
  leaf: { label: "Foglia", d: "M5 95 C5 45 35 5 95 5 C95 60 60 95 5 95 Z" },
  drop: { label: "Goccia", d: "M50 2 C66 26 86 46 86 66 C86 86 70 98 50 98 C30 98 14 86 14 66 C14 46 34 26 50 2 Z" },
  moon: { label: "Luna", d: "M62 4 C34 8 14 30 14 54 C14 80 36 98 62 96 C40 88 28 70 28 50 C28 30 42 12 62 4 Z" },
  cross: { label: "Croce", d: "M35 2 L65 2 L65 35 L98 35 L98 65 L65 65 L65 98 L35 98 L35 65 L2 65 L2 35 L35 35 Z" },
  wave: { label: "Onda", d: "M0 30 C20 10 30 10 50 30 C70 50 80 50 100 30 L100 100 L0 100 Z" },
  ribbon: { label: "Nastro", d: "M2 20 L98 20 L86 50 L98 80 L2 80 L14 50 Z" },
  frame: { label: "Cornice", d: "M2 2 L98 2 L98 98 L2 98 Z M14 14 L14 86 L86 86 L86 14 Z" },
  ring: {
    label: "Anello",
    d: "M50 2 A48 48 0 1 0 50 98 A48 48 0 1 0 50 2 Z M50 20 A30 30 0 1 1 50 80 A30 30 0 1 1 50 20 Z",
  },
  line: { label: "Linea", d: "M0 46 L100 46 L100 54 L0 54 Z" },
} as const;

export type SvgShape = keyof typeof SVG_SHAPES;
export const SVG_SHAPE_IDS = Object.keys(SVG_SHAPES) as SvgShape[];

export const SHAPE_IDS = ["rect", "ellipse", ...SVG_SHAPE_IDS] as ["rect", "ellipse", ...SvgShape[]];
export type ShapeId = "rect" | "ellipse" | SvgShape;

export const SHAPE_LABELS: Record<ShapeId, string> = {
  rect: "Rettangolo",
  ellipse: "Ellisse",
  ...(Object.fromEntries(SVG_SHAPE_IDS.map((k) => [k, SVG_SHAPES[k].label])) as Record<SvgShape, string>),
};

export const isSvgShape = (shape: string): shape is SvgShape => shape in SVG_SHAPES;
