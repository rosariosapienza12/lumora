import { describe, expect, it } from "vitest";
import { initState, reducer, currentPage, restyle } from "./store";
import { applyMotif } from "@/lib/editor/motifs";
import { buildTemplate } from "@/lib/editor/templates";
import { buildLayout } from "@/lib/editor/layouts";
import { documentSchema, type PresentationDoc } from "@/lib/editor/schema";
import { getTheme, needsRestyle } from "@/lib/editor/themes";

const words = { heading: "Il ciclo dell'acqua", items: [{ title: "Evaporazione", text: "Il sole scalda il mare." }, { title: "Condensazione", text: "Il vapore forma le nuvole." }, { title: "Precipitazione", text: "Piove." }] };
const docWith = (): PresentationDoc => ({ version: 1, pages: [buildLayout("processo", getTheme("oceano"), words)], settings: { autoAdvance: 0, theme: "oceano" } });
const texts = (doc: PresentationDoc) => JSON.stringify(doc.pages[0].elements.filter((e) => e.type === "text").map((e) => (e.type === "text" ? e.text : "")));

describe("editor actions", () => {
  it("Cambia impaginazione redraws the same words in another layout, and undo brings it back", () => {
    const s0 = initState(docWith());
    const s1 = reducer(s0, { type: "relayout" });
    expect(currentPage(s1).source?.layout).not.toBe("processo");
    expect(currentPage(s1).id).toBe(currentPage(s0).id);
    for (const w of ["Evaporazione", "Condensazione", "Precipitazione"]) expect(texts(s1.doc)).toContain(w);
    expect(documentSchema.safeParse(s1.doc).success).toBe(true);
    expect(currentPage(reducer(s1, { type: "undo" })).source?.layout).toBe("processo");
  });

  it("a main colour is replaced everywhere it is used", () => {
    const s0 = initState(docWith());
    const old = getTheme("oceano").palette.accent;
    const s1 = reducer(s0, { type: "main-color", role: "accent", color: "#aa00ff" });
    expect(JSON.stringify(s1.doc).toLowerCase()).not.toContain(old.toLowerCase());
    expect(s1.doc.settings?.colors?.accent).toBe("#aa00ff");
    // A second change starts from the colour picked before.
    const s2 = reducer(s1, { type: "main-color", role: "accent", color: "#00aa55" });
    expect(JSON.stringify(s2.doc)).not.toContain("#aa00ff\"");
  });

  it("background textures go on one page or all of them", () => {
    const doc = { ...docWith(), pages: [...docWith().pages, ...docWith().pages.map((p) => ({ ...p, id: "secondpage" }))] };
    const one = reducer(initState(doc), { type: "pattern", pattern: "dots" });
    expect(one.doc.pages.map((p) => p.pattern)).toEqual(["dots", doc.pages[1].pattern]);
    const all = reducer(initState(doc), { type: "pattern", pattern: "grid", all: true });
    expect(all.doc.pages.every((p) => p.pattern === "grid")).toBe(true);
  });

  it("decoration density changes how many decorations each page gets", () => {
    const withTopic = reducer(initState(docWith()), { type: "apply-motif", motif: "mare" });
    const none = reducer(withTopic, { type: "decor-density", density: 0 });
    const many = reducer(withTopic, { type: "decor-density", density: 3 });
    const count = (d: PresentationDoc) => d.pages[0].elements.filter((e) => e.decor).length;
    expect(count(none.doc)).toBe(0);
    expect(count(many.doc)).toBeGreaterThanOrEqual(count(withTopic.doc));
  });
});

describe("restyle", () => {
  it("re-assembles an old presentation in the clean style without losing pages, links or hand edits", () => {
    const base = applyMotif(buildTemplate("lezione", "Prova", "notte"), "spazio");
    const edited = { ...base, pages: base.pages.map((p, i) => (i === 1 ? { ...p, elements: p.elements.map((e) => (e.type === "text" && e.weight === "800" ? { ...e, text: "Il mio titolo scritto a mano" } : e)) } : p)) };
    expect(needsRestyle(edited)).toBe(true);
    const next = restyle(edited);
    expect(needsRestyle(next)).toBe(false);
    expect(next.settings?.theme).toBe("aurora");
    expect(next.pages).toHaveLength(edited.pages.length);
    expect(next.pages.flatMap((p) => p.elements).some((e) => e.decor)).toBe(false);
    expect(next.pages[1].elements.some((e) => e.type === "text" && e.text === "Il mio titolo scritto a mano")).toBe(true);
    const links = (d: typeof next) => d.pages.flatMap((p) => p.elements).filter((e) => e.type === "button" && e.interaction?.action.kind === "goto").length;
    expect(links(next)).toBe(links(edited));
    expect(documentSchema.safeParse(next).success).toBe(true);
  });
});

describe("smart layouts", () => {
  const list = { heading: "Perché riciclare", items: [{ title: "Meno rifiuti", text: "Le discariche si riempiono più piano." }, { title: "Meno energia", text: "Rifondere costa meno che estrarre." }] };
  const start = (): PresentationDoc => ({ version: 1, pages: [buildLayout("elenco", getTheme("aurora"), list)], settings: { autoAdvance: 0, theme: "aurora" } });
  const textsOf = (d: PresentationDoc) => d.pages[0].elements.flatMap((e) => (e.type === "text" ? [e.text] : []));

  it("texts know which field they show", () => {
    const binds = start().pages[0].elements.flatMap((e) => (e.type === "text" && e.bind ? [e.bind] : []));
    expect(binds).toEqual(expect.arrayContaining(["heading", "items.0.title", "items.1.text"]));
  });

  it("an edit on the page updates the page's words, so re-composing keeps it", () => {
    let s = initState(start());
    const title = s.doc.pages[0].elements.find((e) => e.type === "text" && e.bind === "items.0.title")!;
    s = reducer(s, { type: "update-element", id: title.id, patch: { text: "Meno plastica in mare" } });
    expect(s.doc.pages[0].source?.content.items?.[0].title).toBe("Meno plastica in mare");
    s = reducer(s, { type: "page-content", content: { ...s.doc.pages[0].source!.content, items: [...s.doc.pages[0].source!.content.items!, { title: "Nuovi posti di lavoro", text: "Il riciclo è un'industria." }] } });
    expect(textsOf(s.doc)).toEqual(expect.arrayContaining(["Meno plastica in mare", "Nuovi posti di lavoro"]));
  });

  it("adding a point re-composes the page and keeps what was added by hand, id and notes", () => {
    let s = initState(start());
    const id = s.doc.pages[0].id;
    s = reducer(s, { type: "update-page", patch: { notes: "Ricorda l'esempio di Milano." } });
    s = reducer(s, { type: "add-element", kind: "text" });
    const before = s.doc.pages[0].elements.length;
    s = reducer(s, { type: "page-content", content: { ...list, items: [...list.items, { title: "Terzo", text: "Un altro motivo." }] } });
    const page = s.doc.pages[0];
    expect(page.id).toBe(id);
    expect(page.notes).toBe("Ricorda l'esempio di Milano.");
    expect(page.elements.some((e) => e.type === "text" && e.text === "Scrivi qui il tuo testo" && e.extra)).toBe(true);
    expect(page.elements.length).toBeGreaterThan(before);
    expect(documentSchema.safeParse(s.doc).success).toBe(true);
    s = reducer(s, { type: "undo" });
    expect(s.doc.pages[0].elements.length).toBe(before);
  });
});
