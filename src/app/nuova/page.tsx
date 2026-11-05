import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { buildDeck, parseDeck } from "@/lib/editor/deck";
import { getTheme } from "@/lib/editor/themes";
import { MOTIFS } from "@/lib/editor/motifs";
import { addFreePhotos } from "@/lib/images/fill";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { SlideThumb } from "@/components/slide/element-view";
import { Button, ButtonLink, Logo } from "@/components/ui";
import { createFromDeckAction } from "./actions";

export const metadata: Metadata = { title: "Nuova presentazione da Zib" };

/** Preview of the outline Zib proposed, then one click to create it. */
export default async function NewFromDeckPage({ searchParams }: PageProps<"/nuova">) {
  const { d } = await searchParams;
  const spec = parseDeck(d);
  if (!spec) redirect("/");
  let doc = buildDeck(spec);
  // The preview shows the same free photos the presentation will get (searches are cached for an hour).
  if (spec.photos && (await rateLimit(`images-preview:${await clientIp()}`, 30, 60 * 60))) doc = (await addFreePhotos(doc, spec.photos)).doc;
  const theme = getTheme(spec.theme);
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-[#05040f] text-white" style={{ backgroundImage: "radial-gradient(60% 50% at 75% 10%, rgba(127,255,212,0.12), transparent 70%)" }}>
      <header className="px-6 py-5 [&_a]:text-white">
        <Logo />
      </header>
      <main className="mx-auto flex max-w-5xl flex-col gap-8 px-6 pb-16">
        <div>
          <p className="text-sm font-medium text-[#7fffd4]">Proposta di Zib</p>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">{spec.title}</h1>
          <p className="mt-3 text-white/75">
            {doc.pages.length} pagine nel tema {theme.name}
            {spec.motif ? `, con le decorazioni per l'argomento ${MOTIFS[spec.motif].name.toLowerCase()}` : ""}
            {spec.photos ? " e foto libere da Wikimedia Commons" : ""}. Una volta creata puoi cambiare testi, layout e tema come vuoi.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {user ? (
            <form action={createFromDeckAction}>
              <input type="hidden" name="d" value={typeof d === "string" ? d : ""} />
              <Button type="submit" className="bg-gradient-to-r from-[#7fffd4] to-[#9d8bff] px-6 py-3 text-base text-[#120d2e]">
                Crea questa presentazione
              </Button>
            </form>
          ) : (
            <>
              <ButtonLink href="/registrati" className="bg-gradient-to-r from-[#7fffd4] to-[#9d8bff] px-6 py-3 text-base text-[#120d2e]">
                Registrati per crearla
              </ButtonLink>
              <ButtonLink href="/accedi" variant="ghost" className="px-6 py-3 text-base text-white hover:bg-white/10">
                Ho già un account
              </ButtonLink>
            </>
          )}
        </div>
        <ol className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {doc.pages.map((p, i) => (
            <li key={p.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
              <SlideThumb page={p} />
              <p className="truncate px-3 py-2 text-sm text-white/80">
                {i + 1}. {spec.pages[i].heading || p.name}
              </p>
            </li>
          ))}
        </ol>
      </main>
    </div>
  );
}
