import "server-only";
import { z } from "zod";

/** An empty variable (KEY= in .env) counts as not set. */
const optional = <T extends z.ZodTypeAny>(s: T) => z.preprocess((v) => (v === "" ? undefined : v), s.optional());

const schema = z
  .object({
    DATABASE_URL: z.string().url().refine((v) => /^postgres(ql)?:\/\//.test(v), "DATABASE_URL must be a PostgreSQL URL"),
    ENCRYPTION_KEY: z
      .string()
      .refine((v) => Buffer.from(v, "base64").length === 32, "ENCRYPTION_KEY must be 32 bytes, base64"),
    APP_URL: z.string().url(),
    // Number of reverse proxies you control in front of the app (0 when Next.js faces the internet).
    TRUSTED_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    // Optional: without it the assistant uses its on-board brain. Read only on the server.
    ANTHROPIC_API_KEY: optional(z.string().regex(/^sk-ant-[A-Za-z0-9_-]{20,}$/, "ANTHROPIC_API_KEY is not a valid Anthropic key")),
  })
  // In production the site must be served over HTTPS (secure cookies, HSTS).
  .refine((e) => e.NODE_ENV !== "production" || e.APP_URL.startsWith("https://") || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(e.APP_URL), {
    message: "APP_URL must use https in production",
    path: ["APP_URL"],
  });

// Fails fast at startup if configuration is missing or malformed.
export const env = schema.parse(process.env);

export const isProd = env.NODE_ENV === "production";
