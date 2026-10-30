"use client";

import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  useVelocity,
  type MotionValue,
} from "motion/react";
import Link from "next/link";
import { PlanetCanvas } from "@/components/planets/planet-canvas";
import { loadPlanetTexture, RINGED } from "@/components/planets/textures";
import { FEATURES, tourAnchor, type Feature } from "./features";
import { FeatureDemo } from "./feature-demos";
import { WarpField } from "./warp-field";

/**
 * Scroll-driven flight through the Lumora system: one screen per world, one
 * world per feature. The current planet flies past the camera, then the next
 * emerges from deep space, so only one planet is ever on stage and it never
 * crosses the copy column. Scrolling stretches the stars into hyperspace
 * streaks, and the page settles on the nearest planet when scrolling stops.
 */

const N = FEATURES.length;
const EASE = [0.22, 1, 0.36, 1] as const;

function useViewport() {
  const [vp, setVp] = useState({ w: 1280, h: 800 });
  useEffect(() => {
    const update = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return vp;
}

/** After scrolling stops inside the tour, glide to the nearest planet. */
function useSnapToStops(sectionRef: RefObject<HTMLElement | null>, reduce: boolean | null) {
  useEffect(() => {
    let timer = 0;
    let snapping = false;
    const onScroll = () => {
      if (snapping) return;
      clearTimeout(timer);
      timer = window.setTimeout(() => {
        const el = sectionRef.current;
        if (!el) return;
        const top = el.getBoundingClientRect().top + window.scrollY;
        const range = el.offsetHeight - window.innerHeight;
        const into = window.scrollY - top;
        // Only inside the tour (plus a small margin at both ends).
        if (into < -window.innerHeight * 0.3 || into > range + window.innerHeight * 0.3) return;
        const step = range / (N - 1);
        const target = top + Math.max(0, Math.min(N - 1, Math.round(into / step))) * step;
        if (Math.abs(target - window.scrollY) < 2) return;
        snapping = true;
        window.scrollTo({ top: target, behavior: reduce ? "auto" : "smooth" });
        window.setTimeout(() => (snapping = false), 700);
      }, 140);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(timer);
    };
  }, [sectionRef, reduce]);
}

export function PlanetTour() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  const position = useTransform(scrollYProgress, [0, 1], [0, N - 1]);
  const velocity = useVelocity(position);
  const [active, setActive] = useState(0);
  const vp = useViewport();
  const reduce = useReducedMotion();
  useSnapToStops(sectionRef, reduce);

  // Prepare every world in arrival order (in workers), so planets are ready before you reach them.
  useEffect(() => {
    for (const f of FEATURES) loadPlanetTexture(f.kind, 256).then(() => loadPlanetTexture(f.kind, 1024));
  }, []);

  useMotionValueEvent(position, "change", (v) => setActive(Math.max(0, Math.min(N - 1, Math.round(v)))));

  const mobile = vp.w < 768;
  const planetSize = Math.round(Math.min(mobile ? vp.w * 0.58 : vp.w * 0.3, vp.h * (mobile ? 0.24 : 0.5), 480));
  const stageX = mobile ? 0.5 : 0.3;
  const stageY = mobile ? 0.28 : 0.5;
  const feature = FEATURES[active];

  const jump = (i: number) => {
    const el = sectionRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + (i / (N - 1)) * (el.offsetHeight - window.innerHeight), behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <section ref={sectionRef} id="viaggio" aria-label="Le funzioni di Lumora, un pianeta alla volta" className="relative" style={{ height: `${N * 100}svh` }}>
      {/* One anchor per planet, so links from the hero land on the right stop. */}
      {FEATURES.map((f, i) => (
        <span key={f.id} id={tourAnchor(f.id)} className="absolute left-0 h-px w-px" style={{ top: `${i * 100}svh` }} />
      ))}

      <div className="sticky top-0 h-svh overflow-hidden p-3 sm:p-5">
        <div className="relative h-full overflow-hidden rounded-[36px] bg-[#05040f]">
          {/* Atmosphere tinted with the colour of the current world. */}
          <motion.div
            aria-hidden
            className="absolute inset-0"
            animate={{
              background: `radial-gradient(55% 70% at ${stageX * 100}% ${stageY * 100}%, ${feature.glow}38, transparent 70%), radial-gradient(40% 50% at 90% 10%, ${feature.glow}1f, transparent 70%)`,
            }}
            transition={{ duration: reduce ? 0 : 1.2, ease: "easeOut" }}
          />
          <WarpField velocity={velocity} tint={feature.glow} centerX={stageX} centerY={stageY} />

          <div className="absolute inset-0" aria-hidden>
            {FEATURES.map((f, i) =>
              Math.abs(i - active) <= 1 ? (
                <TourPlanet key={f.id} feature={f} index={i} still={i !== active} position={position} size={planetSize} stageX={stageX} stageY={stageY} vp={vp} mobile={mobile} />
              ) : null,
            )}
          </div>

          <div className={`absolute z-10 ${mobile ? "inset-x-5 bottom-[4.5rem] top-[47%]" : "right-28 top-1/2 w-[38%] max-w-md -translate-y-1/2"}`}>
            <AnimatePresence mode="wait">
              <FeatureCopy key={feature.id} feature={feature} reduce={Boolean(reduce)} mobile={mobile} />
            </AnimatePresence>
          </div>

          {/* Index of worlds: real miniatures. */}
          <nav
            aria-label="Tappe del viaggio"
            className={`absolute z-20 flex items-center gap-1.5 ${mobile ? "bottom-5 left-1/2 -translate-x-1/2" : "right-6 top-1/2 -translate-y-1/2 flex-col"}`}
          >
            {FEATURES.map((f, i) => (
              <button
                key={f.id}
                onClick={() => jump(i)}
                aria-label={`${f.title}, pianeta ${f.planet}`}
                aria-current={i === active ? "step" : undefined}
                className="group relative grid size-9 place-items-center rounded-full transition-transform hover:scale-110"
              >
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-full border transition-all duration-500"
                  style={{
                    borderColor: i === active ? f.glow : "transparent",
                    boxShadow: i === active ? `0 0 16px ${f.glow}90, inset 0 0 10px ${f.glow}50` : "none",
                  }}
                />
                <span className={`transition-opacity duration-300 ${i === active ? "opacity-100" : "opacity-55 group-hover:opacity-100"}`}>
                  <PlanetCanvas kind={f.kind} size={f.kind === "gold" ? 14 : 18} spin={20 + i * 4} className="block" />
                </span>
                {!mobile && (
                  <span className="pointer-events-none absolute right-11 whitespace-nowrap rounded-full bg-white/10 px-2.5 py-1 text-xs text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    {f.title}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {active === 0 && !mobile && (
            <motion.div
              className="absolute bottom-7 left-[30%] z-20 flex -translate-x-1/2 flex-col items-center gap-2 text-xs text-white/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              Scorri per volare al prossimo pianeta
              <motion.span
                aria-hidden
                className="block h-6 w-px origin-top bg-gradient-to-b from-white/70 to-transparent"
                animate={reduce ? undefined : { scaleY: [0.3, 1, 0.3] }}
                transition={{ duration: 1.8, repeat: Infinity }}
              />
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * Flight path for one planet, by its offset from the planet in focus:
 * arriving (0..0.5) it grows out of deep space; leaving (-0.5..0) it rushes past
 * the camera towards the outer edge. Outside those windows it is invisible, so
 * two planets are never on screen together.
 */
function TourPlanet({
  feature,
  index,
  still,
  position,
  size,
  stageX,
  stageY,
  vp,
  mobile,
}: {
  feature: Feature;
  index: number;
  still: boolean;
  position: MotionValue<number>;
  size: number;
  stageX: number;
  stageY: number;
  vp: { w: number; h: number };
  mobile: boolean;
}) {
  const offset = useTransform(position, (p) => index - p);
  const arrive = (o: number) => Math.max(0, Math.min(1, o / 0.5));
  const leave = (o: number) => Math.max(0, Math.min(1, -o / 0.5));

  const scale = useTransform(offset, (o) => (o >= 0 ? 1 - 0.88 * arrive(o) ** 0.7 : 1 + 1.9 * leave(o) ** 1.6));
  const opacity = useTransform(offset, (o) => (o >= 0 ? 1 - arrive(o) ** 2 : 1 - leave(o) ** 1.4));
  const x = useTransform(offset, (o) => (o >= 0 ? 0 : -(leave(o) ** 1.5) * (mobile ? vp.w * 0.2 : vp.w * 0.32)));
  const y = useTransform(offset, (o) => (o >= 0 ? arrive(o) * (mobile ? -10 : -30) : -(leave(o) ** 1.5) * (mobile ? vp.h * 0.25 : vp.h * 0.12)));
  const rotate = useTransform(offset, (o) => o * -18);
  const blur = useTransform(offset, (o) => (o >= 0 ? arrive(o) * 3 : leave(o) ** 1.3 * 16));
  const filter = useMotionTemplate`blur(${blur}px)`;

  return (
    <motion.div
      className="absolute"
      style={{ left: `${stageX * 100}%`, top: `${stageY * 100}%`, x, y, scale, opacity, rotate, filter, translateX: "-50%", translateY: "-50%" }}
    >
      <div className="absolute inset-[-45%] rounded-full" style={{ background: `radial-gradient(circle, ${feature.glow}55 0%, ${feature.glow}18 35%, transparent 62%)` }} />
      <div className="tour-orbit absolute inset-[-22%] rounded-full border" style={{ borderColor: `${feature.glow}30` }}>
        <span className="absolute -top-1.5 left-1/2 size-3 -translate-x-1/2 rounded-full" style={{ background: feature.glow, boxShadow: `0 0 12px ${feature.glow}` }} />
      </div>
      {/* A ringed world is drawn smaller so its rings stay inside the planet column. */}
      <PlanetCanvas kind={feature.kind} size={RINGED.has(feature.kind) ? Math.round(size * 0.62) : size} spin={feature.period * 1.4} still={still} tilt={feature.kind === "rose" ? 0.6 : 0.22} className="relative block" />
    </motion.div>
  );
}

function FeatureCopy({ feature, reduce, mobile }: { feature: Feature; reduce: boolean; mobile: boolean }) {
  const item = {
    hidden: { opacity: 0, y: 22, filter: "blur(8px)" },
    shown: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: reduce ? 0 : 0.55, ease: EASE } },
    gone: { opacity: 0, y: -14, filter: "blur(6px)", transition: { duration: reduce ? 0 : 0.22 } },
  };
  return (
    <motion.div
      initial="hidden"
      animate="shown"
      exit="gone"
      variants={{ shown: { transition: { staggerChildren: reduce ? 0 : 0.07, delayChildren: reduce ? 0 : 0.12 } } }}
      className="flex h-full flex-col justify-center"
    >
      <motion.p variants={item} className="flex items-center gap-2.5 text-sm font-medium text-white/65">
        <span aria-hidden className="size-2 rounded-full" style={{ background: feature.glow, boxShadow: `0 0 10px ${feature.glow}` }} />
        Pianeta {feature.planet}
      </motion.p>

      <h2 className="mt-2 text-balance font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl" aria-label={feature.title}>
        {/* Letters animate one by one, but each word is an unbreakable block: lines only wrap between words. */}
        {feature.title.split(" ").map((word, w, words) => {
          const before = words.slice(0, w).join(" ").length + (w > 0 ? 1 : 0);
          return (
            <span key={w} aria-hidden>
              <span className="inline-block whitespace-nowrap">
                {word.split("").map((ch, i) => (
                  <motion.span
                    key={i}
                    className="inline-block"
                    variants={{
                      hidden: { opacity: 0, y: "0.6em", rotateX: -70 },
                      shown: { opacity: 1, y: 0, rotateX: 0, transition: { duration: reduce ? 0 : 0.6, delay: reduce ? 0 : 0.1 + (before + i) * 0.025, ease: EASE } },
                      gone: { opacity: 0, transition: { duration: 0.15 } },
                    }}
                    style={{ textShadow: `0 0 36px ${feature.glow}70` }}
                  >
                    {ch}
                  </motion.span>
                ))}
              </span>
              {w < words.length - 1 ? " " : null}
            </span>
          );
        })}
      </h2>

      <motion.p variants={item} className="mt-3 text-base leading-relaxed text-white/80 sm:text-lg">
        {feature.tagline}
      </motion.p>

      <motion.ul variants={item} aria-label="Strumenti" className="mt-4 flex flex-wrap gap-1.5">
        {(mobile ? feature.tools.slice(0, 4) : feature.tools).map((tool, i) => (
          <motion.li
            key={tool}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: reduce ? 0 : 0.35 + i * 0.04, duration: 0.3 }}
            className="rounded-full border px-2.5 py-1 text-xs text-white/85"
            style={{ borderColor: `${feature.glow}55`, background: `${feature.glow}14` }}
          >
            {tool}
          </motion.li>
        ))}
      </motion.ul>

      <motion.div variants={item} className="mt-5">
        <div className="tour-demo-border rounded-[18px] p-px" style={{ "--glow": feature.glow } as CSSProperties}>
          <div className="rounded-[17px] bg-[#0b0920]/90">
            <p className="px-4 pt-3 text-xs font-medium text-white/55">Provala qui</p>
            <div className="p-2 pt-1.5">
              <FeatureDemo id={feature.id} accent={feature.glow} />
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div variants={item} className="mt-4">
        <Link
          href={`/crea/${feature.id}`}
          className="group inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-[#120d26] transition-transform hover:scale-[1.03] active:scale-[0.98]"
          style={{ background: feature.glow, boxShadow: `0 10px 30px -10px ${feature.glow}` }}
        >
          Crea con {feature.title.toLowerCase()}
        </Link>
      </motion.div>
    </motion.div>
  );
}
