"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion, type MotionValue } from "motion/react";

/**
 * Star field flying towards the viewer. At rest the stars drift slowly; while
 * the visitor scrolls, `velocity` stretches them into light streaks
 * (hyperspace), tinted with the colour of the world ahead.
 */
export function WarpField({
  velocity,
  tint,
  centerX,
  centerY,
  lite = false,
}: {
  velocity: MotionValue<number>;
  tint: string;
  /** Vanishing point as fractions of the canvas size. */
  centerX: number;
  centerY: number;
  /** Phones: fewer stars at 1× pixels, about half the drawing work per frame. */
  lite?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const tintRef = useRef(tint);
  const reduce = useReducedMotion();

  useEffect(() => {
    tintRef.current = tint;
  }, [tint]);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = lite ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
    let w = 0, h = 0;
    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const COUNT = lite ? 140 : 260;
    const stars = Array.from({ length: COUNT }, () => ({ x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2, z: Math.random() }));
    let speed = 0;
    let raf = 0;
    let last = performance.now();
    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(canvas);

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!visible) return;
      // Ease towards the scroll speed so the streaks grow and fade smoothly.
      const target = reduce ? 0 : Math.min(6, Math.abs(velocity.get()) * 1.4);
      speed += (target - speed) * Math.min(1, dt * 6);
      const advance = (0.04 + speed * 0.9) * dt;

      ctx.clearRect(0, 0, w, h);
      const cx = w * centerX, cy = h * centerY;
      const scale = Math.max(w, h) * 0.6;
      ctx.lineCap = "round";
      for (const s of stars) {
        const pz = s.z;
        s.z -= advance;
        if (s.z <= 0.02) {
          s.x = (Math.random() - 0.5) * 2;
          s.y = (Math.random() - 0.5) * 2;
          s.z = 1;
          continue;
        }
        const x = cx + (s.x / s.z) * scale, y = cy + (s.y / s.z) * scale;
        const px = cx + (s.x / pz) * scale, py = cy + (s.y / pz) * scale;
        if (x < -50 || x > w + 50 || y < -50 || y > h + 50) continue;
        const near = 1 - s.z;
        ctx.globalAlpha = Math.min(1, 0.15 + near * 0.9);
        ctx.strokeStyle = speed > 0.4 && near > 0.35 ? tintRef.current : "#ffffff";
        ctx.lineWidth = 0.4 + near * 1.8;
        ctx.beginPath();
        // Streak length follows speed; at rest it is a dot.
        const k = Math.min(1, 0.15 + speed * 0.35);
        ctx.moveTo(x, y);
        ctx.lineTo(x + (px - x) * (1 + speed * 6) * k, y + (py - y) * (1 + speed * 6) * k);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [velocity, centerX, centerY, reduce, lite]);

  return <canvas ref={ref} aria-hidden className="absolute inset-0 h-full w-full" />;
}
