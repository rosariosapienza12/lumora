"use server";

import { redirect } from "next/navigation";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { verifyPassword } from "@/lib/auth/password";
import { getPublished, setUnlocked } from "@/lib/public-view";
import type { FormState } from "@/lib/validation";

export async function unlockAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const slug = String(formData.get("slug") ?? "");
  const password = String(formData.get("password") ?? "").slice(0, 128);
  if (!/^[A-Za-z0-9_-]{16,32}$/.test(slug)) redirect("/");

  const allowed =
    (await rateLimit(`unlock:${await clientIp()}:${slug.slice(0, 32)}`, 10, 15 * 60)) &&
    // Per-link ceiling, whatever the source IP: stops distributed guessing.
    (await rateLimit(`unlock:slug:${slug.slice(0, 32)}`, 50, 60 * 60));
  if (!allowed) {
    return { message: "Troppi tentativi. Riprova tra qualche minuto." };
  }

  const p = await getPublished(slug);
  if (!p?.passwordHash) redirect(`/p/${encodeURIComponent(slug)}`);
  if (!(await verifyPassword(p.passwordHash, password))) return { message: "Password non corretta." };

  await setUnlocked(slug, p.passwordHash);
  redirect(`/p/${encodeURIComponent(slug)}`);
}
