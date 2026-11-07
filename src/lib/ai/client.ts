import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { env } from "@/lib/env";

/**
 * One way for Zib to talk to a language model, whatever the provider.
 *
 * Free options come first: Google Gemini (free tier of the Gemini API), Groq
 * (free tier, Llama and other open models) or OpenRouter (models marked
 * ":free"). They all speak the OpenAI chat-completions protocol, so plain
 * fetch is enough: no extra package. Anthropic stays available for whoever
 * sets its key. Without any key Zib keeps its on-board brain.
 *
 * Every answer that builds something (a presentation) is validated with zod
 * by the caller, so a confused model can never write invalid data.
 */

type Msg = { role: "user" | "assistant"; content: string };

type OpenAiProvider = { name: "gemini" | "groq" | "openrouter"; base: string; key: string; model: string };
type Provider = OpenAiProvider | { name: "anthropic"; key: string; model: string };

const DEFAULT_MODEL = {
  gemini: "gemini-2.5-flash",
  groq: "llama-3.3-70b-versatile",
  openrouter: "meta-llama/llama-3.3-70b-instruct:free",
  anthropic: "claude-opus-5-5",
} as const;

const BASE = {
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai",
  groq: "https://api.groq.com/openai/v1",
  openrouter: "https://openrouter.ai/api/v1",
} as const;

/** The provider in use: the one named in AI_PROVIDER, else the first free one with a key, else Anthropic. */
export function provider(): Provider | null {
  const keys = { gemini: env.GEMINI_API_KEY ?? env.GOOGLE_API_KEY ?? env.GOOGLE_GENERATIVE_AI_API_KEY, groq: env.GROQ_API_KEY, openrouter: env.OPENROUTER_API_KEY, anthropic: env.ANTHROPIC_API_KEY };
  const order = env.AI_PROVIDER ? [env.AI_PROVIDER] : (["gemini", "groq", "openrouter", "anthropic"] as const);
  for (const name of order) {
    const key = keys[name];
    if (!key) continue;
    const model = env.AI_MODEL ?? DEFAULT_MODEL[name];
    return name === "anthropic" ? { name, key, model } : { name, key, model, base: BASE[name] };
  }
  return null;
}

export const aiAvailable = () => provider() !== null;

let anthropic: Anthropic | null = null;
const anthropicClient = (key: string) => (anthropic ??= new Anthropic({ apiKey: key }));

async function openAi(p: OpenAiProvider, body: Record<string, unknown>, signal?: AbortSignal) {
  const res = await fetch(`${p.base}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${p.key}`, ...(p.name === "openrouter" ? { "X-Title": "Lumora" } : {}) },
    body: JSON.stringify({ model: p.model, ...body }),
    signal: signal ?? AbortSignal.timeout(90_000),
  });
  if (!res.ok) throw new Error(`${p.name} ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res;
}

/** Streams an answer, chunk by chunk. */
export async function* streamChat(o: { system: string; messages: Msg[]; maxTokens: number }): AsyncGenerator<string> {
  const p = provider();
  if (!p) return;
  if (p.name === "anthropic") {
    const stream = anthropicClient(p.key).messages.stream({ model: p.model, max_tokens: o.maxTokens, system: o.system, messages: o.messages });
    for await (const ev of stream) if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") yield ev.delta.text;
    return;
  }
  const res = await openAi(p, { stream: true, max_tokens: o.maxTokens, messages: [{ role: "system", content: o.system }, ...o.messages] });
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") return;
      try {
        const text = JSON.parse(data)?.choices?.[0]?.delta?.content;
        if (typeof text === "string" && text) yield text;
      } catch {
        // A keep-alive or a partial line: skip it.
      }
    }
  }
}

/** A whole answer as text. */
export async function chatText(o: { system: string; prompt: string; maxTokens: number }): Promise<string> {
  let out = "";
  for await (const chunk of streamChat({ system: o.system, messages: [{ role: "user", content: o.prompt }], maxTokens: o.maxTokens })) out += chunk;
  return out.trim();
}

/** Takes the first JSON object out of a text (models sometimes wrap it in ```json fences or a sentence). */
export function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

/**
 * Asks for structured data through a tool (function) call and validates it.
 * Returns null when the model fails or answers something invalid.
 */
export async function chatJson<T extends z.ZodTypeAny>(o: { system: string; prompt: string; maxTokens: number; tool: string; description: string; schema: T }): Promise<z.infer<T> | null> {
  const p = provider();
  if (!p) return null;
  const parameters = z.toJSONSchema(o.schema, { target: "draft-7" }) as Record<string, unknown>;
  try {
    let input: unknown;
    if (p.name === "anthropic") {
      const res = await anthropicClient(p.key).messages.create({
        model: p.model,
        max_tokens: o.maxTokens,
        system: o.system,
        tools: [{ name: o.tool, description: o.description, input_schema: parameters as Anthropic.Tool.InputSchema }],
        tool_choice: { type: "tool", name: o.tool },
        messages: [{ role: "user", content: o.prompt }],
      });
      const call = res.content.find((b) => b.type === "tool_use");
      input = call && call.type === "tool_use" ? call.input : null;
    } else {
      const res = await openAi(p, {
        max_tokens: o.maxTokens,
        messages: [
          { role: "system", content: o.system },
          { role: "user", content: o.prompt },
        ],
        tools: [{ type: "function", function: { name: o.tool, description: o.description, parameters } }],
        tool_choice: { type: "function", function: { name: o.tool } },
      });
      const json = await res.json();
      const msg = json?.choices?.[0]?.message;
      const args = msg?.tool_calls?.[0]?.function?.arguments;
      input = typeof args === "string" ? extractJson(args) : (args ?? extractJson(String(msg?.content ?? "")));
    }
    const parsed = o.schema.safeParse(input);
    if (!parsed.success) console.error("ai answer not valid", parsed.error.issues.slice(0, 3));
    return parsed.success ? parsed.data : null;
  } catch (err) {
    console.error("ai call failed", err instanceof Error ? err.message : err);
    return null;
  }
}
