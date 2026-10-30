"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { PlanetCanvas } from "@/components/planets/planet-canvas";
import { FEATURES, tourAnchor, type Feature } from "./features";

/**
 * Hero: the Lumora "system". The sun is the light source; each planet is a
 * feature, all the same size. The system stands still: visitors drag to turn
 * the orbits, hover a planet to light its orbit, or click to open it.
 * Positions are computed per frame and written straight to the DOM (no React
 * re-render per frame).
 */

/** Vertical squash of the orbit plane: we look at it from above, at an angle. */
const FLATTEN = 0.36;
/** How long the card shows its skeleton before the content. */
const FOCUS_SECONDS = 0.75;
/** Orbit time added per pixel dragged. */
const DRAG_SECONDS_PER_PX = 0.03;

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

/** Full-screen stage: the orbit plane sits in the lower part, leaving the top clear for the title. */
function geometry(w: number, h: number, clear: number) {
  const mobile = w < 768;
  // The plane sits below the hero text (`clear`), with room at the bottom for
  // the front planets, their names and the scroll cue.
  const fit = (cy: number) => Math.min(w * (mobile ? 0.44 : 0.4), (h - cy - 95) / 0.42);
  let cy = h * (mobile ? 0.66 : 0.64);
  const R = fit(cy);
  // Side planets sit at the height of the sun: keep them below the text.
  cy = Math.max(cy, clear + R * 0.06 + 10);
  return { cx: w / 2, cy, R: Math.max(60, fit(cy)) };
}

/** Every planet has the same size, proportional to the system radius. */
const planetPx = (R: number) => Math.max(26, Math.round(R * 0.1));

/**
 * Where each planet rests when nobody drags, as a horizontal position (in
 * system radii, by feature order). The slots are evenly spaced and leave a gap
 * for the sun; neighbours alternate in depth so their names never share a row.
 */
const SLOTS = [-0.16, 0.16, 0.38, -0.38, -0.6, 0.6, 0.82, -0.82];

/** Angle on each orbit (front half) that puts the planet on its slot. */
const restingAngles = () => FEATURES.map((f, i) => Math.acos(Math.max(-1, Math.min(1, SLOTS[i] / f.orbit))));

