"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type RefObject } from "react";
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
import { SpaceEvents } from "./space-events";

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
    const update = () =>
      setVp((prev) => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        // On phones the address bar slides in and out while scrolling, changing the height by
        // up to ~15%. Reacting to that would resize (and rebuild) the planet mid-scroll, so only a
        // new width (rotation, window resize) or a big height change counts.
        if (w === prev.w && Math.abs(h - prev.h) < prev.h * 0.2) return prev;
        return { w, h };
      });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return vp;
}

/** Touch screens: finger scrolling has its own momentum, and fighting it feels like the page froze. */
const isTouch = () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

/**
 * Phones and tablets get a lighter tour: no animated blur filters and fewer stars. Blur over a
 * moving canvas is recomputed on every frame and was the main cause of stutter on phones.
 */
function useLite() {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia("(pointer: coarse)");
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    isTouch,
    () => false,
  );
}

/** Length of the glide from one planet to the next: the same whatever the gesture. */
const GLIDE_MS = 900;
/**
 * Pause (ms) without wheel events that ends a gesture. A trackpad flick, with its inertia, sends
 * wheel events for a second or more: all of it is one gesture, so one planet. Spinning the wheel
 * hard never races through the tour; the next planet needs a new gesture.
 */
const WHEEL_GESTURE_GAP = 200;
/** A swipe shorter than this (px) is a tap, not a move. */
const SWIPE_MIN = 30;

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/**
 * The tour behaves like pages. While it fills the screen, every gesture (a swipe, a wheel
 * notch, a trackpad flick) plays the same glide to exactly the next or previous planet: the
 * speed of the gesture and the phone's momentum no longer decide where it stops. At the first
 * and last planet the page scrolls on normally. If native scrolling ever leaves the tour between
 * two planets (arriving from above, the scrollbar, the keyboard), it settles on the nearest one.
 * Returns `glideTo(index)` for the planet buttons.
 */
function usePagedTour(sectionRef: RefObject<HTMLElement | null>, reduce: boolean | null) {
  const glideRef = useRef<(index: number) => void>(() => {});

  useEffect(() => {
    let animating = false;
    let frame = 0;
    let settleTimer = 0;
    let lastWheel = 0;
    let touchY: number | null = null;
    let touchOwned = false;
    let touchDir = 0;

    const geometry = () => {
      const el = sectionRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      const step = (el.offsetHeight - window.innerHeight) / (N - 1);
      const at = (window.scrollY - top) / step;
      // Pinned: the stage fills the screen.
      const pinned = rect.top <= 1 && rect.bottom >= window.innerHeight - 1;
      return { top, step, at, pinned, current: Math.max(0, Math.min(N - 1, Math.round(at))) };
    };

    const glideTo = (index: number) => {
      const g = geometry();
      if (!g) return;
      const target = g.top + Math.max(0, Math.min(N - 1, index)) * g.step;
      cancelAnimationFrame(frame);
      if (reduce) {
        window.scrollTo(0, target);
        return;
      }
      const from = window.scrollY;
      const start = performance.now();
      animating = true;
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / GLIDE_MS);
        window.scrollTo(0, from + (target - from) * easeInOut(t));
        if (t < 1) frame = requestAnimationFrame(tick);
        else animating = false;
      };
      frame = requestAnimationFrame(tick);
    };
    glideRef.current = glideTo;

    /** The planet to go to for a gesture in direction `dir`, or null to let the page scroll. */
    const nextFor = (dir: number) => {
      const g = geometry();
      if (!g || !g.pinned || !dir) return null;
      const next = g.current + dir;
      return next < 0 || next > N - 1 ? null : next;
    };

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return; // ctrl + wheel is the browser zoom
      const dir = Math.sign(e.deltaY);
      const g = geometry();
      if (!g?.pinned) return;
      const now = performance.now();
      const newGesture = now - lastWheel > WHEEL_GESTURE_GAP;
      lastWheel = now;
      if (animating) {
        e.preventDefault(); // the glide is running: the rest of the gesture is swallowed
        return;
      }
      const next = nextFor(dir);
      if (next === null) return; // first or last planet: normal scrolling
      e.preventDefault();
      // One gesture, one planet.
      if (!newGesture) return;
      glideTo(next);
    };

    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0]?.clientY ?? null;
      touchOwned = false;
      touchDir = 0;
      clearTimeout(settleTimer);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (touchY === null) return;
      const y = e.touches[0]?.clientY ?? touchY;
      const dir = Math.sign(touchY - y); // finger up = forward
      if (animating) {
        e.preventDefault();
        touchOwned = true;
        return;
      }
      if (!touchOwned) {
        if (!dir || nextFor(dir) === null) return; // not in the tour, or leaving it: native scroll
        touchOwned = true;
        touchDir = dir;
      }
      e.preventDefault(); // the page does not move: the glide will
    };
    const onTouchEnd = (e: TouchEvent) => {
      const startY = touchY;
      touchY = null;
      if (!touchOwned || startY === null || animating) return;
      const endY = e.changedTouches[0]?.clientY ?? startY;
      if (Math.abs(startY - endY) < SWIPE_MIN) return;
      const next = nextFor(touchDir);
      if (next !== null) glideTo(next);
    };

    // Safety net: if native scrolling stops between two planets, settle on the nearest.
    const onScroll = () => {
      if (animating) return;
      clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        if (animating || touchY !== null) return;
        const g = geometry();
        if (!g) return;
        const range = g.step * (N - 1);
        const into = window.scrollY - g.top;
        if (into < -window.innerHeight * 0.3 || into > range + window.innerHeight * 0.3) return;
        if (Math.abs(g.at - Math.round(g.at)) * g.step < 2) return;
        glideTo(Math.round(g.at));
      }, 160);
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    // passive: false, otherwise preventDefault cannot stop the native scroll.
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
      clearTimeout(settleTimer);
    };
  }, [sectionRef, reduce]);

  return (index: number) => glideRef.current(index);
}

