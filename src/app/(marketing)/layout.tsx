import Link from "next/link";
import { ButtonLink, Logo } from "@/components/ui";
import { Assistant } from "@/components/assistant/assistant";

// Light field behind the glass panels: the brand's colours, drifting slowly.
const LIGHTS = [
  { color: "#5b3df5", style: { width: "48vw", height: "48vw", left: "-12vw", top: "-10vw" } },
  { color: "#ffb547", style: { width: "34vw", height: "34vw", right: "-8vw", top: "30vh", animationDelay: "-8s" } },
  { color: "#2fd4cf", style: { width: "38vw", height: "38vw", left: "20vw", top: "120vh", animationDelay: "-14s" } },
  { color: "#ff8fb1", style: { width: "30vw", height: "30vw", right: "6vw", bottom: "-8vw", animationDelay: "-4s" } },
];

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="glass-sky" aria-hidden>
        {LIGHTS.map((l) => (
          <span key={l.color} style={{ "--light": l.color, ...l.style } as unknown as React.CSSProperties} />
        ))}
      </div>

      <header className="sticky top-3 z-40 mx-auto mt-3 w-[calc(100%-1.5rem)] max-w-7xl">
        <div className="glass flex items-center gap-6 rounded-full px-4 py-2.5 sm:px-5">
          <Logo />
          <nav className="hidden gap-1 text-sm font-medium sm:flex">
            <Link href="/#viaggio" className="rounded-full px-3 py-1.5 hover:bg-paper/60">
              Funzioni
            </Link>
            <Link href="/#sicurezza" className="rounded-full px-3 py-1.5 hover:bg-paper/60">
              Sicurezza
            </Link>
          </nav>
          <div className="ml-auto flex gap-2">
            <ButtonLink href="/accedi" variant="ghost">
              Accedi
            </ButtonLink>
            <ButtonLink href="/registrati">Registrati</ButtonLink>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mx-auto mb-3 w-[calc(100%-1.5rem)] max-w-7xl">
        <div className="glass flex flex-wrap items-center gap-4 rounded-[28px] px-6 py-6 text-sm text-ink-soft">
          <Logo className="text-base text-ink" />
          <span>© {new Date().getFullYear()} Lumora</span>
          <nav className="ml-auto flex gap-4">
            <Link href="/privacy">Privacy</Link>
            <Link href="/cookie">Cookie</Link>
            <Link href="/termini">Termini di servizio</Link>
          </nav>
        </div>
      </footer>
      <Assistant />
    </div>
  );
}
