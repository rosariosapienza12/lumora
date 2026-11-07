"use client";

import { useEffect, useRef, useState } from "react";
import type { Element } from "@/lib/editor/schema";
import { draw3D, has3D, type Render3D } from "@/lib/three/renderer";

type Object3DElement = Extract<Element, { type: "object3d" }>;

/**
 * Renders are queued and drawn a few per frame, so a page full of objects
 * (or a dashboard full of thumbnails) never freezes the browser.
 */
const queue = new Map<HTMLCanvasElement, () => void>();
let scheduled = false;
function schedule(canvas: HTMLCanvasElement, job: () => void) {
  queue.set(canvas, job);
  if (scheduled) return;
  scheduled = true;
  const run = () => {
    const start = performance.now();
    for (const [c, j] of queue) {
      queue.delete(c);
      j();
      if (performance.now() - start > 12) break;
    }
    if (queue.size) requestAnimationFrame(run);
    else scheduled = false;
  };
  requestAnimationFrame(run);
}

/** Pixel size for the canvas: its size on screen, sharp on retina, capped so big objects stay fast. */
function pixelSize(box: DOMRect | { width: number; height: number }) {
  const dpr = typeof window === "undefined" ? 1 : Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(16, box.width * dpr);
  const h = Math.max(16, box.height * dpr);
  const k = Math.min(1, 720 / Math.max(w, h));
  return { w: Math.round(w * k), h: Math.round(h * k) };
}

const params = (el: Object3DElement, spinDeg = 0, time = 0): Render3D => ({
  form: el.form,
  material: el.material,
  color: el.fill,
  color2: el.color2,
  tiltX: el.tiltX ?? 0,
  tiltY: (el.tiltY ?? 0) + spinDeg,
  light: el.light ?? 0,
  time,
});

/** Without WebGL: a lit, sphere-like gradient in the object's colour. */
function drawFallback(canvas: HTMLCanvasElement, color: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { width: w, height: h } = canvas;
  const r = Math.min(w, h) * 0.4;
  const g = ctx.createRadialGradient(w / 2 - r * 0.35, h / 2 - r * 0.4, r * 0.1, w / 2, h / 2, r);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.35, color);
  g.addColorStop(1, "#000000");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
  ctx.fill();
}

/** A 3D object. `live` (the presentation) animates spinning objects; editor and thumbnails show a still. */
export function Object3DView({ el, live = false }: { el: Object3DElement; live?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  // Drawn only once it comes on screen: a dashboard full of thumbnails does not render them all at once.
  const [seen, setSeen] = useState(false);

  // Follow the size on screen (the stage scales with the window).
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setSeen(true);
        io.disconnect();
      }
    }, { rootMargin: "200px" });
    io.observe(canvas);
    const ro = new ResizeObserver(([entry]) => {
      const next = pixelSize(entry.contentRect);
      setSize((s) => (s && Math.abs(s.w - next.w) < 8 && Math.abs(s.h - next.h) < 8 ? s : next));
    });
    ro.observe(canvas);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  const animated = live && (el.spin || el.form === "blob");
  const key = JSON.stringify(params(el));

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !size || !seen) return;
    canvas.width = size.w;
    canvas.height = size.h;
    if (!has3D()) {
      drawFallback(canvas, el.fill);
      return;
    }
    if (!animated) {
      schedule(canvas, () => draw3D(canvas, params(el)));
      return;
    }
    // Spin and ripple at about 30 frames a second, only while the tab is visible.
    let frame = 0;
    let last = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      if (now - last < 33 || document.hidden) return;
      last = now;
      const s = (now - t0) / 1000;
      draw3D(canvas, params(el, el.spin ? s * 28 : 0, s));
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` captures every drawing parameter of `el`
  }, [key, size, animated, seen]);

  return <canvas ref={ref} aria-label={el.alt || undefined} role={el.alt ? "img" : undefined} aria-hidden={el.alt ? undefined : true} style={{ width: "100%", height: "100%", display: "block" }} />;
}
