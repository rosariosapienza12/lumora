import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2 font-display text-xl font-bold tracking-tight ${className}`}>
      <span aria-hidden className="relative grid size-7 place-items-center rounded-full bg-violet">
        <span className="size-2.5 rounded-full bg-amber" />
      </span>
      Lumora
    </Link>
  );
}

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-[background,transform] active:scale-[0.97] disabled:opacity-60 disabled:pointer-events-none";

const variants = {
  primary: "bg-violet text-white hover:bg-violet-deep",
  ghost: "text-ink hover:bg-line/60",
  outline: "border border-line bg-paper text-ink hover:border-violet",
  danger: "bg-danger text-white hover:opacity-90",
} as const;

type Variant = keyof typeof variants;

export function Button({ variant = "primary", className = "", ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={`${buttonBase} ${variants[variant]} ${className}`} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={`${buttonBase} ${variants[variant]} ${className}`} {...props} />;
}

export function Field({
  label,
  name,
  error,
  hint,
  ...props
}: ComponentProps<"input"> & { label: string; name: string; error?: string; hint?: ReactNode }) {
  const id = `f-${name}`;
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className="rounded-xl border border-line bg-paper px-3.5 py-2.5 text-base outline-none transition-colors focus:border-violet aria-invalid:border-danger"
        {...props}
      />
      {error ? (
        <p id={`${id}-err`} className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-ink-soft">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function FormMessage({ children, tone = "error" }: { children?: ReactNode; tone?: "error" | "ok" }) {
  if (!children) return null;
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-xl px-3.5 py-2.5 text-sm ${tone === "error" ? "bg-danger/10 text-danger" : "bg-mint/10 text-mint"}`}
    >
      {children}
    </p>
  );
}
