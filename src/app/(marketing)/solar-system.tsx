"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { PlanetCanvas } from "@/components/planets/planet-canvas";
import { FEATURES, tourAnchor, type Feature } from "./features";

/**
 * Hero: the Lumora "system". The sun is the light source; each planet is a
 * feature. A trail of light leaves the sun and threads every planet in order
 * while they orbit, and a pulse runs along it lighting one feature at a time.
 * Positions are computed per frame and written straight to the DOM (no React
 * re-render per frame).
 */

/** Vertical squash of the orbit plane: we look at it from above, at an angle. */
const FLATTEN = 0.36;
/** Length of the travelling light pulse, as a fraction of the whole trail. */
const PULSE = 0.16;
const PULSE_SECONDS = 7;
/** How long the light takes to travel from the sun to a clicked planet. */
const FOCUS_SECONDS = 0.75;

// Deterministic star field (identical on server and client).
const STARS = Array.from({ length: 150 }, (_, i) => {
  const r = (n: number) => {
    const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  // Rounded so the server and browser serialise identical style strings.
  const round = (v: number) => Math.round(v * 100) / 100;
  return { left: round(r(1) * 100), top: round(r(2) * 100), size: round(0.6 + r(3) * 1.8), delay: round(r(4) * 6), duration: round(2.5 + r(5) * 4) };
});

type Pt = { x: number; y: number };

/** Smooth curve through points (Catmull-Rom converted to cubic Béziers). */
function smoothPath(pts: Pt[]) {
  if (pts.length < 2) return "";
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${c1.x.toFixed(1)},${c1.y.toFixed(1)} ${c2.x.toFixed(1)},${c2.y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

function geometry(w: number, h: number) {
  return { cx: w / 2, cy: h * 0.52, R: w * 0.52 };
}

export function SolarSystem() {
  const stageRef = useRef<HTMLDivElement>(null);
  const planetRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const trailRef = useRef<SVGPathElement>(null);
  const glowRef = useRef<SVGPathElement>(null);
  const pulseRef = useRef<SVGPathElement>(null);
  const cometRef = useRef<SVGCircleElement>(null);
  const pausedRef = useRef(false);
  /** Index of the planet the light is travelling to, or -1. */
  const focusRef = useRef(-1);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [active, setActive] = useState<Feature | "sun" | null>(null);
  const [loaded, setLoaded] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    pausedRef.current = active !== null || Boolean(reduce);
    focusRef.current = active && active !== "sun" ? FEATURES.indexOf(active) : -1;
  }, [active, reduce]);

  // Card loading: a skeleton while the light travels, then the content.
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => setLoaded(true), reduce ? 0 : FOCUS_SECONDS * 1000 + 150);
    return () => clearTimeout(t);
  }, [active, reduce]);

  const open = (f: Feature | "sun") => {
    if (f !== "sun") {
      const el = planetRefs.current[FEATURES.indexOf(f)];
      el?.removeAttribute("data-burst");
      // Force a reflow so the burst animation restarts on repeated clicks.
      void el?.offsetWidth;
      el?.setAttribute("data-burst", "");
    }
    setLoaded(false);
    setActive(f);
  };

  useLayoutEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    const update = () => setSize({ w: node.clientWidth, h: node.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!size.w) return;
    const { cx, cy, R } = geometry(size.w, size.h);
    let raf = 0;
    let orbitTime = 0;
    let pulseTime = 0;
    let speed = 1;
    let focusIndex = -1;
    let focusProgress = 0;
    let last = performance.now();

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      // Ease the orbits to a stop instead of freezing them.
      speed += ((pausedRef.current ? 0 : 1) - speed) * Math.min(1, dt * 5);
      orbitTime += dt * speed;
      if (!reduce) pulseTime += dt;
      if (focusRef.current !== focusIndex) {
        focusIndex = focusRef.current;
        focusProgress = 0;
      }
      if (focusIndex >= 0) focusProgress = Math.min(1, focusProgress + dt / (reduce ? 0.001 : FOCUS_SECONDS));

      // Planet positions on the flattened plane; nearer = lower = larger.
      const pts: Pt[] = [{ x: cx, y: cy }];
      FEATURES.forEach((f, i) => {
        const a = (orbitTime / f.period + f.phase) * Math.PI * 2;
        const x = cx + Math.cos(a) * f.orbit * R;
        const y = cy + Math.sin(a) * f.orbit * R * FLATTEN;
        const depth = (Math.sin(a) + 1) / 2;
        pts.push({ x, y });
        const el = planetRefs.current[i];
        if (el) {
          el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${0.78 + depth * 0.32})`;
          el.style.zIndex = String(Math.round(10 + depth * 20));
        }
      });

      const d = smoothPath(pts);
      for (const p of [trailRef.current, glowRef.current, pulseRef.current]) p?.setAttribute("d", d);

      // Travelling pulse, and the planet it is passing over.
      const path = pulseRef.current;
      if (path) {
        const len = path.getTotalLength();
        // Each planet's position along the trail, approximated with straight segments.
        let acc = 0;
        const along = pts.map((p, i) => (i > 0 ? (acc += Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y)) : 0));
        const total = acc || 1;
        const at = (i: number) => (along[i + 1] / total) * len;

        let head: number;
        if (focusIndex >= 0) {
          // Light the whole stretch from the sun to the chosen feature.
          const eased = 1 - Math.pow(1 - focusProgress, 3);
          head = eased * at(focusIndex);
          path.style.strokeDasharray = `${head} ${len * 2}`;
          path.style.strokeDashoffset = "0";
        } else {
          const t = (pulseTime / PULSE_SECONDS) % 1;
          head = t * len * (1 + PULSE);
          path.style.strokeDasharray = `${len * PULSE} ${len * 2}`;
          path.style.strokeDashoffset = String(len * PULSE - head);
        }
        const tip = path.getPointAtLength(Math.min(len, head));
        cometRef.current?.setAttribute("cx", String(tip.x));
        cometRef.current?.setAttribute("cy", String(tip.y));
        cometRef.current?.setAttribute("opacity", head > len || (focusIndex >= 0 && focusProgress >= 1) ? "0" : "1");

        FEATURES.forEach((_, i) => {
          const lit = focusIndex >= 0 ? i === focusIndex && focusProgress >= 1 : head >= at(i) && head - at(i) < len * PULSE;
          planetRefs.current[i]?.toggleAttribute("data-lit", lit);
        });
      }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [size, reduce]);

  const { cx, cy, R } = geometry(size.w, size.h);
  const current = active === "sun" ? null : active;

  return (
    <div
      ref={stageRef}
      data-compact=""
      className="solar-stage relative aspect-[4/3] w-full overflow-hidden rounded-[28px] bg-[#05040f] text-white sm:aspect-[16/11]"
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 82% 8%, rgba(91,61,245,0.38), transparent 70%), radial-gradient(45% 40% at 8% 92%, rgba(255,181,71,0.16), transparent 70%), radial-gradient(35% 30% at 18% 12%, rgba(63,209,177,0.12), transparent 70%)",
        }}
      />
      <div aria-hidden className="absolute inset-0">
        {STARS.map((s, i) => (
          <span
            key={i}
            className="solar-star absolute rounded-full bg-white"
            style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s`, animationDuration: `${s.duration}s` }}
          />
        ))}
      </div>

      {size.w > 0 && (
        <motion.div className="absolute inset-0" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}>
          <svg aria-hidden className="absolute inset-0 h-full w-full" viewBox={`0 0 ${size.w} ${size.h}`}>
            <defs>
              <linearGradient id="lumora-trail" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0" stopColor="#ffe9b0" />
                <stop offset="0.5" stopColor="#ffb547" />
                <stop offset="1" stopColor="#8c76ff" />
              </linearGradient>
              <filter id="lumora-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="6" />
              </filter>
            </defs>
            {FEATURES.map((f) => (
              <ellipse key={f.id} cx={cx} cy={cy} rx={f.orbit * R} ry={f.orbit * R * FLATTEN} fill="none" stroke="rgba(255,255,255,0.07)" />
            ))}
            <path ref={trailRef} fill="none" stroke="rgba(255,214,140,0.25)" strokeWidth={1.2} strokeDasharray="2 6" strokeLinecap="round" />
            <path ref={glowRef} fill="none" stroke="url(#lumora-trail)" strokeWidth={10} opacity={0.14} filter="url(#lumora-glow)" />
            <path ref={pulseRef} fill="none" stroke="url(#lumora-trail)" strokeWidth={3} strokeLinecap="round" style={{ filter: "drop-shadow(0 0 6px #ffb547)" }} />
            <circle ref={cometRef} r={4.5} fill="#fff6dc" style={{ filter: "drop-shadow(0 0 8px #ffd27a) drop-shadow(0 0 18px #ffb547)" }} />
          </svg>

          {/* Sun: the light source */}
          <button
            type="button"
            onClick={() => open("sun")}
            aria-label="Lumora: la sorgente di luce"
            className="absolute z-[19] grid place-items-center"
            style={{ left: cx, top: cy, width: size.w * 0.12, height: size.w * 0.12, transform: "translate(-50%, -50%)" }}
          >
            <span aria-hidden className="solar-corona absolute inset-[-60%] rounded-full" />
            <span aria-hidden className="solar-flare absolute inset-[-25%] rounded-full" />
            <span
              className="relative block h-full w-full rounded-full"
              style={{
                background: "radial-gradient(circle at 40% 38%, #fffbe6 0%, #ffe38a 22%, #ffb547 52%, #ff7a1a 82%, #e2450c 100%)",
                boxShadow: "0 0 40px 12px rgba(255,181,71,0.6), 0 0 120px 40px rgba(255,122,26,0.3)",
              }}
            />
          </button>

          {FEATURES.map((f, i) => (
            <button
              key={f.id}
              ref={(el) => {
                planetRefs.current[i] = el;
              }}
              type="button"
              onClick={() => open(f)}
              aria-label={`${f.title}: scopri la funzione`}
              className="solar-planet group absolute left-0 top-0"
              style={{ width: size.w * f.size, height: size.w * f.size }}
            >
              <span aria-hidden className="solar-burst absolute inset-0 rounded-full" />
              <span className="solar-body relative block h-full w-full rounded-full transition-[scale,box-shadow] duration-300 group-hover:scale-125">
                <PlanetCanvas kind={f.kind} size={Math.round(size.w * f.size)} spin={f.period / 2} className="pointer-events-none block" />
              </span>
              <span className="solar-label pointer-events-none absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold">
                {f.title}
              </span>
            </button>
          ))}
        </motion.div>
      )}

      <AnimatePresence>
        {active && (
          <motion.div
            key={active === "sun" ? "sun" : active.id}
            role="dialog"
            aria-labelledby="feature-title"
            initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="absolute bottom-4 left-4 right-4 z-40 max-w-sm rounded-3xl border border-white/10 bg-[#120f2b]/80 p-5 backdrop-blur-xl sm:right-auto"
          >
            {/* Light bar: fills while the trail reaches the planet. */}
            <div aria-hidden className="mb-4 h-0.5 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#ffe9b0] via-[#ffb547] to-[#8c76ff] shadow-[0_0_12px_#ffb547]"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: reduce ? 0 : FOCUS_SECONDS + 0.15, ease: [0.65, 0, 0.35, 1] }}
              />
            </div>
            <AnimatePresence mode="wait" initial={false}>
              {!loaded ? (
                <motion.div key="skeleton" aria-busy="true" aria-label="Caricamento" exit={{ opacity: 0, transition: { duration: 0.15 } }} className="flex flex-col gap-2.5">
                  <span className="solar-skeleton h-5 w-2/5 rounded-full" />
                  <span className="solar-skeleton h-3.5 w-full rounded-full" />
                  <span className="solar-skeleton h-3.5 w-4/5 rounded-full" />
                  <span className="solar-skeleton mt-2 h-7 w-32 rounded-full" />
                </motion.div>
              ) : (
                <motion.div key="content" initial="hidden" animate="shown" variants={{ shown: { transition: { staggerChildren: 0.07 } } }}>
                  <Reveal>
                    <h3 id="feature-title" className="font-display text-xl font-bold">
                      {current ? current.title : "Lumora"}
                    </h3>
                  </Reveal>
                  <Reveal>
                    <p className="mt-1.5 text-[15px] leading-snug text-white/85">
                      {current ? current.body : "Dal latino lumen, luce. Ogni funzione riceve la stessa luce e la porta a chi guarda."}
                    </p>
                  </Reveal>
                  {current && (
                    <Reveal>
                      <p className="mt-2 text-xs text-white/50">Sul pianeta {current.planet}</p>
                    </Reveal>
                  )}
                  <Reveal>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {current && (
                        <a
                          href={`#${tourAnchor(current.id)}`}
                          onClick={() => setActive(null)}
                          className="rounded-full bg-[#ffb547] px-4 py-1.5 text-sm font-semibold text-[#2a1a00] transition-transform hover:scale-[1.03]"
                        >
                          Guarda da vicino
                        </a>
                      )}
                      <button autoFocus onClick={() => setActive(null)} className="rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold transition-colors hover:bg-white/20">
                        Riprendi l&apos;orbita
                      </button>
                    </div>
                  </Reveal>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Reveal({ children }: { children: ReactNode }) {
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 8, filter: "blur(4px)" }, shown: { opacity: 1, y: 0, filter: "blur(0px)" } }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
