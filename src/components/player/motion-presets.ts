import type { TargetAndTransition, Variants } from "motion/react";
import type { EmphasisAnimation, EnterAnimation, Transition } from "@/lib/editor/schema";

export const enterFrom: Record<EnterAnimation, TargetAndTransition> = {
  none: {},
  fade: { opacity: 0 },
  "slide-up": { opacity: 0, y: 80 },
  "slide-left": { opacity: 0, x: 120 },
  zoom: { opacity: 0, scale: 0.6 },
  pop: { opacity: 0, scale: 0.2 },
  blur: { opacity: 0, filter: "blur(24px)" },
};

export const enterTo: TargetAndTransition = { opacity: 1, x: 0, y: 0, scale: 1, filter: "blur(0px)" };

export const emphasisLoop: Record<EmphasisAnimation, TargetAndTransition | undefined> = {
  none: undefined,
  pulse: { scale: [1, 1.08, 1], transition: { duration: 1.4, repeat: Infinity, ease: "easeInOut" } },
  wiggle: { rotate: [0, -4, 4, -2, 0], transition: { duration: 1.2, repeat: Infinity, repeatDelay: 1 } },
  float: { y: [0, -14, 0], transition: { duration: 2.6, repeat: Infinity, ease: "easeInOut" } },
  glow: {
    filter: ["drop-shadow(0 0 0px #ffb547)", "drop-shadow(0 0 24px #ffb547)", "drop-shadow(0 0 0px #ffb547)"],
    transition: { duration: 2, repeat: Infinity },
  },
};

/** Page transitions; `custom` is the navigation direction (1 forward, -1 back). */
export const pageVariants: Record<Transition, Variants> = {
  none: { enter: {}, center: {}, exit: {} },
  fade: { enter: { opacity: 0 }, center: { opacity: 1 }, exit: { opacity: 0 } },
  "slide-left": {
    enter: (d: number) => ({ x: `${d * 100}%` }),
    center: { x: 0 },
    exit: (d: number) => ({ x: `${d * -100}%` }),
  },
  "slide-up": {
    enter: (d: number) => ({ y: `${d * 100}%` }),
    center: { y: 0 },
    exit: (d: number) => ({ y: `${d * -100}%` }),
  },
  zoom: { enter: { opacity: 0, scale: 1.15 }, center: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.9 } },
  flip: {
    enter: (d: number) => ({ rotateY: d * 90, opacity: 0 }),
    center: { rotateY: 0, opacity: 1 },
    exit: (d: number) => ({ rotateY: d * -90, opacity: 0 }),
  },
};
