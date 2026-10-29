import { describe, expect, it } from "vitest";
import { decrypt, encrypt, hmac } from "./crypto";
import { generateRecoveryCodes, hashRecoveryCode } from "./auth/totp";

describe("encrypt / decrypt", () => {
  it("round-trips and uses a fresh IV each time", () => {
    const a = encrypt("JBSWY3DPEHPK3PXP");
    const b = encrypt("JBSWY3DPEHPK3PXP");
    expect(a).not.toBe(b);
    expect(a.startsWith("v1.")).toBe(true);
    expect(decrypt(a)).toBe("JBSWY3DPEHPK3PXP");
  });

  it("rejects tampered ciphertext and truncated tags", () => {
    const [v, iv, tag, ct] = encrypt("secret").split(".");
    const flipped = ct[0] === "A" ? "B" + ct.slice(1) : "A" + ct.slice(1);
    expect(() => decrypt([v, iv, tag, flipped].join("."))).toThrow();
    expect(() => decrypt([v, iv, tag.slice(0, 8), ct].join("."))).toThrow();
    expect(() => decrypt(["v0", iv, tag, ct].join("."))).toThrow();
  });
});

describe("recovery codes", () => {
  it("generates ten unique ~80-bit codes stored as keyed hashes", () => {
    const { codes, hashes } = generateRecoveryCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    for (const c of codes) expect(c).toMatch(/^[a-z2-9]{4}(-[a-z2-9]{4}){3}$/);
    expect(hashes[0]).toBe(hashRecoveryCode(codes[0]));
    expect(hashes[0]).not.toContain(codes[0].replace(/-/g, ""));
  });

  it("accepts codes typed with different case, spaces or no dashes", () => {
    const { codes } = generateRecoveryCodes();
    const raw = codes[0];
    expect(hashRecoveryCode(raw.toUpperCase())).toBe(hashRecoveryCode(raw));
    expect(hashRecoveryCode(raw.replace(/-/g, " "))).toBe(hashRecoveryCode(raw));
  });

  it("hmac depends on the server key purpose, not plain sha256", () => {
    expect(hmac("a")).not.toBe(hmac("b"));
    expect(hmac("a")).toHaveLength(43);
  });
});
