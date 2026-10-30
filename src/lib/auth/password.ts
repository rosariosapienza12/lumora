import "server-only";
import { hash, verify } from "@node-rs/argon2";
import { createHash } from "node:crypto";

// OWASP recommended argon2id parameters (19 MiB, 2 iterations, 1 lane).
const OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

// Each argon2 run takes ~19 MiB and real CPU time: cap how many run at once so
// a flood of login/sign-up requests cannot exhaust the server.
const MAX_CONCURRENT = 4;
let running = 0;
const queue: (() => void)[] = [];

async function limited<T>(fn: () => Promise<T>): Promise<T> {
  if (running >= MAX_CONCURRENT) await new Promise<void>((resolve) => queue.push(resolve));
  running++;
  try {
    return await fn();
  } finally {
    running--;
    queue.shift()?.();
  }
}

export function hashPassword(password: string): Promise<string> {
  return limited(() => hash(password, OPTIONS));
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await limited(() => verify(passwordHash, password));
  } catch {
    return false;
  }
}

// A real argon2id hash of a random string, used to spend the same time when
// the account does not exist (prevents user enumeration through timing).
let dummyHash: Promise<string> | null = null;
export async function burnPasswordCheck(password: string) {
  dummyHash ??= hashPassword(crypto.randomUUID());
  await verifyPassword(await dummyHash, password);
}

/**
 * Checks the password against Have I Been Pwned using k-anonymity: only the
 * first 5 hex chars of its SHA-1 leave the server. Fails open if the API is unreachable.
 */
export async function isPasswordBreached(password: string): Promise<boolean> {
  // SHA-1 is required by the Pwned Passwords range API; it is a lookup key, never how passwords are stored (argon2id).
  const sha1 = createHash("sha1").update(password).digest("hex").toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);
  try {
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true" },
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });
    if (!res.ok) return false;
    const body = await res.text();
    return body.split("\n").some((line) => {
      const [s, count] = line.trim().split(":");
      return s === suffix && Number(count) > 0;
    });
  } catch {
    return false;
  }
}
