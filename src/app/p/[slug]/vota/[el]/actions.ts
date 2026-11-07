"use server";

import { findPoll, castVote, results } from "@/lib/polls";
import { isUnlocked } from "@/lib/public-view";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";

export type VoteState = { ok: boolean; message?: string; counts?: number[]; option?: number };

/** One vote from the audience (no account; one per browser, can be changed). */
export async function voteAction(slug: string, elementId: string, option: number): Promise<VoteState> {
  if (!(await rateLimit(`poll-vote:${await clientIp()}`, 30, 60))) return { ok: false, message: "Troppi voti da questa rete: riprova tra un minuto." };
  const found = await findPoll(slug, elementId);
  if (!found) return { ok: false, message: "Questo sondaggio non esiste più." };
  if (found.passwordHash && !(await isUnlocked(slug, found.passwordHash))) return { ok: false, message: "Apri prima la presentazione con la sua password." };
  if (!Number.isInteger(option) || option < 0 || option >= found.poll.options.length) return { ok: false, message: "Risposta non valida." };
  await castVote(found.presentationId, elementId, option);
  return { ok: true, option, counts: await results(found.presentationId, elementId, found.poll.options.length) };
}
