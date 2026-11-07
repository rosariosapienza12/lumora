import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublished, isUnlocked } from "@/lib/public-view";
import { Player } from "@/components/player/player";
import { Logo } from "@/components/ui";
import { UnlockForm } from "./unlock-form";

export async function generateMetadata({ params }: PageProps<"/p/[slug]">): Promise<Metadata> {
  const p = await getPublished((await params).slug);
  // Shared links are unlisted: keep them out of search engines.
  return { title: p && !p.passwordHash ? p.title : "Presentazione", robots: { index: false, follow: false } };
}

export default async function PublicPresentationPage({ params }: PageProps<"/p/[slug]">) {
  const { slug } = await params;
  const p = await getPublished(slug);
  if (!p) notFound();

  if (p.passwordHash && !(await isUnlocked(slug, p.passwordHash))) {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <div className="w-full max-w-sm rounded-3xl border border-line bg-paper p-6">
          <span className="hotspot mb-4" aria-hidden>
            ?
          </span>
          <h1 className="font-display text-2xl font-bold">Presentazione protetta</h1>
          <p className="mb-5 mt-2 text-ink-soft">Inserisci la password che ti ha dato chi l&apos;ha condivisa.</p>
          <UnlockForm slug={slug} />
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-screen flex-col bg-[#0f0d22]">
      <h1 className="sr-only">{p.title}</h1>
      <div className="min-h-0 flex-1">
        <Player doc={p.doc} slug={slug} />
      </div>
      <div className="flex justify-end px-4 pb-2 text-white/70">
        <Logo className="text-sm" />
      </div>
    </main>
  );
}
