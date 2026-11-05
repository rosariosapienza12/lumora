import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getOwnedPresentation } from "@/lib/presentations";
import { documentSchema, type Page } from "@/lib/editor/schema";
import { SlideThumb } from "@/components/slide/element-view";
import { PrintButton } from "../stampa/print-button";

export const metadata: Metadata = { title: "Dispensa", robots: { index: false } };

/** The words of a page in reading order (top to bottom, left to right), answers included. */
function pageText(page: Page) {
  return page.elements
    .flatMap((e): { x: number; y: number; text: string }[] => (e.type === "text" ? [e] : e.type === "button" ? [{ x: e.x, y: e.y, text: e.label }] : []))
    .filter((e) => e.text.trim() && e.text.trim().length > 1)
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .map((e) => e.text.trim());
}

/**
 * "Dispensa": a handout to give the audience, built from the presentation
 * itself: a small picture of each page, its text and the speaker notes.
 */
export default async function HandoutPage({ params }: PageProps<"/editor/[id]/dispensa">) {
  const user = await requireUser();
  const { id } = await params;
  if (!/^[a-z0-9]{20,32}$/.test(id)) notFound();
  const p = await getOwnedPresentation(user.id, id);
  if (!p) notFound();
  const parsed = documentSchema.safeParse(p.content);
  if (!parsed.success) notFound();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-violet">Dispensa</p>
          <h1 className="font-display text-3xl font-bold">{p.title}</h1>
          <p className="print-hide mt-1 text-sm text-ink-soft">Testi e note di ogni pagina, pronti da stampare o salvare in PDF per chi ti ascolta.</p>
        </div>
        <div className="print-hide">
          <PrintButton />
        </div>
      </header>
      {parsed.data.pages.map((page, i) => {
        const [title, ...rest] = pageText(page);
        return (
          <section key={page.id} className="grid gap-4 border-t border-line pt-6 sm:grid-cols-[220px_1fr]" style={{ breakInside: "avoid" }}>
            <div className="overflow-hidden rounded-xl border border-line">
              <SlideThumb page={page} />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold">
                {i + 1}. {title ?? page.name}
              </h2>
              <div className="mt-2 flex flex-col gap-1.5 text-sm leading-relaxed">
                {rest.map((t, j) => (
                  <p key={j} className="whitespace-pre-line">
                    {t}
                  </p>
                ))}
              </div>
              {page.notes && <p className="mt-3 rounded-lg bg-mist px-3 py-2 text-sm text-ink-soft whitespace-pre-line">{page.notes}</p>}
            </div>
          </section>
        );
      })}
    </main>
  );
}
