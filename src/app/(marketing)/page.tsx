import { ButtonLink } from "@/components/ui";
import { Hero } from "./hero";
import { PlanetTour } from "./planet-tour";

const security = [
  ["Verifica in due passaggi", "Un codice dall'app del telefono oltre alla password, con codici di emergenza."],
  ["Password protette", "Mai salvate in chiaro: le cifriamo con argon2id e rifiutiamo quelle apparse in violazioni note."],
  ["Link non indovinabili", "Ogni link pubblico ha 128 bit casuali. Quando rendi privata una presentazione, il vecchio link smette di funzionare."],
  ["Contenuti isolati", "Testi e link inseriti nelle presentazioni non possono eseguire codice nel browser di chi guarda."],
  ["Accessi sotto controllo", "Vedi i dispositivi connessi e disconnettili con un clic. Troppi tentativi sbagliati bloccano l'accesso."],
] as const;

const audiences = [
  ["Per chi insegna", "Lezioni da esplorare, verifiche veloci e materiali adatti a ogni studente."],
  ["Per le aziende", "Onboarding, formazione interna e presentazioni che i clienti ricordano."],
  ["Per chi studia", "Esposizioni e tesine che si distinguono, da mostrare in classe o online."],
] as const;

export default function HomePage() {
  return (
    <>
      <Hero />

      <PlanetTour />

      <section className="mx-auto w-[calc(100%-1.5rem)] max-w-7xl py-6">
        <ul className="grid gap-4 md:grid-cols-3">
          {audiences.map(([title, body]) => (
            <li key={title} className="glass rounded-[28px] p-7">
              <h3 className="font-display text-2xl font-semibold">{title}</h3>
              <p className="mt-2 text-ink-soft">{body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="sicurezza" className="mx-auto w-[calc(100%-1.5rem)] max-w-7xl scroll-mt-24 py-6">
        <div className="glass-dark grid gap-12 rounded-[36px] px-7 py-14 text-mist sm:px-12 lg:grid-cols-2 [color:#efedff]">
          <div>
            <h2 className="font-display text-4xl font-bold tracking-tight">I tuoi contenuti restano tuoi</h2>
            <p className="mt-4 max-w-md text-white/70">
              La sicurezza non è un&apos;opzione da attivare: è il modo in cui Lumora è costruita, dal primo accesso
              all&apos;ultimo link condiviso.
            </p>
          </div>
          <ul className="flex flex-col divide-y divide-white/10">
            {security.map(([title, body]) => (
              <li key={title} className="py-4 first:pt-0">
                <p className="font-semibold">{title}</p>
                <p className="mt-1 text-white/70">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto w-[calc(100%-1.5rem)] max-w-7xl py-6">
        <div className="glass flex flex-col items-start gap-6 rounded-[36px] px-7 py-14 sm:px-12">
          <h2 className="max-w-2xl font-display text-4xl font-bold tracking-tight">La tua prossima presentazione può essere la prima che il pubblico tocca con mano.</h2>
          <ButtonLink href="/registrati" className="px-6 py-3 text-base">
            Crea un account gratis
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
