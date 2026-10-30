"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { ATMOSPHERE, LIMB, loadPlanetTexture, RINGED, type PlanetKind, type PlanetTexture } from "./textures";

/**
 * A planet rendered per pixel on a canvas: the procedural texture is projected
 * onto a sphere and lit from the sun's direction, with limb darkening, a
 * specular highlight on shiny surfaces (water, ice, metal), an atmosphere that
 * glows beyond the edge on the lit side and, for ringed worlds, rings passing
 * behind and in front. The projection is precomputed once, so each frame only
 * shifts longitudes.
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

const RING_SCALE = 2.4;
/** Extra room around the sphere for the atmosphere glow, as a fraction of the radius. */
const HALO = 0.14;
const DEFAULT_LIGHT: [number, number, number] = [-0.62, -0.32, 0.72];
const FPS = 24;
/** Cap on the sphere's pixel diameter: high enough that big planets stay sharp on retina screens. */
const MAX_PIXELS = 1100;

/**
 * Rings as many thin, translucent ringlets: density varies like real ring
 * systems, with a dark gap (like Cassini's) and a soft iridescent drift from
 * gold to rose, violet and teal.
 */
const RINGLET_STEP = 0.011;
const RINGLETS = (() => {
  const out: { r: number; color: string }[] = [];
  const stops: [number, [number, number, number]][] = [
    [0, [255, 220, 160]],
    [0.4, [255, 186, 196]],
    [0.7, [190, 168, 255]],
    [1, [150, 230, 236]],
  ];
  for (let r = 1.2; r <= 2.02; r += RINGLET_STEP) {
    const t = (r - 1.2) / 0.82;
    let k = 1;
    while (k < stops.length - 1 && stops[k][0] < t) k++;
    const [t0, c0] = stops[k - 1];
    const [t1, c1] = stops[k];
    const m = (t - t0) / (t1 - t0);
    const c = c0.map((v, i) => Math.round(v + (c1[i] - v) * m));
    // Density: fine pseudo-random structure, brighter middle band, a gap at 1.6.
    const fine = 0.55 + 0.45 * Math.sin(r * 97) * Math.sin(r * 41);
    const band = Math.exp(-(((r - 1.45) / 0.22) ** 2)) * 0.5 + 0.35;
    const gap = Math.abs(r - 1.6) < 0.035 ? 0.08 : 1;
    const edge = Math.min(1, (r - 1.2) / 0.08, (2.02 - r) / 0.12);
    out.push({ r, color: `rgba(${c[0]},${c[1]},${c[2]},${(fine * band * gap * edge * 0.9).toFixed(3)})` });
  }
  return out;
})();

/** Texture width matched to how big the planet is drawn. */
// About two texels per pixel across the visible half, so the surface never looks soft.
const textureWidth = (diameterPx: number) => (diameterPx >= 360 ? 2048 : diameterPx >= 100 ? 1024 : diameterPx >= 30 ? 512 : 256);

