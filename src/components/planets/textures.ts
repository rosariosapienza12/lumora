/**
 * Procedural surfaces for Lumora's imaginary worlds. Each generator fills an
 * equirectangular RGBA texture: RGB is the surface colour, A is emission
 * (parts that glow on their own, also on the night side). Seeded noise is
 * sampled on the unit sphere, so the texture wraps seamlessly and the same
 * world always looks the same.
 */

export type PlanetKind = "ember" | "aurora" | "ocean" | "crystal" | "jungle" | "gold" | "rose" | "aegis";

export const TEX_W = 512;
export const TEX_H = 256;

type RGB = [number, number, number];
/** Colour plus emission 0..1. */
type Texel = [number, number, number, number];

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeNoise(seed: number) {
  const rand = mulberry32(seed);
  const perm = new Uint8Array(512);
  const values = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    perm[i] = i;
    values[i] = rand();
  }
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];

  const lattice = (x: number, y: number, z: number) => values[perm[(perm[(perm[x & 255] + y) & 255] + z) & 255]];
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const noise = (x: number, y: number, z: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = smooth(x - xi), yf = smooth(y - yi), zf = smooth(z - zi);
    const c = (dx: number, dy: number, dz: number) => lattice(xi + dx, yi + dy, zi + dz);
    return lerp(
      lerp(lerp(c(0, 0, 0), c(1, 0, 0), xf), lerp(c(0, 1, 0), c(1, 1, 0), xf), yf),
      lerp(lerp(c(0, 0, 1), c(1, 0, 1), xf), lerp(c(0, 1, 1), c(1, 1, 1), xf), yf),
      zf,
    );
  };
  /** Fractal noise, roughly 0..1. */
  return (x: number, y: number, z: number, octaves = 5) => {
    let amp = 0.5, freq = 1, sum = 0, norm = 0;
    for (let o = 0; o < octaves; o++) {
      sum += amp * noise(x * freq, y * freq, z * freq);
      norm += amp;
      amp *= 0.5;
      freq *= 2.03;
    }
    return sum / norm;
  };
}

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const mix = (a: RGB, b: RGB, t: number): RGB => {
  const k = clamp01(t);
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
};
function ramp(stops: [number, RGB][], t: number): RGB {
  if (t <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [p0, c0] = stops[i - 1];
      const [p1, c1] = stops[i];
      return mix(c0, c1, (t - p0) / (p1 - p0));
    }
  }
  return stops[stops.length - 1][1];
}
/** 1 on thin "veins" where noise crosses 0.5, falling off with `width`. */
const vein = (v: number, width: number) => clamp01(1 - Math.abs(v - 0.5) / width);

type P = { x: number; y: number; z: number };
type Sampler = (lat: number, lon: number, p: P) => Texel;

