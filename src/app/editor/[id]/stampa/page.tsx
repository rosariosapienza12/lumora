import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getOwnedPresentation } from "@/lib/presentations";
import { documentSchema } from "@/lib/editor/schema";
import { SlideThumb } from "@/components/slide/element-view";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "Esporta in PDF", robots: { index: false } };

/** Every page, one per sheet, ready for the browser's "Save as PDF". */
export default async function PrintPage({ params }: PageProps<"/editor/[id]/stampa">) {
  const user = await requireUser();
  const { id } = await params;
  if (!/^[a-z0-9]{20,32}$/.test(id)) notFound();
  const p = await getOwnedPresentation(user.id, id);
  if (!p) notFound();
  const parsed = documentSchema.safeParse(p.content);
  if (!parsed.success) notFound();

  return (
    <main className="print-deck mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <div className="print-hide flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">{p.title}</h1>
          <p className="text-sm text-ink-soft">
            {parsed.data.pages.length} pagine. Nella finestra di stampa scegli &quot;Salva come PDF&quot; e orientamento orizzontale.
          </p>
        </div>
        <PrintButton />
      </div>
      {parsed.data.pages.map((page, i) => (
        <section key={page.id} className="print-sheet overflow-hidden rounded-2xl border border-line" aria-label={`Pagina ${i + 1}: ${page.name}`}>
          <SlideThumb page={page} />
        </section>
      ))}
    </main>
  );
}