/**
 * While the tour fills the screen the site header slides away, so it never covers the top of
 * the planet; it comes back as soon as the tour is left.
 */
function useHideHeaderInTour(sectionRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = document.documentElement;
    const update = () => {
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const inside = rect.top <= window.innerHeight * 0.05 && rect.bottom >= window.innerHeight * 0.95;
      if ((root.dataset.tour === "on") !== inside) root.dataset.tour = inside ? "on" : "off";
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      delete root.dataset.tour;
    };
  }, [sectionRef]);
}

export function PlanetTour() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  const position = useTransform(scrollYProgress, [0, 1], [0, N - 1]);
  const velocity = useVelocity(position);
  const [active, setActive] = useState(0);
  const vp = useViewport();
  const reduce = useReducedMotion();
  const lite = useLite();
  const glideTo = usePagedTour(sectionRef, reduce);
  useHideHeaderInTour(sectionRef);

  // Prepare every world in arrival order (in workers), so planets are ready before you reach them.
  useEffect(() => {
    // Phones only preload the light version; each planet fetches its sharper texture when shown.
    const touch = isTouch();
    for (const f of FEATURES) loadPlanetTexture(f.kind, 256).then(() => (touch ? undefined : loadPlanetTexture(f.kind, 1024)));
  }, []);

  useMotionValueEvent(position, "change", (v) => setActive(Math.max(0, Math.min(N - 1, Math.round(v)))));

  const mobile = vp.w < 768;
  const planetSize = Math.round(Math.min(mobile ? vp.w * 0.58 : vp.w * 0.3, vp.h * (mobile ? 0.24 : 0.5), 480));
  const stageX = mobile ? 0.5 : 0.3;
  const stageY = mobile ? 0.28 : 0.5;
  const feature = FEATURES[active];
  // The stage is the rounded box inside the page padding (p-3 / sm:p-5): space events orbit
  // the planet, whose centre is at (stageX, stageY) of that box.
  const pad = vp.w < 640 ? 12 : 20;
  const eventStage = { cx: (vp.w - 2 * pad) * stageX, cy: (vp.h - 2 * pad) * stageY, r: planetSize / 2, mobile };

  const jump = (i: number) => glideTo(i);

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
            // Phones: instant change, a full-screen gradient repainted for 1.2 s costs too much there.
            transition={{ duration: reduce || lite ? 0 : 1.2, ease: "easeOut" }}
          />
          <WarpField velocity={velocity} tint={feature.glow} centerX={stageX} centerY={stageY} lite={lite} />

          <div className="absolute inset-0" aria-hidden>
            {FEATURES.map((f, i) =>
              Math.abs(i - active) <= 1 ? (
                <TourPlanet key={f.id} feature={f} index={i} still={i !== active} position={position} size={planetSize} stageX={stageX} stageY={stageY} vp={vp} mobile={mobile} lite={lite} />
              ) : null,
            )}
          </div>

          {/* A shooting star, meteors, an alien ship... a small show at every jump between planets,
              in front of the planet and under the text. */}
          <SpaceEvents active={active} reduce={Boolean(reduce)} stage={eventStage} />

          <div className={`absolute z-10 ${mobile ? "inset-x-5 bottom-[4.5rem] top-[47%]" : "right-28 top-1/2 w-[38%] max-w-md -translate-y-1/2"}`}>
            <AnimatePresence mode="wait">
              <FeatureCopy key={feature.id} feature={feature} reduce={Boolean(reduce)} mobile={mobile} lite={lite} />
            </AnimatePresence>
          </div>

          {/* Index of worlds: real miniatures. On phones the row starts from the left and leaves the
              bottom-right corner free, where Zib's launcher sits and would cover the last planets. */}
          <nav
            aria-label="Tappe del viaggio"
            className={`absolute z-20 flex items-center ${mobile ? "bottom-5 left-3 gap-0.5" : "right-6 top-1/2 -translate-y-1/2 flex-col gap-1.5"}`}
          >
            {FEATURES.map((f, i) => (
              <button
                key={f.id}
                onClick={() => jump(i)}
                aria-label={`${f.title}, pianeta ${f.planet}`}
                aria-current={i === active ? "step" : undefined}
                className={`group relative grid place-items-center rounded-full transition-transform hover:scale-110 ${mobile ? "size-8" : "size-9"}`}
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
                  {/* Phones: still miniatures. Eight tiny spheres redrawn pixel by pixel on every frame were
                      the heaviest part of the tour there, and at this size the spin is not visible. */}
                  <PlanetCanvas kind={f.kind} size={f.kind === "gold" ? 14 : 18} spin={20 + i * 4} still={lite} className="block" />
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
  lite,
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
  lite: boolean;
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
      // Phones: no blur filter while the planet flies past (opacity and scale carry the motion).
      style={{ left: `${stageX * 100}%`, top: `${stageY * 100}%`, x, y, scale, opacity, rotate, filter: lite ? "none" : filter, translateX: "-50%", translateY: "-50%" }}
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

function FeatureCopy({ feature, reduce, mobile, lite }: { feature: Feature; reduce: boolean; mobile: boolean; lite: boolean }) {
  // Phones: the text slides and fades without the blur, which is expensive to animate there.
  // The filter is always set (0 on phones): the page first renders as on a computer, and a
  // variant without a filter would leave that first blur on the text for good.
  const blur = (px: number) => ({ filter: `blur(${lite ? 0 : px}px)` });
  const item = {
    hidden: { opacity: 0, y: 22, ...blur(8) },
    shown: { opacity: 1, y: 0, ...blur(0), transition: { duration: reduce ? 0 : 0.55, ease: EASE } },
    gone: { opacity: 0, y: -14, ...blur(6), transition: { duration: reduce ? 0 : 0.22 } },
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

      {/* On phones the live demo does not fit: it pushed the text onto the planet and covered the
          row of planets used to jump between stops. The button below opens the real editor instead. */}
      {!mobile && (
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
      )}

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
