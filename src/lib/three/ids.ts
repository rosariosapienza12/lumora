/**
 * Lumora's 3D objects: every form and material the renderer can draw. Pure
 * data, shared by the document schema, the editor and the renderer.
 */

export const FORMS_3D = [
  "sfera",
  "toro",
  "cubo",
  "capsula",
  "cilindro",
  "cono",
  "gemma",
  "piramide",
  "blob",
  "torsione",
  "molecola",
  "goccia",
  "moneta",
  "arco",
  "anello",
  "nodo",
] as const;
export type Form3D = (typeof FORMS_3D)[number];

export const FORM_NAMES: Record<Form3D, string> = {
  sfera: "Sfera",
  toro: "Ciambella",
  cubo: "Cubo smussato",
  capsula: "Capsula",
  cilindro: "Cilindro",
  cono: "Cono",
  gemma: "Gemma",
  piramide: "Piramide",
  blob: "Blob organico",
  torsione: "Colonna ritorta",
  molecola: "Molecola",
  goccia: "Goccia",
  moneta: "Moneta",
  arco: "Arco",
  anello: "Anello sottile",
  nodo: "Nodo intrecciato",
};

export const MATERIALS_3D = ["vetro", "cromo", "metallo", "argilla", "plastica", "iridescente", "satinato", "luminoso", "marmo", "gesso", "gomma", "ceramica"] as const;
export type Material3D = (typeof MATERIALS_3D)[number];

export const MATERIAL_NAMES: Record<Material3D, string> = {
  vetro: "Vetro",
  cromo: "Cromo a specchio",
  metallo: "Metallo colorato",
  argilla: "Argilla",
  plastica: "Plastica lucida",
  iridescente: "Iridescente",
  satinato: "Metallo satinato",
  luminoso: "Luce al neon",
  marmo: "Marmo",
  gesso: "Gesso da modello",
  gomma: "Gomma morbida",
  ceramica: "Ceramica smaltata",
};

export const isForm3D = (v: unknown): v is Form3D => typeof v === "string" && (FORMS_3D as readonly string[]).includes(v);
export const isMaterial3D = (v: unknown): v is Material3D => typeof v === "string" && (MATERIALS_3D as readonly string[]).includes(v);

/** Relief that turns a flat drawing into a 3D one with light and shadow. */
export const RELIEFS = ["none", "gonfio", "inciso", "smalto"] as const;
export type Relief = (typeof RELIEFS)[number];
export const RELIEF_NAMES: Record<Relief, string> = { none: "Piatto", gonfio: "Gonfio 3D", inciso: "Inciso", smalto: "Smalto lucido" };
