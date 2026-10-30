import "server-only";
import { db } from "./db";
import { documentSchema, MAX_DOC_BYTES, type PresentationDoc } from "./editor/schema";

/**
 * Data access layer for presentations. Every function takes the owner id and
 * scopes the query with it, so one user can never read or change another
 * user's presentations (protects against IDOR).
 */

export function listPresentations(ownerId: string, opts: { trash?: boolean; q?: string } = {}) {
  return db.presentation.findMany({
    where: {
      ownerId,
      deletedAt: opts.trash ? { not: null } : null,
      ...(opts.q ? { title: { contains: opts.q.slice(0, 100), mode: "insensitive" as const } } : {}),
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, updatedAt: true, visibility: true, deletedAt: true, content: true },
    take: 200,
  });
}

export function getOwnedPresentation(ownerId: string, id: string) {
  return db.presentation.findFirst({ where: { id, ownerId, deletedAt: null } });
}

export const MAX_PRESENTATIONS = 500;
/** Per-user storage quota across all presentations, trash included. */
export const STORAGE_QUOTA_BYTES = 100 * 1024 * 1024;

/** Counts every presentation, trash included, so trashing does not free a slot. */
export function countAll(ownerId: string) {
  return db.presentation.count({ where: { ownerId } });
}

/** Bytes used by the owner's documents and uploaded images, excluding presentation `exceptId` (the one being replaced). */
export async function storageUsed(ownerId: string, exceptId?: string) {
  const [docs, images] = await Promise.all([
    db.$queryRaw<{ bytes: bigint | null }[]>`
      SELECT SUM(pg_column_size("content"))::bigint AS bytes FROM "Presentation"
      WHERE "ownerId" = ${ownerId} AND "id" <> ${exceptId ?? ""}`,
    db.asset.aggregate({ where: { ownerId }, _sum: { size: true } }),
  ]);
  return Number(docs[0]?.bytes ?? 0) + (images._sum.size ?? 0);
}

export function docBytes(input: unknown) {
  return Buffer.byteLength(JSON.stringify(input ?? null), "utf8");
}

/** Validates the document; returns the parsed copy or an error message. */
export function parseDocument(input: unknown): { doc: PresentationDoc } | { error: string } {
  let bytes: number;
  try {
    bytes = docBytes(input);
  } catch {
    return { error: "Documento non valido" };
  }
  if (bytes > MAX_DOC_BYTES) return { error: "La presentazione è troppo grande." };
  const parsed = documentSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Documento non valido" };
  return { doc: parsed.data };
}
