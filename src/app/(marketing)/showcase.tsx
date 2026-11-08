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

const OUTLINE = ["Il Colosseo", "Chi lo costruì e perché", "Com'era fatto dentro", "Gli spettacoli", "Cosa resta oggi"];

/** The three steps shown as what you actually see, not described: the field, the outline, a page. */
function Steps() {
  const page = buildTemplate("lezione", "Il Colosseo", "carta").pages[0];
  return (
    <ol className="mt-8 grid items-start gap-6 md:grid-cols-[1fr_1fr_1.35fr] md:gap-8">
      <li>
        <div className="rounded-2xl border border-line bg-paper px-4 py-3.5 shadow-sm">
          <span className="block text-xs font-semibold text-ink-soft">Di cosa parla la presentazione?</span>
          <span className="mt-1 block font-medium">
            Il Colosseo<span className="caret text-violet" aria-hidden />
          </span>
        </div>
        <p className="mt-3 text-sm text-ink-soft"><b className="text-ink">1. Scrivi l&apos;argomento.</b> Una riga basta.</p>
      </li>
      <li className="md:mt-8">
        <div className="rounded-2xl border border-line bg-paper px-4 py-3.5 font-mono text-[13px] leading-relaxed shadow-sm">
          {OUTLINE.map((t, i) => (
            <span key={t} className="block truncate">
              <span className="text-ink-soft">{String(i + 1).padStart(2, "0")}</span> {t}
            </span>
          ))}
        </div>
        <p className="mt-3 text-sm text-ink-soft"><b className="text-ink">2. Zib la scrive.</b> Testi, numeri, note e foto, pagina per pagina.</p>
      </li>
      <li className="md:-mt-2">
        <div className="-rotate-1 overflow-hidden rounded-2xl border border-line bg-paper shadow-lg">
          <SlideThumb page={page} />
        </div>
        <p className="mt-3 text-sm text-ink-soft"><b className="text-ink">3. La rifinisci e la presenti.</b> Temi, grafici, sondaggi col QR code.</p>
      </li>
    </ol>
  );
}

export function Showcase() {
  return (
    <section className="mx-auto w-[calc(100%-1.5rem)] max-w-7xl scroll-mt-24 py-10" id="esempi">
      <div className="glass rounded-[36px] px-6 py-12 sm:px-12">
        <h2 className="max-w-3xl font-display text-4xl font-bold tracking-tight sm:text-5xl">Da una riga a una presentazione completa.</h2>
        <Steps />
        <h3 className="mt-12 font-display text-2xl font-semibold">Pagine vere, fatte con Lumora</h3>
        <p className="mt-1 text-ink-soft">Non sono screenshot: il codice dell&apos;editor le disegna mentre scorri, con i modelli e i temi che userai anche tu.</p>
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
