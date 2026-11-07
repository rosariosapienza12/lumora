import { NextResponse } from "next/server";
import { findPoll, results } from "@/lib/polls";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";

/**
 * Live results of a poll, for the screen the presentation runs on. Only the
 * vote counts (numbers, no text) of a published presentation.
 */
export async function GET(_req: Request, { params }: RouteContext<"/api/sondaggio/[slug]/[el]">) {
  const { slug, el } = await params;
  if (!(await rateLimit(`poll-results:${await clientIp()}`, 240, 60))) return NextResponse.json({ error: "Troppe richieste." }, { status: 429 });
  const found = await findPoll(slug, el);
  if (!found) return NextResponse.json({ error: "Sondaggio non trovato." }, { status: 404 });
  const counts = await results(found.presentationId, el, found.poll.options.length);
  return NextResponse.json({ counts }, { headers: { "Cache-Control": "no-store" } });
}
