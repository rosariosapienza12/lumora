"use client";

import { useState } from "react";
import { motion } from "motion/react";

/**
 * A small show at every jump between planets: a shooting star, a meteor shower, an alien ship
 * circling the planet, a comet, a satellite. A different one each time, reversed when you
 * travel back. Every path runs on the planet's orbit band, around the disc, so nothing covers
 * the planet, the menu or the text. Big enough to see at a glance, 1.5–2.4 s long. Decorative only: transforms only (cheap on phones), no pointer events, and
 * nothing with reduced motion.
 */

const KINDS = ["star", "meteors", "ufo", "comet", "satellite"] as const;
type Kind = (typeof KINDS)[number];
type Dir = 1 | -1;
type Point = [number, number];

/** Where the planet is, in the stage's pixels: its centre and radius. */
export type Stage = { cx: number; cy: number; r: number; mobile: boolean };

export function SpaceEvents({ active, reduce, stage }: { active: number; reduce: boolean; stage: Stage }) {
  const [previous, setPrevious] = useState(active);
  const [event, setEvent] = useState<{ id: number; kind: Kind; dir: Dir } | null>(null);
  const [count, setCount] = useState(0);

  // React's "adjust state when a prop changes" pattern: a new planet starts a new event.
  if (active !== previous) {
    setPrevious(active);
    if (!reduce) {
      setEvent({ id: count + 1, kind: KINDS[count % KINDS.length], dir: active > previous ? 1 : -1 });
      setCount(count + 1);
    }
  }

  if (!event) return null;
  const onDone = () => setEvent((current) => (current?.id === event.id ? null : current));
  const props = { stage, dir: event.dir, onDone };
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden" key={event.id}>
      {event.kind === "star" && <ShootingStar {...props} />}
      {event.kind === "meteors" && <Meteors {...props} />}
      {event.kind === "ufo" && <Ufo {...props} />}
      {event.kind === "comet" && <Comet {...props} />}
      {event.kind === "satellite" && <Satellite {...props} />}
    </div>
  );
}

type EventProps = { stage: Stage; dir: Dir; onDone: () => void };

// ── Geometry ───────────────────────────────────────────────────────────────

const deg = (rad: number) => (rad * 180) / Math.PI;

/** n+1 points on an ellipse around (cx, cy), from angle a0 to a1 (radians, y down). */
function arc(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n = 32): Point[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n;
    return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
  });
}

/** Direction of travel at each point, in degrees, for tails and tilts. */
function headings(points: Point[]): number[] {
  return points.map((p, i) => {
    const q = points[Math.min(i + 1, points.length - 1)];
    const o = i === points.length - 1 ? points[i - 1] : p;
    const [from, to] = i === points.length - 1 ? [o, p] : [p, q];
    return deg(Math.atan2(to[1] - from[1], to[0] - from[0]));
  });
}

/** Keeps a rotation keyframe list continuous (no 359° → 1° spin). */
function unwrap(angles: number[]): number[] {
  const out = [angles[0]];
  for (let i = 1; i < angles.length; i++) {
    let a = angles[i];
    while (a - out[i - 1] > 180) a -= 360;
    while (a - out[i - 1] < -180) a += 360;
    out.push(a);
  }
  return out;
}

const route = (points: Point[], dir: Dir) => (dir === 1 ? points : [...points].reverse());

// ── Pieces ─────────────────────────────────────────────────────────────────

