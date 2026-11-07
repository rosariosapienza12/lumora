import "server-only";
import { z } from "zod";

/** An empty variable (KEY= in .env) counts as not set. */
const optional = <T extends z.ZodTypeAny>(s: T) => z.preprocess((v) => (v === "" ? undefined : v), s.optional());

export const envSchema = z
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
    // Free AI for Zib (any one is enough; see src/lib/ai/client.ts):
    // Google Gemini API free tier (https://aistudio.google.com/apikey),
    GEMINI_API_KEY: optional(z.string().regex(/^[A-Za-z0-9_-]{20,}$/, "GEMINI_API_KEY is not a valid key")),
    // The same Google key under the names other tools use.
    GOOGLE_API_KEY: optional(z.string().regex(/^[A-Za-z0-9_-]{20,}$/, "GOOGLE_API_KEY is not a valid key")),
    GOOGLE_GENERATIVE_AI_API_KEY: optional(z.string().regex(/^[A-Za-z0-9_-]{20,}$/, "GOOGLE_GENERATIVE_AI_API_KEY is not a valid key")),
    // Groq free tier (https://console.groq.com/keys),
    GROQ_API_KEY: optional(z.string().regex(/^gsk_[A-Za-z0-9]{20,}$/, "GROQ_API_KEY is not a valid Groq key")),
    // OpenRouter, models marked ":free" (https://openrouter.ai/keys).
    OPENROUTER_API_KEY: optional(z.string().regex(/^sk-or-[A-Za-z0-9_-]{20,}$/, "OPENROUTER_API_KEY is not a valid OpenRouter key")),
    // Optional: force one provider, or another model of it.
    AI_PROVIDER: optional(z.enum(["gemini", "groq", "openrouter", "anthropic"])),
    AI_MODEL: optional(z.string().regex(/^[\w.:/-]{2,100}$/, "AI_MODEL is not a valid model name")),
    // Transactional email through Resend (https://resend.com). Optional: without it, people can
    // still sign up, sign in and use the editor, but cannot confirm their email (so cannot
    // publish) or reset a forgotten password.
    RESEND_API_KEY: optional(z.string().regex(/^re_[A-Za-z0-9_]{10,}$/, "RESEND_API_KEY is not a valid Resend key")),
    // Sender, e.g. "Lumora <noreply@yourdomain.com>" (the domain must be verified on Resend).
    MAIL_FROM: optional(z.string().min(3).max(200)),
    // Shown on the privacy page as the contact for data-protection requests.
    CONTACT_EMAIL: optional(z.string().email("CONTACT_EMAIL is not a valid email")),
  })
  // In production the site must be served over HTTPS (secure cookies, HSTS).
  .refine((e) => e.NODE_ENV !== "production" || e.APP_URL.startsWith("https://") || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(e.APP_URL), {
    message: "APP_URL must use https in production",
    path: ["APP_URL"],
  })
  // Half a configuration is always a mistake.
  .refine((e) => Boolean(e.RESEND_API_KEY) === Boolean(e.MAIL_FROM), {
    message: "Set both RESEND_API_KEY and MAIL_FROM, or neither",
    path: ["MAIL_FROM"],
  });

// Fails fast at startup if configuration is missing or malformed.
export const env = envSchema.parse(process.env);

export const isProd = env.NODE_ENV === "production";

/** In development emails are printed to the terminal; in production they need a provider. */
export const emailEnabled = !isProd || Boolean(env.RESEND_API_KEY && env.MAIL_FROM);
