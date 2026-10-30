/**
 * Procedural surfaces for Lumora's imaginary worlds. Each generator fills an
 * equirectangular RGBA texture: RGB is the surface colour, A is emission
 * (parts that glow on their own, also on the night side). Seeded noise is
 * sampled on the unit sphere, so the texture wraps seamlessly and the same
 * world always looks the same.
 */

export type PlanetKind = "ember" | "aurora" | "ocean" | "crystal" | "jungle" | "gold" | "rose" | "aegis";


type RGB = [number, number, number];
/** Colour, emission 0..1 and, optionally, specular strength 0..1 (shiny water, ice, metal). */
type Texel = [number, number, number, number, number?];

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
type Noise = ReturnType<typeof makeNoise>;
const smoothstep = (a: number, b: number, t: number) => {
  const k = clamp01((t - a) / (b - a));
  return k * k * (3 - 2 * k);
};

type Giant = {
  /** Bright zones (high ammonia clouds) and dark belts, from equator to mid-latitudes. */
  zone: RGB;
  belt: RGB;
  /** Deepest belt colour, seen in the darkest streaks. */
  deep: RGB;
  /** Colour of the poles, where banding gives way to mottled cyclones. */
  pole: RGB;
  /** The great storm: colour, centre (radians) and half-size (radians). */
  storm: { color: RGB; lat: number; lon: number; w: number; h: number };
  /** How strongly belts differ from zones (Saturn is subtle, Jupiter is not). */
  contrast: number;
  /** Seed offset so each giant has its own band layout. */
  seed: number;
  /** Optional north polar hexagon, like Saturn's. */
  hexagon?: boolean;
};

/**
 * A gas giant modelled on Jupiter (Juno and Cassini imagery): zones and
 * belts of uneven width with fairly crisp edges; streaky clouds stretched
 * along the zonal winds; eddies and scallops where neighbouring bands shear;
 * a chain of small white ovals; one great oval storm that the bands flow
 * around; banding that fades into darker, mottled poles. Colours stay muted:
 * real giants are far less saturated than they look in art.
 */
function giant(g: Giant, a: Noise, b: Noise, c: Noise, d: Noise): Sampler {
  const o = g.seed;
  return (lat, lon, p) => {
    // Storm geometry (also bends the bands around it).
    let dLon = lon - g.storm.lon;
    dLon -= Math.round(dLon / (Math.PI * 2)) * Math.PI * 2;
    const sx = (dLon * Math.cos(lat)) / g.storm.w;
    const sy = (lat - g.storm.lat) / g.storm.h;
    const sr = Math.hypot(sx, sy);
    const deflect = sr < 2.2 ? Math.exp(-sr * sr * 0.6) * Math.sign(sy || 1) * g.storm.h * 0.9 : 0;

    // Shear eddies: strongest near band edges, stretched along longitude.
    const eddy = (a(p.x * 7 + o, p.y * 16, p.z * 7, 5) - 0.5) * 0.1 + (d(p.x * 16 + o, p.y * 40, p.z * 16, 3) - 0.5) * 0.03;
    const l = lat + eddy + deflect;

    // Uneven band profile (about a dozen bands pole to pole, some faint), sharpened so belts have defined edges.
    const raw = 0.5 + 0.5 * Math.sin(l * 15 + o + 1.4 * Math.sin(l * 4.3 + o * 2));
    const strength = 0.55 + 0.45 * Math.sin(l * 5.1 + o * 3);
    const beltness = smoothstep(0.4, 0.6, raw) * strength;

    // Zonal streaks: noise stretched along longitude (slow in x/z, fast in y).
    const streak = b(p.x * 3 + o, p.y * 34, p.z * 3, 6);
    const fine = c(p.x * 14 + o, p.y * 70, p.z * 14, 3);
    let col = mix(g.zone, g.belt, beltness * g.contrast * 0.85);
    col = mix(col, g.deep, clamp01((streak - 0.55) * 2.6) * beltness * 0.8);
    col = mix(col, g.zone, clamp01((0.42 - streak) * 2) * (1 - beltness) * 0.6);
    const shade = 0.9 + (fine - 0.5) * 0.22 + (streak - 0.5) * 0.18;
    col = [col[0] * shade, col[1] * shade, col[2] * shade];

    // A string of small white ovals in the southern temperate belt.
    const spacing = (Math.PI * 2) / 11;
    let pLon = lon + o - spacing / 2;
    pLon -= Math.round(pLon / spacing) * spacing;
    const ovals = Math.exp(-(((pLon * Math.cos(lat)) / 0.03) ** 2) - ((lat + 0.68) / 0.022) ** 2);
    col = mix(col, [250, 246, 238], ovals * 0.85);

    // The great storm: swirling core, paler collar.
    if (sr < 1.6) {
      const ang = Math.atan2(sy, sx) + sr * 3;
      const swirl = a(Math.cos(ang) * sr * 3 + o, Math.sin(ang) * sr * 3, 7, 4);
      const core = smoothstep(1.05, 0.35, sr);
      const collar = smoothstep(1.5, 1.1, sr) * (1 - core);
      col = mix(col, g.storm.color, core * (0.75 + swirl * 0.35));
      col = mix(col, mix(g.zone, [255, 250, 240], 0.4), collar * 0.7);
    }

    // Poles: banding fades into darker, mottled cyclone fields.
    const polar = smoothstep(0.95, 1.35, Math.abs(lat));
    if (polar > 0) {
      const mottle = d(p.x * 9 + o, p.y * 9, p.z * 9, 5);
      const cyclones = smoothstep(0.62, 0.75, c(p.x * 16, p.y * 16 + o, p.z * 16, 3));
      col = mix(col, mix(g.pole, g.zone, cyclones * 0.5), polar * (0.7 + mottle * 0.3));
    }

    // Saturn's north polar hexagon.
    if (g.hexagon && lat > 1.1) {
      const r = Math.PI / 2 - lat;
      const seg = ((((lon % (Math.PI / 3)) + Math.PI / 3) % (Math.PI / 3)) - Math.PI / 6);
      const hex = (r * Math.cos(seg)) / Math.cos(Math.PI / 6);
      const line = 1 - smoothstep(0.012, 0.03, Math.abs(hex - 0.3));
      col = mix(col, g.deep, line * 0.55);
    }

    return [...col, 0, 0.04];
  };
}

