import "server-only";
import { db } from "../db";
import { randomToken, sha256 } from "../crypto";
import type { EmailTokenType } from "@/generated/prisma/client";

const TTL_MINUTES: Record<EmailTokenType, number> = {
  VERIFY_EMAIL: 24 * 60,
  RESET_PASSWORD: 30,
};

/** Issues a single-use token; any older unused token of the same type is invalidated. */
export async function issueEmailToken(userId: string, type: EmailTokenType) {
  const token = randomToken();
  await db.$transaction([
    db.emailToken.deleteMany({ where: { userId, type, usedAt: null } }),
    db.emailToken.create({
      data: { id: sha256(token), userId, type, expiresAt: new Date(Date.now() + TTL_MINUTES[type] * 60 * 1000) },
    }),
  ]);
  return token;
}

/** Atomically marks the token used. Returns the user id, or null if invalid/expired/used. */
export async function consumeEmailToken(token: string, type: EmailTokenType): Promise<string | null> {
  if (!token || token.length > 100) return null;
  const id = sha256(token);
  const { count } = await db.emailToken.updateMany({
    where: { id, type, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  if (count !== 1) return null;
  const row = await db.emailToken.findUnique({ where: { id }, select: { userId: true } });
  return row?.userId ?? null;
}
