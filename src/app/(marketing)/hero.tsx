"use client";

import { motion } from "motion/react";
import { ButtonLink } from "@/components/ui";
import { SolarSystem } from "./solar-system";

const lines = ["Presentazioni", "che si lasciano", "esplorare."];

export function Hero() {
  return (
    <section className="mx-auto grid w-full max-w-7xl items-center gap-10 px-5 pb-20 pt-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:pt-16">
      <div>
        <h1 className="font-display text-[clamp(2.75rem,6vw,5rem)] font-extrabold leading-[0.95] tracking-tight">
          {lines.map((line, i) => (
            <motion.span
              key={line}
              className="block"
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
            >
              {line}
            </motion.span>
          ))}
        </h1>
        <motion.p
          className="mt-6 max-w-md text-lg text-ink-soft"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.6 }}
        >
          Con Lumora aggiungi hotspot, finestre, domande e animazioni a lezioni, corsi e presentazioni. Chi guarda clicca,
          scopre e partecipa. Nessun codice da scrivere.
        </motion.p>
        <motion.div className="mt-8 flex flex-wrap gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
          <ButtonLink href="/registrati" className="px-6 py-3 text-base">
            Crea un account gratis
          </ButtonLink>
          <ButtonLink href="/accedi" variant="outline" className="px-6 py-3 text-base">
            Accedi
          </ButtonLink>
        </motion.div>
      </div>

      <motion.figure
        initial={{ opacity: 0, scale: 0.96, rotate: -1.5 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="shadow-[0_40px_90px_-30px_rgba(91,61,245,0.55)] rounded-[28px]">
          <SolarSystem />
        </div>
        <figcaption className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
          <span className="inline-block size-2.5 rounded-full bg-amber" aria-hidden />
          Ogni pianeta è una funzione di Lumora. Toccane uno e segui la luce.
        </figcaption>
      </motion.figure>
    </section>
  );
}
