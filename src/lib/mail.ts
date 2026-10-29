import "server-only";
import { isProd } from "./env";

type Mail = { to: string; subject: string; text: string };

async function deliver(mail: Mail) {
  if (isProd) {
    // Plug in a transactional email provider here (e.g. Resend, Postmark) before going live.
    // Never log the message body: it contains single-use links.
    throw new Error("No email provider configured");
  }
  console.info(`\n──── EMAIL (dev) ────\nTo: ${mail.to}\nSubject: ${mail.subject}\n\n${mail.text}\n─────────────────────\n`);
}

/**
 * Sends in the background and never throws: the caller's response time and
 * outcome must not depend on whether an email was sent (prevents account enumeration).
 */
export function queueMail(mail: Mail) {
  void deliver(mail).catch((err) => console.error("email delivery failed:", err instanceof Error ? err.message : err));
}
