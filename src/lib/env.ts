import "server-only";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().url(),
  ENCRYPTION_KEY: z
    .string()
    .refine((v) => Buffer.from(v, "base64").length === 32, "ENCRYPTION_KEY must be 32 bytes, base64"),
  APP_URL: z.string().url(),
  // Number of reverse proxies you control in front of the app (0 when Next.js faces the internet).
  TRUSTED_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

// Fails fast at startup if configuration is missing or malformed.
export const env = schema.parse(process.env);

export const isProd = env.NODE_ENV === "production";
