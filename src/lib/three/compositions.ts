import type { Element } from "../editor/schema";
import { CANVAS_H, CANVAS_W, newId } from "../editor/schema";
import type { Form3D, Material3D } from "./ids";

/**
 * Ready-made 3D compositions: several objects arranged into one scene (a
 * planet with its ring, a podium, a zen stack...). Each object stays its own
 * element, so after inserting a scene every piece can be moved, recoloured or
 * given another material.
 */

export type Palette3D = { main: Material3D; second: Material3D; accent: string; accent2: string; tint?: string };

type Piece = { x: number; y: number; s: number; form: Form3D; second?: boolean; color?: "accent" | "accent2"; tiltX?: number; tiltY?: number; spin?: boolean; material?: Material3D; h?: number };

export const COMPOSITIONS: { id: string; name: string; hint: string; pieces: Piece[] }[] = [
  {
    id: "pianeta",
    name: "Pianeta con anello",
    hint: "Spazio, scienza, idee grandi",
    pieces: [
      { x: 0, y: 0, s: 300, form: "sfera", spin: true },
      { x: -70, y: 70, s: 440, form: "anello", second: true, tiltX: 70, tiltY: 18 },
    ],
  },
  {
    id: "podio",
    name: "Podio",
    hint: "Classifiche, risultati, premi",
    pieces: [
      { x: -230, y: 60, s: 200, form: "cilindro", second: true, tiltX: -20 },
      { x: 0, y: 0, s: 230, form: "cilindro", tiltX: -20 },
      { x: 230, y: 90, s: 190, form: "cilindro", second: true, tiltX: -20 },
      { x: 20, y: -200, s: 150, form: "gemma", color: "accent2", spin: true },
    ],
  },
  {
    id: "zen",
    name: "Pila zen",
    hint: "Equilibrio, benessere, calma",
    pieces: [
      { x: 0, y: 150, s: 280, form: "blob", tiltX: 70 },
      { x: 10, y: 10, s: 210, form: "blob", second: true, tiltX: 70, tiltY: 40 },
      { x: -5, y: -110, s: 150, form: "blob", tiltX: 70, tiltY: 90 },
    ],
  },
  {
    id: "orbita",
    name: "Orbita",
    hint: "Sistemi, squadre, relazioni",
    pieces: [
      { x: 0, y: 0, s: 260, form: "sfera", spin: true },
      { x: -260, y: -90, s: 110, form: "sfera", second: true },
      { x: 250, y: -150, s: 90, form: "sfera", color: "accent2" },
      { x: 230, y: 170, s: 130, form: "sfera", second: true },
      { x: -10, y: 0, s: 620, form: "anello", tiltX: 78, material: "cromo" },
    ],
  },
  {
    id: "molecola",
    name: "Molecola sul piedistallo",
    hint: "Chimica, laboratorio, ricerca",
    pieces: [
      { x: 0, y: 180, s: 300, form: "cilindro", material: "marmo", tiltX: -15 },
      { x: 0, y: -60, s: 300, form: "molecola", spin: true },
    ],
  },
  {
    id: "monete",
    name: "Monete in volo",
    hint: "Economia, risparmio, business",
    pieces: [
      { x: -200, y: 120, s: 170, form: "moneta", tiltX: 30, tiltY: 20 },
      { x: -60, y: 20, s: 180, form: "moneta", second: true, tiltX: 50, tiltY: -30 },
      { x: 90, y: -80, s: 170, form: "moneta", tiltX: 20, tiltY: 60 },
      { x: 220, y: -180, s: 150, form: "moneta", second: true, tiltX: 60, tiltY: -10 },
    ],
  },
  {
    id: "gocce",
    name: "Gocce",
    hint: "Acqua, natura, sostenibilità",
    pieces: [
      { x: -160, y: -80, s: 170, form: "goccia" },
      { x: 30, y: 60, s: 230, form: "goccia", second: true },
      { x: 200, y: -120, s: 130, form: "goccia" },
    ],
  },
  {
    id: "alba",
    name: "Alba",
    hint: "Inizi, futuro, viaggi",
    pieces: [
      { x: 0, y: 60, s: 460, form: "arco", second: true, tiltX: -10 },
      { x: 0, y: -40, s: 200, form: "sfera", color: "accent2" },
    ],
  },
  {
    id: "costellazione",
    name: "Costellazione di gemme",
    hint: "Valori, qualità, eccellenza",
    pieces: [
      { x: 0, y: 0, s: 220, form: "gemma", spin: true },
      { x: -240, y: -110, s: 120, form: "gemma", second: true, tiltY: 40 },
      { x: 230, y: -140, s: 100, form: "gemma", tiltX: 30 },
      { x: -190, y: 160, s: 90, form: "gemma", color: "accent2" },
      { x: 250, y: 140, s: 130, form: "gemma", second: true, tiltY: -30 },
    ],
  },
  {
    id: "onda",
    name: "Onda di capsule",
    hint: "Ritmo, processi, crescita",
    pieces: [-2, -1, 0, 1, 2].map((i) => ({ x: i * 130, y: Math.round(Math.sin(i * 0.9) * 90), s: 150, form: "capsula" as Form3D, second: i % 2 === 0, tiltX: 10, tiltY: i * 25 })),
  },
  {
    id: "blocchi",
    name: "Blocchi",
    hint: "Costruire, metodo, progetti",
    pieces: [
      { x: -120, y: 110, s: 200, form: "cubo", tiltY: 30 },
      { x: 100, y: 110, s: 200, form: "cubo", second: true, tiltY: 15 },
      { x: -10, y: -90, s: 190, form: "cubo", tiltY: 50 },
      { x: 10, y: -260, s: 130, form: "piramide", color: "accent2" },
    ],
  },
  {
    id: "intreccio",
    name: "Intreccio",
    hint: "Collaborazione, legami, reti",
    pieces: [
      { x: 0, y: 0, s: 360, form: "nodo", spin: true, tiltX: 20 },
      { x: 220, y: 170, s: 120, form: "toro", second: true, tiltX: 50 },
    ],
  },
];

/** The scene's elements, centred on the page, in the theme's materials and colours. */
export function buildComposition(id: string, pal: Palette3D): Element[] {
  const c = COMPOSITIONS.find((x) => x.id === id) ?? COMPOSITIONS[0];
  return c.pieces.map((pc, i) => {
    const h = pc.h ?? pc.s;
    const fill = pc.color ? pal[pc.color] : pc.second ? pal.accent2 : pal.accent;
    return {
      id: newId(),
      type: "object3d",
      x: Math.round(CANVAS_W / 2 + pc.x - pc.s / 2),
      y: Math.round(CANVAS_H / 2 + pc.y - h / 2),
      w: pc.s,
      h,
      rotation: 0,
      opacity: 1,
      hidden: false,
      locked: false,
      animation: { enter: "zoom", emphasis: i === 0 ? "float" : "none", duration: 0.8, delay: 0.12 * i },
      interaction: null,
      form: pc.form,
      material: pc.material ?? (pc.second ? pal.second : pal.main),
      fill,
      ...(pal.tint ? { color2: pal.tint } : {}),
      tiltX: pc.tiltX ?? -18,
      tiltY: pc.tiltY ?? 24,
      light: 0,
      ...(pc.spin ? { spin: true } : {}),
    } satisfies Element;
  });
}
