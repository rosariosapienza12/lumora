"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { hashPassword, isPasswordBreached, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession, requireUser, revokeAllSessions } from "@/lib/auth/session";
import { consumeTotp, createTotpEnrollment, generateRecoveryCodes } from "@/lib/auth/totp";
import { passwordSchema, totpCodeSchema, type FormState } from "@/lib/validation";

export type EnrollState = FormState & { qrDataUrl?: string; secret?: string; recoveryCodes?: string[] };

const TOO_MANY = "Troppi tentativi, riprova tra qualche minuto.";

/** Re-checks the password: a stolen session alone must not change security settings. */
async function confirmPassword(userId: string, password: unknown) {
  if (typeof password !== "string" || password.length > 128) return false;
  const row = await db.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  return Boolean(row && (await verifyPassword(row.passwordHash, password)));
}

/** Signs out every other device and keeps this browser signed in with a fresh session. */
async function rotateSessions(userId: string) {
  await revokeAllSessions(userId);
  await destroySession();
  await createSession(userId);
}

/**
 * Changes the password from inside the account: the current password is required (a stolen
 * session alone is not enough), the new one goes through the same rules as sign-up, and every
 * other session is signed out.
 */
export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!(await rateLimit(`password-change:${user.id}`, 5, 15 * 60))) return { message: TOO_MANY };

  const next = formData.get("next");
  const confirm = formData.get("confirm");
  const parsed = passwordSchema.safeParse(next);
  if (!parsed.success) return { errors: { next: parsed.error.issues[0].message } };
  if (next !== confirm) return { errors: { confirm: "Le password non coincidono" } };
  if (!(await confirmPassword(user.id, formData.get("current")))) return { errors: { current: "Password attuale non corretta" } };
  if (await isPasswordBreached(parsed.data)) {
    return { errors: { next: "Questa password è apparsa in violazioni di dati note. Scegline un'altra." } };
  }

  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(parsed.data), failedLoginCount: 0, lockedUntil: null } });
  await rotateSessions(user.id);
  await audit("password.changed", user.id);
  revalidatePath("/impostazioni");
  return { ok: true };
}

export async function startTotpAction(_prev: EnrollState, formData: FormData): Promise<EnrollState> {
  const user = await requireUser();
  if (user.totpEnabledAt) return { message: "La verifica in due passaggi è già attiva." };
  if (!user.emailVerifiedAt) return { message: "Conferma prima la tua email." };
  if (!(await rateLimit(`2fa-enroll:${user.id}`, 10, 10 * 60))) return { message: TOO_MANY };
  if (!(await confirmPassword(user.id, formData.get("password")))) return { message: "Password non corretta." };

  const { secret, secretEnc, qrDataUrl } = await createTotpEnrollment(user.email);
  // Stored but not enforced until confirmed (totpEnabledAt stays null).
  await db.user.update({ where: { id: user.id }, data: { totpSecretEnc: secretEnc, totpLastStep: null } });
  return { qrDataUrl, secret };
}

export async function confirmTotpAction(_prev: EnrollState, formData: FormData): Promise<EnrollState> {
  const user = await requireUser();
  if (!(await rateLimit(`2fa-enroll:${user.id}`, 10, 10 * 60))) return { ..._prev, message: TOO_MANY };

  const row = await db.user.findUnique({ where: { id: user.id }, select: { totpSecretEnc: true, totpEnabledAt: true } });
  if (!row?.totpSecretEnc || row.totpEnabledAt) return { message: "Avvia di nuovo la configurazione." };

  const parsed = totpCodeSchema.safeParse(formData.get("code"));
  if (!parsed.success || !(await consumeTotp(user.id, row.totpSecretEnc, user.email, parsed.data))) {
    return { ..._prev, errors: { code: "Codice non valido. Controlla che l'ora del telefono sia corretta." } };
  }

  const { codes, hashes } = generateRecoveryCodes();
  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { totpEnabledAt: new Date() } }),
    db.recoveryCode.deleteMany({ where: { userId: user.id } }),
    db.recoveryCode.createMany({ data: hashes.map((codeHash) => ({ userId: user.id, codeHash })) }),
  ]);
  await rotateSessions(user.id);
  await audit("2fa.enabled", user.id);
  revalidatePath("/impostazioni");
  return { ok: true, recoveryCodes: codes };
}

export async function disableTotpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!(await rateLimit(`2fa-disable:${user.id}`, 5, 15 * 60))) return { message: TOO_MANY };

  const row = await db.user.findUnique({ where: { id: user.id }, select: { totpSecretEnc: true } });
  const code = totpCodeSchema.safeParse(formData.get("code"));
  const ok =
    row?.totpSecretEnc &&
    (await confirmPassword(user.id, formData.get("password"))) &&
    code.success &&
    (await consumeTotp(user.id, row.totpSecretEnc, user.email, code.data));
  if (!ok) return { message: "Password o codice non corretti." };

  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { totpEnabledAt: null, totpSecretEnc: null, totpLastStep: null } }),
    db.recoveryCode.deleteMany({ where: { userId: user.id } }),
  ]);
  await rotateSessions(user.id);
  await audit("2fa.disabled", user.id);
  revalidatePath("/impostazioni");
  return { ok: true, message: "Verifica in due passaggi disattivata." };
}

export async function revokeOtherSessionsAction() {
  const user = await requireUser();
  if (!(await rateLimit(`sessions-revoke:${user.id}`, 10, 15 * 60))) return;
  await rotateSessions(user.id);
  await audit("sessions.revoked", user.id);
  revalidatePath("/impostazioni");
}
