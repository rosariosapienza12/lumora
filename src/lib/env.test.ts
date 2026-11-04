import { describe, expect, it } from "vitest";
import { envSchema } from "./env";

const base = {
  DATABASE_URL: "postgresql://u:p@db.example.com:5432/lumora",
  ENCRYPTION_KEY: Buffer.alloc(32, 1).toString("base64"),
  APP_URL: "https://lumora.example.com",
  NODE_ENV: "production",
};

describe("envSchema", () => {
  it("starts in production without an email provider (email is optional)", () => {
    expect(envSchema.safeParse(base).success).toBe(true);
  });

  it("accepts a complete Resend configuration", () => {
    const parsed = envSchema.safeParse({ ...base, RESEND_API_KEY: "re_1234567890abcdef", MAIL_FROM: "Lumora <noreply@example.com>" });
    expect(parsed.success).toBe(true);
  });

  it("rejects half an email configuration", () => {
    expect(envSchema.safeParse({ ...base, RESEND_API_KEY: "re_1234567890abcdef" }).success).toBe(false);
    expect(envSchema.safeParse({ ...base, MAIL_FROM: "noreply@example.com" }).success).toBe(false);
  });

  it("requires https in production and a 32-byte encryption key", () => {
    expect(envSchema.safeParse({ ...base, APP_URL: "http://lumora.example.com" }).success).toBe(false);
    expect(envSchema.safeParse({ ...base, ENCRYPTION_KEY: "corta" }).success).toBe(false);
  });
});
