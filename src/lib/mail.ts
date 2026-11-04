import "server-only";
import { env, isProd } from "./env";
import { isGuestEmail } from "./guest";

export type Mail = { to: string; subject: string; text: string };

const RESEND_URL = "https://api.resend.com/emails";

/** Sends one email through Resend. Throws on any failure, without echoing the message. */
export async function sendWithResend(mail: Mail, apiKey: string, from: string, fetchImpl: typeof fetch = fetch) {
  const response = await fetchImpl(RESEND_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [mail.to], subject: mail.subject, text: mail.text }),
    // A provider that hangs must not keep requests open forever.
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    // Only the status: the body may echo the message, which contains single-use links.
    throw new Error(`Resend responded ${response.status}`);
  }
}

async function deliver(mail: Mail) {
  if (env.RESEND_API_KEY && env.MAIL_FROM) {
    await sendWithResend(mail, env.RESEND_API_KEY, env.MAIL_FROM);
    return;
  }
  if (isProd) {
    // No provider configured: the pages tell people that email is switched off.
    console.warn("email not sent: RESEND_API_KEY and MAIL_FROM are not set");
    return;
  }
  console.info(`\n──── EMAIL (dev) ────\nTo: ${mail.to}\nSubject: ${mail.subject}\n\n${mail.text}\n─────────────────────\n`);
}

/**
 * Sends in the background and never throws: the caller's response time and
 * outcome must not depend on whether an email was sent (prevents account enumeration).
 */
export function queueMail(mail: Mail) {
  // Guest addresses are undeliverable by design (.invalid domain).
  if (isGuestEmail(mail.to)) return;
  void deliver(mail).catch((err) => console.error("email delivery failed:", err instanceof Error ? err.message : err));
}
