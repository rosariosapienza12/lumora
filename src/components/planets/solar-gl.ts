import { ATMOSPHERE, LIMB, RINGED, type PlanetKind, type PlanetTexture } from "./textures";

/**
 * The homepage solar system in real 3D, on one WebGL2 canvas.
 *
 * Planets are sphere impostors: each is a screen-space quad whose fragment
 * shader rebuilds the sphere's surface, turns it into the planet's own frame
 * (camera pitch, axial tilt, spin) and samples the procedural equirectangular
 * textures with proper mip levels across the date line. Light comes from the
 * sun's real position, so planets show phases: full behind the sun, crescents
 * in front, with an atmosphere that glows when back-lit. Ringed worlds
 * intersect their ring plane per pixel, with the planet's shadow on the rings
 * and the rings' shadow on the planet. The sun is a granulated, limb-darkened
 * disc with a living corona. Orbits are anti-aliased ribbons in perspective.
 */

export type PlanetDraw = {
  kind: PlanetKind;
  /** Centre and radius in CSS pixels. */
  x: number;
  y: number;
  r: number;
  /** Direction towards the sun, in view space (x right, y up, z towards the viewer). */
  light: [number, number, number];
  /** Rotation of the surface, in turns. */
  phase: number;
  tilt: number;
  hover: number;
  glow: [number, number, number];
  /** 0-1: planets dragged behind the hero text fade out. */
  fade: number;
  /** Half side of the drawn square, in planet radii (default: room for the halo or the rings). */
  extent?: number;
};

export type OrbitDraw = { points: Float32Array; alphas: Float32Array; color: [number, number, number]; width: number; alpha: number };

export type Frame = {
  w: number;
  h: number;
  dpr: number;
  time: number;
  /** World → view rotation (column-major 3×3). */
  view: Float32Array;
  sun: { x: number; y: number; r: number };
  /** Back-to-front lists. */
  back: PlanetDraw[];
  front: PlanetDraw[];
  orbitsBack: OrbitDraw[];
  orbitsFront: OrbitDraw[];
};

const QUAD_VS = `#version 300 es
in vec2 aPos;
uniform vec2 uCenter; uniform float uRadius; uniform float uExtent; uniform vec2 uRes;
out vec2 vUv;
void main(){
  vUv = aPos * uExtent;
  vec2 px = uCenter + vec2(aPos.x, -aPos.y) * uRadius * uExtent;
  gl_Position = vec4(px / uRes * 2.0 - 1.0, 0.0, 1.0);
  gl_Position.y = -gl_Position.y;
}`;

const COMMON = `
vec3 aces(vec3 x){return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0);}
float hash(vec3 p){p=fract(p*0.3183099+.1);p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 x){vec3 i=floor(x);vec3 f=fract(x);f=f*f*(3.0-2.0*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float s=0.0,a=0.5;for(int i=0;i<5;i++){s+=a*noise(p);p*=2.03;a*=0.5;}return s;}
`;

