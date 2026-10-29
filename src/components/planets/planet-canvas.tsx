"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { ATMOSPHERE, planetTexture, RINGED, TEX_H, TEX_W, type PlanetKind } from "./textures";

/**
 * A planet rendered per pixel on a canvas: the procedural texture is projected
 * onto a sphere, lit from the sun's direction, with limb darkening, an
 * atmosphere glow and (for ringed worlds) rings passing behind and in front.
 * The projection is precomputed once, so each frame only shifts longitudes.
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
};

const RING_SCALE = 2.4;
const DEFAULT_LIGHT: [number, number, number] = [-0.62, -0.32, 0.72];
const FPS = 30;
const MAX_PIXELS = 620;

export function PlanetCanvas({ kind, size, spin = 40, tilt = 0.22, light = DEFAULT_LIGHT, className = "" }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();
  const ringed = RINGED.has(kind);
  const box = ringed ? size * RING_SCALE : size;
  // Primitive key so a new array literal on each render does not restart the effect.
  const lightKey = light.join(",");

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || size < 2) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    // Capped so a large planet stays cheap to redraw every frame.
    const D = Math.max(4, Math.min(MAX_PIXELS, Math.round(size * dpr)));
    const S = ringed ? Math.round(D * RING_SCALE) : D;
    canvas.width = S;
    canvas.height = S;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let cancelled = false;
    let raf = 0;
    let visible = true;

    // Defer the (heavy) texture build so first paint is not blocked.
    const start = () => {
      if (cancelled) return;
      const tex = planetTexture(kind);
      const atmo = ATMOSPHERE[kind];
      const R = D / 2;
      const [lx0, ly0, lz0] = lightKey.split(",").map(Number);
      const ll = Math.hypot(lx0, ly0, lz0);
      const lx = lx0 / ll, ly = ly0 / ll, lz = lz0 / ll;
      const ct = Math.cos(tilt), st = Math.sin(tilt);

      // Precompute the sphere projection.
      const idx: number[] = [];
      const u0: number[] = [];
      const v: number[] = [];
      const shade: number[] = [];
      const rim: number[] = [];
      const alpha: number[] = [];
      for (let py = 0; py < D; py++) {
        for (let px = 0; px < D; px++) {
          const nx = (px + 0.5 - R) / R;
          const ny = (py + 0.5 - R) / R;
          const d = Math.hypot(nx, ny);
          if (d > 1 + 1 / R) continue;
          const dc = Math.min(d, 0.99999);
          const nz = Math.sqrt(1 - dc * dc);
          const sx = d > 0 ? (nx / d) * dc : 0;
          const sy = d > 0 ? (ny / d) * dc : 0;
          // Undo the axial tilt to find surface coordinates.
          const tx = sx * ct + sy * st;
          const ty = -sx * st + sy * ct;
          const lat = Math.asin(Math.max(-1, Math.min(1, -ty)));
          const lon = Math.atan2(tx, nz);
          idx.push(py * D + px);
          u0.push((lon / (Math.PI * 2) + 0.5) * TEX_W);
          v.push(Math.min(TEX_H - 1, Math.max(0, Math.floor((0.5 - lat / Math.PI) * TEX_H))));
          const diffuse = Math.max(0, sx * lx + sy * ly + nz * lz);
          shade.push((0.035 + 1.08 * Math.pow(diffuse, 0.85)) * (0.82 + 0.18 * nz));
          rim.push(atmo ? Math.pow(1 - nz, 2.6) * Math.max(0, sx * lx + sy * ly + 0.35) * 0.9 : 0);
          alpha.push(Math.max(0, Math.min(1, (1 - d) * R + 0.5)));
        }
      }
      const n = idx.length;
      const IDX = Uint32Array.from(idx), U0 = Float32Array.from(u0), V = Uint16Array.from(v);
      const SH = Float32Array.from(shade), RIM = Float32Array.from(rim), AL = Float32Array.from(alpha);

      const image = new ImageData(D, D);
      const buf = image.data;
      const sphere = ringed ? new OffscreenCanvas(D, D) : null;
      const sctx = sphere?.getContext("2d") ?? null;
      const ar = atmo?.[0] ?? 0, ag = atmo?.[1] ?? 0, ab = atmo?.[2] ?? 0;

      const drawRings = (front: boolean) => {
        const cx = S / 2, cy = S / 2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-0.38);
        ctx.beginPath();
        // Back half is above the ring's major axis, front half below.
        if (front) ctx.rect(-S, 0, S * 2, S);
        else ctx.rect(-S, -S, S * 2, S);
        ctx.clip();
        // Iridescent rings: gold inside, shifting to violet and teal outside.
        const bands: [number, number, string][] = [
          [1.18, 0.05, "rgba(255,214,140,0.35)"],
          [1.3, 0.12, "rgba(255,200,110,0.85)"],
          [1.45, 0.1, "rgba(255,170,190,0.8)"],
          [1.56, 0.03, "rgba(30,20,40,0.3)"],
          [1.66, 0.09, "rgba(170,140,255,0.7)"],
          [1.8, 0.06, "rgba(120,230,240,0.45)"],
        ];
        for (const [r, w, color] of bands) {
          ctx.beginPath();
          ctx.ellipse(0, 0, R * r, R * r * 0.26, 0, 0, Math.PI * 2);
          ctx.lineWidth = R * w;
          ctx.strokeStyle = color;
          ctx.stroke();
        }
        ctx.restore();
      };

      let last = 0;
      const t0 = performance.now();
      const frame = (now: number) => {
        if (cancelled) return;
        raf = requestAnimationFrame(frame);
        if (!visible || now - last < 1000 / FPS) return;
        last = now;
        const offset = reduce ? 0 : (((now - t0) / 1000 / spin) * TEX_W) % TEX_W;
        for (let i = 0; i < n; i++) {
          let u = U0[i] + offset;
          if (u >= TEX_W) u -= TEX_W;
          const x0 = u | 0;
          const f = u - x0;
          const x1 = x0 + 1 === TEX_W ? 0 : x0 + 1;
          const row = V[i] * TEX_W;
          const a = (row + x0) * 4, b = (row + x1) * 4;
          const r = RIM[i];
          // Emissive parts (lava, rivers, shields) glow even on the night side.
          const glow = (tex[a + 3] + (tex[b + 3] - tex[a + 3]) * f) / 255;
          const s = SH[i] + glow * 1.1;
          const o = IDX[i] * 4;
          buf[o] = (tex[a] + (tex[b] - tex[a]) * f) * s + ar * r;
          buf[o + 1] = (tex[a + 1] + (tex[b + 1] - tex[a + 1]) * f) * s + ag * r;
          buf[o + 2] = (tex[a + 2] + (tex[b + 2] - tex[a + 2]) * f) * s + ab * r;
          buf[o + 3] = AL[i] * 255;
        }
        if (ringed && sctx) {
          sctx.putImageData(image, 0, 0);
          ctx.clearRect(0, 0, S, S);
          drawRings(false);
          ctx.drawImage(sphere!, (S - D) / 2, (S - D) / 2);
          drawRings(true);
        } else {
          ctx.putImageData(image, 0, 0);
        }
        if (reduce) cancelAnimationFrame(raf);
      };
      raf = requestAnimationFrame(frame);
    };

    const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
    io.observe(canvas);
    const hasIdle = typeof window.requestIdleCallback === "function";
    const idle = hasIdle ? window.requestIdleCallback(start, { timeout: 600 }) : setTimeout(start, 50);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      io.disconnect();
      if (hasIdle) window.cancelIdleCallback(idle as number);
      else clearTimeout(idle);
    };
  }, [kind, size, spin, tilt, lightKey, ringed, reduce]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={className}
      style={{ width: box, height: box, marginLeft: ringed ? -(box - size) / 2 : 0, marginTop: ringed ? -(box - size) / 2 : 0 }}
    />
  );
}