/** A glowing head with a fading tail that always trails behind, following any curve. */
function Streak({
  points,
  duration,
  delay = 0,
  head,
  glow,
  tail,
  tailLength,
  tailWidth,
  onDone,
}: {
  points: Point[];
  duration: number;
  delay?: number;
  head: number;
  glow: string;
  tail: string;
  tailLength: number;
  tailWidth: number;
  onDone?: () => void;
}) {
  const rotate = unwrap(headings(points));
  const fade = { duration, delay, times: [0, 0.1, 0.8, 1] };
  return (
    <motion.div
      className="absolute left-0 top-0"
      initial={{ x: points[0][0], y: points[0][1], rotate: rotate[0], opacity: 0 }}
      animate={{ x: points.map((p) => p[0]), y: points.map((p) => p[1]), rotate, opacity: [0, 1, 1, 0] }}
      transition={{ duration, delay, ease: "easeInOut", opacity: fade }}
      onAnimationComplete={onDone}
      style={{ willChange: "transform, opacity" }}
    >
      {/* The wrapper is turned towards the direction of travel: the tail extends behind (−x). */}
      <span
        className="absolute rounded-full"
        style={{ right: 0, top: -tailWidth / 2, width: tailLength, height: tailWidth, background: `linear-gradient(90deg, transparent, ${tail})`, filter: "blur(1px)" }}
      />
      <span
        className="absolute rounded-full bg-white"
        style={{
          left: -head / 2,
          top: -head / 2,
          width: head,
          height: head,
          boxShadow: `0 0 ${head * 1.4}px ${head * 0.5}px ${glow}, 0 0 ${head * 4}px ${head * 1.2}px ${glow}66`,
        }}
      />
    </motion.div>
  );
}

/** Sparks left behind along a path: each lights up as the head passes, then fades. */
function Sparks({ points, duration, delay = 0, color, size }: { points: Point[]; duration: number; delay?: number; color: string; size: number }) {
  const picks = points.filter((_, i) => i % 3 === 1);
  return (
    <>
      {picks.map((p, i) => (
        <motion.span
          key={i}
          className="absolute left-0 top-0 rounded-full"
          style={{ width: size, height: size, x: p[0] - size / 2, y: p[1] - size / 2, background: color, boxShadow: `0 0 ${size * 2}px ${color}` }}
          initial={{ opacity: 0, scale: 0.3 }}
          animate={{ opacity: [0, 1, 0], scale: [0.3, 1.2, 0.2], y: [p[1] - size / 2, p[1] - size / 2 + 14] }}
          transition={{ duration: 0.9, delay: delay + ((i + 1) / (picks.length + 1)) * duration, ease: "easeOut" }}
        />
      ))}
    </>
  );
}

/** A quick flash where a meteor burns up. */
function Flash({ at, delay, color, size }: { at: Point; delay: number; color: string; size: number }) {
  return (
    <motion.span
      className="absolute left-0 top-0 rounded-full"
      style={{ width: size, height: size, x: at[0] - size / 2, y: at[1] - size / 2, background: `radial-gradient(circle, #fff, ${color} 40%, transparent 70%)` }}
      initial={{ opacity: 0, scale: 0.2 }}
      animate={{ opacity: [0, 1, 0], scale: [0.2, 1.4, 1.8] }}
      transition={{ duration: 0.5, delay }}
    />
  );
}

// ── Events ─────────────────────────────────────────────────────────────────
// Every path is an arc on the planet's orbit band: radius 1.2–1.45 × the planet's radius, which
// stays off the planet's disc, below the menu bar and left of the text on every screen size.

const UP = -Math.PI / 2;

/** Over the top of the planet, from its right side to its left, with a trail of sparks. */
function ShootingStar({ stage, dir, onDone }: EventProps) {
  const { cx, cy, r, mobile } = stage;
  const points = route(arc(cx, cy, r * 1.32, r * 1.32, 0.15, -Math.PI - 0.35, 36), dir);
  const s = mobile ? 0.8 : 1;
  return (
    <>
      <Sparks points={points} duration={1.5} color="#dbe7ff" size={6 * s} />
      <Streak points={points} duration={1.5} head={13 * s} glow="#cfe0ff" tail="rgba(230,238,255,0.95)" tailLength={(mobile ? 120 : 230) * s} tailWidth={4.5 * s} onDone={onDone} />
    </>
  );
}

