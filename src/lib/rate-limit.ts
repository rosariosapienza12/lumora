import "server-only";
import { db } from "./db";

/**
 * Fixed-window rate limiter stored in Postgres, so limits hold across restarts
 * and multiple server instances. Returns true when the action is allowed.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowSeconds * 1000);

  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "count", "windowStart")
    VALUES (${key}, 1, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."windowStart" < ${windowStart} THEN 1 ELSE "RateLimit"."count" + 1 END,
      "windowStart" = CASE WHEN "RateLimit"."windowStart" < ${windowStart} THEN ${now} ELSE "RateLimit"."windowStart" END
    RETURNING "count"`;

  maybePurge();
  return (rows[0]?.count ?? 0) <= limit;
}

let lastPurge = 0;

/** Deletes stale housekeeping rows at most once an hour, in the background. */
function maybePurge() {
  const now = Date.now();
  if (now - lastPurge < 60 * 60 * 1000) return;
  lastPurge = now;
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  Promise.all([
    db.rateLimit.deleteMany({ where: { windowStart: { lt: dayAgo } } }),
    db.session.deleteMany({ where: { expiresAt: { lt: new Date(now) } } }),
    db.emailToken.deleteMany({ where: { OR: [{ expiresAt: { lt: dayAgo } }, { usedAt: { lt: dayAgo } }] } }),
    // Unverified sign-ups older than a week (also blocks pre-registration of someone else's email).
    db.user.deleteMany({ where: { emailVerifiedAt: null, createdAt: { lt: weekAgo } } }),
  ]).catch((err) => console.error("purge failed", err instanceof Error ? err.message : err));
}
