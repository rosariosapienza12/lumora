import Link from "next/link";
import { GUEST_HOURS } from "@/lib/guest";

/** Reminds a guest that their work is temporary and cannot be published. */
export function GuestBanner() {
  return (
    <p role="note" className="bg-amber/15 px-4 py-2 text-center text-sm">
      Stai provando Lumora come ospite: le presentazioni si cancellano dopo {GUEST_HOURS} ore e non si possono pubblicare.{" "}
      <Link href="/registrati" className="font-semibold text-violet underline-offset-2 hover:underline">
        Crea un account gratis
      </Link>
    </p>
  );
}
