"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { randomToken } from "@/lib/crypto";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { hashPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { buildTemplate } from "@/lib/editor/templates";
import { DEFAULT_THEME } from "@/lib/editor/themes";
import { GUEST_DOMAIN, guestCutoff, newGuestEmail } from "@/lib/guest";
import type { Prisma } from "@/generated/prisma/client";

// Short enough to fit the cover on one line, like the template names.
const FIRST_TITLE = "Benvenuto su Lumora";

/** "Prova senza account": a temporary account with an example presentation, opened in the editor. */
export async function startGuestAction() {
  const allowed =
    (await rateLimit(`guest:ip:${await clientIp()}`, 5, 60 * 60)) &&
    // Global ceiling, so a botnet cannot fill the database with guests.
    (await rateLimit("guest:global", 300, 60 * 60));
  if (!allowed) redirect("/accedi?ospite=limite");

  // Housekeeping: guests older than a day go away, with their presentations, images and sessions (cascade).
  await db.user.deleteMany({ where: { email: { endsWith: `@${GUEST_DOMAIN}` }, createdAt: { lt: guestCutoff() } } });

  const user = await db.user.create({
    data: {
      kind: "EDUCATION",
      name: "Ospite",
      email: newGuestEmail(),
      // Random password that nobody ever sees: the account is reachable only through this session.
      passwordHash: await hashPassword(randomToken()),
    },
    select: { id: true },
  });
  const content = buildTemplate("lezione", FIRST_TITLE, DEFAULT_THEME);
  const presentation = await db.presentation.create({
    data: { ownerId: user.id, title: FIRST_TITLE, content: content as Prisma.InputJsonValue },
    select: { id: true },
  });

  await destroySession();
  await createSession(user.id);
  await audit("guest.started", user.id);
  redirect(`/editor/${presentation.id}`);
}
