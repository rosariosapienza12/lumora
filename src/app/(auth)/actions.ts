"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { audit } from "@/lib/audit";
import { queueMail } from "@/lib/mail";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { sha256 } from "@/lib/crypto";
import { burnPasswordCheck, hashPassword, isPasswordBreached, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession, getSession, revokeAllSessions } from "@/lib/auth/session";
import { consumeEmailToken, issueEmailToken } from "@/lib/auth/email-tokens";
import { consumeTotp, hashRecoveryCode } from "@/lib/auth/totp";
import {
  emailSchema,
  fieldErrors,
  loginSchema,
  passwordSchema,
  recoveryCodeSchema,
  signupSchema,
  totpCodeSchema,
  type FormState,
} from "@/lib/validation";

const TOO_MANY = "Troppi tentativi. Attendi qualche minuto e riprova.";
const MAX_FAILED_LOGINS = 10;
const MAX_FAILED_2FA = 10;
const LOCK_MINUTES = 15;

function str(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

// ── Sign up ────────────────────────────────────────────────────────────────

export async function signupAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = {
    kind: str(formData, "kind"),
    name: str(formData, "name"),
    email: str(formData, "email"),
    password: str(formData, "password"),
    terms: str(formData, "terms"),
  };
  const values = { kind: raw.kind, name: raw.name, email: raw.email };

  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const { kind, name, email, password } = parsed.data;

  const allowed =
    (await rateLimit(`signup:ip:${await clientIp()}`, 5, 60 * 60)) &&
    (await rateLimit(`signup:email:${sha256(email)}`, 3, 60 * 60)) &&
    // Global ceiling: caps account creation and outgoing mail even from many IPs.
    (await rateLimit("signup:global", 200, 60 * 60));
  if (!allowed) return { message: TOO_MANY, values };

  if (await isPasswordBreached(password)) {
    return {
      errors: { password: "Questa password è apparsa in violazioni di dati note. Scegline un'altra." },
      values,
    };
  }

  // Hash in both branches so response time does not reveal whether the email exists.
  const passwordHash = await hashPassword(password);
  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    queueMail({
      to: email,
      subject: "Tentativo di registrazione su Lumora",
      text: `Qualcuno ha provato a creare un account Lumora con questa email, ma ne hai già uno.\nSe hai dimenticato la password: ${env.APP_URL}/password-dimenticata\nSe non sei stato tu, puoi ignorare questo messaggio.`,
    });
  } else {
    const user = await db.user.create({ data: { kind, name, email, passwordHash } });
    const token = await issueEmailToken(user.id, "VERIFY_EMAIL");
    queueMail({
      to: email,
      subject: "Conferma la tua email su Lumora",
      text: `Ciao ${name},\nconferma il tuo indirizzo aprendo questo link (valido 24 ore):\n${env.APP_URL}/verifica-email?token=${token}`,
    });
    await audit("signup", user.id, { kind });
  }

  redirect(`/registrati/controlla-email`);
}

// Confirmation is a POST behind a button, so link scanners in mail clients
// that prefetch URLs cannot consume the token.
export async function verifyEmailAction(formData: FormData) {
  const userId = await consumeEmailToken(str(formData, "token"), "VERIFY_EMAIL");
  if (!userId) redirect("/verifica-email?esito=non-valido");
  await db.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
  await audit("email.verified", userId);
  redirect("/accedi?verificata=1");
}

// ── Log in ────────────────────────────────────────────────────────────────

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = { email: str(formData, "email"), password: str(formData, "password") };
  const values = { email: raw.email };
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const { email, password } = parsed.data;

  const allowed =
    (await rateLimit(`login:ip:${await clientIp()}`, 30, 15 * 60)) && (await rateLimit(`login:email:${sha256(email)}`, 10, 15 * 60));
  if (!allowed) return { message: TOO_MANY, values };

  const user = await db.user.findUnique({ where: { email } });
  const invalid: FormState = { message: "Email o password non corretti.", values };

  if (!user) {
    await burnPasswordCheck(password);
    await audit("login.failure", null, { reason: "unknown-email" });
    return invalid;
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    await audit("login.locked", user.id);
    return { message: TOO_MANY, values };
  }

  if (!(await verifyPassword(user.passwordHash, password))) {
    // Atomic increment: parallel attempts cannot undercount.
    const { failedLoginCount } = await db.user.update({
      where: { id: user.id },
      data: { failedLoginCount: { increment: 1 } },
      select: { failedLoginCount: true },
    });
    if (failedLoginCount >= MAX_FAILED_LOGINS) {
      await db.user.update({
        where: { id: user.id },
        data: { failedLoginCount: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60 * 1000) },
      });
      await audit("login.locked", user.id);
    } else {
      await audit("login.failure", user.id);
    }
    return invalid;
  }

  await db.user.update({ where: { id: user.id }, data: { failedLoginCount: 0, lockedUntil: null } });

  // Drop any session already in this browser before issuing a new one.
  await destroySession();

  if (user.totpEnabledAt && user.totpSecretEnc) {
    await createSession(user.id, true);
    redirect("/accedi/verifica");
  }

  await createSession(user.id);
  await audit("login.success", user.id);
  redirect("/dashboard");
}