const PLANET_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform sampler2D uTex, uAux;
uniform float uHasTex, uPhase, uCloudPhase, uTilt, uLimb, uRinged, uHover, uRadius, uExtent, uAtmoOn, uFade;
uniform vec3 uL, uAtmo, uBase, uGlow;
uniform mat3 uCamInv;
uniform float uAxisX;
${COMMON}
// Axial tilt: towards the viewer (uAxisX, opens the rings) and sideways (uTilt).
vec3 toBody(vec3 v){
  vec3 w = uCamInv * v;
  float ca=cos(uAxisX), sa=sin(uAxisX);
  w = vec3(w.x, ca*w.y - sa*w.z, sa*w.y + ca*w.z);
  float c=cos(uTilt), s=sin(uTilt);
  return vec3(c*w.x+s*w.y, -s*w.x+c*w.y, w.z);
}
vec4 eq(sampler2D t, vec3 b, float phase){
  vec2 uv = vec2(atan(b.z, b.x)/6.2831853 + 0.5 + phase, 0.5 - asin(clamp(b.y,-1.0,1.0))/3.14159265);
  vec2 uv2 = vec2(fract(uv.x + 0.5), uv.y);
  vec2 dx = dFdx(uv), dy = dFdy(uv), dx2 = dFdx(uv2), dy2 = dFdy(uv2);
  if (abs(dx2.x) < abs(dx.x)) dx.x = dx2.x;
  if (abs(dy2.x) < abs(dy.x)) dy.x = dy2.x;
  // A sharper level than strict filtering (the bands and craters keep their contrast), still without shimmer.
  return textureGrad(t, uv, dx * 0.45, dy * 0.45);
}
// fw: how much of the ring one pixel covers. Fine ringlets blend into their average when they would alias.
vec4 ring(float r, float fw){
  if (r < 1.2 || r > 2.02) return vec4(0.0);
  float t = (r - 1.2) / 0.82;
  vec3 c = t < 0.4 ? mix(vec3(1.0,0.86,0.63), vec3(1.0,0.73,0.77), t/0.4)
         : t < 0.7 ? mix(vec3(1.0,0.73,0.77), vec3(0.75,0.66,1.0), (t-0.4)/0.3)
         : mix(vec3(0.75,0.66,1.0), vec3(0.59,0.9,0.93), (t-0.7)/0.3);
  // When the ringlets are too fine for the pixels, a fuller average keeps small rings visible.
  float fine = mix(0.55 + 0.45*sin(r*97.0)*sin(r*41.0), 0.85, smoothstep(0.02, 0.07, fw));
  float band = exp(-pow((r-1.45)/0.22, 2.0))*0.5 + 0.35;
  float gap = mix(1.0, 0.08, smoothstep(0.035 + fw, 0.035 - fw, abs(r-1.6)));
  float edge = clamp(min((r-1.2)/max(0.08, fw), (2.02-r)/max(0.12, fw)), 0.0, 1.0);
  return vec4(c, fine*band*gap*edge*0.9);
}
void main(){
  vec2 p = vUv;
  float d2 = dot(p,p);
  float d = sqrt(d2);
  vec3 Lb = toBody(uL);
  vec4 sphere = vec4(0.0);
  float tS = 1e9;
  if (d < 1.0 + 1.5/uRadius) {
    float dc = min(d, 0.9999);
    vec3 n = vec3(d > 0.0 ? p/d*dc : p, sqrt(1.0 - dc*dc));
    tS = 4.0 - n.z;
    vec3 b = toBody(n);
    // Lit in the texture's own colour space, like the 2D renderer: the procedural colours stay rich.
    vec4 tx = uHasTex > 0.5 ? eq(uTex, b, uPhase) : vec4(uBase, 0.0);
    vec3 albedo = tx.rgb;
    float emis = tx.a;
    float spec = uHasTex > 0.5 ? eq(uAux, b, uPhase).r : 0.06;
    float cloud = uHasTex > 0.5 ? eq(uAux, b, uCloudPhase).g : 0.0;
    float cshadow = uHasTex > 0.5 ? eq(uAux, b, uCloudPhase + 0.006).g : 0.0;
    float ndl = dot(n, uL);
    float key = pow(max(0.0, (ndl + 0.08) / 1.08), 0.9);
    // Rings cast their shadow on the planet.
    if (uRinged > 0.5 && abs(Lb.y) > 1e-3) {
      float t = -b.y / Lb.y;
      if (t > 0.0) key *= 1.0 - ring(length((b + Lb*t).xz), 0.01).a * 0.85;
    }
    // Soft fill from the viewer: the night side stays readable, the phase still shows.
    float fill = max(0.0, dot(n, normalize(vec3(-0.3, 0.45, 0.85)))) * 0.3;
    float limb = pow(max(n.z, 0.0), uLimb);
    vec3 surf = mix(albedo * (1.0 - cshadow*0.45), vec3(0.98, 0.99, 1.0), cloud*0.92);
    vec3 col = surf * (0.03 + key*0.92 + fill) * limb;
    vec3 h = normalize(uL + vec3(0.0, 0.0, 1.0));
    col += vec3(1.0, 0.95, 0.85) * pow(max(dot(n, h), 0.0), 70.0) * spec * (1.0 - cloud) * 0.32 * step(0.0, ndl)
      + vec3(1.0, 0.95, 0.85) * pow(max(dot(n, h), 0.0), 14.0) * spec * (1.0 - cloud) * 0.06;
    col += albedo * emis * 1.1 * (1.0 - 0.6*key);
    if (uAtmoOn > 0.5) {
      float rim = pow(1.0 - n.z, 2.4);
      float scatter = clamp(ndl + 0.4, 0.0, 1.0) + pow(max(0.0, -uL.z), 2.0) * 1.1;
      col += uAtmo * rim * scatter * 0.6;
      col += vec3(1.0, 0.55, 0.35) * 0.22 * smoothstep(0.22, 0.0, abs(ndl)) * smoothstep(-0.2, 0.1, ndl);
    }
    col = clamp(col, 0.0, 1.0);
    float a = clamp((1.0 - d) * uRadius + 0.5, 0.0, 1.0);
    sphere = vec4(col * a, a);
  }
  vec4 rcol = vec4(0.0);
  float tR = 1e9;
  if (uRinged > 0.5) {
    vec3 ob = toBody(vec3(p, 4.0));
    vec3 db = toBody(vec3(0.0, 0.0, -1.0));
    if (abs(db.y) > 1e-4) {
      float t = -ob.y / db.y;
      vec3 q = ob + db * t;
      float rq = length(q.xz);
      vec4 rg = ring(rq, fwidth(rq));
      if (rg.a > 0.0) {
        tR = t;
        float bq = dot(q, Lb), cq = dot(q, q) - 1.0, disc = bq*bq - cq;
        float shadow = (disc > 0.0 && -bq - sqrt(disc) > 0.0) ? 0.12 : 1.0;
        // Ice scatters light through the rings: they stay readable even when the sun grazes them edge-on.
        float through = pow(max(0.0, dot(normalize(db), Lb)), 4.0) * 0.6;
        vec3 c = clamp(rg.rgb * (abs(Lb.y) * 0.35 + 0.8 + through) * shadow, 0.0, 1.0);
        rcol = vec4(c * rg.a, rg.a);
      }
    }
  }
  vec4 res = tR < tS ? rcol + sphere * (1.0 - rcol.a) : sphere + rcol * (1.0 - sphere.a);
  // Atmosphere beyond the edge: brighter on the sun's side, a full ring of light when back-lit.
  if (uAtmoOn > 0.5 && d > 1.0) {
    float dist = d - 1.0;
    // Only the lit limb glows (no outline on the night side), and the glow starts soft at the edge.
    float side = clamp(dot(p/d, normalize(uL.xy + 1e-5)) * length(uL.xy) + 0.1, 0.0, 1.0);
    float back = pow(max(0.0, -uL.z), 1.5) * 1.1;
    // Fades to nothing at the edge of the square, so the glow is never cut.
    float edgeFade = clamp(1.0 - dist / (uExtent - 1.0), 0.0, 1.0);
    res.rgb += uAtmo * exp(-dist * 7.0) * (side * side + back) * 0.5 * (1.0 - res.a) * edgeFade * edgeFade;
  }
  // Hover: a thin ring of the feature's colour.
  if (uHover > 0.0) {
    float ringd = abs(d - 1.16);
    res.rgb += uGlow * uHover * (smoothstep(0.035, 0.0, ringd) * 0.9 + exp(-max(d - 1.0, 0.0) * 6.0) * 0.18) * (1.0 - res.a);
  }
  o = res * uFade;
}`;

const SUN_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform float uTime, uRadius;
${COMMON}
void main(){
  vec2 p = vUv;
  float d = length(p);
  float ang = atan(p.y, p.x);
  // Corona: soft glow plus slow streamers.
  float streak = fbm(vec3(cos(ang)*2.2, sin(ang)*2.2, uTime*0.05)) ;
  float corona = exp(-(d - 1.0) * 2.4) * (0.55 + 0.9*pow(streak, 2.0)) + 0.5 / (1.0 + d*d*2.5);
  vec3 cc = mix(vec3(1.0, 0.45, 0.12), vec3(1.0, 0.78, 0.4), exp(-(d-1.0)*3.0)) * corona * 0.9;
  if (d > 1.0) { o = vec4(pow(aces(cc), vec3(1.0/2.2)) * smoothstep(4.2, 1.0, d), 0.0); return; }
  vec3 n = vec3(p, sqrt(1.0 - d*d));
  float c = cos(uTime*0.02), s = sin(uTime*0.02);
  vec3 q = vec3(c*n.x + s*n.z, n.y, -s*n.x + c*n.z);
  float gran = fbm(q*9.0 + uTime*0.03);
  float cells = fbm(q*26.0 - uTime*0.05);
  float mu = n.z;
  vec3 col = mix(vec3(0.85, 0.22, 0.04), vec3(1.0, 0.62, 0.2), smoothstep(0.0, 0.45, mu));
  col = mix(col, vec3(1.0, 0.95, 0.78), smoothstep(0.4, 1.0, mu));
  col *= 0.78 + 0.32*gran + 0.12*cells;
  col *= 2.1;
  col = pow(aces(col), vec3(1.0/2.2));
  float a = clamp((1.0 - d) * uRadius + 0.5, 0.0, 1.0);
  o = vec4(col * a + pow(aces(cc), vec3(1.0/2.2)) * (1.0 - a), a);
}`;

