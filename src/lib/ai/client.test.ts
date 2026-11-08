import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({ env: { GEMINI_API_KEY: "test-key-test-key-test-key-1234" } }));

const { chatJson, extractJson, provider, streamChat } = await import("./client");

const sse = (chunks: string[]) =>
  new Response(
    new ReadableStream({
      start(c) {
        for (const t of chunks) c.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ choices: [{ delta: { content: t } }] })}\n\n`));
        c.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
        c.close();
      },
    }),
  );

afterEach(() => vi.restoreAllMocks());

describe("free AI client", () => {
  it("picks the free Gemini provider when its key is set", () => {
    expect(provider()).toMatchObject({ name: "gemini", model: "gemini-flash-lite-latest" });
  });

  it("streams an OpenAI-compatible answer chunk by chunk", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(sse(["Ciao", ", sono ", "Zib"]));
    let out = "";
    for await (const c of streamChat({ system: "s", messages: [{ role: "user", content: "ciao" }], maxTokens: 50 })) out += c;
    expect(out).toBe("Ciao, sono Zib");
    expect(String(fetch.mock.calls[0][0])).toContain("generativelanguage.googleapis.com");
    expect((fetch.mock.calls[0][1]?.headers as Record<string, string>).Authorization).toBe("Bearer test-key-test-key-test-key-1234");
  });

  it("returns validated tool-call data, and null for invalid data", async () => {
    const schema = z.object({ title: z.string(), pages: z.number().int() });
    const answer = (args: unknown) => new Response(JSON.stringify({ choices: [{ message: { tool_calls: [{ function: { name: "t", arguments: JSON.stringify(args) } }] } }] }));
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(answer({ title: "Il Colosseo", pages: 9 }));
    expect(await chatJson({ system: "s", prompt: "p", maxTokens: 10, tool: "t", description: "d", schema })).toEqual({ title: "Il Colosseo", pages: 9 });
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(answer({ title: 3 }));
    expect(await chatJson({ system: "s", prompt: "p", maxTokens: 10, tool: "t", description: "d", schema })).toBeNull();
  });

  it("a quota error never throws out of chatJson", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("quota", { status: 429 }));
    expect(await chatJson({ system: "s", prompt: "p", maxTokens: 10, tool: "t", description: "d", schema: z.object({}) })).toBeNull();
  });

  it("finds JSON wrapped in text or code fences", () => {
    expect(extractJson('Ecco:\n```json\n{"a": 1}\n```')).toEqual({ a: 1 });
    expect(extractJson("niente")).toBeNull();
  });
});

describe("backup models", () => {
  it("moves on to the next model when one is retired", async () => {
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("not found", { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { tool_calls: [{ function: { arguments: '{"ok":true}' } }] } }] })));
    expect(await chatJson({ system: "s", prompt: "p", maxTokens: 5, tool: "t", description: "d", schema: z.object({ ok: z.boolean() }) })).toEqual({ ok: true });
    expect(JSON.parse(String(fetch.mock.calls[1][1]?.body)).model).toBe("gemini-flash-latest");
  });
});

describe("key formats", () => {
  it("accepts the newer Google key format with dots", () => {
    expect(/^[A-Za-z0-9._-]{20,200}$/.test("AQ.Ab8RN6Iexample-key_with.dots1234567890abcdef")).toBe(true);
  });
});
