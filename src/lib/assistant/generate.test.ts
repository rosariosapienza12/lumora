import { describe, expect, it } from "vitest";
import { docFromGenerated, generatedDeckSchema } from "./generate";
import { documentSchema } from "../editor/schema";

const answer = {
  title: "Le api",
  theme: "natura",
  decor: ["leaf", "sun", "not-a-shape", "flower"],
  pages: [
    { layout: "copertina", content: { heading: "Le api", subtitle: "Piccole operaie che nutrono il mondo" } },
    { layout: "processo", content: { heading: "Dal fiore al miele", items: [{ title: "Raccolta", text: "Le bottinatrici raccolgono nettare e polline." }, { title: "Trasformazione", text: "Gli enzimi trasformano il nettare." }, { title: "Conservazione", text: "Il miele viene sigillato nelle celle di cera." }] }, notes: "Fonte: FAO, rapporti sugli impollinatori." },
    { layout: "percentuale", content: { heading: "Quanto contano", stats: [{ value: "75%", label: "delle colture alimentari", text: "dipende in parte dagli impollinatori." }], highlight: "Fonte: FAO" } },
    { layout: "inventato", content: { heading: "Pagina sconosciuta" } },
    { layout: "domanda", content: { question: { text: "Chi depone le uova nell'alveare?", right: "La regina", wrong: "Le operaie", explanation: "La regina è l'unica femmina fertile." } } },
    { layout: "chiusura", content: { heading: "Grazie!" } },
  ],
};

describe("presentations written by Zib", () => {
  it("become valid documents with real content, notes and the chosen drawings", () => {
    const built = docFromGenerated(generatedDeckSchema.parse(answer));
    expect(built).not.toBeNull();
    const { doc } = built!;
    expect(documentSchema.safeParse(doc).success).toBe(true);
    expect(doc.pages).toHaveLength(5); // the unknown layout is dropped
    expect(doc.settings?.decor).toEqual(["leaf", "sun"]);
    expect(JSON.stringify(doc)).toContain("Le bottinatrici raccolgono nettare e polline.");
    expect(doc.pages[1].notes).toContain("FAO");
    const arc = doc.pages[2].elements.find((e) => e.type === "shape" && e.shape === "arc");
    expect(arc).toMatchObject({ progress: 75 });
    expect(doc.pages[1].source?.layout).toBe("processo");
  });

  it("rejects answers that are too long or malformed", () => {
    expect(generatedDeckSchema.safeParse({ ...answer, title: "x".repeat(200) }).success).toBe(false);
    expect(generatedDeckSchema.safeParse({ ...answer, pages: [] }).success).toBe(false);
    expect(docFromGenerated(generatedDeckSchema.parse({ ...answer, pages: answer.pages.slice(3, 4).concat(answer.pages.slice(3, 4), answer.pages.slice(3, 4)) }))).toBeNull();
  });
});
