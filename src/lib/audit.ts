import "server-only";
import { db } from "./db";
import { clientIp } from "./request";

export type AuditAction =
  | "signup"
  | "login.success"
  | "login.failure"
  | "login.locked"
  | "login.2fa.failure"
  | "logout"
  | "email.verified"
  | "password.reset.requested"
  | "password.reset"
  | "2fa.enabled"
  | "2fa.disabled"
  | "2fa.recovery.used"
  | "sessions.revoked"
  | "presentation.published"
  | "presentation.unpublished";

/** Never put secrets (passwords, tokens, codes) in `meta`. */
export async function audit(action: AuditAction, userId: string | null, meta?: Record<string, string | number | boolean>) {
  try {
    await db.auditLog.create({ data: { action, userId, ip: await clientIp(), meta } });
  } catch (err) {
    // Auditing must never break the user flow.
    console.error("audit log failed", action, err instanceof Error ? err.message : err);
  }
}
