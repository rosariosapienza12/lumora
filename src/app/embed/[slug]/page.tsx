import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublished } from "@/lib/public-view";
import { Player } from "@/components/player/player";
import { env } from "@/lib/env";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Framable version of a published presentation (src/proxy.ts allows frame-ancestors only here). */
export default async function EmbedPage({ params }: PageProps<"/embed/[slug]">) {
  const { slug } = await params;
  const p = await getPublished(slug);
  if (!p) notFound();

  // Password-protected presentations are never rendered inside third-party frames.
  if (p.passwordHash) {
    return (
      <main className="grid h-screen place-items-center bg-[#0f0d22] p-4 text-center text-white">
        <div>
          <p className="font-display text-xl font-semibold">Questa presentazione è protetta da password</p>
          <a href={`${env.APP_URL}/p/${slug}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block underline">
            Aprila in una nuova scheda
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen">
      <Player doc={p.doc} slug={slug} />
    </main>
  );
}
