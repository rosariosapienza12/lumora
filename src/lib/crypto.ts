import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, hkdfSync, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "./env";

/** URL-safe random token with `bytes` bytes of entropy. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

// One master secret, separate derived keys per purpose (no key reuse across algorithms).
const master = Buffer.from(env.ENCRYPTION_KEY, "base64");
const derive = (purpose: string) => Buffer.from(hkdfSync("sha256", master, Buffer.alloc(0), `lumora:${purpose}:v1`, 32));
const keys = {
  encrypt: derive("aes-gcm"),
  hmac: derive("hmac"),
};

/** Keyed hash for low-entropy secrets (recovery codes, cookie signatures): useless without the server key. */
export function hmac(value: string): string {
  return createHmac("sha256", keys.hmac).update(value).digest("base64url");
}

const VERSION = "v1";

/** AES-256-GCM. Output: v1.base64url(iv).base64url(tag).base64url(ciphertext) */
export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keys.encrypt, iv, { authTagLength: 16 });
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return [VERSION, ...[iv, cipher.getAuthTag(), ct].map((b) => b.toString("base64url"))].join(".");
}

export function decrypt(payload: string): string {
  const [version, ...parts] = payload.split(".");
  if (version !== VERSION) throw new Error("Unknown ciphertext version");
  const [iv, tag, ct] = parts.map((p) => Buffer.from(p, "base64url"));
  if (!iv || !tag || !ct || tag.length !== 16) throw new Error("Malformed ciphertext");
  const decipher = createDecipheriv("aes-256-gcm", keys.encrypt, iv, { authTagLength: 16 });
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}
