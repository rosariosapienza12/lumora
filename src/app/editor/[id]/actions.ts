"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { randomToken } from "@/lib/crypto";
import { rateLimit } from "@/lib/rate-limit";
import { hashPassword, isPasswordBreached } from "@/lib/auth/password";
import { requireUser, touchSession } from "@/lib/auth/session";
import { docBytes, parseDocument, STORAGE_QUOTA_BYTES, storageUsed } from "@/lib/presentations";
import type { Prisma } from "@/generated/prisma/client";

const idSchema = z.string().regex(/^[a-z0-9]{20,32}$/);
const titleSchema = z.string().trim().min(1).max(120);

export type SaveResult = { ok: true; savedAt: string } | { ok: false; error: string };

export async function saveDocumentAction(id: unknown, title: unknown, doc: unknown): Promise<SaveResult> {
  const user = await requireUser();
  const pid = idSchema.safeParse(id);
  const t = titleSchema.safeParse(title);
  if (!pid.success || !t.success) return { ok: false, error: "Titolo non valido" };
  // Autosave runs every couple of seconds while editing; this only stops abuse.
  if (!(await rateLimit(`save:${user.id}`, 120, 60))) return { ok: false, error: "Troppi salvataggi, riprovo tra poco" };

  const parsed = parseDocument(doc);
  if ("error" in parsed) return { ok: false, error: parsed.error };
  if ((await storageUsed(user.id, pid.data)) + docBytes(parsed.doc) > STORAGE_QUOTA_BYTES) {
    return { ok: false, error: "Spazio esaurito: elimina definitivamente qualche presentazione dal cestino." };
  }

  const { count } = await db.presentation.updateMany({
    where: { id: pid.data, ownerId: user.id, deletedAt: null },
    data: { title: t.data, content: parsed.doc as Prisma.InputJsonValue },
  });
  if (count !== 1) return { ok: false, error: "Presentazione non trovata" };
  await touchSession();
  return { ok: true, savedAt: new Date().toISOString() };
}

export type PublishResult = { ok: true; slug: string | null; hasPassword: boolean } | { ok: false; error: string };

export async function publishAction(id: unknown, password: unknown): Promise<PublishResult> {
  const user = await requireUser();
  const pid = idSchema.safeParse(id);
  if (!pid.success) return { ok: false, error: "Presentazione non trovata" };
  if (password !== null && typeof password !== "string") return { ok: false, error: "Password non valida" };
  if (!user.emailVerifiedAt) return { ok: false, error: "Conferma prima la tua email per pubblicare." };
  if (password !== null && (password.length < 10 || password.length > 128)) {
    return { ok: false, error: "La password del link deve avere da 10 a 128 caratteri." };
  }
  if (password !== null && (await isPasswordBreached(password))) {
    return { ok: false, error: "Questa password è apparsa in violazioni di dati note. Scegline un'altra." };
  }
  if (!(await rateLimit(`publish:${user.id}`, 30, 60 * 60))) return { ok: false, error: "Troppe pubblicazioni, riprova più tardi." };

  const existing = await db.presentation.findFirst({ where: { id: pid.data, ownerId: user.id, deletedAt: null }, select: { shareSlug: true } });
  if (!existing) return { ok: false, error: "Presentazione non trovata" };

  // 128-bit unguessable slug; kept stable across re-publishing.
  const slug = existing.shareSlug ?? randomToken(16);
  await db.presentation.update({
    where: { id: pid.data },
    data: {
      visibility: "LINK",
      shareSlug: slug,
      sharePasswordHash: password ? await hashPassword(password) : null,
      publishedAt: new Date(),
    },
  });
  await audit("presentation.published", user.id, { presentationId: pid.data, passwordProtected: Boolean(password) });
  return { ok: true, slug, hasPassword: Boolean(password) };
}

export async function unpublishAction(id: unknown): Promise<PublishResult> {
  const user = await requireUser();
  if (!(await rateLimit(`publish:${user.id}`, 30, 60 * 60))) return { ok: false, error: "Troppe operazioni, riprova più tardi." };
  const pid = idSchema.safeParse(id);
  if (!pid.success) return { ok: false, error: "Presentazione non trovata" };
  // Rotating the slug means old links stop working even if re-published later.
  const { count } = await db.presentation.updateMany({
    where: { id: pid.data, ownerId: user.id },
    data: { visibility: "PRIVATE", shareSlug: null, sharePasswordHash: null },
  });
  if (count !== 1) return { ok: false, error: "Presentazione non trovata" };
  await audit("presentation.unpublished", user.id, { presentationId: pid.data });
  return { ok: true, slug: null, hasPassword: false };
}
