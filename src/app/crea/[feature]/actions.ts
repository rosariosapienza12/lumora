"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { requireUser } from "@/lib/auth/session";
import { buildStarter, isStarterId } from "@/lib/editor/starters";
import { DEFAULT_THEME, isThemeId } from "@/lib/editor/themes";
import { countAll, docBytes, MAX_PRESENTATIONS, STORAGE_QUOTA_BYTES, storageUsed } from "@/lib/presentations";
import type { Prisma } from "@/generated/prisma/client";

export async function createFromStarterAction(formData: FormData) {
  const user = await requireUser();
  const id = formData.get("feature");
  if (!isStarterId(id)) redirect("/dashboard");

  const theme = formData.get("theme");
  const { title, doc } = buildStarter(id, isThemeId(theme) ? theme : DEFAULT_THEME);
  const allowed =
    (await rateLimit(`create:${user.id}`, 30, 60 * 60)) &&
    (await countAll(user.id)) < MAX_PRESENTATIONS &&
    (await storageUsed(user.id)) + docBytes(doc) <= STORAGE_QUOTA_BYTES;
  if (!allowed) redirect("/dashboard?limite=1");

  const p = await db.presentation.create({
    data: { ownerId: user.id, title, content: doc as Prisma.InputJsonValue },
    select: { id: true },
  });
  redirect(`/editor/${p.id}?idea=${id}`);
}
