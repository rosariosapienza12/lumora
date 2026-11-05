"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { requireUser } from "@/lib/auth/session";
import { parseDeck } from "@/lib/editor/deck";
import { countAll, docBytes, MAX_PRESENTATIONS, STORAGE_QUOTA_BYTES, storageUsed } from "@/lib/presentations";
import { createDeckDocument } from "@/lib/assistant/create";
import type { Prisma } from "@/generated/prisma/client";

/** Creates a presentation from an outline proposed by Zib, after the user confirmed it. */
export async function createFromDeckAction(formData: FormData) {
  const user = await requireUser();
  const spec = parseDeck(formData.get("d"));
  if (!spec) redirect("/dashboard");

  // Limits first, so nobody spends AI work on a presentation that cannot be saved.
  if (!(await rateLimit(`create:${user.id}`, 30, 60 * 60)) || (await countAll(user.id)) >= MAX_PRESENTATIONS) redirect("/dashboard?limite=1");
  // Zib writes the real content of every page (or, without AI, builds the outline).
  const { doc } = await createDeckDocument(user.id, { topic: spec.title, outline: spec, photos: Boolean(spec.photos) });
  if ((await storageUsed(user.id)) + docBytes(doc) > STORAGE_QUOTA_BYTES) redirect("/dashboard?limite=1");

  const p = await db.presentation.create({
    data: { ownerId: user.id, title: spec.title, content: doc as Prisma.InputJsonValue },
    select: { id: true },
  });
  redirect(`/editor/${p.id}`);
}
