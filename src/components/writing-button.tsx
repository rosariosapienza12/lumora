"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui";

/** What Zib is doing while it writes, in the order it happens. */
const STAGES = ["Zib sceglie la scaletta…", "Zib scrive le pagine…", "Zib controlla i fatti…", "Zib sceglie tema e immagini…", "Quasi pronta…"];

/**
 * Submit button for "create a presentation": while Zib writes (up to half a
 * minute with AI) it says what is happening and how long it has been, so the
 * wait never looks like a frozen page.
 */
export function WritingButton({ children, className }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!pending) return;
    const start = Date.now();
    const t = setInterval(() => setSeconds(Math.round((Date.now() - start) / 1000)), 1000);
    return () => {
      clearInterval(t);
      setSeconds(0);
    };
  }, [pending]);
  const stage = STAGES[Math.min(STAGES.length - 1, Math.floor(seconds / 7))];
  return (
    <Button type="submit" disabled={pending} className={className} aria-live="polite">
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {stage}
          {seconds >= 3 && <span className="tabular-nums opacity-70">{seconds}s</span>}
        </span>
      ) : (
        children
      )}
    </Button>
  );
}
