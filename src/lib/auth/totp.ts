import "server-only";
import { Secret, TOTP } from "otpauth";
import QRCode from "qrcode";
import { randomBytes } from "node:crypto";
import { db } from "../db";
import { decrypt, encrypt, hmac } from "../crypto";

const PERIOD = 30;

function totpFor(secretBase32: string, email: string) {
  return new TOTP({
    issuer: "Lumora",
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: PERIOD,
    secret: Secret.fromBase32(secretBase32),
  });
}

export async function createTotpEnrollment(email: string) {
  const secret = new Secret({ size: 20 }).base32;
  const uri = totpFor(secret, email).toString();
  const qrDataUrl = await QRCode.toDataURL(uri, { margin: 1, width: 220 });
  return { secret, secretEnc: encrypt(secret), qrDataUrl };
}

/** Time step of a valid code (current step ± 1 for clock drift), or null. */
export function totpStep(secretEnc: string, email: string, code: string): number | null {
  const token = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(token)) return null;
  const delta = totpFor(decrypt(secretEnc), email).validate({ token, window: 1 });
  if (delta === null) return null;
  return Math.floor(Date.now() / 1000 / PERIOD) + delta;
}

/**
 * Verifies a code and atomically records its time step, so the same code (or
 * an older one) cannot be replayed within its validity window.
 */
export async function consumeTotp(userId: string, secretEnc: string, email: string, code: string): Promise<boolean> {
  const step = totpStep(secretEnc, email, code);
  if (step === null) return false;
  const { count } = await db.user.updateMany({
    where: { id: userId, OR: [{ totpLastStep: null }, { totpLastStep: { lt: step } }] },
    data: { totpLastStep: step },
  });
  return count === 1;
}

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

/**
 * Ten single-use codes like "k7m2-9qxd-hp4w-z2bn" (~79 bits each), shown once
 * and stored as HMACs keyed with a server secret.
 */
export function generateRecoveryCodes() {
  const codes = Array.from({ length: 10 }, () => {
    const chars = Array.from(randomBytes(16), (b) => ALPHABET[b % ALPHABET.length]).join("");
    return chars.match(/.{4}/g)!.join("-");
  });
  return { codes, hashes: codes.map((c) => hashRecoveryCode(c)) };
}

export function hashRecoveryCode(code: string) {
  return hmac(`recovery:${normalizeRecoveryCode(code)}`);
}

function normalizeRecoveryCode(code: string) {
  return code.toLowerCase().replace(/[\s-]/g, "");
}