export function PlanetCanvas({ kind, size, spin = 40, tilt = 0.22, light = DEFAULT_LIGHT, className = "", still = false }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();
  const ringed = RINGED.has(kind);
  const box = (ringed ? size * RING_SCALE : size) * (1 + HALO);
  // Primitive key so a new array literal on each render does not restart the effect.
  const lightKey = light.join(",");

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || size < 2) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const D = Math.max(4, Math.min(MAX_PIXELS, Math.round(size * dpr)));
    const R = D / 2;
    const P = Math.ceil(R * HALO); // halo padding in pixels
    const SD = D + P * 2; // sphere canvas side
    const S = Math.round((ringed ? D * RING_SCALE : D) * (1 + HALO)); // output canvas side
    canvas.width = S;
    canvas.height = S;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let cancelled = false;
    let raf = 0;
    let visible = true;
    const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
    io.observe(canvas);

    const setup = (texture: PlanetTexture) => {
      const { rgba: tex, spec: SPEC, clouds: CL, w: TW, h: TH } = texture;
      const atmo = ATMOSPHERE[kind];
      const [lx0, ly0, lz0] = lightKey.split(",").map(Number);
      const ll = Math.hypot(lx0, ly0, lz0);
      const lx = lx0 / ll, ly = ly0 / ll, lz = lz0 / ll;
      // Half vector between light and viewer (0,0,1), for the specular highlight.
      const hl = Math.hypot(lx, ly, lz + 1);
      const hx = lx / hl, hy = ly / hl, hz = (lz + 1) / hl;
      const ct = Math.cos(tilt), st = Math.sin(tilt);

      // Precompute the sphere projection (surface pixels) and the halo ring.
      const idx: number[] = [], u0: number[] = [], v: number[] = [], fy: number[] = [], shade: number[] = [], rim: number[] = [], alpha: number[] = [], gloss: number[] = [], term: number[] = [];
      const haloIdx: number[] = [], haloA: number[] = [];
      for (let py = 0; py < SD; py++) {
        for (let px = 0; px < SD; px++) {
          const nx = (px + 0.5 - SD / 2) / R;
          const ny = (py + 0.5 - SD / 2) / R;
          const d = Math.hypot(nx, ny);
          if (d > 1 + HALO) continue;
          if (d > 1) {
            // Atmosphere beyond the edge: fades out, stronger on the lit side.
            if (!atmo) continue;
            const t = 1 - (d - 1) / HALO;
            const lit = Math.max(0, (nx / d) * lx + (ny / d) * ly + 0.45);
            const a = t * t * lit * 0.85;
            if (a > 0.01) {
              haloIdx.push(py * SD + px);
              haloA.push(a);
            }
            if (d > 1 + 1 / R) continue;
          }
          const dc = Math.min(d, 0.99999);
          const nz = Math.sqrt(1 - dc * dc);
          const sx = d > 0 ? (nx / d) * dc : 0;
          const sy = d > 0 ? (ny / d) * dc : 0;
          // Undo the axial tilt to find surface coordinates.
          const tx = sx * ct + sy * st;
          const ty = -sx * st + sy * ct;
          const lat = Math.asin(Math.max(-1, Math.min(1, -ty)));
          const lon = Math.atan2(tx, nz);
          idx.push(py * SD + px);
          u0.push((lon / (Math.PI * 2) + 0.5) * TW);
          const vy = Math.min(TH - 1.001, Math.max(0, (0.5 - lat / Math.PI) * TH - 0.5));
          v.push(Math.floor(vy));
          fy.push(vy - Math.floor(vy));
          const diffuse = Math.max(0, sx * lx + sy * ly + nz * lz);
          // Soft terminator: a little light wraps past the shadow line.
          const wrapped = Math.max(0, (sx * lx + sy * ly + nz * lz + 0.12) / 1.12);
          // Limb darkening: the edge of the disc is seen through more haze and lit at a grazing angle.
          shade.push((0.03 + 1.05 * Math.pow(diffuse, 0.9) * 0.85 + wrapped * 0.15) * Math.pow(nz, LIMB[kind]));
          rim.push(atmo ? Math.pow(1 - nz, 2.4) * Math.max(0, sx * lx + sy * ly + 0.4) : 0);
          // Broad, soft sun glint (only where the surface is shiny: water, ice, metal).
          gloss.push(diffuse > 0 ? Math.pow(Math.max(0, sx * hx + sy * hy + nz * hz), 36) * 0.5 : 0);
          // Warm band along the day/night line, where sunlight crosses the most atmosphere.
          term.push(atmo && diffuse < 0.22 && wrapped > 0 ? (1 - diffuse / 0.22) * wrapped * 2.2 : 0);
          alpha.push(Math.max(0, Math.min(1, (1 - d) * R + 0.5)));
        }
      }
      const n = idx.length;
      const IDX = Uint32Array.from(idx), U0 = Float32Array.from(u0), V = Uint16Array.from(v), FY = Float32Array.from(fy);
      const SH = Float32Array.from(shade), RIM = Float32Array.from(rim), AL = Float32Array.from(alpha), GL = Float32Array.from(gloss), TERM = Float32Array.from(term);
      // Cloud shadows fall slightly away from the sun.
      const shadowShift = TW * 0.006;
      const ar = atmo?.[0] ?? 0, ag = atmo?.[1] ?? 0, ab = atmo?.[2] ?? 0;

      const image = new ImageData(SD, SD);
      const buf = image.data;
      // The halo never changes: paint it once.
      for (let i = 0; i < haloIdx.length; i++) {
        const o = haloIdx[i] * 4;
        buf[o] = ar;
        buf[o + 1] = ag;
        buf[o + 2] = ab;
        buf[o + 3] = haloA[i] * 255;
      }
      const sphere = new OffscreenCanvas(SD, SD);
      const sctx = sphere.getContext("2d");
      if (!sctx) return;

      const drawRings = (front: boolean) => {
        ctx.save();
        ctx.translate(S / 2, S / 2);
        ctx.rotate(-0.38);
        ctx.beginPath();
        // Back half is above the ring's major axis, front half below.
        if (front) ctx.rect(-S, 0, S * 2, S);
        else ctx.rect(-S, -S, S * 2, S);
        ctx.clip();
        for (const ring of RINGLETS) {
          ctx.beginPath();
          ctx.ellipse(0, 0, R * ring.r, R * ring.r * 0.26, 0, 0, Math.PI * 2);
          ctx.lineWidth = R * RINGLET_STEP * 1.15;
          ctx.strokeStyle = ring.color;
          ctx.stroke();
        }
        ctx.restore();
      };

      let last = 0;
      // Large discs cost more per frame and turn slowly: half the frame rate is invisible there.
      const frameMs = 1000 / (D > 600 ? FPS / 2 : FPS);
      const t0 = performance.now();
      const frame = (now: number) => {
        if (cancelled) return;
        raf = requestAnimationFrame(frame);
        if (!visible || now - last < frameMs) return;
        // Keep the cadence steady instead of drifting down to every third frame.
        last = now - ((now - last) % frameMs);
        const elapsed = (now - t0) / 1000;
        const offset = reduce ? 0 : ((elapsed / spin) * TW) % TW;
        // Weather drifts a little faster than the ground.
        const cloudOffset = reduce ? 0 : ((elapsed / (spin * 0.8)) * TW) % TW;
        for (let i = 0; i < n; i++) {
          let u = U0[i] + offset;
          if (u >= TW) u -= TW;
          const x0 = u | 0;
          const fx = u - x0;
          const x1 = x0 + 1 === TW ? 0 : x0 + 1;
          const fv = FY[i];
          const r0 = V[i] * TW, r1 = r0 + TW;
          const a = (r0 + x0) * 4, b = (r0 + x1) * 4, c = (r1 + x0) * 4, d = (r1 + x1) * 4;
          const w00 = (1 - fx) * (1 - fv), w10 = fx * (1 - fv), w01 = (1 - fx) * fv, w11 = fx * fv;
          let red = tex[a] * w00 + tex[b] * w10 + tex[c] * w01 + tex[d] * w11;
          let green = tex[a + 1] * w00 + tex[b + 1] * w10 + tex[c + 1] * w01 + tex[d + 1] * w11;
          let blue = tex[a + 2] * w00 + tex[b + 2] * w10 + tex[c + 2] * w01 + tex[d + 2] * w11;
          // Emissive parts (lava, rivers, shields) glow even on the night side.
          const glow = (tex[a + 3] * w00 + tex[b + 3] * w10 + tex[c + 3] * w01 + tex[d + 3] * w11) / 255;
          const sh = SH[i];
          let s = sh + glow * 1.1;
          let sp = (SPEC[r0 + x0] / 255) * GL[i] * 255;
          if (CL) {
            let cu = U0[i] + cloudOffset;
            if (cu >= TW) cu -= TW;
            const ci = r0 + (cu | 0);
            const cloud = CL[ci] / 255;
            let su = cu + shadowShift;
            if (su >= TW) su -= TW;
            const shadow = CL[r0 + (su | 0)] / 255;
            s *= 1 - shadow * 0.45;
            // Clouds are white, lit like the surface, and hide the glint below them.
            const k = cloud * 0.92;
            red = red * (1 - k) + 250 * k;
            green = green * (1 - k) + 252 * k;
            blue = blue * (1 - k) + 255 * k;
            sp *= 1 - cloud;
            s = s * (1 - k) + (sh + glow * 0.3) * k;
          }
          const r = RIM[i];
          const t = TERM[i];
          const o = IDX[i] * 4;
          buf[o] = red * s + ar * r + 255 * t * 0.22 + sp;
          buf[o + 1] = green * s + ag * r + 140 * t * 0.22 + sp;
          buf[o + 2] = blue * s + ab * r + 90 * t * 0.22 + sp;
          buf[o + 3] = Math.max(buf[o + 3] * (1 - AL[i]), AL[i] * 255);
        }
        sctx.putImageData(image, 0, 0);
        ctx.clearRect(0, 0, S, S);
        if (ringed) drawRings(false);
        ctx.drawImage(sphere, (S - SD) / 2, (S - SD) / 2);
        if (ringed) drawRings(true);
        if (reduce || still) cancelAnimationFrame(raf);
      };
      raf = requestAnimationFrame(frame);
    };

    // Progressive: a small texture first (appears fast), then the sharp one.
    const target = textureWidth(D);
    const show = (w: number) =>
      loadPlanetTexture(kind, w).then((t) => {
        if (cancelled) return;
        cancelAnimationFrame(raf);
        setup(t);
      });
    // Each step sharper than the last: a rough sphere at once, full detail a few seconds later.
    const steps = [256, 1024, 2048].filter((w) => w < target).concat(target);
    steps.reduce<Promise<void>>((prev, w) => prev.then(() => (cancelled ? undefined : show(w))), Promise.resolve());

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [kind, size, spin, tilt, lightKey, ringed, reduce, still]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={className}
      style={{ width: box, height: box, marginLeft: -(box - size) / 2, marginTop: -(box - size) / 2, marginRight: -(box - size) / 2, marginBottom: -(box - size) / 2 }}
    />
  );
}
