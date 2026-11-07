import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { pageContext, SYSTEM_PROMPT } from "@/lib/assistant/knowledge";
import { brainAnswer } from "@/lib/assistant/brain";
import { keyDiagnosis, provider, streamChat } from "@/lib/ai/client";

const MODEL = "claude-opus-5-5";
/** AI answers per day for the whole site; beyond it Zib keeps working offline. */
const AI_DAILY_BUDGET = 500;

const bodySchema = z.object({
  // Where the visitor is: a plain site path, never a full URL.
  page: z.string().max(80).regex(/^\/[\w\-/#]*$/).default("/"),
  messages: z
    .array(
      z.discriminatedUnion("role", [
        z.object({ role: z.literal("user"), content: z.string().trim().min(1).max(1200) }),
        // Zib's own earlier answers can be longer (outlines, lists).
        z.object({ role: z.literal("assistant"), content: z.string().trim().min(1).max(4000) }),
      ]),
    )
    .min(1)
    .max(16)
    .refine((m) => m[0].role === "user" && m[m.length - 1].role === "user", "La conversazione deve iniziare e finire con l'utente."),
});

const error = (message: string, status: number) => NextResponse.json({ error: message }, { status });

/** Streams text to the client, one chunk at a time. */
function textStream(produce: (write: (text: string) => void) => Promise<void>, mode = "ai") {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        await produce((text) => controller.enqueue(encoder.encode(text)));
      } catch (err) {
        console.error("assistant failed", err instanceof Error ? err.message : err);
        controller.enqueue(encoder.encode("\n\nLa navicella ha perso il segnale per un attimo. Riprova tra poco."));
      }
      controller.close();
    },
  });
  return new Response(stream, {
    // X-Zib-Mode says which brain answered (no secrets): "ai:<provider>" or "offline".
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "X-Zib-Mode": mode },
  });
}

let client: Anthropic | null = null;

/**
 * Zib, the site assistant. Public (visitors can ask before signing up), so it
 * is rate limited per IP and accepts only short, plain-text conversations.
 * The CSRF Origin check runs in src/proxy.ts before this handler.
 */
export async function POST(request: Request) {
  const ip = await clientIp();
  if (!(await rateLimit(`assistant:${ip}`, 30, 60 * 60))) return error("Hai fatto molte domande: riprova tra un po'.", 429);
  if (Number(request.headers.get("content-length") ?? 0) > 64 * 1024) return error("Messaggio troppo lungo.", 413);

  let parsed;
  try {
    parsed = bodySchema.safeParse(await request.json());
  } catch {
    return error("Richiesta non valida.", 400);
  }
  if (!parsed.success) return error("Richiesta non valida.", 400);
  const { messages, page } = parsed.data;

  // Without a key, or once the site-wide daily budget of AI answers is used up (so many IPs together
  // cannot run up the bill), the assistant answers with its free on-board brain.
  const ai = provider();
  const aiAllowed = ai !== null && (await rateLimit("assistant:ai:global", AI_DAILY_BUDGET, 24 * 60 * 60));
  if (!aiAllowed) {
    const answer = brainAnswer(messages);
    return textStream(async (write) => write(answer), ai ? "offline:budget" : `offline:no-key; ${keyDiagnosis()}`);
  }

  if (ai.name !== "anthropic") {
    // A free model (Gemini, Groq, OpenRouter). If it is busy or over its free quota,
    // Zib answers with its on-board brain instead of an error.
    return textStream(async (write) => {
      let wrote = false;
      try {
        for await (const chunk of streamChat({ system: `${SYSTEM_PROMPT}

${pageContext(page)}`, messages, maxTokens: 2048 })) {
          wrote = true;
          write(chunk);
        }
      } catch (err) {
        console.error("free ai failed", err instanceof Error ? err.message : err);
      }
      if (!wrote) write(brainAnswer(messages));
    }, `ai:${ai.name}`);
  }

  client ??= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const anthropic = client;
  return textStream(async (write) => {
    const stream = anthropic.beta.messages.stream({
      model: MODEL,
      max_tokens: 2048,
      // Quick, conversational answers: low effort keeps latency down.
      output_config: { effort: "low" },
      // If a safety classifier declines, Anthropic re-runs the request on its recommended fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      // The stable prompt is cached; the page context comes after the breakpoint.
      system: [
        { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
        { type: "text", text: pageContext(page) },
      ],
      messages,
    });
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") write(event.delta.text);
    }
    const final = await stream.finalMessage();
    if (final.stop_reason === "refusal") write("Su questo non posso aiutarti, ma chiedimi pure qualsiasi cosa su Lumora!");
  });
}
