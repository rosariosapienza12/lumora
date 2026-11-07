import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { findPoll } from "@/lib/polls";
import { isUnlocked } from "@/lib/public-view";
import { Logo } from "@/components/ui";
import { VoteForm } from "./vote-form";

export const metadata: Metadata = { title: "Vota", robots: { index: false, follow: false } };

/** The audience opens this page from the QR code of a live poll and votes from the phone. */
export default async function VotePage({ params }: PageProps<"/p/[slug]/vota/[el]">) {
  const { slug, el } = await params;
  const found = await findPoll(slug, el);
  if (!found) notFound();
  const locked = Boolean(found.passwordHash) && !(await isUnlocked(slug, found.passwordHash!));
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-5 py-6">
      <Logo />
      <div>
        <p className="text-sm text-ink-soft">{found.title}</p>
        <h1 className="mt-1 font-display text-2xl font-bold">{found.poll.question}</h1>
      </div>
      {locked ? (
        <p className="rounded-2xl bg-mist p-4 text-sm">
          Questa presentazione è protetta. <Link href={`/p/${slug}`} className="font-semibold text-violet underline">Aprila con la password</Link>, poi torna qui con il QR code.
        </p>
      ) : (
        <VoteForm slug={slug} el={el} options={found.poll.options} />
      )}
    </main>
  );
}
