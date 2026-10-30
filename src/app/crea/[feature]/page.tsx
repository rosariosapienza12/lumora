import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { isStarterId, STARTERS } from "@/lib/editor/starters";
import { Logo } from "@/components/ui";
import { FEATURES } from "../../(marketing)/features";
import { StarterChooser } from "./starter-chooser";

export async function generateMetadata({ params }: PageProps<"/crea/[feature]">): Promise<Metadata> {
  const { feature } = await params;
  const f = FEATURES.find((x) => x.id === feature);
  return { title: f ? `Crea con ${f.title.toLowerCase()}` : "Crea" };
}

/** Landing for the planet shortcuts: shows the idea, then creates it in one click. */
export default async function CreatePage({ params }: PageProps<"/crea/[feature]">) {
  const { feature } = await params;
  if (!isStarterId(feature)) notFound();
  const f = FEATURES.find((x) => x.id === feature);
  if (!f) notFound();
  const starter = STARTERS[feature];
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-screen flex-col bg-[#05040f] text-white" style={{ backgroundImage: `radial-gradient(60% 50% at 70% 20%, ${f.glow}30, transparent 70%)` }}>
      <header className="px-6 py-5 [&_a]:text-white">
        <Logo />
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-8 px-6 pb-16">
        <div className="max-w-2xl">
          <p className="text-sm font-medium" style={{ color: f.glow }}>
            Pianeta {f.planet}
          </p>
          <h1 className="mt-2 font-display text-5xl font-extrabold tracking-tight">Crea con {f.title.toLowerCase()}</h1>
          <p className="mt-4 text-lg text-white/80">{starter.idea}</p>
          <p className="mt-2 text-white/60">La presentazione si apre nell&apos;editor con un suggerimento su dove trovare gli strumenti.</p>
        </div>
        <StarterChooser feature={feature} glow={f.glow} signedIn={Boolean(user)} />
      </main>
    </div>
  );
}
