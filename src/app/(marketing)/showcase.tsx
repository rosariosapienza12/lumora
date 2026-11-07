import { SlideThumb } from "@/components/slide/element-view";
import { buildTemplate, type TemplateId } from "@/lib/editor/templates";
import type { ThemeId } from "@/lib/editor/themes";

/**
 * "Come funziona" and real output: pages built by Lumora's own templates and
 * layouts, rendered live (not screenshots or illustrations), so visitors see
 * exactly what they will get.
 */
const SAMPLES: { template: TemplateId; page: number; theme: ThemeId; title: string; caption: string }[] = [
  { template: "pitch", page: 0, theme: "ardesia", title: "Orbit: il lavoro, finalmente in ordine", caption: "Pitch · copertina" },
  { template: "pitch", page: 4, theme: "ardesia", title: "Orbit", caption: "Grafico con conclusione" },
  { template: "relazione", page: 4, theme: "nordico", title: "Il riciclo a scuola", caption: "Risultati di un sondaggio" },
  { template: "lezione", page: 1, theme: "carta", title: "Le stagioni", caption: "Lezione · l'idea sbagliata" },
  { template: "quiz", page: 2, theme: "corallo", title: "Quiz di cultura generale", caption: "Quiz a round" },
  { template: "viaggio", page: 1, theme: "foresta", title: "Una settimana in Sicilia", caption: "Diario di viaggio · itinerario" },
];

const STEPS = [
  ["Scrivi l'argomento", "«Il Colosseo», «la fotosintesi», «il mio progetto»: una riga basta."],
  ["Zib la scrive per te", "Testi veri, numeri, domande, note per chi parla e foto libere scelte pagina per pagina."],
  ["Personalizza e presenta", "Temi, grafici, sondaggi dal vivo con il QR code, effetti Morph. Poi condividi un link."],
] as const;

export function Showcase() {
  return (
    <section className="mx-auto w-[calc(100%-1.5rem)] max-w-7xl scroll-mt-24 py-10" id="esempi">
      <div className="glass rounded-[36px] px-6 py-12 sm:px-12">
        <h2 className="max-w-3xl font-display text-4xl font-bold tracking-tight sm:text-5xl">Da una riga a una presentazione completa.</h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {STEPS.map(([title, body], i) => (
            <li key={title} className="rounded-3xl border border-line bg-paper/70 p-6">
              <span className="font-display text-sm font-bold text-violet">0{i + 1}</span>
              <h3 className="mt-1 font-display text-xl font-semibold">{title}</h3>
              <p className="mt-1.5 text-ink-soft">{body}</p>
            </li>
          ))}
        </ol>
        <h3 className="mt-12 font-display text-2xl font-semibold">Pagine vere, fatte con Lumora</h3>
        <p className="mt-1 text-ink-soft">Nessuna illustrazione: sono pagine generate dai modelli e dai temi che trovi nell&apos;editor.</p>
        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SAMPLES.map((s) => {
            const doc = buildTemplate(s.template, s.title, s.theme);
            const page = doc.pages[Math.min(s.page, doc.pages.length - 1)];
            return (
              <li key={s.caption} className="overflow-hidden rounded-2xl border border-line bg-paper shadow-sm">
                <SlideThumb page={page} />
                <p className="px-4 py-2.5 text-sm font-medium text-ink-soft">{s.caption}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

const FAQ = [
  ["È davvero gratis?", "Sì. Puoi creare, presentare e condividere senza pagare. Per provarla non serve nemmeno un account."],
  ["Zib inventa le informazioni?", "Zib scrive con un'intelligenza artificiale istruita a usare solo fatti noti e a indicare nelle note le fonti da controllare. Rileggi sempre i dati prima di presentare."],
  ["Posso usare le foto che sceglie?", "Sì: vengono da Wikimedia Commons con licenza libera, e Lumora aggiunge in fondo una pagina con autori e licenze, come le licenze richiedono."],
  ["Il pubblico deve installare qualcosa per votare?", "No. Inquadra il QR code con il telefono e vota dal browser, senza account."],
  ["Posso esportarla?", "Sì: in PDF dalla stampa, come dispensa con testi e note, oppure con un link pubblico, anche protetto da password."],
] as const;

export function Faq() {
  return (
    <section className="mx-auto w-[calc(100%-1.5rem)] max-w-4xl py-10">
      <h2 className="font-display text-4xl font-bold tracking-tight">Domande frequenti</h2>
      <div className="mt-6 flex flex-col gap-3">
        {FAQ.map(([q, a]) => (
          <details key={q} className="glass group rounded-2xl px-6 py-4">
            <summary className="cursor-pointer list-none font-semibold marker:hidden">
              <span className="flex items-center justify-between gap-4">
                {q}
                <span aria-hidden className="text-violet transition-transform group-open:rotate-45">+</span>
              </span>
            </summary>
            <p className="mt-2 text-ink-soft">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
