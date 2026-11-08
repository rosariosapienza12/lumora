import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { listPresentations } from "@/lib/presentations";
import { documentSchema } from "@/lib/editor/schema";
import { SlideThumb } from "@/components/slide/element-view";
import { NewPresentation } from "./new-presentation";
import {
  deleteForeverAction,
  duplicatePresentationAction,
  restorePresentationAction,
  trashPresentationAction,
} from "./actions";

/** Zib writes whole presentations with AI: creating one can take up to a minute or two. */
export const maxDuration = 120;

export const metadata: Metadata = { title: "Le mie presentazioni" };

/** Greeting by the hour in Italy (the server runs in UTC). */
function greeting() {
  const h = Number(new Intl.DateTimeFormat("it-IT", { hour: "numeric", hourCycle: "h23", timeZone: "Europe/Rome" }).format(new Date()));
  return h < 5 ? "Ancora sveglio" : h < 13 ? "Buongiorno" : h < 18 ? "Buon pomeriggio" : "Buonasera";
}

const dateFmt = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const user = await requireUser();
  const params = await searchParams;
  const trash = params.vista === "cestino";
  const q = typeof params.q === "string" ? params.q : "";
  const items = await listPresentations(user.id, { trash, q });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">{trash ? "Cestino" : `${greeting()}, ${user.name}`}</h1>
          <p className="mt-1 text-ink-soft">
            {trash ? "Le presentazioni nel cestino non sono visibili a nessuno." : "Riprendi da dove avevi lasciato o crea qualcosa di nuovo."}
          </p>
        </div>
        {!trash && <NewPresentation />}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <form className="flex-1" role="search">
          {trash && <input type="hidden" name="vista" value="cestino" />}
          <label htmlFor="q" className="sr-only">
            Cerca per titolo
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            maxLength={100}
            placeholder="Cerca per titolo"
            className="w-full max-w-sm rounded-full border border-line bg-paper px-4 py-2 text-sm outline-none focus:border-violet"
          />
        </form>
        <nav className="flex gap-1 text-sm font-medium">
          <Link href="/dashboard" aria-current={!trash ? "page" : undefined} className="rounded-full px-3 py-1.5 aria-[current]:bg-ink aria-[current]:text-mist">
            Tutte
          </Link>
          <Link href="/dashboard?vista=cestino" aria-current={trash ? "page" : undefined} className="rounded-full px-3 py-1.5 aria-[current]:bg-ink aria-[current]:text-mist">
            Cestino
          </Link>
        </nav>
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line px-6 py-16 text-center">
          <p className="font-display text-xl font-semibold">{trash ? "Il cestino è vuoto" : q ? "Nessun risultato" : "Ancora nessuna presentazione"}</p>
          {!trash && !q && (
            <p className="mt-2 text-ink-soft">Scrivi un argomento e Zib la prepara in un minuto, oppure parti da un modello.</p>
          )}
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => {
            const doc = documentSchema.safeParse(p.content);
            const first = doc.success ? doc.data.pages[0] : null;
            return (
              <li key={p.id} className="group flex flex-col overflow-hidden rounded-3xl border border-line bg-paper">
                <Link href={trash ? "#" : `/editor/${p.id}`} className="block" aria-disabled={trash}>
                  {first ? <SlideThumb page={first} /> : <div className="aspect-video bg-mist" />}
                </Link>
                <div className="flex items-start gap-2 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{p.title}</p>
                    <p className="text-sm text-ink-soft">
                      {p.visibility === "LINK" ? "Pubblicata · " : ""}Modificata {dateFmt.format(p.updatedAt)}
                    </p>
                  </div>
                  <div className="flex gap-1 text-sm">
                    {trash ? (
                      <>
                        <form action={restorePresentationAction}>
                          <input type="hidden" name="id" value={p.id} />
                          <button className="rounded-full px-2.5 py-1 hover:bg-mist">Ripristina</button>
                        </form>
                        <form action={deleteForeverAction}>
                          <input type="hidden" name="id" value={p.id} />
                          <button className="rounded-full px-2.5 py-1 text-danger hover:bg-danger/10">Elimina</button>
                        </form>
                      </>
                    ) : (
                      <>
                        <form action={duplicatePresentationAction}>
                          <input type="hidden" name="id" value={p.id} />
                          <button className="rounded-full px-2.5 py-1 hover:bg-mist">Duplica</button>
                        </form>
                        <form action={trashPresentationAction}>
                          <input type="hidden" name="id" value={p.id} />
                          <button className="rounded-full px-2.5 py-1 hover:bg-mist">Sposta nel cestino</button>
                        </form>
                      </>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