export function SolarSystem() {
  const stageRef = useRef<HTMLDivElement>(null);
  const planetRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const orbitRefs = useRef<(SVGEllipseElement | null)[]>([]);
  const parallaxRef = useRef<HTMLDivElement>(null);
  const starsRef = useRef<HTMLDivElement>(null);
  /** Index of the open planet, or -1. */
  const focusRef = useRef(-1);
  /** Index of the hovered or focused planet, or -1. */
  const hoverRef = useRef(-1);
  /** Pointer position on the stage, from -1 to 1 (parallax). */
  const pointerRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef({ active: false, moved: false, startX: 0, lastX: 0, lastT: 0, pending: 0, velocity: 0 });
  const [size, setSize] = useState({ w: 0, h: 0, clear: 0 });
  const [active, setActive] = useState<Feature | "sun" | null>(null);
  const [loaded, setLoaded] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    focusRef.current = active && active !== "sun" ? FEATURES.indexOf(active) : -1;
  }, [active, reduce]);

  // Card loading: a short skeleton, then the content.
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => setLoaded(true), reduce ? 0 : FOCUS_SECONDS * 1000 + 150);
    return () => clearTimeout(t);
  }, [active, reduce]);

  const open = (f: Feature | "sun") => {
    // A drag that ends on a planet is not a click.
    if (dragRef.current.moved) return;
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
    const update = () => {
      // Bottom of the hero text, relative to the stage: planets rest below it.
      const copy = document.querySelector("[data-hero-copy]")?.getBoundingClientRect();
      const clear = copy ? copy.bottom - node.getBoundingClientRect().top : node.clientHeight * 0.55;
      setSize({ w: node.clientWidth, h: node.clientHeight, clear });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!size.w) return;
    const { cx, cy, R } = geometry(size.w, size.h, size.clear);
    const px = planetPx(R);
    let raf = 0;
    let orbitTime = 0;
    let idle = 0;
    // Planets dragged above the bottom of the hero text fade, so nothing sits behind the title.
    const clear = size.clear;
    const rest = restingAngles();
    let tiltX = 0;
    let tiltY = 0;
    let lastHighlight = -2;
    // What the DOM currently shows: frames where nothing moved write nothing.
    let drawnTime = NaN;
    let drawnHighlight = -2;
    let drawnHover = -2;
    let last = performance.now();

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const drag = dragRef.current;
      const hover = hoverRef.current;
      const focus = focusRef.current;
      // The orbits only turn while being dragged, then glide to a stop.
      orbitTime += drag.pending;
      drag.pending = 0;
      // Released drags keep spinning and slow down.
      if (!drag.active && drag.velocity) {
        orbitTime += drag.velocity * dt;
        drag.velocity *= Math.pow(0.05, dt);
        if (Math.abs(drag.velocity) < 0.01) drag.velocity = 0;
      }
      // Once left alone, the planets glide back to their tidy resting places.
      idle = drag.active || drag.velocity ? 0 : idle + dt;
      if (idle > 1.8 && orbitTime) {
        orbitTime += (0 - orbitTime) * Math.min(1, dt * 2.2);
        if (Math.abs(orbitTime) < 0.001) orbitTime = 0;
      }

      const p = pointerRef.current;
      if (!reduce && (Math.abs(p.x - tiltX) > 0.002 || Math.abs(p.y - tiltY) > 0.002)) {
        tiltX += (p.x - tiltX) * Math.min(1, dt * 3);
        tiltY += (p.y - tiltY) * Math.min(1, dt * 3);
        if (parallaxRef.current) parallaxRef.current.style.transform = `translate(${(-tiltX * 16).toFixed(1)}px, ${(-tiltY * 10).toFixed(1)}px)`;
        if (starsRef.current) starsRef.current.style.transform = `translate(${(tiltX * 8).toFixed(1)}px, ${(tiltY * 5).toFixed(1)}px)`;
      }

      // The planet in the spotlight: the open one, else the hovered one.
      const highlight = focus >= 0 ? focus : hover;
      if (orbitTime === drawnTime && highlight === drawnHighlight && hover === drawnHover) {
        raf = requestAnimationFrame(frame);
        return;
      }
      drawnTime = orbitTime;
      drawnHighlight = highlight;
      drawnHover = hover;

      // Planet positions on the flattened plane.
      const labels: { i: number; depth: number; x: number; y: number; w: number }[] = [];
      FEATURES.forEach((f, i) => {
        const a = rest[i] + (orbitTime / f.period) * Math.PI * 2;
        const x = cx + Math.cos(a) * f.orbit * R;
        const y = cy + Math.sin(a) * f.orbit * R * FLATTEN;
        const depth = (Math.sin(a) + 1) / 2;
        labels.push({ i, depth, x, y: y + px / 2 + 14, w: f.title.length * 6.6 + 30 });
        const el = planetRefs.current[i];
        if (el) {
          el.style.transform = `translate3d(${(x - px / 2).toFixed(1)}px, ${(y - px / 2).toFixed(1)}px, 0)`;
          el.style.zIndex = String(i === hover ? 35 : Math.round(10 + depth * 20));
          el.style.opacity = String(Math.min(1, Math.max(0.15, (y - px / 2 - clear + 40) / 40)));
          el.toggleAttribute("data-lit", i === highlight);
        }
      });

      if (highlight !== lastHighlight) {
        lastHighlight = highlight;
        orbitRefs.current.forEach((o, i) => {
          o?.setAttribute("stroke", i === highlight ? FEATURES[i].glow : "#ffffff");
          o?.setAttribute("stroke-opacity", i === highlight ? "0.55" : "0.07");
          o?.setAttribute("stroke-width", i === highlight ? "1.5" : "1");
        });
      }

      // Names never overlap: nearest planets claim their label space first, the others fade.
      const placed: { x: number; y: number; w: number }[] = [];
      for (const l of labels.sort((p, q) => q.depth - p.depth)) {
        const hit = placed.some((p) => Math.abs(p.x - l.x) < (p.w + l.w) / 2 && Math.abs(p.y - l.y) < 26);
        planetRefs.current[l.i]?.toggleAttribute("data-label-hidden", hit);
        if (!hit) placed.push(l);
      }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [size, reduce]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || active) return;
    Object.assign(dragRef.current, { active: true, moved: false, startX: e.clientX, lastX: e.clientX, lastT: e.timeStamp, velocity: 0 });
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    pointerRef.current = { x: ((e.clientX - rect.left) / rect.width) * 2 - 1, y: ((e.clientY - rect.top) / rect.height) * 2 - 1 };
    const d = dragRef.current;
    if (!d.active) return;
    if (!d.moved && Math.abs(e.clientX - d.startX) > 6) {
      d.moved = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (!d.moved) return;
    const delta = (e.clientX - d.lastX) * DRAG_SECONDS_PER_PX;
    const elapsed = Math.max(0.008, (e.timeStamp - d.lastT) / 1000);
    d.pending += delta;
    d.velocity = Math.max(-8, Math.min(8, delta / elapsed));
    d.lastX = e.clientX;
    d.lastT = e.timeStamp;
  };
  const endDrag = () => {
    const d = dragRef.current;
    d.active = false;
    // The click that follows a drag still sees `moved`; reset it afterwards.
    setTimeout(() => (d.moved = false), 0);
  };
  const hover = (i: number) => () => (hoverRef.current = i);

  const { cx, cy, R } = geometry(size.w, size.h, size.clear);
  const px = planetPx(R);
  const current = active === "sun" ? null : active;

  return (
    <div
      ref={stageRef}
      data-compact={size.w > 0 && size.w < 520 ? "" : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={() => (pointerRef.current = { x: 0, y: 0 })}
      style={{ touchAction: "pan-y" }}
      className="solar-stage absolute inset-0 cursor-grab select-none overflow-hidden bg-[#05040f] text-white active:cursor-grabbing"
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 82% 8%, rgba(91,61,245,0.38), transparent 70%), radial-gradient(45% 40% at 8% 92%, rgba(255,181,71,0.16), transparent 70%), radial-gradient(35% 30% at 18% 12%, rgba(63,209,177,0.12), transparent 70%)",
        }}
      />
      <div ref={starsRef} aria-hidden className="absolute -inset-4">
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
          <div ref={parallaxRef} className="absolute inset-0">
            <svg aria-hidden className="absolute inset-0 h-full w-full" viewBox={`0 0 ${size.w} ${size.h}`}>
              {FEATURES.map((f, i) => (
                <ellipse
                  key={f.id}
                  ref={(el) => {
                    orbitRefs.current[i] = el;
                  }}
                  cx={cx}
                  cy={cy}
                  rx={f.orbit * R}
                  ry={f.orbit * R * FLATTEN}
                  fill="none"
                  stroke="#ffffff"
                  strokeOpacity={0.07}
                  style={{ transition: "stroke 0.4s, stroke-opacity 0.4s" }}
                />
              ))}
            </svg>

            {/* Sun: the light source */}
            <button
              type="button"
              onClick={() => open("sun")}
              aria-label="Lumora: la sorgente di luce"
              className="absolute z-[19] grid cursor-pointer place-items-center"
              style={{ left: cx, top: cy, width: R * 0.2, height: R * 0.2, transform: "translate(-50%, -50%)" }}
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
                onPointerEnter={hover(i)}
                onPointerLeave={hover(-1)}
                onFocus={hover(i)}
                onBlur={hover(-1)}
                aria-label={`${f.title}: scopri la funzione`}
                className="solar-planet group absolute left-0 top-0 cursor-pointer"
                style={{ width: px, height: px, "--glow": f.glow } as React.CSSProperties}
              >
                <span aria-hidden className="solar-burst absolute inset-0 rounded-full" />
                <span className="solar-body relative block h-full w-full rounded-full transition-[scale,box-shadow] duration-300 group-hover:scale-125">
                  <PlanetCanvas kind={f.kind} size={px} spin={f.period / 2} tilt={f.kind === "rose" ? 0.6 : 0.22} className="pointer-events-none block" />
                </span>
                <span className="solar-label pointer-events-none absolute left-1/2 top-full mt-2 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full py-1 pl-2 pr-2.5 text-[11.5px] font-semibold tracking-[0.01em]">
                  <span aria-hidden className="solar-dot h-1.5 w-1.5 rounded-full" />
                  {f.title}
                </span>
              </button>
            ))}
          </div>
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
                        <>
                          <a
                            href={`/crea/${current.id}`}
                            className="rounded-full px-4 py-1.5 text-sm font-semibold text-[#120d26] transition-transform hover:scale-[1.03]"
                            style={{ background: current.glow }}
                          >
                            Crea con questa funzione
                          </a>
                          <a
                            href={`#${tourAnchor(current.id)}`}
                            onClick={() => setActive(null)}
                            className="rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold transition-colors hover:bg-white/20"
                          >
                            Guarda da vicino
                          </a>
                        </>
                      )}
                      <button autoFocus onClick={() => setActive(null)} className="rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold transition-colors hover:bg-white/20">
                        Chiudi
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
