import "server-only";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { db } from "./db";
import { isProd } from "./env";
import { sha256 } from "./crypto";
import { documentSchema, type Element } from "./editor/schema";

/**
 * Live audience polls. People vote from their phone on the published
 * presentation (no account): one vote per browser and poll, which they can
 * change. A random cookie identifies the browser; only its hash is stored.
 */

const SLUG = /^[A-Za-z0-9_-]{16,32}$/;
const ID = /^[a-zA-Z0-9_-]{1,32}$/;
const VOTER_COOKIE = "lumora_voter";

export type Poll = Extract<Element, { type: "poll" }>;

/** The poll of a published presentation, with what is needed to check access. */
export async function findPoll(slug: string, elementId: string) {
  if (!SLUG.test(slug) || !ID.test(elementId)) return null;
  const p = await db.presentation.findUnique({ where: { shareSlug: slug }, select: { id: true, title: true, content: true, visibility: true, deletedAt: true, sharePasswordHash: true } });
  if (!p || p.visibility !== "LINK" || p.deletedAt) return null;
  const doc = documentSchema.safeParse(p.content);
  if (!doc.success) return null;
  const poll = doc.data.pages.flatMap((pg) => pg.elements).find((e): e is Poll => e.type === "poll" && e.id === elementId);
  return poll ? { presentationId: p.id, title: p.title, poll, passwordHash: p.sharePasswordHash } : null;
}

/** Votes per option, in the order of the options. */
export async function results(presentationId: string, elementId: string, options: number): Promise<number[]> {
  const rows = await db.pollVote.groupBy({ by: ["option"], where: { presentationId, elementId }, _count: { _all: true } });
  const counts = Array.from({ length: options }, () => 0);
  for (const r of rows) if (r.option >= 0 && r.option < options) counts[r.option] = r._count._all;
  return counts;
}

/** This browser's voter id (hashed), created on the first vote. */
async function voter(): Promise<string> {
  const jar = await cookies();
  let raw = jar.get(VOTER_COOKIE)?.value;
  if (!raw || !/^[A-Za-z0-9_-]{22}$/.test(raw)) {
    raw = randomBytes(16).toString("base64url");
    jar.set(VOTER_COOKIE, raw, { httpOnly: true, secure: isProd, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  }
  return sha256(`voter:${raw}`);
}

/** Records (or changes) this browser's vote. */
export async function castVote(presentationId: string, elementId: string, option: number) {
  const v = await voter();
  await db.pollVote.upsert({
    where: { presentationId_elementId_voter: { presentationId, elementId, voter: v } },
    create: { presentationId, elementId, option, voter: v },
    update: { option },
  });
}
