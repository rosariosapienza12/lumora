import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import { searchCommons } from "@/lib/images/commons";

const querySchema = z.string().trim().min(2).max(80);

const error = (message: string, status: number) => NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });

/**
 * Free photos from Wikimedia Commons for the editor's "Cerca foto gratis".
 * Signed-in users only, and limited per user, so Lumora never becomes an
 * open proxy towards Commons. Every photo comes with author and licence.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return error("Accedi per cercare le foto.", 401);
  if (!(await rateLimit(`images:${user.id}`, 60, 60 * 60))) return error("Hai fatto molte ricerche: riprova tra un po'.", 429);

  const q = querySchema.safeParse(new URL(request.url).searchParams.get("q"));
  if (!q.success) return error("Scrivi da 2 a 80 caratteri.", 400);

  try {
    const photos = await searchCommons(q.data, 24);
    return NextResponse.json({ photos }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (err) {
    console.error("commons search failed", err instanceof Error ? err.message : err);
    return error("Wikimedia Commons non risponde, riprova tra poco.", 502);
  }
}
