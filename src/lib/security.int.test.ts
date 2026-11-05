/**
 * Security tests against a real PostgreSQL database. They prove, end to end through Prisma,
 * the rules the app relies on: one user can never reach another user's data, private or
 * deleted presentations are never public, email tokens work once only, rate limits block,
 * and deleting an account (or an expired guest) removes everything it owned.
 *
 * They run when DATABASE_TESTS=1 (in CI, with a Postgres service; locally, with a test database
 * at the DATABASE_URL in vitest.config.mts and `npx prisma migrate deploy` applied to it).
 */
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "./db";
import { getOwnedPresentation, listPresentations, countAll, storageUsed } from "./presentations";
import { getPublished } from "./public-view";
import { consumeEmailToken, issueEmailToken } from "./auth/email-tokens";
import { rateLimit } from "./rate-limit";
import { purgeExpiredGuests } from "./guest-cleanup";
import { newGuestEmail } from "./guest";
import { buildTemplate } from "./editor/templates";
import { sha256 } from "./crypto";
import type { Prisma } from "@/generated/prisma/client";

let n = 0;
async function user(email = `user${++n}-${Date.now()}@example.com`, createdAt?: Date) {
  return db.user.create({ data: { email, name: "Test", passwordHash: "x", kind: "STUDENT", ...(createdAt ? { createdAt } : {}) } });
}

async function presentation(ownerId: string, data: Partial<Prisma.PresentationUncheckedCreateInput> = {}) {
  const content = buildTemplate("vuota", "Prova");
  content.pages[0].notes = "Appunti segreti del relatore";
  return db.presentation.create({ data: { ownerId, title: "Prova", content: content as Prisma.InputJsonValue, ...data } });
}

describe.runIf(process.env.DATABASE_TESTS === "1")("security rules on a real database", () => {
  beforeEach(async () => {
    // Children first is not needed: cascades take care of them.
    await db.auditLog.deleteMany();
    await db.rateLimit.deleteMany();
    await db.user.deleteMany();
  });
  afterAll(async () => {
    await db.$disconnect();
  });

  it("a user can never read another user's presentation (IDOR)", async () => {
    const alice = await user();
    const bob = await user();
    const secret = await presentation(alice.id);

    expect(await getOwnedPresentation(alice.id, secret.id)).not.toBeNull();
    expect(await getOwnedPresentation(bob.id, secret.id)).toBeNull();
    expect(await listPresentations(bob.id)).toEqual([]);
    expect(await countAll(bob.id)).toBe(0);
  });

  it("presentations in the trash are not opened as live ones", async () => {
    const alice = await user();
    const trashed = await presentation(alice.id, { deletedAt: new Date() });

    expect(await getOwnedPresentation(alice.id, trashed.id)).toBeNull();
    expect((await listPresentations(alice.id, { trash: true })).map((p) => p.id)).toEqual([trashed.id]);
    // Trashing does not free a slot in the quota.
    expect(await countAll(alice.id)).toBe(1);
  });

  it("only published, non-deleted presentations are public, and without speaker notes", async () => {
    const alice = await user();
    const slug = (s: string) => s.padEnd(20, "x");
    await presentation(alice.id, { shareSlug: slug("privata"), visibility: "PRIVATE" });
    await presentation(alice.id, { shareSlug: slug("cestinata"), visibility: "LINK", deletedAt: new Date() });
    await presentation(alice.id, { shareSlug: slug("pubblica"), visibility: "LINK" });

    expect(await getPublished(slug("privata"))).toBeNull();
    expect(await getPublished(slug("cestinata"))).toBeNull();
    expect(await getPublished("corto")).toBeNull();
    const shown = await getPublished(slug("pubblica"));
    expect(shown?.title).toBe("Prova");
    expect(JSON.stringify(shown)).not.toContain("Appunti segreti");
    // Never the owner's data.
    expect(JSON.stringify(shown)).not.toContain(alice.email);
  });

  it("email tokens work once, for their own purpose, and are stored only as hashes", async () => {
    const alice = await user();
    const token = await issueEmailToken(alice.id, "VERIFY_EMAIL");

    expect(await db.emailToken.findUnique({ where: { id: token } })).toBeNull();
    expect(await db.emailToken.findUnique({ where: { id: sha256(token) } })).not.toBeNull();
    expect(await consumeEmailToken(token, "RESET_PASSWORD")).toBeNull();
    expect(await consumeEmailToken(token, "VERIFY_EMAIL")).toBe(alice.id);
    expect(await consumeEmailToken(token, "VERIFY_EMAIL")).toBeNull();
  });

  it("a new email token cancels the previous one, and expired tokens are refused", async () => {
    const alice = await user();
    const first = await issueEmailToken(alice.id, "RESET_PASSWORD");
    const second = await issueEmailToken(alice.id, "RESET_PASSWORD");
    expect(await consumeEmailToken(first, "RESET_PASSWORD")).toBeNull();

    await db.emailToken.update({ where: { id: sha256(second) }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await consumeEmailToken(second, "RESET_PASSWORD")).toBeNull();
  });

  it("rate limits block after the limit, separately for each key", async () => {
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await rateLimit("login:test", 3, 60));
    expect(results).toEqual([true, true, true, false]);
    expect(await rateLimit("login:other", 3, 60)).toBe(true);
  });

  it("deleting an account removes everything it owned, and unlinks the security log", async () => {
    const alice = await user();
    await presentation(alice.id);
    await db.asset.create({ data: { id: "a".repeat(32), ownerId: alice.id, mime: "image/png", size: 10, data: Buffer.from("png") } });
    await db.session.create({ data: { id: "s".repeat(64), userId: alice.id, expiresAt: new Date(Date.now() + 60_000) } });
    await issueEmailToken(alice.id, "VERIFY_EMAIL");
    await db.auditLog.create({ data: { action: "account.deleted", userId: alice.id } });
    expect(await storageUsed(alice.id)).toBeGreaterThan(10);

    await db.user.delete({ where: { id: alice.id } });

    expect(await db.presentation.count({ where: { ownerId: alice.id } })).toBe(0);
    expect(await db.asset.count({ where: { ownerId: alice.id } })).toBe(0);
    expect(await db.session.count({ where: { userId: alice.id } })).toBe(0);
    expect(await db.emailToken.count({ where: { userId: alice.id } })).toBe(0);
    const log = await db.auditLog.findFirst({ where: { action: "account.deleted" } });
    expect(log?.userId).toBeNull();
  });

  it("expired guests are deleted with their work; recent guests and real users stay", async () => {
    const now = new Date();
    const oldGuest = await user(newGuestEmail(), new Date(now.getTime() - 25 * 60 * 60 * 1000));
    const newGuest = await user(newGuestEmail(), new Date(now.getTime() - 60 * 60 * 1000));
    const realOld = await user(undefined, new Date(now.getTime() - 48 * 60 * 60 * 1000));
    await presentation(oldGuest.id);

    expect(await purgeExpiredGuests(now)).toBe(1);

    const left = (await db.user.findMany({ select: { id: true } })).map((u) => u.id).sort();
    expect(left).toEqual([newGuest.id, realOld.id].sort());
    expect(await db.presentation.count({ where: { ownerId: oldGuest.id } })).toBe(0);
  });
});
