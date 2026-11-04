"use client";

import { motion, useReducedMotion } from "motion/react";
import { ButtonLink } from "@/components/ui";
import { GuestButton } from "../prova/guest-button";
import { SolarSystem } from "./solar-system";

const EASE = [0.22, 1, 0.36, 1] as const;
const words = ["Presentazioni", "che", "si", "lasciano", "esplorare."];

/**
 * Opening scene: the Lumora system fills the screen. The title rises out of
 * the dark above the orbit plane (never over it), then a cue invites the
 * visitor to fly through the worlds below.
 */
export function Hero() {
  const reduce = useReducedMotion();
  return (
    <section className="relative -mt-[4.5rem] h-svh min-h-[560px] overflow-hidden">
      <SolarSystem />
      {/* Vignette: draws the eye to the centre and fades into the page below. */}
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(120% 90% at 50% 40%, transparent 75%, rgba(5,4,15,0.45) 100%), linear-gradient(to bottom, transparent 90%, rgba(5,4,15,1))" }} />

      <div data-hero-copy className="pointer-events-none relative z-10 mx-auto flex max-w-6xl flex-col items-center px-5 pt-[16svh] text-center text-white">
        <h1 className="font-display text-[clamp(2.6rem,7vw,6rem)] font-extrabold leading-[0.95] tracking-tight" aria-label="Presentazioni che si lasciano esplorare.">
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
          Ogni pianeta è uno strumento per creare la tua presentazione. Tocca un pianeta per aprirlo, trascina per far girare le orbite, oppure scorri e attraversa il sistema.
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
          <ButtonLink href="#viaggio" variant="ghost" className="px-6 py-3 text-base text-white hover:bg-white/10">
            Esplora le funzioni
          </ButtonLink>
        </motion.div>
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
