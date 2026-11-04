import { describe, expect, it } from "vitest";
import { GUEST_DOMAIN, guestCutoff, isGuestEmail, newGuestEmail } from "./guest";

describe("guest accounts", () => {
  it("creates unique, undeliverable addresses", () => {
    const a = newGuestEmail();
    const b = newGuestEmail();
    expect(a).not.toBe(b);
    expect(a.endsWith(`@${GUEST_DOMAIN}`)).toBe(true);
    // .invalid is reserved (RFC 2606): mail to it can never be delivered
    expect(GUEST_DOMAIN.endsWith(".invalid")).toBe(true);
  });

  it("recognises guest addresses only by the full domain", () => {
    expect(isGuestEmail(newGuestEmail())).toBe(true);
    expect(isGuestEmail("OSPITE-1@OSPITE.LUMORA.INVALID")).toBe(true);
    expect(isGuestEmail("ada@example.com")).toBe(false);
    expect(isGuestEmail("ada@ospite.lumora.invalid.example.com")).toBe(false);
    expect(isGuestEmail("ada@notospite.lumora.invalid")).toBe(false);
  });

  it("expires guests after 24 hours", () => {
    const now = new Date("2026-11-04T20:00:00Z");
    expect(guestCutoff(now).toISOString()).toBe("2026-11-03T20:00:00.000Z");
  });
});
