import "server-only";
import { cookies } from "next/headers";
import { db } from "./db";
import { isProd } from "./env";
import { hmac, safeEqual, sha256 } from "./crypto";
import { documentSchema } from "./editor/schema";

const SLUG = /^[A-Za-z0-9_-]{16,32}$/;
const UNLOCK_SECONDS = 12 * 60 * 60;

/** Published presentation by slug, or null. Never returns owner data. */
export async function getPublished(slug: string) {
  if (!SLUG.test(slug)) return null;
  const p = await db.presentation.findUnique({
    where: { shareSlug: slug },
    select: { title: true, content: true, visibility: true, deletedAt: true, sharePasswordHash: true },
  });
  if (!p || p.visibility !== "LINK" || p.deletedAt) return null;
  const doc = documentSchema.safeParse(p.content);
  if (!doc.success) return null;
  // Speaker notes are private to the author: never send them to viewers.
  const publicDoc = { ...doc.data, pages: doc.data.pages.map((page) => ({ ...page, notes: undefined })) };
  return { title: p.title, doc: publicDoc, passwordHash: p.sharePasswordHash };
}

const cookieName = (slug: string) => `lv_${sha256(slug).slice(0, 16)}`;

// Signed "issuedAt" bound to the current password hash: expires server-side,
// and changing the password invalidates every earlier unlock.
const sign = (slug: string, passwordHash: string, issuedAt: number) => hmac(`view:${slug}:${passwordHash}:${issuedAt}`);

export async function isUnlocked(slug: string, passwordHash: string) {
  const value = (await cookies()).get(cookieName(slug))?.value ?? "";
  const [issued, sig] = value.split(".");
  const issuedAt = Number(issued);
  if (!Number.isInteger(issuedAt) || !sig) return false;
  const age = Date.now() / 1000 - issuedAt;
  if (age < 0 || age > UNLOCK_SECONDS) return false;
  return safeEqual(sig, sign(slug, passwordHash, issuedAt));
}

export async function setUnlocked(slug: string, passwordHash: string) {
  const issuedAt = Math.floor(Date.now() / 1000);
  (await cookies()).set(cookieName(slug), `${issuedAt}.${sign(slug, passwordHash, issuedAt)}`, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: `/p/${slug}`,
    maxAge: UNLOCK_SECONDS,
  });
}
