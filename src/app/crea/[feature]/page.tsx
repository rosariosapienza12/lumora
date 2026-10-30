import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { buildStarter, isStarterId, STARTERS } from "@/lib/editor/starters";
import { SlideThumb } from "@/components/slide/element-view";
import { Button, ButtonLink, Logo } from "@/components/ui";
import { FEATURES } from "../../(marketing)/features";
import { createFromStarterAction } from "./actions";

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
  const preview = buildStarter(feature).doc.pages[0];
  const user = await getCurrentUser();
  const back = encodeURIComponent(`/crea/${feature}`);

  return (
    <div className="flex min-h-screen flex-col bg-[#05040f] text-white" style={{ backgroundImage: `radial-gradient(60% 50% at 70% 20%, ${f.glow}30, transparent 70%)` }}>
      <header className="px-6 py-5 [&_a]:text-white">
        <Logo />
      </header>
      <main className="mx-auto grid w-full max-w-5xl flex-1 items-center gap-10 px-6 pb-16 md:grid-cols-2">
        <div>
          <p className="text-sm font-medium" style={{ color: f.glow }}>
            Pianeta {f.planet}
          </p>
          <h1 className="mt-2 font-display text-5xl font-extrabold tracking-tight">Crea con {f.title.toLowerCase()}</h1>
          <p className="mt-4 text-lg text-white/80">{starter.idea}</p>
          <p className="mt-2 text-white/60">La presentazione si apre nell&apos;editor con un suggerimento su dove trovare gli strumenti.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            {user ? (
              <form action={createFromStarterAction}>
                <input type="hidden" name="feature" value={feature} />
                <Button type="submit" className="px-6 py-3 text-base" style={{ background: f.glow, color: "#120d26" }}>
                  Crea e apri l&apos;editor
                </Button>
              </form>
            ) : (
              <>
                <ButtonLink href={`/registrati?dopo=${back}`} className="px-6 py-3 text-base" style={{ background: f.glow, color: "#120d26" }}>
                  Registrati e inizia
                </ButtonLink>
                <ButtonLink href={`/accedi?dopo=${back}`} variant="ghost" className="px-6 py-3 text-base text-white hover:bg-white/10">
                  Ho già un account
                </ButtonLink>
              </>
            )}
          </div>
        </div>
        <div className="overflow-hidden rounded-3xl border border-white/10 shadow-2xl" style={{ boxShadow: `0 40px 80px -30px ${f.glow}80` }}>
          <SlideThumb page={preview} />
        </div>
      </main>
    </div>
  );
}
