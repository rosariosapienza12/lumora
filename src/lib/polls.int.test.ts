/**
 * Live polls against a real PostgreSQL database (DATABASE_TESTS=1, see security.int.test.ts):
 * only published presentations accept votes, one vote per browser that can be changed,
 * and results count every browser once.
 */
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomToken } from "./crypto";
import { buildTemplate } from "./editor/templates";
import type { Prisma } from "@/generated/prisma/client";

// A fake cookie jar: each "browser" is a different jar.
let jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (k: string) => (jar.has(k) ? { value: jar.get(k) } : undefined), set: (k: string, v: string) => jar.set(k, v) }),
}));

const { db } = await import("./db");
const { castVote, findPoll, results } = await import("./polls");

async function publishedWithPoll(visibility: "LINK" | "PRIVATE" = "LINK") {
  const owner = await db.user.create({ data: { email: `poll-${Date.now()}-${Math.random()}@example.com`, name: "T", passwordHash: randomToken(), kind: "STUDENT" } });
  const doc = buildTemplate("vuota", "Sondaggio");
  doc.pages[0].elements.push({ id: "poll1", type: "poll", x: 100, y: 100, w: 1000, h: 500, rotation: 0, opacity: 1, hidden: false, locked: false, animation: { enter: "none", emphasis: "none", duration: 0.6, delay: 0 }, interaction: null, question: "Pizza o pasta?", options: ["Pizza", "Pasta"], fill: "#5b3df5", color: "#111111" });
  const slug = randomToken().replace(/[^A-Za-z0-9_-]/g, "").slice(0, 22).padEnd(16, "x");
  const p = await db.presentation.create({ data: { ownerId: owner.id, title: "Sondaggio", content: doc as Prisma.InputJsonValue, visibility, shareSlug: slug } });
  return { slug, id: p.id };
}

describe.runIf(process.env.DATABASE_TESTS === "1")("live polls on a real database", () => {
  beforeEach(async () => {
    await db.user.deleteMany();
    jar = new Map();
  });
  afterAll(async () => {
    await db.$disconnect();
  });

  it("counts one vote per browser, and a browser can change its vote", async () => {
    const { slug, id } = await publishedWithPoll();
    const found = await findPoll(slug, "poll1");
    expect(found?.poll.question).toBe("Pizza o pasta?");
    await castVote(id, "poll1", 0);
    await castVote(id, "poll1", 1); // same browser changes its mind
    jar = new Map(); // another browser
    await castVote(id, "poll1", 1);
    expect(await results(id, "poll1", 2)).toEqual([0, 2]);
  });

  it("private presentations and unknown polls accept no votes", async () => {
    const priv = await publishedWithPoll("PRIVATE");
    expect(await findPoll(priv.slug, "poll1")).toBeNull();
    const pub = await publishedWithPoll();
    expect(await findPoll(pub.slug, "nope")).toBeNull();
    expect(await findPoll("short", "poll1")).toBeNull();
  });
});
