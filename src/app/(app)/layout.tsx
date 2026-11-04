import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { logoutAction } from "../(auth)/actions";
import { Logo } from "@/components/ui";
import { Assistant } from "@/components/assistant/assistant";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  return (
    <div className="flex min-h-screen flex-col">
      {/* On phones the links move to a second row, so the header never overflows the screen. */}
      <header className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-line bg-paper px-5 py-3">
        <Logo />
        <nav className="order-last flex w-full gap-1 text-sm font-medium sm:order-none sm:w-auto">
          <Link href="/dashboard" className="rounded-full px-3 py-1.5 hover:bg-mist">
            Le mie presentazioni
          </Link>
          <Link href="/impostazioni" className="rounded-full px-3 py-1.5 hover:bg-mist">
            Sicurezza
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className="hidden text-ink-soft sm:inline">{user.name}</span>
          <form action={logoutAction}>
            <button type="submit" className="rounded-full px-3 py-1.5 font-medium hover:bg-mist">
              Esci
            </button>
          </form>
        </div>
      </header>
      <main className="flex-1 px-5 py-8">{children}</main>
      <Assistant />
    </div>
  );
}
