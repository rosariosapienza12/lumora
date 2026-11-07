"use client";

import { motion, useReducedMotion } from "motion/react";
import { ButtonLink } from "@/components/ui";
import { GuestButton } from "../prova/guest-button";
import { SolarSystem } from "./solar-system";

const EASE = [0.22, 1, 0.36, 1] as const;
const words = ["Scrivi", "un", "argomento.", "Zib", "ti", "consegna", "la", "presentazione."];

/**
 * Opening scene: the Lumora system fills the screen. The title rises out of
 * the dark above the orbit plane (never over it), then a cue invites the
 * visitor to fly through the worlds below.
 */
export function Hero() {
  const reduce = useReducedMotion();
  return (
    <section className="relative -mt-[4.5rem] h-[max(100svh,900px)] overflow-hidden sm:h-svh sm:min-h-[560px]">
      <SolarSystem />
      {/* Vignette: draws the eye to the centre and fades into the page below. */}
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(120% 90% at 50% 40%, transparent 75%, rgba(5,4,15,0.45) 100%), linear-gradient(to bottom, transparent 90%, rgba(5,4,15,1))" }} />

      <div data-hero-copy className="pointer-events-none relative z-10 mx-auto flex max-w-6xl flex-col items-center px-5 pt-[13svh] text-center text-white sm:pt-[16svh]">
        <h1 className="max-w-5xl font-display text-[clamp(2.1rem,5.6vw,5rem)] font-extrabold leading-[0.98] tracking-tight" aria-label="Scrivi un argomento. Zib ti consegna la presentazione.">
          {words.map((w, i) => (
            <motion.span
              key={w}
              aria-hidden
              className="hero-word mr-[0.25em] inline-block"
              initial={reduce ? false : { opacity: 0, y: 40, filter: "blur(12px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.9, delay: 0.6 + i * 0.12, ease: EASE }}
              style={{ textShadow: "0 0 40px rgba(255,181,71,0.25)" }}
            >
              {w}
            </motion.span>
          ))}
        </h1>
        <motion.p
          className="mt-5 max-w-2xl text-lg text-white/75"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.8 }}
        >
          <span className="sm:hidden">Zib scrive i contenuti, sceglie le foto e impagina tutto in un minuto.</span>
          <span className="hidden sm:inline">Zib scrive i contenuti, sceglie foto libere pagina per pagina e impagina tutto in un minuto. Tu la personalizzi, la presenti e il pubblico vota dal telefono.</span>
        </motion.p>
        <motion.div
          className="pointer-events-auto mt-7 flex flex-wrap justify-center gap-3"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8, duration: 0.6 }}
        >
          <GuestButton className="px-6 py-3 text-base">Prova subito, senza account</GuestButton>
          <ButtonLink href="/registrati" variant="ghost" className="px-6 py-3 text-base text-white ring-1 ring-white/30 hover:bg-white/10">
            Crea un account gratis
          </ButtonLink>
          <ButtonLink href="#esempi" variant="ghost" className="hidden px-6 py-3 text-base text-white hover:bg-white/10 sm:inline-flex">
            Guarda gli esempi
          </ButtonLink>
        </motion.div>
        {/* Honest proof next to the main action: what you get, with no catch. */}
        <motion.ul
          aria-label="In breve"
          className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm text-white/70"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.1, duration: 0.6 }}
        >
          {["Gratis", "Nessun account per provare", "Foto con licenza libera", "In italiano"].map((t) => (
            <li key={t} className="flex items-center gap-1.5">
              <span aria-hidden className="text-[#7fffd4]">✓</span>
              {t}
            </li>
          ))}
        </motion.ul>
      </div>

      <motion.a
        href="#viaggio"
        className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 text-xs text-white/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.4 }}
      >
        Scorri per attraversare il sistema
        <motion.span aria-hidden className="block h-8 w-px origin-top bg-gradient-to-b from-white/70 to-transparent" animate={reduce ? undefined : { scaleY: [0.3, 1, 0.3] }} transition={{ duration: 1.8, repeat: Infinity }} />
      </motion.a>
    </section>
  );
}