/** A shower of rocks on the upper orbit, each burning up in a flash. */
function Meteors({ stage, dir, onDone }: EventProps) {
  const { cx, cy, r, mobile } = stage;
  const s = mobile ? 0.8 : 1;
  const rocks = [
    { k: 1.22, from: -0.25, to: -1.35, size: 14, delay: 0 },
    { k: 1.4, from: -0.6, to: -1.75, size: 10, delay: 0.2 },
    { k: 1.3, from: -1.0, to: -2.15, size: 12, delay: 0.38 },
    { k: 1.44, from: -1.4, to: -2.6, size: 9, delay: 0.55 },
  ];
  return (
    <>
      {rocks.map((rock, i) => {
        // Going back through the tour they fall the other way round.
        const a0 = dir === 1 ? rock.from : -Math.PI - rock.from;
        const a1 = dir === 1 ? rock.to : -Math.PI - rock.to;
        const points = arc(cx, cy, r * rock.k, r * rock.k, a0, a1, 16);
        const last = i === rocks.length - 1;
        return (
          <div key={i}>
            <Streak points={points} duration={0.95} delay={rock.delay} head={rock.size * s} glow="#ff8a3d" tail="rgba(255,170,90,0.95)" tailLength={rock.size * 10 * s} tailWidth={rock.size * 0.6 * s} />
            <Flash at={points[points.length - 1]} delay={rock.delay + 0.82} color="#ffb070" size={rock.size * 5 * s} />
            {last && <motion.span className="hidden" animate={{ opacity: 1 }} transition={{ delay: rock.delay + 1.35 }} onAnimationComplete={onDone} />}
          </div>
        );
      })}
    </>
  );
}

/** An alien ship that swoops in, circles the planet once with its beam flashing, and leaves. */
function Ufo({ stage, dir, onDone }: EventProps) {
  const { cx, cy, r, mobile } = stage;
  const R = r * 1.33;
  const loop = arc(cx, cy, R, R * 0.9, UP, UP + 2 * Math.PI, 44);
  const points = route([[cx + R * 1.1, cy - R * 1.25], ...loop, [cx - R * 1.1, cy - R * 1.25]], dir);
  const width = mobile ? 86 : 132;
  const tilt = unwrap(headings(points)).map((a) => Math.max(-16, Math.min(16, Math.sin((a * Math.PI) / 180) * 16)));
  return (
    <motion.div
      className="absolute left-0 top-0"
      initial={{ x: points[0][0] - width / 2, y: points[0][1] - width * 0.33, opacity: 0 }}
      animate={{
        x: points.map((p) => p[0] - width / 2),
        y: points.map((p) => p[1] - width * 0.33),
        rotate: tilt,
        opacity: [0, 1, 1, 1, 0],
        // A touch bigger on the near (lower) side of the orbit, smaller on the far side.
        scale: points.map((p) => 0.82 + 0.3 * Math.max(0, Math.min(1, (p[1] - (cy - R)) / (2 * R)))),
      }}
      transition={{ duration: 2.3, ease: "easeInOut", opacity: { duration: 2.3, times: [0, 0.07, 0.5, 0.92, 1] } }}
      onAnimationComplete={onDone}
      style={{ willChange: "transform, opacity" }}
    >
      <UfoShape width={width} />
    </motion.div>
  );
}

/** Under the planet: an icy comet with a long tail and glittering dust. */
function Comet({ stage, dir, onDone }: EventProps) {
  const { cx, cy, r, mobile } = stage;
  const points = route(arc(cx, cy, r * 1.36, r * 1.3, -0.25, Math.PI + 0.25, 32), dir);
  const s = mobile ? 0.8 : 1;
  return (
    <>
      <Sparks points={points} duration={1.9} color="#9fd2ff" size={7 * s} />
      <Streak points={points} duration={1.9} head={18 * s} glow="#7cc4ff" tail="rgba(150,205,255,0.9)" tailLength={(mobile ? 150 : 300) * s} tailWidth={12 * s} onDone={onDone} />
    </>
  );
}

