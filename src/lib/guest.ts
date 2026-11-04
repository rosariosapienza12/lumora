/**
 * Guest accounts let people try Lumora without signing up.
 * Their address uses the reserved `.invalid` top-level domain, so no email can ever
 * be delivered to it; they cannot publish (email never confirmed) and they are
 * deleted, with everything they made, after GUEST_HOURS.
 */
export const GUEST_DOMAIN = "ospite.lumora.invalid";
export const GUEST_HOURS = 24;

export function isGuestEmail(email: string): boolean {
  return email.toLowerCase().endsWith(`@${GUEST_DOMAIN}`);
}

export function newGuestEmail(): string {
  // Web Crypto: the same code works on the server and in the browser (this module is shared).
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `ospite-${hex}@${GUEST_DOMAIN}`;
}

/** Guests created before this moment have expired. */
export function guestCutoff(now = new Date()): Date {
  return new Date(now.getTime() - GUEST_HOURS * 60 * 60 * 1000);
}
