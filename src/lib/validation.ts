import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "Email troppo lunga")
  .email("Inserisci un'email valida");

// Length over complexity rules (NIST SP 800-63B); breached passwords are rejected separately.
export const passwordSchema = z
  .string()
  .min(12, "La password deve avere almeno 12 caratteri")
  .max(128, "La password può avere al massimo 128 caratteri");

export const nameSchema = z.string().trim().min(1, "Inserisci il tuo nome").max(80, "Nome troppo lungo");

export const kindSchema = z.enum(["EDUCATION", "BUSINESS", "STUDENT"], { message: "Scegli un profilo" });

export const signupSchema = z.object({
  kind: kindSchema,
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  terms: z.literal("on", { message: "Devi accettare i termini e l'informativa privacy" }),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Inserisci la password").max(128),
});

export const totpCodeSchema = z.string().trim().regex(/^\d{3}\s?\d{3}$/, "Il codice è di 6 cifre");

export const recoveryCodeSchema = z.string().trim().min(16).max(30);

/** Flattens zod errors to { field: firstMessage } for forms. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

export type FormState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
  values?: Record<string, string>;
};