const LINE_VS = `#version 300 es
in vec2 aPos; in float aEdge; in float aAlpha;
uniform vec2 uRes;
out float vEdge; out float vAlpha;
void main(){ vEdge = aEdge; vAlpha = aAlpha; vec2 c = aPos / uRes * 2.0 - 1.0; gl_Position = vec4(c.x, -c.y, 0.0, 1.0); }`;

const LINE_FS = `#version 300 es
precision highp float;
in float vEdge; in float vAlpha;
uniform vec3 uColor; uniform float uHalf, uAlpha;
out vec4 o;
void main(){ float a = clamp(uHalf - abs(vEdge) + 0.5, 0.0, 1.0) * vAlpha * uAlpha; o = vec4(uColor * a, a); }`;

type Prog = { p: WebGLProgram; u: (name: string) => WebGLUniformLocation | null };

/** Extra lean of a ringed planet's axis towards the viewer, in radians. */
const RING_LEAN = 0.3;

const hexRgb = (c: [number, number, number]) => c.map((v) => v / 255) as [number, number, number];

export class SolarGL {
  private gl: WebGL2RenderingContext;
  private planet: Prog;
  private sun: Prog;
  private line: Prog;
  private quad: WebGLBuffer;
  private lineBuf: WebGLBuffer;
  private vaoQuad: WebGLVertexArrayObject;
  private vaoLine: WebGLVertexArrayObject;
  private tex = new Map<PlanetKind, { rgba: WebGLTexture; aux: WebGLTexture; w: number }>();

