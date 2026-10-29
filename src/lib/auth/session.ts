import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "../db";
import { isProd } from "../env";
import { randomToken, sha256 } from "../crypto";
import { clientIp, userAgent } from "../request";

// __Host- prefix forces Secure, Path=/ and no Domain: the cookie cannot be set by subdomains.
const COOKIE = isProd ? "__Host-lumora_session" : "lumora_session";
const SESSION_DAYS = 14;
const RENEW_WHEN_DAYS_LEFT = 7;
const PENDING_2FA_MINUTES = 10;
/** Hard cap: sliding renewal never keeps a session alive longer than this. */
const MAX_SESSION_DAYS = 90;

const DAY = 24 * 60 * 60 * 1000;

async function setCookie(token: string, expires: Date) {
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    expires,
  });
}

/**
 * Creates a fresh session (new random token, so any pre-login token is useless:
 * prevents session fixation). With `twoFactorPending` the session only unlocks the 2FA step.
 */
export async function createSession(userId: string, twoFactorPending = false) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + (twoFactorPending ? PENDING_2FA_MINUTES * 60 * 1000 : SESSION_DAYS * DAY));
  await db.session.create({
    data: { id: sha256(token), userId, twoFactorPending, expiresAt, ip: await clientIp(), userAgent: await userAgent() },
  });
  await setCookie(token, expiresAt);
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { id: sha256(token) } });
  store.delete(COOKIE);
}

export async function revokeAllSessions(userId: string) {
  await db.session.deleteMany({ where: { userId } });
}

type SessionWithUser = NonNullable<Awaited<ReturnType<typeof loadSession>>>;

async function loadSession() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const session = await db.session.findUnique({
    where: { id: sha256(token) },
    include: {
      user: { select: { id: true, email: true, name: true, kind: true, emailVerifiedAt: true, totpEnabledAt: true } },
    },
  });
  if (!session) return null;
  const tooOld = Date.now() - session.createdAt.getTime() > MAX_SESSION_DAYS * DAY;
  if (session.expiresAt.getTime() <= Date.now() || tooOld) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  return session;
}

/** Reads the session once per request. */
export const getSession = cache(loadSession);

export type CurrentUser = SessionWithUser["user"];

/** Fully authenticated user (2FA completed), or null. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await getSession();
  if (!session || session.twoFactorPending) return null;
  return session.user;
});

/** Use at the top of every protected page, Server Action and Route Handler. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/accedi");
  return user;
}

/** Sliding renewal; call from Server Actions (cookies cannot be set during render). */
export async function touchSession() {
  const session = await getSession();
  if (!session || session.twoFactorPending) return;
  const daysLeft = (session.expiresAt.getTime() - Date.now()) / DAY;
  if (daysLeft > RENEW_WHEN_DAYS_LEFT) return;
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return;
  const expiresAt = new Date(Date.now() + SESSION_DAYS * DAY);
  await db.session.update({ where: { id: session.id }, data: { expiresAt, lastSeenAt: new Date() } });
  await setCookie(token, expiresAt);
}
