"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui";
import { startGuestAction } from "./actions";

function Submit({ className, variant, children }: { className: string; variant: "primary" | "ghost" | "outline"; children: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending} className={className}>
      {pending ? "Preparo l'editor…" : children}
    </Button>
  );
}

/** Starts a temporary guest account and opens the editor on an example presentation. */
export function GuestButton({
  className = "",
  variant = "primary",
  children = "Prova senza account",
}: {
  className?: string;
  variant?: "primary" | "ghost" | "outline";
  children?: ReactNode;
}) {
  return (
    <form action={startGuestAction}>
      <Submit className={className} variant={variant}>
        {children}
      </Submit>
    </form>
  );
}