  static create(canvas: HTMLCanvasElement): SolarGL | null {
    try {
      const gl = canvas.getContext("webgl2", { premultipliedAlpha: true, alpha: true, antialias: false });
      return gl ? new SolarGL(gl) : null;
    } catch (err) {
      console.error("Lumora: sistema solare 3D non disponibile", err);
      return null;
    }
  }

  private constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.planet = this.program(QUAD_VS, PLANET_FS);
    this.sun = this.program(QUAD_VS, SUN_FS);
    this.line = this.program(LINE_VS, LINE_FS);
    this.quad = gl.createBuffer()!;
    this.vaoQuad = gl.createVertexArray()!;
    gl.bindVertexArray(this.vaoQuad);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    for (const prog of [this.planet, this.sun]) {
      const loc = gl.getAttribLocation(prog.p, "aPos");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    }
    this.lineBuf = gl.createBuffer()!;
    this.vaoLine = gl.createVertexArray()!;
    gl.bindVertexArray(this.vaoLine);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.lineBuf);
    const stride = 4 * 4;
    const attr = (name: string, size: number, offset: number) => {
      const loc = gl.getAttribLocation(this.line.p, name);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride, offset);
    };
    attr("aPos", 2, 0);
    attr("aEdge", 1, 8);
    attr("aAlpha", 1, 12);
    gl.bindVertexArray(null);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }

  private program(vs: string, fs: string): Prog {
    const gl = this.gl;
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`shader: ${gl.getShaderInfoLog(s) || (gl.isContextLost() ? "context lost" : "?")}`);
      return s;
    };
    const p = gl.createProgram()!;
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? "link");
    const cache = new Map<string, WebGLUniformLocation | null>();
    return { p, u: (n) => (cache.has(n) ? cache.get(n)! : (cache.set(n, gl.getUniformLocation(p, n)), cache.get(n)!)) };
  }

  /** Width of the texture a planet currently has (0: none yet). */
  textureWidth(kind: PlanetKind) {
    return this.tex.get(kind)?.w ?? 0;
  }

  /** Uploads (or replaces with a sharper one) a planet's surface and its gloss/cloud map. */
  setTexture(kind: PlanetKind, t: PlanetTexture) {
    const gl = this.gl;
    const old = this.tex.get(kind);
    if (old && old.w >= t.w) return;
    const make = (data: Uint8Array | Uint8ClampedArray) => {
      const tx = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tx);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, t.w, t.h, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.generateMipmap(gl.TEXTURE_2D);
      return tx;
    };
    const aux = new Uint8Array(t.w * t.h * 4);
    for (let i = 0; i < t.w * t.h; i++) {
      aux[i * 4] = t.spec[i];
      aux[i * 4 + 1] = t.clouds ? t.clouds[i] : 0;
      aux[i * 4 + 3] = 255;
    }
    const entry = { rgba: make(t.rgba), aux: make(aux), w: t.w };
    if (old) {
      gl.deleteTexture(old.rgba);
      gl.deleteTexture(old.aux);
    }
    this.tex.set(kind, entry);
  }

  render(f: Frame) {
    const gl = this.gl;
    const canvas = gl.canvas as HTMLCanvasElement;
    const W = Math.round(f.w * f.dpr);
    const H = Math.round(f.h * f.dpr);
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const res = [W, H] as const;
    const s = f.dpr;

    for (const o of f.orbitsBack) this.drawOrbit(o, res, s);
    for (const p of f.back) this.drawPlanet(p, f, res, s);
    this.drawSun(f, res, s);
    for (const o of f.orbitsFront) this.drawOrbit(o, res, s);
    for (const p of f.front) this.drawPlanet(p, f, res, s);
  }

  private drawOrbit(o: OrbitDraw, res: readonly [number, number], s: number) {
    const gl = this.gl;
    const n = o.points.length / 2;
    if (n < 2) return;
    const half = (o.width * s) / 2;
    const reach = half + 1;
    const data = new Float32Array(n * 2 * 4);
    for (let i = 0; i < n; i++) {
      const a = Math.max(0, i - 1);
      const b = Math.min(n - 1, i + 1);
      let dx = o.points[b * 2] - o.points[a * 2];
      let dy = o.points[b * 2 + 1] - o.points[a * 2 + 1];
      const len = Math.hypot(dx, dy) || 1;
      dx /= len;
      dy /= len;
      const x = o.points[i * 2] * s;
      const y = o.points[i * 2 + 1] * s;
      for (const side of [-1, 1]) {
        const k = (i * 2 + (side > 0 ? 1 : 0)) * 4;
        data[k] = x - dy * reach * side;
        data[k + 1] = y + dx * reach * side;
        data[k + 2] = reach * side;
        data[k + 3] = o.alphas[i];
      }
    }
    gl.useProgram(this.line.p);
    gl.bindVertexArray(this.vaoLine);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.lineBuf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
    gl.uniform2f(this.line.u("uRes"), res[0], res[1]);
    gl.uniform3fv(this.line.u("uColor"), o.color);
    gl.uniform1f(this.line.u("uHalf"), half);
    gl.uniform1f(this.line.u("uAlpha"), o.alpha);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, n * 2);
  }

  private drawSun(f: Frame, res: readonly [number, number], s: number) {
    const gl = this.gl;
    const { p, u } = this.sun;
    gl.useProgram(p);
    gl.bindVertexArray(this.vaoQuad);
    gl.uniform2f(u("uRes"), res[0], res[1]);
    gl.uniform2f(u("uCenter"), f.sun.x * s, f.sun.y * s);
    gl.uniform1f(u("uRadius"), f.sun.r * s);
    gl.uniform1f(u("uExtent"), 4.2);
    gl.uniform1f(u("uTime"), f.time);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  private drawPlanet(pl: PlanetDraw, f: Frame, res: readonly [number, number], s: number) {
    const gl = this.gl;
    const { p, u } = this.planet;
    const ringed = RINGED.has(pl.kind);
    const atmo = ATMOSPHERE[pl.kind];
    const tex = this.tex.get(pl.kind);
    gl.useProgram(p);
    gl.bindVertexArray(this.vaoQuad);
    gl.uniform2f(u("uRes"), res[0], res[1]);
    gl.uniform2f(u("uCenter"), pl.x * s, pl.y * s);
    gl.uniform1f(u("uRadius"), pl.r * s);
    gl.uniform1f(u("uExtent"), pl.extent ?? (ringed ? 2.1 : 1.4));
    gl.uniform3fv(u("uL"), pl.light);
    gl.uniform1f(u("uPhase"), pl.phase);
    gl.uniform1f(u("uCloudPhase"), pl.phase * 1.25);
    gl.uniform1f(u("uTilt"), pl.tilt);
    // Ringed worlds lean towards the viewer, so the far side of the rings shows above the planet.
    // The rings open by (camera pitch + lean): leaning the north pole towards the camera.
    gl.uniform1f(u("uAxisX"), ringed ? -RING_LEAN : 0);
    gl.uniform1f(u("uLimb"), LIMB[pl.kind]);
    gl.uniform1f(u("uRinged"), ringed ? 1 : 0);
    gl.uniform1f(u("uHover"), pl.hover);
    gl.uniform1f(u("uFade"), pl.fade);
    gl.uniform1f(u("uAtmoOn"), atmo ? 1 : 0);
    gl.uniform3fv(u("uAtmo"), atmo ? hexRgb(atmo) : [0, 0, 0]);
    gl.uniform3fv(u("uBase"), pl.glow);
    gl.uniform3fv(u("uGlow"), pl.glow);
    // View → world is the transpose of world → view.
    const v = f.view;
    gl.uniformMatrix3fv(u("uCamInv"), false, [v[0], v[3], v[6], v[1], v[4], v[7], v[2], v[5], v[8]]);
    gl.uniform1f(u("uHasTex"), tex ? 1 : 0);
    if (tex) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex.rgba);
      gl.uniform1i(u("uTex"), 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, tex.aux);
      gl.uniform1i(u("uAux"), 1);
    }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /** One planet alone, centred in a size×size picture (the planet tour). */
  renderSingle(size: number, p: PlanetDraw, view: Float32Array) {
    const gl = this.gl;
    const canvas = gl.canvas as HTMLCanvasElement;
    if (canvas.width !== size || canvas.height !== size) {
      canvas.width = size;
      canvas.height = size;
    }
    gl.viewport(0, 0, size, size);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    this.drawPlanet(p, { view } as Frame, [size, size], 1);
  }

  /** The drawing canvas (for copying a rendered planet elsewhere). */
  get canvas() {
    return this.gl.canvas as HTMLCanvasElement;
  }

  destroy() {
    const gl = this.gl;
    for (const t of this.tex.values()) {
      gl.deleteTexture(t.rgba);
      gl.deleteTexture(t.aux);
    }
    this.tex.clear();
    for (const prog of [this.planet, this.sun, this.line]) gl.deleteProgram(prog.p);
    gl.deleteBuffer(this.quad);
    gl.deleteBuffer(this.lineBuf);
    // The context itself is kept: the same canvas may be set up again (React re-runs effects in development).
  }
}

let shared: SolarGL | null | undefined;

/** One renderer for every planet of the tour: browsers allow only a few WebGL contexts per page. */
export function sharedPlanetGL(): SolarGL | null {
  if (shared === undefined) shared = typeof document === "undefined" ? null : SolarGL.create(document.createElement("canvas"));
  return shared;
}
