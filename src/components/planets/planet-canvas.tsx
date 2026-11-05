"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { loadPlanetTexture, RINGED, type PlanetKind, type PlanetTexture } from "./textures";
import { canvasSide, createSphere, HALO, RING_SCALE, type SphereOptions } from "./sphere";
import { sharedPlanetGL } from "./solar-gl";

/**
 * A procedural planet on a canvas (see sphere.ts for the rendering). Small
 * planets are drawn on the page; large ones are handed to a Web Worker through
 * OffscreenCanvas, so scrolling never waits for their per-pixel work.
 */

type Props = {
  kind: PlanetKind;
  /** Planet diameter in CSS pixels. */
  size: number;
  /** Seconds per rotation. */
  spin?: number;
  /** Axial tilt in radians. */
  tilt?: number;
  /** Direction of the light (sun), x right, y down, z towards the viewer. */
  light?: [number, number, number];
  className?: string;
  /** Draw once and stop: for planets that are on screen but not in focus. */
  still?: boolean;
};

const DEFAULT_LIGHT: [number, number, number] = [-0.62, -0.32, 0.72];

/** Seen slightly from above: poles show and rings open up (a 15° pitch, like the old flat rings). */
const tourView = (() => {
  const p = 0.26;
  const [c, s] = [Math.cos(p), Math.sin(p)];
  return new Float32Array([1, 0, 0, 0, c, s, 0, -s, c]);
})();
/** Cap on the sphere's pixel diameter: high enough that big planets stay sharp on retina screens. */
const MAX_PIXELS = 1100;
/** From this diameter (device pixels) a planet is drawn off the main thread. */
const OFF_THREAD_MIN = 160;

/** Texture width matched to how big the planet is drawn. */
// About two texels per pixel across the visible half, so the surface never looks soft.
const textureWidth = (diameterPx: number) => (diameterPx >= 360 ? 2048 : diameterPx >= 100 ? 1024 : diameterPx >= 30 ? 512 : 256);

/** Phones and tablets: at most 2× pixels and 1024px textures. Sharper is invisible there, and costs memory and battery. */
const TOUCH_MAX_DPR = 2;
const TOUCH_MAX_TEXTURE = 1024;

