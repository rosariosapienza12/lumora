import "server-only";
import { db } from "./db";
import { GUEST_DOMAIN, guestCutoff } from "./guest";

/**
 * Deletes guest accounts older than GUEST_HOURS. Their presentations, images, sessions and tokens
 * go with them (database cascade). Returns how many guests were removed.
 */
export async function purgeExpiredGuests(now = new Date()) {
  const { count } = await db.user.deleteMany({
    where: { email: { endsWith: `@${GUEST_DOMAIN}` }, createdAt: { lt: guestCutoff(now) } },
  });
  return count;
}
