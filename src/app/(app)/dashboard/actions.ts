"use server";

import { DEFAULT_THEME, isThemeId } from "@/lib/editor/themes";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { requireUser, touchSession } from "@/lib/auth/session";
import { countAll, docBytes, getOwnedPresentation, MAX_PRESENTATIONS, STORAGE_QUOTA_BYTES, storageUsed } from "@/lib/presentations";
import { buildTemplate, isTemplateId, TEMPLATES } from "@/lib/editor/templates";
import { buildDeck, planDeck } from "@/lib/editor/deck";
import { documentSchema } from "@/lib/editor/schema";
import { addFreePhotos } from "@/lib/images/fill";
import type { Prisma } from "@/generated/prisma/client";

const idSchema = z.string().regex(/^[a-z0-9]{20,32}$/);
const titleSchema = z.string().trim().min(1, "Inserisci un titolo").max(120, "Titolo troppo lungo");

function parseId(value: FormDataEntryValue | null) {
  const parsed = idSchema.safeParse(value);
  if (!parsed.success) throw new Error("Not found");
  return parsed.data;
}

/** Ceiling on rename, trash, restore and delete, so a script cannot hammer the database. */
const editAllowed = (userId: string) => rateLimit(`dashboard-edit:${userId}`, 120, 60 * 60);

/** Slot and storage checks shared by create and duplicate. */
async function canAdd(userId: string, bytes: number) {
  if (!(await rateLimit(`create:${userId}`, 30, 60 * 60))) return false;
  if ((await countAll(userId)) >= MAX_PRESENTATIONS) return false;
  return (await storageUsed(userId)) + bytes <= STORAGE_QUOTA_BYTES;
}

export async function createPresentationAction(formData: FormData) {
  const user = await requireUser();
  await touchSession();
  const template = formData.get("template");
  const id = isTemplateId(template) ? template : "vuota";
  const title = id === "vuota" ? "Presentazione senza titolo" : (TEMPLATES.find((t) => t.id === id)?.name ?? "Presentazione");
  const theme = formData.get("theme");
  const content = buildTemplate(id, title, isThemeId(theme) ? theme : DEFAULT_THEME);
  if (!(await canAdd(user.id, docBytes(content)))) throw new Error("Limit reached");

  const p = await db.presentation.create({
    data: { ownerId: user.id, title, content: content as Prisma.InputJsonValue },
    select: { id: true },
  });
  redirect(`/editor/${p.id}`);
}

/** "Da un argomento": Lumora picks theme, decorations and varied layouts, and optionally free photos. */
export async function createFromTopicAction(formData: FormData) {
  const user = await requireUser();
  await touchSession();
  const topic = titleSchema.safeParse(formData.get("topic"));
  if (!topic.success) redirect("/dashboard");
  const wantsPhotos = formData.get("photos") === "on";
  const spec = planDeck(topic.data, { photos: wantsPhotos });
  let content = buildDeck(spec);
  if (spec.photos && (await rateLimit(`images:${user.id}`, 60, 60 * 60))) content = (await addFreePhotos(content, spec.photos)).doc;
  if (!documentSchema.safeParse(content).success) throw new Error("Invalid document");
  if (!(await canAdd(user.id, docBytes(content)))) throw new Error("Limit reached");

  const p = await db.presentation.create({
    data: { ownerId: user.id, title: spec.title, content: content as Prisma.InputJsonValue },
    select: { id: true },
  });
  redirect(`/editor/${p.id}`);
}

export async function duplicatePresentationAction(formData: FormData) {
  const user = await requireUser();
  const source = await getOwnedPresentation(user.id, parseId(formData.get("id")));
  if (!source || !(await canAdd(user.id, docBytes(source.content)))) return;
  await db.presentation.create({
    data: { ownerId: user.id, title: `${source.title} (copia)`.slice(0, 120), content: source.content as Prisma.InputJsonValue },
  });
  revalidatePath("/dashboard");
}

export async function renamePresentationAction(formData: FormData) {
  const user = await requireUser();
  if (!(await editAllowed(user.id))) return;
  const title = titleSchema.safeParse(formData.get("title"));
  if (!title.success) return;
  await db.presentation.updateMany({
    where: { id: parseId(formData.get("id")), ownerId: user.id, deletedAt: null },
    data: { title: title.data },
  });
  revalidatePath("/dashboard");
}

export async function trashPresentationAction(formData: FormData) {
  const user = await requireUser();
  if (!(await editAllowed(user.id))) return;
  // Moving to trash also takes it offline and invalidates the old link.
  await db.presentation.updateMany({
    where: { id: parseId(formData.get("id")), ownerId: user.id },
    data: { deletedAt: new Date(), visibility: "PRIVATE", shareSlug: null, sharePasswordHash: null },
  });
  revalidatePath("/dashboard");
}

export async function restorePresentationAction(formData: FormData) {
  const user = await requireUser();
  if (!(await editAllowed(user.id))) return;
  await db.presentation.updateMany({
    where: { id: parseId(formData.get("id")), ownerId: user.id },
    data: { deletedAt: null },
  });
  revalidatePath("/dashboard");
}

export async function deleteForeverAction(formData: FormData) {
  const user = await requireUser();
  if (!(await editAllowed(user.id))) return;
  // Only items already in the trash can be removed permanently.
  await db.presentation.deleteMany({
    where: { id: parseId(formData.get("id")), ownerId: user.id, deletedAt: { not: null } },
  });
  revalidatePath("/dashboard");
}
