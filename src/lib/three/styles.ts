import type { Form3D, Material3D, Relief } from "./ids";
import type { ThemeId } from "../editor/themes";
import type { Element, Page, PresentationDoc } from "../editor/schema";

/**
 * The 3D look of each theme: which material its objects are made of, a
 * second material for contrast, the three forms of its cover composition and
 * how its flat drawings are lit. No two themes share the same combination.
 */
export type Style3D = { material: Material3D; second: Material3D; forms: [Form3D, Form3D, Form3D]; relief: Exclude<Relief, "none"> };

export const THEME_3D: Record<ThemeId, Style3D> = {
  notte: { material: "vetro", second: "iridescente", forms: ["sfera", "anello", "gemma"], relief: "smalto" },
  minimal: { material: "gesso", second: "marmo", forms: ["cubo", "sfera", "cono"], relief: "inciso" },
  aziendale: { material: "satinato", second: "cromo", forms: ["cubo", "cilindro", "torsione"], relief: "smalto" },
  accademico: { material: "marmo", second: "gesso", forms: ["piramide", "cilindro", "sfera"], relief: "inciso" },
  lavagna: { material: "gesso", second: "argilla", forms: ["cono", "cubo", "sfera"], relief: "inciso" },
  natura: { material: "argilla", second: "ceramica", forms: ["goccia", "blob", "capsula"], relief: "gonfio" },
  oceano: { material: "vetro", second: "cromo", forms: ["goccia", "toro", "sfera"], relief: "smalto" },
  tramonto: { material: "ceramica", second: "metallo", forms: ["sfera", "arco", "moneta"], relief: "gonfio" },
  pastello: { material: "gomma", second: "argilla", forms: ["blob", "capsula", "toro"], relief: "gonfio" },
  neon: { material: "luminoso", second: "cromo", forms: ["toro", "anello", "nodo"], relief: "smalto" },
  retro: { material: "plastica", second: "ceramica", forms: ["toro", "molecola", "cono"], relief: "gonfio" },
  laboratorio: { material: "vetro", second: "satinato", forms: ["molecola", "capsula", "cilindro"], relief: "smalto" },
  pergamena: { material: "metallo", second: "marmo", forms: ["moneta", "gemma", "arco"], relief: "inciso" },
  galleria: { material: "marmo", second: "cromo", forms: ["torsione", "cubo", "sfera"], relief: "inciso" },
  palco: { material: "iridescente", second: "luminoso", forms: ["gemma", "nodo", "sfera"], relief: "smalto" },
  stadio: { material: "gomma", second: "plastica", forms: ["sfera", "cilindro", "capsula"], relief: "gonfio" },
  trattoria: { material: "ceramica", second: "argilla", forms: ["goccia", "moneta", "blob"], relief: "gonfio" },
  orizzonte: { material: "satinato", second: "vetro", forms: ["piramide", "arco", "goccia"], relief: "gonfio" },
  benessere: { material: "argilla", second: "vetro", forms: ["blob", "goccia", "sfera"], relief: "gonfio" },
};

export const style3D = (id: string | undefined): Style3D => THEME_3D[(id ?? "notte") as ThemeId] ?? THEME_3D.notte;

/** The materials and forms a presentation's objects are made of: chosen by Zib or by hand, else the theme's. */
export type Look3D = Pick<Style3D, "material" | "second" | "forms">;

export const lookOf = (doc: PresentationDoc): Look3D => doc.settings?.look3d ?? style3D(doc.settings?.theme);

/** Re-makes one page's objects from the `from` look into the `to` look; objects picked by hand stay. */
export function relookPage(page: Page, from: Look3D, to: Look3D): Page {
  if (!page.elements.some((e) => e.type === "object3d")) return page;
  return {
    ...page,
    elements: page.elements.map((e): Element => {
      if (e.type !== "object3d") return e;
      const material = e.material === from.material ? to.material : e.material === from.second ? to.second : e.material;
      const i = from.forms.indexOf(e.form);
      return { ...e, material, form: i >= 0 ? to.forms[i] : e.form };
    }),
  };
}

/** Gives every page the new look and remembers it, so pages added later get it too. */
export function applyLook3D(doc: PresentationDoc, to: Look3D): PresentationDoc {
  const from = lookOf(doc);
  return {
    ...doc,
    pages: doc.pages.map((p) => relookPage(p, from, to)),
    settings: { ...doc.settings, autoAdvance: doc.settings?.autoAdvance ?? 0, look3d: to },
  };
}