export function PlanetCanvas({ kind, size, spin = 40, tilt = 0.22, light = DEFAULT_LIGHT, className = "", still = false }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  /** The render worker of the current canvas, kept across React's development double effects. */
  const workerRef = useRef<{ canvas: HTMLCanvasElement; worker: Worker; end?: ReturnType<typeof setTimeout> } | null>(null);
  const reduce = useReducedMotion();
  const ringed = RINGED.has(kind);
  const box = (ringed ? size * RING_SCALE : size) * (1 + HALO);
  // Primitive key so a new array literal on each render does not restart the effect.
  const lightKey = light.join(",");

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || size < 2) return;
    const touch = window.matchMedia("(pointer: coarse)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, touch ? TOUCH_MAX_DPR : 2.5);
    const D = Math.max(4, Math.min(MAX_PIXELS, Math.round(size * dpr)));
    const S = canvasSide(D, ringed);
    const options: SphereOptions = { kind, D, ringed, spin, tilt, light: lightKey.split(",").map(Number) as [number, number, number], reduce: Boolean(reduce), still };

    let deliver: (texture: PlanetTexture) => void;
    let setVisible: (visible: boolean) => void;
    let stop: () => void;
    const shared = workerRef.current ? null : sharedPlanetGL();
    if (shared) {
      // Real 3D: the shared WebGL renderer draws the planet (rings with shadows, true sphere lighting)
      // and the picture is copied into this canvas.
      canvas.width = S;
      canvas.height = S;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const [lx, ly, lz] = options.light;
      const ll = Math.hypot(lx, ly, lz) || 1;
      const view = tourView;
      let visible = true;
      let raf = 0;
      let last = 0;
      const frameMs = D > 600 ? 66 : 33;
      const t0 = performance.now();
      const draw = (now: number) => {
        const elapsed = reduce ? 0 : (now - t0) / 1000;
        shared.renderSingle(
          S,
          { kind, x: S / 2, y: S / 2, r: D / 2, light: [lx / ll, -ly / ll, lz / ll], phase: elapsed / spin, tilt, hover: 0, glow: [0.6, 0.6, 0.7], fade: 1, extent: S / D },
          view,
        );
        ctx.clearRect(0, 0, S, S);
        ctx.drawImage(shared.canvas, 0, 0);
      };
      const tick = (now: number) => {
        raf = requestAnimationFrame(tick);
        if (!visible || document.hidden || now - last < frameMs) return;
        last = now;
        draw(now);
      };
      const animate = !reduce && !still;
      deliver = (t) => {
        shared.setTexture(kind, t);
        draw(performance.now());
      };
      setVisible = (v) => (visible = v);
      if (animate) raf = requestAnimationFrame(tick);
      else draw(performance.now());
      stop = () => cancelAnimationFrame(raf);
      // The surface is drawn as soon as a texture is ready (shared between planets of the same kind).
    } else {
    let current = workerRef.current;
    if (current && current.canvas !== canvas) {
      current.worker.terminate();
      current = workerRef.current = null;
    }
    if (current || (D >= OFF_THREAD_MIN && typeof canvas.transferControlToOffscreen === "function" && typeof Worker !== "undefined")) {
      // Large planet: drawn by its own worker, so the page never waits for it.
      if (current) {
        clearTimeout(current.end);
        current.worker.postMessage({ type: "init", size: S, options });
      } else {
        const offscreen = canvas.transferControlToOffscreen();
        const worker = new Worker(new URL("./planet-render-worker.ts", import.meta.url));
        worker.postMessage({ type: "init", canvas: offscreen, size: S, options }, [offscreen]);
        current = workerRef.current = { canvas, worker };
      }
      const { worker } = current;
      deliver = (texture) => worker.postMessage({ type: "texture", texture });
      setVisible = (visible) => worker.postMessage({ type: "visible", visible });
      stop = () => {
        worker.postMessage({ type: "stop" });
        // Ended unless the same canvas reuses it straight away (React development re-runs effects).
        const entry = workerRef.current;
        if (entry) entry.end = setTimeout(() => {
          worker.terminate();
          if (workerRef.current?.worker === worker) workerRef.current = null;
        }, 0);
      };
    } else {
      canvas.width = S;
      canvas.height = S;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const sphere = createSphere(ctx, options);
      deliver = sphere.setTexture;
      setVisible = sphere.setVisible;
      stop = sphere.stop;
    }
    }

    let cancelled = false;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    io.observe(canvas);

    // Progressive: each step sharper than the last, a rough sphere at once and full detail a few seconds later.
    const target = touch ? Math.min(textureWidth(D), TOUCH_MAX_TEXTURE) : textureWidth(D);
    const steps = [256, 1024, 2048].filter((w) => w < target).concat(target);
    steps.reduce<Promise<void>>(
      (prev, w) => prev.then(() => (cancelled ? undefined : loadPlanetTexture(kind, w).then((t) => (cancelled ? undefined : deliver(t))))),
      Promise.resolve(),
    );

    return () => {
      cancelled = true;
      stop();
      io.disconnect();
    };
  }, [kind, size, spin, tilt, lightKey, ringed, reduce, still]);

  return (
    <canvas
      // A canvas handed to a worker cannot be taken back: new settings get a fresh element.
      // `still` is not part of the key: pausing or restarting the spin reuses the same canvas and
      // worker (the effect re-sends "init"), instead of rebuilding the planet at every stop of the tour.
      key={`${kind}-${size}-${spin}-${tilt}-${lightKey}-${reduce}`}
      ref={ref}
      aria-hidden
      className={className}
      // Centred on the planet's box. The vertical shift uses relative positioning, not a negative
      // top margin: that margin would collapse into the parent and push the sphere off-centre.
      style={{
        position: "relative",
        top: -(box - size) / 2,
        width: box,
        height: box,
        marginLeft: -(box - size) / 2,
        marginRight: -(box - size) / 2,
        marginBottom: -(box - size),
      }}
    />
  );
}
