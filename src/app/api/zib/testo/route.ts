import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { getCurrentUser } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";

const MODEL = "claude-opus-5-5";

const ACTIONS = {
  riscrivi: "Riscrivi il testo in modo più chiaro e incisivo, stessa lunghezza circa.",
  accorcia: "Accorcia il testo a circa metà, tenendo solo l'essenziale.",
  semplifica: "Riscrivi il testo con parole semplici, adatte a un ragazzo di 12 anni.",
  allunga: "Arricchisci il testo con un dettaglio o un esempio vero in più, senza raddoppiarne la lunghezza.",
  inglese: "Traduci il testo in inglese.",
} as const;

const bodySchema = z.object({
  text: z.string().trim().min(1).max(2000),
  action: z.enum(Object.keys(ACTIONS) as [keyof typeof ACTIONS, ...(keyof typeof ACTIONS)[]]),
  /** The page heading, as context. */
  context: z.string().max(200).optional(),
});

const error = (message: string, status: number) => NextResponse.json({ error: message }, { status });

let client: Anthropic | null = null;

/**
 * "Zib sulla pagina": rewrites the selected text. Signed-in users only, limited
 * per user and per day site-wide. The CSRF Origin check runs in src/proxy.ts.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return error("Accedi per usare Zib sulla pagina.", 401);
  if (!env.ANTHROPIC_API_KEY) return error("Zib sulla pagina ha bisogno dell'IA, che su questo sito non è attiva.", 503);
  if (Number(request.headers.get("content-length") ?? 0) > 16 * 1024) return error("Testo troppo lungo.", 413);
  if (!(await rateLimit(`zib:text:${user.id}`, 60, 60 * 60)) || !(await rateLimit("zib:text:global", 2000, 24 * 60 * 60))) {
    return error("Zib si sta riposando: riprova tra un po'.", 429);
  }

  let parsed;
  try {
    parsed = bodySchema.safeParse(await request.json());
  } catch {
    return error("Richiesta non valida.", 400);
  }
  if (!parsed.success) return error("Richiesta non valida.", 400);
  const { text, action, context } = parsed.data;

  client ??= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 1200,
      system:
        "Sei Zib e modifichi un testo di una slide. Rispondi SOLO con il nuovo testo, senza virgolette, premesse o markdown, senza lineette lunghe. Mantieni gli a capo se il testo è un elenco. Non inventare dati: se aggiungi un fatto, deve essere vero e noto.",
      messages: [{ role: "user", content: `${ACTIONS[action]}${context ? `\nTitolo della pagina: ${context}` : ""}\n\nTesto:\n${text}` }],
    });
    const out = res.content
      .flatMap((b) => (b.type === "text" ? [b.text] : []))
      .join("")
      .trim()
      .slice(0, 5000);
    if (!out) return error("Zib non ha trovato una risposta, riprova.", 502);
    return NextResponse.json({ text: out }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("zib text failed", err instanceof Error ? err.message : err);
    return error("Zib ha perso il segnale, riprova tra poco.", 502);
  }
}
