"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { requireUser } from "@/lib/auth/session";
import { buildDeck, parseDeck } from "@/lib/editor/deck";
import { documentSchema } from "@/lib/editor/schema";
import { countAll, docBytes, MAX_PRESENTATIONS, STORAGE_QUOTA_BYTES, storageUsed } from "@/lib/presentations";
import type { Prisma } from "@/generated/prisma/client";

/** Creates a presentation from an outline proposed by Zib, after the user confirmed it. */
export async function createFromDeckAction(formData: FormData) {
  const user = await requireUser();
  const spec = parseDeck(formData.get("d"));
  if (!spec) redirect("/dashboard");

  const doc = buildDeck(spec);
  // The outline is user-controlled input: the built document goes through the same validation as every save.
  if (!documentSchema.safeParse(doc).success) redirect("/dashboard");
  const allowed =
    (await rateLimit(`create:${user.id}`, 30, 60 * 60)) &&
    (await countAll(user.id)) < MAX_PRESENTATIONS &&
    (await storageUsed(user.id)) + docBytes(doc) <= STORAGE_QUOTA_BYTES;
  if (!allowed) redirect("/dashboard?limite=1");

  const p = await db.presentation.create({
    data: { ownerId: user.id, title: spec.title, content: doc as Prisma.InputJsonValue },
    select: { id: true },
  });
  redirect(`/editor/${p.id}`);
}