function samplers(): Record<PlanetKind, Sampler> {
  const a = makeNoise(11);
  const b = makeNoise(29);
  const c = makeNoise(53);
  const d = makeNoise(97);

  const warp = (p: P, amount: number, freq = 1.6): P => ({
    x: p.x + (d(p.x * freq, p.y * freq, p.z * freq, 4) - 0.5) * amount,
    y: p.y + (d(p.x * freq + 31, p.y * freq + 17, p.z * freq + 5, 4) - 0.5) * amount,
    z: p.z + (d(p.x * freq + 11, p.y * freq + 47, p.z * freq + 29, 4) - 0.5) * amount,
  });
  /** Fine grain added on top of every surface: keeps close-ups crisp. */
  const grain = (p: P) => (c(p.x * 40, p.y * 40, p.z * 40, 2) - 0.5) * 0.1 + (a(p.x * 120, p.y * 120, p.z * 120, 2) - 0.5) * 0.06;

  return {
    // Ignis: black basalt split by glowing lava.
    ember: (_lat, _lon, p0) => {
      const p = warp(p0, 0.5);
      const rock = a(p.x * 3, p.y * 3, p.z * 3, 8) + grain(p0);
      const crack = Math.max(vein(b(p.x * 2.2, p.y * 2.2, p.z * 2.2, 7), 0.03), vein(c(p.x * 4.5, p.y * 4.5, p.z * 4.5, 6), 0.02) * 0.7);
      const base = ramp([[0, [22, 14, 12]], [0.5, [58, 34, 26]], [1, [96, 58, 40]]], rock);
      const lava = ramp([[0, [190, 40, 10]], [0.6, [255, 120, 20]], [1, [255, 226, 120]]], crack);
      const col = mix(base, lava, crack * 1.2);
      return [...col, crack * 0.95];
    },
    // Aurelia: a violet Jupiter, with a magenta great storm.
    aurora: giant(
      { zone: [214, 198, 236], belt: [118, 74, 168], deep: [70, 36, 110], pole: [92, 84, 140], storm: { color: [214, 82, 168], lat: -0.38, lon: 2.2, w: 0.42, h: 0.17 }, contrast: 0.95, seed: 1.3 },
      a, b, c, d,
    ),
    // Thalassa: teal ocean world with coral islands and clouds.
    ocean: (lat, _lon, p0) => {
      const p = warp(p0, 0.6);
      const land = a(p.x * 2.2, p.y * 2.2, p.z * 2.2, 8) + grain(p0) * 0.4;
      let col: RGB =
        land > 0.6
          ? ramp([[0, [214, 196, 146]], [0.15, [128, 168, 96]], [0.5, [64, 120, 76]], [0.85, [120, 110, 92]], [1, [210, 210, 214]]], (land - 0.6) / 0.4 + grain(p0))
          : ramp([[0, [4, 34, 62]], [0.6, [8, 96, 132]], [0.9, [24, 168, 176]], [1, [120, 220, 210]]], land / 0.6);
      if (Math.abs(lat) > 1.32 - grain(p0)) col = mix(col, [236, 246, 250], 0.9);
      // Open water shines, land does not.
      return [...col, 0, land > 0.6 ? 0.02 : 0.9];
    },
    // Cryo: pale crystal ice with luminous fractures.
    crystal: (_lat, _lon, p0) => {
      const p = warp(p0, 0.35, 2.4);
      const facet = a(p.x * 5, p.y * 5, p.z * 5, 5) + grain(p0);
      const fracture = Math.max(vein(b(p.x * 3, p.y * 3, p.z * 3, 7), 0.022), vein(c(p.x * 7, p.y * 7, p.z * 7, 5), 0.015) * 0.6);
      const col = mix(ramp([[0, [140, 190, 230]], [0.5, [200, 230, 250]], [1, [250, 254, 255]]], facet), [120, 240, 255], fracture);
      return [...col, fracture * 0.8, 0.45];
    },
    // Silva: emerald jungle crossed by bioluminescent rivers.
    jungle: (_lat, _lon, p0) => {
      const p = warp(p0, 0.5);
      const canopy = a(p.x * 3.5, p.y * 3.5, p.z * 3.5, 8) + grain(p0);
      const river = vein(b(p.x * 1.8, p.y * 1.8, p.z * 1.8, 7), 0.022);
      let col = ramp([[0, [8, 60, 36]], [0.45, [26, 120, 62]], [0.75, [72, 176, 84]], [1, [160, 220, 110]]], canopy);
      const mist = c(p.x * 4, p.y * 4, p.z * 4, 4);
      col = mix(col, [220, 255, 230], Math.max(0, (mist - 0.65) * 2));
      col = mix(col, [120, 255, 200], river);
      return [...col, river * 0.85, 0.04 + river * 0.6];
    },
    // Aurum: a golden Saturn: subtle butterscotch bands and the polar hexagon.
    gold: giant(
      { zone: [246, 222, 168], belt: [198, 152, 84], deep: [150, 104, 50], pole: [170, 160, 140], storm: { color: [255, 238, 200], lat: 0.62, lon: 4.1, w: 0.16, h: 0.07 }, contrast: 0.55, seed: 4.7, hexagon: true },
      a, b, c, d,
    ),
    // Rosalia: a coral Jupiter with a cream great storm.
    rose: giant(
      { zone: [252, 222, 206], belt: [214, 112, 120], deep: [150, 60, 82], pole: [170, 130, 150], storm: { color: [196, 70, 70], lat: -0.4, lon: 5.2, w: 0.38, h: 0.15 }, contrast: 0.85, seed: 2.9 },
      a, b, c, d,
    ),
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

export type PlanetTexture = {
  w: number;
  h: number;
  /** RGBA, A = emission. */
  rgba: Uint8ClampedArray;
  /** Specular strength per texel. */
  spec: Uint8ClampedArray;
  /** Cloud density per texel, drawn as a separate, faster-moving layer (null: no clouds). */
  clouds: Uint8ClampedArray | null;
};

/** Worlds with a weather layer, and how cloudy they are. */
const CLOUDS: Partial<Record<PlanetKind, { cover: number; stretch: number }>> = {
  ocean: { cover: 0.52, stretch: 3 },
  jungle: { cover: 0.6, stretch: 2.2 },
  crystal: { cover: 0.66, stretch: 4 },
  aegis: { cover: 0.68, stretch: 2 },
};

/** Relief strength: rocky worlds get deep shading, gas giants stay smooth. */
const RELIEF: Record<PlanetKind, number> = {
  ember: 3.2,
  aurora: 0.5,
  ocean: 1.6,
  crystal: 2.6,
  jungle: 2.4,
  gold: 0.4,
  rose: 0.5,
  aegis: 1.8,
};

let all: Record<PlanetKind, Sampler> | null = null;

/**
 * Builds the texture of a world (pure computation, no DOM). Runs inside a
 * Web Worker so the page never stutters; the relief pass bakes subtle shading
 * from the surface's own brightness so craters, ridges and coasts read as 3D.
 */
export function generateTexture(kind: PlanetKind, w: number): PlanetTexture {
  const h = w / 2;
    all ??= samplers();
    const sample = all[kind];
    const rgba = new Uint8ClampedArray(w * h * 4);
    const spec = new Uint8ClampedArray(w * h);
    const lum = new Float32Array(w * h);
    const cloudCfg = CLOUDS[kind];
    const clouds = cloudCfg ? new Uint8ClampedArray(w * h) : null;
    const cn = makeNoise(71);
    const cw = makeNoise(83);
    for (let y = 0; y < h; y++) {
      const lat = (0.5 - (y + 0.5) / h) * Math.PI;
      const cl = Math.cos(lat), sl = Math.sin(lat);
      for (let x = 0; x < w; x++) {
        const lon = ((x + 0.5) / w) * Math.PI * 2;
        const t = sample(lat, lon, { x: cl * Math.cos(lon), y: sl, z: cl * Math.sin(lon) });
        const i = y * w + x;
        rgba[i * 4] = t[0];
        rgba[i * 4 + 1] = t[1];
        rgba[i * 4 + 2] = t[2];
        rgba[i * 4 + 3] = clamp01(t[3]) * 255;
        spec[i] = clamp01(t[4] ?? 0.06) * 255;
        lum[i] = (t[0] * 0.3 + t[1] * 0.59 + t[2] * 0.11) / 255;
        if (clouds && cloudCfg) {
          const px = cl * Math.cos(lon), pz = cl * Math.sin(lon);
          // Warped, latitude-stretched noise: long streaks like real weather systems.
          const wx = (cw(px * 2, sl * 2, pz * 2, 3) - 0.5) * 0.8;
          const v = cn(px * 3 + wx, sl * 3 * cloudCfg.stretch, pz * 3 + wx, 7);
          clouds[i] = clamp01((v - cloudCfg.cover) * 3.2) * 255;
        }
      }
    }
    // Relief: light comes from the upper left, so a surface rising to the right is darker.
    const k = RELIEF[kind];
    for (let y = 1; y < h - 1; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const dx = lum[y * w + ((x + 1) % w)] - lum[y * w + ((x - 1 + w) % w)];
        const dy = lum[(y + 1) * w + x] - lum[(y - 1) * w + x];
        const relief = 1 - (dx * 0.8 + dy * 0.5) * k;
        if (rgba[i * 4 + 3] > 40) continue; // glowing parts are not shaded
        rgba[i * 4] *= relief;
        rgba[i * 4 + 1] *= relief;
        rgba[i * 4 + 2] *= relief;
      }
    }
    return { w, h, rgba, spec, clouds };
}

const cache = new Map<string, Promise<PlanetTexture>>();
type Pending = { resolve: (t: PlanetTexture) => void };
let pool: Worker[] | null = null;
let nextWorker = 0;
let seq = 0;
const pending = new Map<number, Pending>();

function workers(): Worker[] | null {
  if (pool || typeof window === "undefined" || typeof Worker === "undefined") return pool;
  try {
    const count = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 2) - 1));
    pool = Array.from({ length: count }, () => {
      const w = new Worker(new URL("./texture-worker.ts", import.meta.url));
      w.onmessage = (e: MessageEvent<{ id: number; texture: PlanetTexture }>) => {
        pending.get(e.data.id)?.resolve(e.data.texture);
        pending.delete(e.data.id);
      };
      return w;
    });
  } catch {
    pool = null;
  }
  return pool;
}

/** Texture of a world at a given width: generated once in a worker, then cached. */
export function loadPlanetTexture(kind: PlanetKind, width: number): Promise<PlanetTexture> {
  const key = `${kind}:${width}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const ws = workers();
  const job = ws
    ? new Promise<PlanetTexture>((resolve) => {
        const id = ++seq;
        pending.set(id, { resolve });
        ws[nextWorker++ % ws.length].postMessage({ id, kind, width });
      })
    : new Promise<PlanetTexture>((resolve) => setTimeout(() => resolve(generateTexture(kind, width)), 0));
  cache.set(key, job);
  return job;
}

/** Limb darkening exponent: gas giants fade strongly towards the edge, rocky worlds barely. */
export const LIMB: Record<PlanetKind, number> = {
  ember: 0.15,
  aurora: 0.55,
  ocean: 0.25,
  crystal: 0.15,
  jungle: 0.25,
  gold: 0.5,
  rose: 0.55,
  aegis: 0.25,
};

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
