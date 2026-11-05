import type { Element, ElementType, Page, PresentationDoc, Transition } from "@/lib/editor/schema";
import { blankPage, CANVAS_H, CANVAS_W, newId } from "@/lib/editor/schema";
import { buildLayout, type LayoutId } from "@/lib/editor/layouts";
import { applyTheme, getTheme, type ThemeId } from "@/lib/editor/themes";
import type { ShapeId } from "@/lib/editor/shapes";
import { applyMotif, decoratePage, type MotifId } from "@/lib/editor/motifs";
import { photoElement, withCreditsPage, type FreePhoto } from "@/lib/editor/photos";

export type EditorState = {
  doc: PresentationDoc;
  pageId: string;
  selectedId: string | null;
  past: PresentationDoc[];
  future: PresentationDoc[];
  /** Incremented on every document change; drives autosave. */
  revision: number;
};

export type Action =
  | { type: "select"; id: string | null }
  | { type: "goto-page"; pageId: string }
  | { type: "add-page"; layout?: LayoutId }
  | { type: "duplicate-page"; pageId: string }
  | { type: "delete-page"; pageId: string }
  | { type: "move-page"; pageId: string; dir: -1 | 1 }
  | { type: "update-page"; patch: Partial<Omit<Page, "id" | "elements">> }
  | { type: "add-element"; kind: ElementType; src?: string; alt?: string; shape?: ShapeId }
  | { type: "update-element"; id: string; patch: Partial<Element>; /** merge into the previous history step (drag) */ coalesce?: boolean }
  | { type: "delete-element"; id: string }
  | { type: "duplicate-element"; id: string }
  | { type: "reorder-element"; id: string; to: "front" | "back" | "forward" | "backward" }
  | { type: "align"; id: string; to: Align }
  | { type: "paste"; element: Element }
  | { type: "transition-all"; transition: Transition }
  | { type: "settings"; autoAdvance: number }
  | { type: "apply-theme"; theme: ThemeId }
  | { type: "apply-motif"; motif: MotifId | undefined }
  /** A free photo: replaces the selected photo space or image, otherwise it is added to the page. */
  | { type: "set-photo"; photo: FreePhoto; targetId?: string | null }
  | { type: "undo" }
  | { type: "redo" };

export type Align = "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom";

const HISTORY = 100;

export function initState(doc: PresentationDoc): EditorState {
  return { doc, pageId: doc.pages[0].id, selectedId: null, past: [], future: [], revision: 0 };
}

export function currentPage(state: EditorState): Page {
  return state.doc.pages.find((p) => p.id === state.pageId) ?? state.doc.pages[0];
}

function commit(state: EditorState, doc: PresentationDoc, extra: Partial<EditorState> = {}, coalesce = false): EditorState {
  const past = coalesce ? state.past : [...state.past, state.doc].slice(-HISTORY);
  return { ...state, ...extra, doc, past, future: [], revision: state.revision + 1 };
}

function mapPage(doc: PresentationDoc, pageId: string, fn: (p: Page) => Page): PresentationDoc {
  return { ...doc, pages: doc.pages.map((p) => (p.id === pageId ? fn(p) : p)) };
}

const baseEl = () => ({
  id: newId(),
  rotation: 0,
  opacity: 1,
  hidden: false,
  locked: false,
  animation: { enter: "fade" as const, emphasis: "none" as const, duration: 0.6, delay: 0 },
  interaction: null,
});

function createElement(kind: ElementType, src?: string, alt = "", shape: ShapeId = "rect"): Element {
  const cx = CANVAS_W / 2;
  const cy = CANVAS_H / 2;
  switch (kind) {
    case "text":
      return { ...baseEl(), type: "text", x: cx - 400, y: cy - 60, w: 800, h: 120, text: "Scrivi qui il tuo testo", fontSize: 56, color: "#1d1a3a", align: "left", weight: "600", font: "display" };
    case "shape":
      // Most shapes look right in a square box; rectangles, arrows and lines are wider.
      const wide = shape === "rect" || shape === "arrow" || shape === "double-arrow" || shape === "line" || shape === "ribbon" || shape === "wave";
      return { ...baseEl(), type: "shape", x: cx - (wide ? 200 : 150), y: cy - 150, w: wide ? 400 : 300, h: shape === "line" ? 40 : 300, shape, fill: "#5b3df5", radius: shape === "rect" ? 32 : 0 };
    case "image":
      return { ...baseEl(), type: "image", x: cx - 320, y: cy - 200, w: 640, h: 400, src: src ?? "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1280", alt, fit: "cover", radius: 24 };
    case "button":
      return { ...baseEl(), type: "button", x: cx - 160, y: cy - 45, w: 320, h: 90, label: "Scopri di più", fill: "#5b3df5", color: "#ffffff", fontSize: 32 };
    case "hotspot":
      return {
        ...baseEl(),
        type: "hotspot",
        x: cx - 40,
        y: cy - 40,
        w: 80,
        h: 80,
        fill: "#ffb547",
        label: "+",
        animation: { enter: "pop", emphasis: "none", duration: 0.5, delay: 0 },
        interaction: { trigger: "click", action: { kind: "popup", title: "Lo sapevi?", body: "Scrivi qui il contenuto che appare al clic." } },
      };
  }
}

