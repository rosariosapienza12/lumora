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
  // Illustrations: small drawings used by the topic decorations and the icon layouts.
  building: { label: "Palazzi", d: "M4 40 H30 V98 H4 Z M9 48 H15 V54 H9 Z M19 48 H25 V54 H19 Z M9 62 H15 V68 H9 Z M19 62 H25 V68 H19 Z M9 76 H15 V82 H9 Z M19 76 H25 V82 H19 Z M32 10 H62 V98 H32 Z M37 18 H44 V24 H37 Z M50 18 H57 V24 H50 Z M37 32 H44 V38 H37 Z M50 32 H57 V38 H50 Z M37 46 H44 V52 H37 Z M50 46 H57 V52 H50 Z M37 60 H44 V66 H37 Z M50 60 H57 V66 H50 Z M37 74 H44 V80 H37 Z M50 74 H57 V80 H50 Z M64 30 H96 V98 H64 Z M70 38 H77 V44 H70 Z M83 38 H90 V44 H83 Z M70 52 H77 V58 H70 Z M83 52 H90 V58 H83 Z M70 66 H77 V72 H70 Z M83 66 H90 V72 H83 Z" },
  tree: { label: "Albero", d: "M16 38 A34 34 0 1 0 84 38 A34 34 0 1 0 16 38 Z M45 73 L55 73 L57 98 L43 98 Z" },
  sprout: { label: "Germoglio", d: "M48 98 V50 H52 V98 Z M47 55 C30 58 10 46 8 26 C28 24 45 36 47 55 Z M53 45 C54 24 72 8 94 10 C94 32 76 45 53 45 Z" },
  mountain: { label: "Montagne", d: "M2 92 L36 30 L52 56 L66 36 L98 92 Z M71 16 A9 9 0 1 0 89 16 A9 9 0 1 0 71 16 Z" },
  sun: { label: "Sole", d: "M28 50 A22 22 0 1 0 72 50 A22 22 0 1 0 28 50 Z M78.6 45.1 L98 50 L78.6 54.9 Z M73.7 66.7 L83.9 83.9 L66.7 73.7 Z M54.9 78.6 L50 98 L45.1 78.6 Z M33.3 73.7 L16.1 83.9 L26.3 66.7 Z M21.4 54.9 L2 50 L21.4 45.1 Z M26.3 33.3 L16.1 16.1 L33.3 26.3 Z M45.1 21.4 L50 2 L54.9 21.4 Z M66.7 26.3 L83.9 16.1 L73.7 33.3 Z" },
  gear: { label: "Ingranaggio", d: "M85 41.4 L96.4 42.5 L96.4 57.5 L85 58.6 L83.3 63.8 L80.8 68.7 L88.1 77.5 L77.5 88.1 L68.7 80.8 L63.8 83.3 L58.6 85 L57.5 96.4 L42.5 96.4 L41.4 85 L36.2 83.3 L31.3 80.8 L22.5 88.1 L11.9 77.5 L19.2 68.7 L16.7 63.8 L15 58.6 L3.6 57.5 L3.6 42.5 L15 41.4 L16.7 36.2 L19.2 31.3 L11.9 22.5 L22.5 11.9 L31.3 19.2 L36.2 16.7 L41.4 15 L42.5 3.6 L57.5 3.6 L58.6 15 L63.8 16.7 L68.7 19.2 L77.5 11.9 L88.1 22.5 L80.8 31.3 L83.3 36.2 Z M50 36 A14 14 0 1 0 50 64 A14 14 0 1 0 50 36 Z" },
  chip: { label: "Chip", d: "M22 22 H78 V78 H22 Z M34 34 V66 H66 V34 Z M30 6 H36 V20 H30 Z M47 6 H53 V20 H47 Z M64 6 H70 V20 H64 Z M30 80 H36 V94 H30 Z M47 80 H53 V94 H47 Z M64 80 H70 V94 H64 Z M6 30 H20 V36 H6 Z M6 47 H20 V53 H6 Z M6 64 H20 V70 H6 Z M80 30 H94 V36 H80 Z M80 47 H94 V53 H80 Z M80 64 H94 V70 H80 Z" },
  code: { label: "Codice", d: "M30 22 L38 30 L20 50 L38 70 L30 78 L4 50 Z M70 22 L96 50 L70 78 L62 70 L80 50 L62 30 Z M56 14 L64 16 L44 86 L36 84 Z" },
  rocket: { label: "Razzo", d: "M50 2 C66 16 70 40 66 70 L34 70 C30 40 34 16 50 2 Z M50 28 A8 8 0 1 0 50 44 A8 8 0 1 0 50 28 Z M28 60 L12 84 L12 96 L30 80 Z M72 60 L88 84 L88 96 L70 80 Z M40 74 L60 74 L50 98 Z" },
  planet: { label: "Pianeta", d: "M20 50 A30 30 0 1 0 80 50 A30 30 0 1 0 20 50 Z M2 66 C-2 56 30 40 60 32 C84 26 100 26 98 34 C97 38 92 41 84 45 C88 39 90 36 86 35 C76 34 50 42 30 52 C12 61 8 66 12 68 C14 69 18 68 22 67 C14 71 4 72 2 66 Z" },
  bulb: { label: "Lampadina", d: "M20 38 A30 30 0 1 0 80 38 A30 30 0 1 0 20 38 Z M38 70 H62 V80 H38 Z M40 82 H60 V90 H40 Z M44 92 H56 V97 H44 Z" },
  book: { label: "Libro", d: "M6 20 Q28 12 48 22 L48 90 Q28 80 6 88 Z M52 22 Q72 12 94 20 L94 88 Q72 80 52 90 Z" },
  cap: { label: "Tocco", d: "M50 14 L98 34 L50 54 L2 34 Z M24 46 L50 58 L76 46 L76 70 Q50 84 24 70 Z M88 41 L92 39 L92 64 L88 64 Z" },
  flask: { label: "Provetta", d: "M38 4 H62 V10 H58 V38 L90 88 Q94 96 84 96 H16 Q6 96 10 88 L42 38 V10 H38 Z M35 78 A5 5 0 1 0 45 78 A5 5 0 1 0 35 78 Z M54 70 A4 4 0 1 0 62 70 A4 4 0 1 0 54 70 Z" },
  chart: { label: "Grafico", d: "M10 60 H26 V88 H10 Z M32 40 H48 V88 H32 Z M54 52 H70 V88 H54 Z M76 18 H92 V88 H76 Z M4 92 H96 V96 H4 Z" },
  trophy: { label: "Coppa", d: "M24 8 H76 V30 Q76 58 50 62 Q24 58 24 30 Z M45 64 H55 V80 H45 Z M30 84 H70 V96 H30 Z" },
  dumbbell: { label: "Manubrio", d: "M28 46 H72 V54 H28 Z M10 30 H26 V70 H10 Z M74 30 H90 V70 H74 Z M2 38 H8 V62 H2 Z M92 38 H98 V62 H92 Z" },
  note: { label: "Nota musicale", d: "M11 82 A13 10 0 1 0 37 82 A13 10 0 1 0 11 82 Z M57 72 A13 10 0 1 0 83 72 A13 10 0 1 0 57 72 Z M33 36 L39 34.9 L39 76 L33 76 Z M79 27.1 L85 26 L85 64 L79 64 Z M33 24 L85 14 L85 24 L33 34 Z" },
  palette: { label: "Tavolozza", d: "M50 4 C78 4 98 22 98 46 C98 62 86 66 76 62 C66 58 58 64 62 76 C66 90 58 98 46 98 C20 98 2 78 2 52 C2 24 22 4 50 4 Z M21 34 A7 7 0 1 0 35 34 A7 7 0 1 0 21 34 Z M43 24 A7 7 0 1 0 57 24 A7 7 0 1 0 43 24 Z M65 32 A7 7 0 1 0 79 32 A7 7 0 1 0 65 32 Z M17 60 A7 7 0 1 0 31 60 A7 7 0 1 0 17 60 Z" },
  cup: { label: "Tazza", d: "M14 30 H74 V62 Q74 90 44 90 Q14 90 14 62 Z M76 38 Q96 38 96 54 Q96 70 76 70 V62 Q88 62 88 54 Q88 46 76 46 Z M30 6 Q38 14 30 22 L34 24 Q42 14 34 4 Z M50 6 Q58 14 50 22 L54 24 Q62 14 54 4 Z" },
  pin: { label: "Segnaposto", d: "M50 98 C50 98 14 60 14 38 C14 18 30 4 50 4 C70 4 86 18 86 38 C86 60 50 98 50 98 Z M36 38 A14 14 0 1 0 64 38 A14 14 0 1 0 36 38 Z" },
  circuit: {
    label: "Circuito",
    d: "M14 14 H54 V34 H78 V40 H48 V20 H14 Z M2 17 A6 6 0 1 0 14 17 A6 6 0 1 0 2 17 Z M5 17 A3 3 0 1 1 11 17 A3 3 0 1 1 5 17 Z M79 37 A7 7 0 1 0 93 37 A7 7 0 1 0 79 37 Z M82.5 37 A3.5 3.5 0 1 1 89.5 37 A3.5 3.5 0 1 1 82.5 37 Z M14 60 H34 V80 H72 V86 H28 V66 H14 Z M2 63 A6 6 0 1 0 14 63 A6 6 0 1 0 2 63 Z M5 63 A3 3 0 1 1 11 63 A3 3 0 1 1 5 63 Z M73 83 A7 7 0 1 0 87 83 A7 7 0 1 0 73 83 Z M76.5 83 A3.5 3.5 0 1 1 83.5 83 A3.5 3.5 0 1 1 76.5 83 Z M60 50 H86 V72 H60 Z M66 56 V66 H80 V56 Z",
  },
  fish: { label: "Pesce", d: "M8 50 C20 28 50 22 70 40 L92 24 L88 50 L92 76 L70 60 C50 78 20 72 8 50 Z M24 46 A4 4 0 1 0 32 46 A4 4 0 1 0 24 46 Z" },
  anchor: {
    label: "Àncora",
    d: "M40 14 A10 10 0 1 0 60 14 A10 10 0 1 0 40 14 Z M45 14 A5 5 0 1 1 55 14 A5 5 0 1 1 45 14 Z M46 24 H54 V94 H46 Z M30 32 H46 V38 H30 Z M54 32 H70 V38 H54 Z M10 60 L18 56 C22 74 32 84 46 86 V93 C28 91 14 78 10 60 Z M90 60 L82 56 C78 74 68 84 54 86 V93 C72 91 86 78 90 60 Z",
  },
  atom: {
    label: "Atomo",
    rule: "nonzero",
    d: "M96 50 A46 16 0 1 1 4 50 A46 16 0 1 1 96 50 Z M90 50 A40 9 0 1 0 10 50 A40 9 0 1 0 90 50 Z M73 89.84 A46 16 60 1 1 27 10.16 A46 16 60 1 1 73 89.84 Z M70 84.64 A40 9 60 1 0 30 15.36 A40 9 60 1 0 70 84.64 Z M27 89.84 A46 16 120 1 1 73 10.16 A46 16 120 1 1 27 89.84 Z M30 84.64 A40 9 120 1 0 70 15.36 A40 9 120 1 0 30 84.64 Z M41 50 A9 9 0 1 0 59 50 A9 9 0 1 0 41 50 Z",
  },
  column: { label: "Colonna", d: "M8 4 H92 V12 H8 Z M18 14 H82 V20 H18 Z M22 22 H30 V84 H22 Z M34 22 H42 V84 H34 Z M46 22 H54 V84 H46 Z M58 22 H66 V84 H58 Z M70 22 H78 V84 H70 Z M18 86 H82 V91 H18 Z M10 93 H90 V98 H10 Z" },
  crown: { label: "Corona", d: "M6 30 L28 52 L50 14 L72 52 L94 30 L86 80 H14 Z M14 86 H86 V96 H14 Z" },
  brush: { label: "Pennello", d: "M88 4 L96 12 L52 60 L42 50 Z M38 54 L48 64 C46 80 30 94 6 94 C14 86 12 70 22 62 C28 58 34 56 38 54 Z" },
  headphones: { label: "Cuffie", d: "M10 54 C10 24 28 8 50 8 C72 8 90 24 90 54 L82 54 C82 30 68 16 50 16 C32 16 18 30 18 54 Z M8 56 H28 V94 H8 Z M72 56 H92 V94 H72 Z" },
  mic: { label: "Microfono", d: "M38 20 A12 12 0 0 1 62 20 V46 A12 12 0 0 1 38 46 Z M24 44 H30 C30 58 40 66 50 66 C60 66 70 58 70 44 H76 C76 62 64 72 53 73 V88 H68 V94 H32 V88 H47 V73 C36 72 24 62 24 44 Z" },
  briefcase: { label: "Valigetta", d: "M6 30 H94 V90 H6 Z M44 50 H56 V60 H44 Z M36 14 H64 V28 H58 V20 H42 V28 H36 Z" },
  pencil: { label: "Matita", d: "M2 50 L22 34 V66 Z M26 34 H76 V66 H26 Z M80 34 H88 Q98 34 98 50 Q98 66 88 66 H80 Z" },
  ball: { label: "Pallone", d: "M4 50 A46 46 0 1 0 96 50 A46 46 0 1 0 4 50 Z M50 34 L65 45 L59 63 L41 63 L35 45 Z M50 8 L60 15 L50 22 L40 15 Z M88 44 L82 56 L74 48 L80 38 Z M12 44 L18 56 L26 48 L20 38 Z M30 80 L42 80 L40 90 L30 88 Z M70 80 L58 80 L60 90 L70 88 Z" },
  apple: { label: "Mela", d: "M50 30 C40 22 14 22 12 50 C10 76 30 96 44 92 C48 90 52 90 56 92 C70 96 90 76 88 50 C86 22 60 22 50 30 Z M52 26 C52 16 58 8 68 6 C68 16 62 24 52 26 Z" },
  cutlery: { label: "Posate", d: "M22 4 H26 V28 H30 V4 H34 V28 H38 V4 H42 V34 Q42 44 35 46 V96 H29 V46 Q22 44 22 34 Z M62 4 C76 10 78 40 74 56 H68 V96 H62 Z" },
  plane: { label: "Aereo", d: "M50 2 C54 2 56 8 56 14 V38 L96 60 V68 L56 56 V80 L68 90 V96 L50 90 L32 96 V90 L44 80 V56 L4 68 V60 L44 38 V14 C44 8 46 2 50 2 Z" },
  suitcase: { label: "Valigia", d: "M8 28 H92 V92 H8 Z M26 36 H32 V84 H26 Z M68 36 H74 V84 H68 Z M36 12 H64 V26 H58 V18 H42 V26 H36 Z" },
  pulse: { label: "Battito", d: "M2 46 H28 L38 14 L50 70 L60 34 L67 46 H98 V54 H63 L60 48 L50 86 L38 32 L33 54 H2 Z" },
  pill: { label: "Pillola", d: "M20 36 H48 V64 H20 A14 14 0 0 1 20 36 Z M52 36 H80 A14 14 0 0 1 80 64 H52 Z" },
} as const satisfies Record<string, { label: string; d: string; rule?: "nonzero" | "evenodd" }>;