/** A satellite on the outer orbit, all the way round, its light blinking. */
function Satellite({ stage, dir, onDone }: EventProps) {
  const { cx, cy, r, mobile } = stage;
  const R = r * 1.42;
  const points = route(arc(cx, cy, R, R * 0.92, 0, 2 * Math.PI, 48), dir);
  const width = mobile ? 74 : 108;
  return (
    <motion.div
      className="absolute left-0 top-0"
      initial={{ x: points[0][0] - width / 2, y: points[0][1] - width * 0.22, opacity: 0 }}
      animate={{ x: points.map((p) => p[0] - width / 2), y: points.map((p) => p[1] - width * 0.22), rotate: [0, 180 * dir], opacity: [0, 1, 1, 0] }}
      transition={{ duration: 2.4, ease: "linear", opacity: { duration: 2.4, times: [0, 0.08, 0.9, 1] } }}
      onAnimationComplete={onDone}
      style={{ willChange: "transform, opacity" }}
    >
      <SatelliteShape width={width} />
    </motion.div>
  );
}

// ── Drawings ───────────────────────────────────────────────────────────────

function UfoShape({ width }: { width: number }) {
  return (
    <svg viewBox="0 0 120 80" width={width} className="drop-shadow-[0_0_22px_rgba(127,255,212,0.6)]" aria-hidden>
      <defs>
        <linearGradient id="se-hull" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d4ccff" />
          <stop offset="1" stopColor="#6c5ce7" />
        </linearGradient>
        <linearGradient id="se-beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7fffd4" stopOpacity="0.75" />
          <stop offset="1" stopColor="#7fffd4" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path d="M47 46 L73 46 L94 80 L26 80 Z" fill="url(#se-beam)" animate={{ opacity: [0, 0, 1, 0.3, 1, 0] }} transition={{ duration: 2.3, times: [0, 0.3, 0.42, 0.52, 0.62, 0.78] }} />
      <ellipse cx="60" cy="25" rx="21" ry="18" fill="rgba(180,255,235,0.3)" stroke="rgba(215,255,245,0.95)" strokeWidth="1.6" />
      <ellipse cx="60" cy="28" rx="8" ry="8.5" fill="#86f0a0" />
      <circle cx="56.6" cy="26" r="2" fill="#0b0920" />
      <circle cx="63.4" cy="26" r="2" fill="#0b0920" />
      <ellipse cx="60" cy="42" rx="57" ry="12.5" fill="url(#se-hull)" />
      <ellipse cx="60" cy="37.5" rx="43" ry="5" fill="#ece8ff" opacity="0.75" />
      {[16, 38, 60, 82, 104].map((x, i) => (
        <motion.circle key={x} cx={x} cy="45" r="3.4" fill={i % 2 ? "#ffd36b" : "#7fffd4"} animate={{ opacity: [1, 0.15, 1] }} transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.08 }} />
      ))}
    </svg>
  );
}

function SatelliteShape({ width }: { width: number }) {
  return (
    <svg viewBox="0 0 100 44" width={width} className="drop-shadow-[0_0_14px_rgba(157,184,255,0.6)]" aria-hidden>
      {[2, 66].map((x) => (
        <g key={x}>
          <rect x={x} y="12" width="32" height="20" rx="2" fill="#2f4f9a" stroke="#b6caff" strokeWidth="1.2" />
          {[1, 2, 3].map((c) => (
            <line key={c} x1={x + c * 8} y1="12" x2={x + c * 8} y2="32" stroke="#7a99e0" strokeWidth="0.8" />
          ))}
          <line x1={x} y1="22" x2={x + 32} y2="22" stroke="#7a99e0" strokeWidth="0.8" />
        </g>
      ))}
      <line x1="34" y1="22" x2="66" y2="22" stroke="#d6dcea" strokeWidth="2" />
      <rect x="40" y="11" width="20" height="22" rx="4" fill="#e6ebf4" stroke="#9aa6bd" strokeWidth="1" />
      <circle cx="50" cy="22" r="4" fill="#9aa6bd" />
      <line x1="50" y1="11" x2="50" y2="3" stroke="#d6dcea" strokeWidth="1.5" />
      <motion.circle cx="50" cy="3" r="3" fill="#ff5a5a" animate={{ opacity: [1, 0.1, 1] }} transition={{ duration: 0.5, repeat: Infinity }} />
    </svg>
  );
}
