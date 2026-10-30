import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomToken } from "@/lib/crypto";
import { rateLimit } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/auth/session";
import { MAX_ASSET_BYTES, sniffImage } from "@/lib/assets";
import { STORAGE_QUOTA_BYTES, storageUsed } from "@/lib/presentations";

const error = (message: string, status: number) => NextResponse.json({ error: message }, { status });

/** Upload one image. The CSRF Origin check runs in src/proxy.ts before this handler. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return error("Accedi per caricare immagini.", 401);
  if (!(await rateLimit(`upload:${user.id}`, 60, 60 * 60))) return error("Troppi caricamenti, riprova più tardi.", 429);

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_ASSET_BYTES + 64 * 1024) return error("L'immagine supera i 4 MB.", 413);

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    return error("Caricamento non valido.", 400);
  }
  if (!(file instanceof File)) return error("Nessun file ricevuto.", 400);
  if (file.size > MAX_ASSET_BYTES) return error("L'immagine supera i 4 MB.", 413);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffImage(bytes);
  if (!mime) return error("Formato non supportato: usa PNG, JPEG, WebP o GIF.", 415);
  if ((await storageUsed(user.id)) + bytes.length > STORAGE_QUOTA_BYTES) return error("Spazio esaurito.", 413);

  const id = randomToken(16);
  await db.asset.create({ data: { id, ownerId: user.id, mime, size: bytes.length, data: bytes } });
  return NextResponse.json({ src: `/a/${id}` }, { status: 201 });
}
