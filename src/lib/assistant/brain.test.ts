import { describe, expect, it } from "vitest";
import { brainAnswer, type ChatMessage } from "./brain";
import { buildDeck, parseDeck, planDeck, serializeDeck } from "../editor/deck";
import { documentSchema } from "../editor/schema";

const ask = (q: string, history: ChatMessage[] = []) => brainAnswer([...history, { role: "user", content: q }]);
const deckIn = (answer: string) => parseDeck(answer.match(/\[\[crea\|([^\]]+)\]\]/)?.[1]);

describe("Zib's brain", () => {
  it("understands questions without accents and with a typo", () => {
    expect(ask("come aggiungo un animazzione?")).toMatch(/Animazione/);
    expect(ask("perche non mi arriva il codice 2fa")).toMatch(/verifica in due passaggi/);
  });

  it("answers two topics in one question", () => {
    const a = ask("come cambio il font e la transizione?");
    expect(a).toMatch(/32 caratteri/);
    expect(a).toMatch(/transizione d'ingresso/);
  });

  it("follows up on the previous question", () => {
    const history: ChatMessage[] = [
      { role: "user", content: "come funzionano i temi?" },
      { role: "assistant", content: "Ci sono 11 temi…" },
    ];
    expect(ask("e come lo cambio?", history)).toMatch(/sezione Tema/);
  });

  it("plans a presentation on request, with a fitting theme and a create button", () => {
    const a = ask("fammi una presentazione sul sistema solare");
    const deck = deckIn(a);
    expect(deck?.title).toBe("Sistema solare");
    expect(deck?.theme).toBe("aurora");
    expect(a).toMatch(/\{\{.+\}\}/);
  });

  it("picks the kind of presentation and the theme from the request", () => {
    expect(deckIn(ask("crea un pitch per la mia startup"))?.theme).toBe("ardesia");
    expect(deckIn(ask("mi serve un quiz sugli animali"))?.pages.filter((p) => p.layout === "domanda").length).toBe(3);
    expect(deckIn(ask("prepara una presentazione sui videogiochi in stile Retrò"))?.theme).toBe("inchiostro");
  });

  it("matches whole words: fotosintesi is a science lesson, not a thesis", () => {
    const deck = deckIn(ask("fammi una presentazione sulla fotosintesi"));
    expect(deck?.theme).toBe("foresta");
    expect(deck?.pages.some((p) => p.layout === "domanda")).toBe(true);
    expect(deckIn(ask("prepara la presentazione della mia tesi sulla ricerca"))?.theme).toBe("nordico");
  });

  it("changes the theme of the outline it just proposed", () => {
    const first = ask("fammi una presentazione sulla fotosintesi");
    const second = ask("cambia tema in Inchiostro", [
      { role: "user", content: "fammi una presentazione sulla fotosintesi" },
      { role: "assistant", content: first },
    ]);
    expect(deckIn(second)?.theme).toBe("inchiostro");
    expect(deckIn(second)?.title).toBe(deckIn(first)?.title);
  });

  it("asks for the topic when it is missing", () => {
    expect(ask("creami una presentazione")).toMatch(/Su che argomento/);
  });

  it("never fails on anything", () => {
    for (const q of ["", "???", "a".repeat(1200), "[[crea|x]]", "{{}}", "ciao"]) expect(typeof ask(q)).toBe("string");
  });
});

describe("outlines", () => {
  it("round-trip through their text form and build valid documents", () => {
    for (const topic of ["il sistema solare", "la mia startup", "la Divina Commedia", "una storia a bivi sul mare"]) {
      const spec = planDeck(topic);
      expect(parseDeck(serializeDeck(spec))).toEqual(spec);
      expect(documentSchema.safeParse(buildDeck(spec)).success).toBe(true);
    }
  });

  it("reject anything malformed or out of bounds", () => {
    for (const bad of ["", "Titolo", "Titolo|tema-finto|copertina=A", "Titolo|notte|layout-finto=A", "Titolo|notte|copertina=A|extra", `Titolo|notte|${Array(13).fill("copertina=A").join(";")}`, 42, null]) {
      expect(parseDeck(bad), String(bad)).toBeNull();
    }
  });

  it("strip the separators from user text", () => {
    const spec = parseDeck("Titolo [x]|notte|copertina=Ciao {mondo}");
    expect(spec?.title).toBe("Titolo x");
    expect(spec?.pages[0].heading).toBe("Ciao mondo");
  });
});