export async function twoFactorAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session?.twoFactorPending) redirect("/accedi");

  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user?.totpSecretEnc) redirect("/accedi");

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    await destroySession();
    return { message: TOO_MANY };
  }
  // Keyed on the user, not the session: logging in again does not grant new guesses.
  if (!(await rateLimit(`2fa:user:${user.id}`, 5, 10 * 60))) return { message: TOO_MANY };

  let ok = false;
  if (str(formData, "mode") === "recovery") {
    const code = recoveryCodeSchema.safeParse(str(formData, "code"));
    if (code.success) {
      const { count } = await db.recoveryCode.updateMany({
        where: { userId: user.id, codeHash: hashRecoveryCode(code.data), usedAt: null },
        data: { usedAt: new Date() },
      });
      ok = count === 1;
      if (ok) await audit("2fa.recovery.used", user.id);
    }
  } else {
    const code = totpCodeSchema.safeParse(str(formData, "code"));
    ok = code.success && (await consumeTotp(user.id, user.totpSecretEnc, user.email, code.data));
  }

  if (!ok) {
    const { failedLoginCount } = await db.user.update({
      where: { id: user.id },
      data: { failedLoginCount: { increment: 1 } },
      select: { failedLoginCount: true },
    });
    if (failedLoginCount >= MAX_FAILED_2FA) {
      await db.user.update({
        where: { id: user.id },
        data: { failedLoginCount: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60 * 1000) },
      });
      await audit("login.locked", user.id, { step: "2fa" });
      await destroySession();
      return { message: TOO_MANY };
    }
    await audit("login.2fa.failure", user.id);
    return { errors: { code: "Codice non valido." } };
  }

  await db.user.update({ where: { id: user.id }, data: { failedLoginCount: 0 } });
  await destroySession();
  await createSession(user.id);
  await audit("login.success", user.id, { twoFactor: true });
  redirect("/dashboard");
}

export async function logoutAction() {
  const session = await getSession();
  await destroySession();
  if (session) await audit("logout", session.userId);
  redirect("/");
}

// ── Password reset ──────────────────────────────────────────────────────────

export async function forgotPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = emailSchema.safeParse(str(formData, "email"));
  if (!parsed.success) return { errors: { email: parsed.error.issues[0].message } };
  const email = parsed.data;
  const done: FormState = {
    ok: true,
    message: "Se esiste un account con questa email, riceverai a breve un link per reimpostare la password.",
  };

  const allowed =
    (await rateLimit(`forgot:ip:${await clientIp()}`, 10, 60 * 60)) &&
    (await rateLimit(`forgot:email:${sha256(email)}`, 3, 60 * 60));
  if (!allowed) return done;

  const user = await db.user.findUnique({ where: { email }, select: { id: true, name: true } });
  if (user) {
    const token = await issueEmailToken(user.id, "RESET_PASSWORD");
    queueMail({
      to: email,
      subject: "Reimposta la password di Lumora",
      text: `Ciao ${user.name},\nper scegliere una nuova password apri questo link (valido 30 minuti):\n${env.APP_URL}/reimposta-password?token=${token}\nSe non l'hai richiesto tu, ignora questa email: la password attuale resta valida.`,
    });
    await audit("password.reset.requested", user.id);
  }
  return done;
}

export async function resetPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const password = str(formData, "password");
  const confirm = str(formData, "confirm");
  const token = str(formData, "token");

  if (!(await rateLimit(`reset:ip:${await clientIp()}`, 10, 60 * 60))) return { message: TOO_MANY };

  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) return { errors: { password: parsed.error.issues[0].message } };
  if (password !== confirm) return { errors: { confirm: "Le password non coincidono" } };
  if (await isPasswordBreached(password)) {
    return { errors: { password: "Questa password è apparsa in violazioni di dati note. Scegline un'altra." } };
  }

  const userId = await consumeEmailToken(token, "RESET_PASSWORD");
  if (!userId) return { message: "Il link non è valido o è scaduto. Richiedine uno nuovo." };

  const before = await db.user.findUnique({ where: { id: userId }, select: { emailVerifiedAt: true } });
  const wasUnverified = !before?.emailVerifiedAt;

  await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: {
        passwordHash: await hashPassword(password),
        failedLoginCount: 0,
        lockedUntil: null,
        // Opening the reset link proves ownership of the mailbox.
        emailVerifiedAt: new Date(),
        // If the email was never verified, whoever set up 2FA may not be the mailbox owner.
        ...(wasUnverified ? { totpSecretEnc: null, totpEnabledAt: null, totpLastStep: null } : {}),
      },
    }),
    ...(wasUnverified ? [db.recoveryCode.deleteMany({ where: { userId } })] : []),
  ]);
  await revokeAllSessions(userId);
  await audit("password.reset", userId);
  redirect("/accedi?reimpostata=1");
}
