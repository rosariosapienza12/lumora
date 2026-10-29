"use client";

import { useActionState } from "react";
import { unlockAction } from "./actions";
import { Button, Field, FormMessage } from "@/components/ui";
import type { FormState } from "@/lib/validation";

export function UnlockForm({ slug }: { slug: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(unlockAction, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="slug" value={slug} />
      <Field label="Password" name="password" type="password" autoComplete="off" autoFocus required />
      <FormMessage>{state.message}</FormMessage>
      <Button type="submit" disabled={pending}>
        Apri la presentazione
      </Button>
    </form>
  );
}