/** Removes references to elements/pages that no longer exist. */
function pruneRefs(doc: PresentationDoc): PresentationDoc {
  const pageIds = new Set(doc.pages.map((p) => p.id));
  return {
    ...doc,
    pages: doc.pages.map((p) => {
      const ids = new Set(p.elements.map((e) => e.id));
      return {
        ...p,
        elements: p.elements.map((e) => {
          const a = e.interaction?.action;
          const dangling = (a?.kind === "goto" && !pageIds.has(a.pageId)) || (a?.kind === "reveal" && !ids.has(a.targetId));
          return dangling ? { ...e, interaction: null } : e;
        }),
      };
    }),
  };
}

export function reducer(state: EditorState, action: Action): EditorState {
  const page = currentPage(state);
  switch (action.type) {
    case "select":
      return { ...state, selectedId: action.id };
    case "goto-page":
      return { ...state, pageId: action.pageId, selectedId: null };
    case "add-page": {
      // A layout is drawn in the presentation's theme; without one, an empty page.
      const theme = getTheme(state.doc.settings?.theme);
      const motif = state.doc.settings?.motif;
      const built = action.layout ? buildLayout(action.layout, theme, undefined, { motif }) : blankPage(`Pagina ${state.doc.pages.length + 1}`);
      const p = action.layout && motif ? decoratePage(built, motif, theme, state.doc.pages.length) : built;
      const idx = state.doc.pages.findIndex((x) => x.id === page.id);
      const pages = [...state.doc.pages];
      pages.splice(idx + 1, 0, p);
      return commit(state, { ...state.doc, pages }, { pageId: p.id, selectedId: null });
    }
    case "duplicate-page": {
      const src = state.doc.pages.find((p) => p.id === action.pageId);
      if (!src) return state;
      const idMap = new Map(src.elements.map((e) => [e.id, newId()]));
      const copy: Page = {
        ...structuredClone(src),
        id: newId(),
        name: `${src.name} (copia)`.slice(0, 80),
        elements: src.elements.map((e) => {
          const c = structuredClone(e);
          c.id = idMap.get(e.id)!;
          if (c.interaction?.action.kind === "reveal") c.interaction.action.targetId = idMap.get(c.interaction.action.targetId) ?? c.interaction.action.targetId;
          return c;
        }),
      };
      const idx = state.doc.pages.findIndex((x) => x.id === src.id);
      const pages = [...state.doc.pages];
      pages.splice(idx + 1, 0, copy);
      return commit(state, { ...state.doc, pages }, { pageId: copy.id, selectedId: null });
    }
    case "delete-page": {
      if (state.doc.pages.length <= 1) return state;
      const idx = state.doc.pages.findIndex((p) => p.id === action.pageId);
      const pages = state.doc.pages.filter((p) => p.id !== action.pageId);
      const nextPage = pages[Math.max(0, idx - 1)];
      return commit(state, pruneRefs({ ...state.doc, pages }), { pageId: nextPage.id, selectedId: null });
    }
    case "move-page": {
      const idx = state.doc.pages.findIndex((p) => p.id === action.pageId);
      const to = idx + action.dir;
      if (idx < 0 || to < 0 || to >= state.doc.pages.length) return state;
      const pages = [...state.doc.pages];
      [pages[idx], pages[to]] = [pages[to], pages[idx]];
      return commit(state, { ...state.doc, pages });
    }
    case "update-page":
      return commit(state, mapPage(state.doc, page.id, (p) => ({ ...p, ...action.patch })));
    case "add-element": {
      const el = createElement(action.kind, action.src, action.alt, action.shape);
      // Elements added one after another are cascaded instead of stacking on the same spot.
      for (let i = 0; i < 12 && page.elements.some((e) => e.x === el.x && e.y === el.y); i++) {
        el.x += 40;
        el.y += 40;
      }
      return commit(state, mapPage(state.doc, page.id, (p) => ({ ...p, elements: [...p.elements, el] })), { selectedId: el.id });
    }
    case "update-element":
      return commit(
        state,
        mapPage(state.doc, page.id, (p) => ({
          ...p,
          elements: p.elements.map((e) => (e.id === action.id ? ({ ...e, ...action.patch } as Element) : e)),
        })),
        {},
        action.coalesce,
      );
    case "delete-element":
      return commit(
        state,
        pruneRefs(mapPage(state.doc, page.id, (p) => ({ ...p, elements: p.elements.filter((e) => e.id !== action.id) }))),
        { selectedId: null },
      );
    case "duplicate-element": {
      const src = page.elements.find((e) => e.id === action.id);
      if (!src) return state;
      const copy = { ...structuredClone(src), id: newId(), x: src.x + 40, y: src.y + 40 };
      return commit(state, mapPage(state.doc, page.id, (p) => ({ ...p, elements: [...p.elements, copy] })), { selectedId: copy.id });
    }
    case "reorder-element": {
      const els = [...page.elements];
      const idx = els.findIndex((e) => e.id === action.id);
      if (idx < 0) return state;
      const [el] = els.splice(idx, 1);
      const to =
        action.to === "front" ? els.length : action.to === "back" ? 0 : action.to === "forward" ? Math.min(els.length, idx + 1) : Math.max(0, idx - 1);
      els.splice(to, 0, el);
      return commit(state, mapPage(state.doc, page.id, (p) => ({ ...p, elements: els })));
    }
    case "align": {
      const el = page.elements.find((e) => e.id === action.id);
      if (!el || el.locked) return state;
      const patch: Partial<Element> =
        action.to === "left" ? { x: 0 }
        : action.to === "hcenter" ? { x: Math.round((CANVAS_W - el.w) / 2) }
        : action.to === "right" ? { x: CANVAS_W - el.w }
        : action.to === "top" ? { y: 0 }
        : action.to === "vcenter" ? { y: Math.round((CANVAS_H - el.h) / 2) }
        : { y: CANVAS_H - el.h };
      return reducer(state, { type: "update-element", id: el.id, patch });
    }
    case "paste": {
      // New id; a "reveal" pointing at another page's element is dropped by pruneRefs.
      const copy = { ...structuredClone(action.element), id: newId(), x: action.element.x + 30, y: action.element.y + 30 };
      return commit(state, pruneRefs(mapPage(state.doc, page.id, (p) => ({ ...p, elements: [...p.elements, copy] }))), { selectedId: copy.id });
    }
    case "transition-all":
      return commit(state, { ...state.doc, pages: state.doc.pages.map((p) => ({ ...p, transition: action.transition })) });
    case "settings":
      return commit(state, { ...state.doc, settings: { ...state.doc.settings, autoAdvance: Math.max(0, Math.min(300, Math.round(action.autoAdvance))) } });
    case "apply-theme":
      return commit(state, applyTheme(state.doc, action.theme));
    case "apply-motif":
      return commit(state, applyMotif(state.doc, action.motif), { selectedId: null });
    case "set-photo": {
      const target = page.elements.find((e) => e.id === action.targetId && (e.type === "image" || (e.type === "shape" && e.photoSlot)));
      if (target) {
        return commit(state, withCreditsPage(mapPage(state.doc, page.id, (p) => ({ ...p, elements: p.elements.map((e) => (e.id === target.id ? photoElement(e, action.photo) : e)) }))), { selectedId: target.id });
      }
      const el = photoElement(createElement("image"), action.photo);
      // Keep the photo's own proportions inside a 640-wide box.
      el.h = Math.round(Math.min(640, (640 * action.photo.height) / action.photo.width));
      el.y = Math.round((CANVAS_H - el.h) / 2);
      return commit(state, withCreditsPage(mapPage(state.doc, page.id, (p) => ({ ...p, elements: [...p.elements, el] }))), { selectedId: el.id });
    }
    case "undo": {
      const prev = state.past.at(-1);
      if (!prev) return state;
      const pageId = prev.pages.some((p) => p.id === state.pageId) ? state.pageId : prev.pages[0].id;
      return { ...state, doc: prev, past: state.past.slice(0, -1), future: [state.doc, ...state.future], pageId, selectedId: null, revision: state.revision + 1 };
    }
    case "redo": {
      const next = state.future[0];
      if (!next) return state;
      const pageId = next.pages.some((p) => p.id === state.pageId) ? state.pageId : next.pages[0].id;
      return { ...state, doc: next, past: [...state.past, state.doc], future: state.future.slice(1), pageId, selectedId: null, revision: state.revision + 1 };
    }
  }
}