function samplers(): Record<PlanetKind, Sampler> {
  const a = makeNoise(11);
  const b = makeNoise(29);
  const c = makeNoise(53);
  const d = makeNoise(97);

  return {
    // Ignis: black basalt split by glowing lava.
    ember: (_lat, _lon, p) => {
      const rock = a(p.x * 3, p.y * 3, p.z * 3, 6);
      const crack = Math.max(vein(b(p.x * 2.2, p.y * 2.2, p.z * 2.2, 5), 0.035), vein(c(p.x * 4, p.y * 4, p.z * 4, 4), 0.025) * 0.7);
      const base = ramp([[0, [22, 14, 12]], [0.5, [58, 34, 26]], [1, [96, 58, 40]]], rock);
      const lava = ramp([[0, [190, 40, 10]], [0.6, [255, 120, 20]], [1, [255, 226, 120]]], crack);
      const col = mix(base, lava, crack * 1.2);
      return [...col, crack * 0.95];
    },
    // Aurelia: violet giant with magenta storms.
    aurora: (lat, _lon, p) => {
      const warp = (a(p.x * 2, p.y * 2, p.z * 2, 4) - 0.5) * 0.9;
      const band = Math.sin((lat + warp * 0.35) * 10) * 0.5 + 0.5;
      const swirl = b(p.x * 3 + warp, p.y * 9, p.z * 3, 5);
      const col = ramp([[0, [46, 20, 110]], [0.35, [112, 52, 214]], [0.6, [190, 92, 240]], [0.85, [244, 140, 230]], [1, [255, 214, 250]]], band * 0.6 + swirl * 0.4);
      return [...col, Math.max(0, swirl - 0.72) * 1.2];
    },
    // Thalassa: teal ocean world with coral islands and clouds.
    ocean: (lat, _lon, p) => {
      const land = a(p.x * 2.2, p.y * 2.2, p.z * 2.2, 6);
      let col: RGB =
        land > 0.6
          ? ramp([[0, [232, 214, 160]], [0.3, [120, 200, 140]], [1, [40, 130, 100]]], (land - 0.6) / 0.4)
          : ramp([[0, [6, 60, 84]], [0.7, [10, 150, 160]], [0.95, [80, 220, 210]], [1, [160, 240, 230]]], land / 0.6);
      const cloud = b(p.x * 3 + 5, p.y * 6, p.z * 3, 5);
      col = mix(col, [245, 252, 255], Math.max(0, (cloud - 0.56) * 2.6));
      if (Math.abs(lat) > 1.3) col = mix(col, [235, 250, 252], 0.85);
      return [...col, 0];
    },
    // Cryo: pale crystal ice with luminous fractures.
    crystal: (_lat, _lon, p) => {
      const facet = a(p.x * 5, p.y * 5, p.z * 5, 3);
      const fracture = vein(b(p.x * 3, p.y * 3, p.z * 3, 5), 0.03);
      const col = mix(ramp([[0, [140, 190, 230]], [0.5, [200, 230, 250]], [1, [250, 254, 255]]], facet), [120, 240, 255], fracture);
      return [...col, fracture * 0.8];
    },
    // Silva: emerald jungle crossed by bioluminescent rivers.
    jungle: (_lat, _lon, p) => {
      const canopy = a(p.x * 3.5, p.y * 3.5, p.z * 3.5, 6);
      const river = vein(b(p.x * 1.8, p.y * 1.8, p.z * 1.8, 5), 0.028);
      let col = ramp([[0, [8, 60, 36]], [0.45, [26, 120, 62]], [0.75, [72, 176, 84]], [1, [160, 220, 110]]], canopy);
      const mist = c(p.x * 4, p.y * 4, p.z * 4, 4);
      col = mix(col, [220, 255, 230], Math.max(0, (mist - 0.65) * 2));
      col = mix(col, [120, 255, 200], river);
      return [...col, river * 0.85];
    },
    // Aurum: polished gold bands.
    gold: (lat, _lon, p) => {
      const warp = (a(p.x * 2, p.y * 2, p.z * 2, 4) - 0.5) * 0.25;
      const band = Math.sin((lat + warp) * 16) * 0.5 + 0.5;
      const col = ramp([[0, [140, 92, 30]], [0.4, [214, 160, 60]], [0.75, [250, 214, 120]], [1, [255, 244, 200]]], band * 0.7 + b(p.x, p.y * 20, p.z, 3) * 0.3);
      return [...col, 0];
    },
    // Rosalia: coral and peach pastel giant.
    rose: (lat, _lon, p) => {
      const warp = (a(p.x * 2.5, p.y * 2.5, p.z * 2.5, 4) - 0.5) * 0.6;
      const band = Math.sin((lat + warp * 0.3) * 8) * 0.5 + 0.5;
      const col = ramp([[0, [190, 60, 110]], [0.4, [240, 120, 150]], [0.7, [255, 176, 170]], [1, [255, 226, 210]]], band * 0.65 + b(p.x * 3, p.y * 7, p.z * 3, 5) * 0.35);
      return [...col, 0];
    },
    // Aegis: dark indigo world wrapped in a glowing shield lattice.
    aegis: (lat, lon, p) => {
      const ground = a(p.x * 3, p.y * 3, p.z * 3, 5);
      let col = ramp([[0, [10, 12, 48]], [0.5, [26, 30, 96]], [1, [52, 60, 150]]], ground);
      // Hexagon-ish lattice from two sets of great-circle lines.
      const gx = Math.abs(Math.sin(lon * 9)), gy = Math.abs(Math.sin(lat * 9));
      const grid = Math.max(clamp01(1 - gx / 0.06), clamp01(1 - gy / 0.06)) * (0.5 + d(p.x * 2, p.y * 2, p.z * 2, 3) * 0.6);
      col = mix(col, [120, 170, 255], grid);
      return [...col, grid * 0.9];
    },
  };
}

const cache = new Map<PlanetKind, Uint8ClampedArray>();
let all: Record<PlanetKind, Sampler> | null = null;

/** RGBA texture (A = emission), TEX_W × TEX_H × 4, generated once per kind and cached. */
export function planetTexture(kind: PlanetKind): Uint8ClampedArray {
  const hit = cache.get(kind);
  if (hit) return hit;
  all ??= samplers();
  const sample = all[kind];
  const tex = new Uint8ClampedArray(TEX_W * TEX_H * 4);
  for (let y = 0; y < TEX_H; y++) {
    const lat = (0.5 - (y + 0.5) / TEX_H) * Math.PI;
    const cl = Math.cos(lat), sl = Math.sin(lat);
    for (let x = 0; x < TEX_W; x++) {
      const lon = ((x + 0.5) / TEX_W) * Math.PI * 2;
      const t = sample(lat, lon, { x: cl * Math.cos(lon), y: sl, z: cl * Math.sin(lon) });
      const i = (y * TEX_W + x) * 4;
      tex[i] = t[0];
      tex[i + 1] = t[1];
      tex[i + 2] = t[2];
      tex[i + 3] = clamp01(t[3]) * 255;
    }
  }
  cache.set(kind, tex);
  return tex;
}

/** Atmosphere colour drawn on the lit limb (null: airless). */
export const ATMOSPHERE: Record<PlanetKind, RGB | null> = {
  ember: [255, 120, 60],
  aurora: [210, 150, 255],
  ocean: [120, 230, 255],
  crystal: [190, 240, 255],
  jungle: [140, 255, 190],
  gold: [255, 220, 150],
  rose: [255, 180, 200],
  aegis: [120, 160, 255],
};

/** Worlds with rings. */
export const RINGED: ReadonlySet<PlanetKind> = new Set(["gold"]);