export type SvgShape = keyof typeof SVG_SHAPES;
export const SVG_SHAPE_IDS = Object.keys(SVG_SHAPES) as SvgShape[];

/** Fill rule of a drawing: holes are cut with "evenodd" unless a drawing needs overlapping parts. */
export const fillRule = (s: SvgShape): "nonzero" | "evenodd" => {
  const def = SVG_SHAPES[s];
  return "rule" in def ? def.rule : "evenodd";
};

/**
 * "arc" is a ring drawn only for a share of its length (the element's `progress`, 0-100):
 * the percentage layouts use it. Like rect and ellipse it is drawn in code, not from a path.
 */
export const SHAPE_IDS = ["rect", "ellipse", "arc", ...SVG_SHAPE_IDS] as ["rect", "ellipse", "arc", ...SvgShape[]];
export type ShapeId = "rect" | "ellipse" | "arc" | SvgShape;

export const SHAPE_LABELS: Record<ShapeId, string> = {
  rect: "Rettangolo",
  ellipse: "Ellisse",
  arc: "Arco percentuale",
  ...(Object.fromEntries(SVG_SHAPE_IDS.map((k) => [k, SVG_SHAPES[k].label])) as Record<SvgShape, string>),
};

/** Drawings (from "building" onwards) are listed apart from geometric shapes in the menus. */
export const ILLUSTRATION_IDS = SVG_SHAPE_IDS.slice(SVG_SHAPE_IDS.indexOf("building")) as SvgShape[];
export const GEOMETRIC_IDS = SHAPE_IDS.filter((s) => !(ILLUSTRATION_IDS as string[]).includes(s)) as ShapeId[];

export const isSvgShape = (shape: string): shape is SvgShape => shape in SVG_SHAPES;
