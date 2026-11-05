import { FORMS_3D, MATERIALS_3D, type Form3D, type Material3D } from "./ids";

/**
 * Lumora's 3D renderer: a WebGL ray marcher written for this site, no
 * libraries. Every object is a signed distance field lit like a product shot
 * in a photo studio (two soft boxes, a rim light, soft shadows, ambient
 * occlusion), with physically inspired materials: glass refracts through the
 * whole object, chrome and metal reflect the studio, clay and plaster scatter
 * light, iridescent surfaces shift hue with the viewing angle. Outside the
 * object the picture is transparent except for a soft shadow on an invisible
 * floor, so objects sit on any page.
 *
 * One WebGL context is shared by the whole page (browsers allow only a few):
 * each call draws an object and copies the pixels into the caller's own 2D
 * canvas, so a page can hold any number of objects and thumbnails.
 */

export type Render3D = {
  form: Form3D;
  material: Material3D;
  color: string;
  color2?: string;
  /** Tilt around the horizontal and vertical axes, in degrees. */
  tiltX: number;
  tiltY: number;
  /** Direction the key light comes from, in degrees around the object (0 = top left). */
  light: number;
  /** Seconds, for animated objects (blob ripples, spin is in tiltY). */
  time?: number;
};

const VERT = `attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`;

const FRAG = `precision highp float;
uniform vec2 uRes;
uniform float uForm, uMat, uTime;
uniform vec3 uCol, uCol2, uLight;
uniform mat3 uRot;

float hash(vec3 p){p=fract(p*0.3183099+.1);p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 x){vec3 i=floor(x);vec3 f=fract(x);f=f*f*(3.0-2.0*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float sdTorus(vec3 p,vec2 t){vec2 q=vec2(length(p.xz)-t.x,p.y);return length(q)-t.y;}
float sdRoundBox(vec3 p,vec3 b,float r){vec3 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.)-r;}
float sdCapsule(vec3 p,float h,float r){p.y-=clamp(p.y,-h,h);return length(p)-r;}
float sdCyl(vec3 p,float h,float r,float rr){vec2 d=abs(vec2(length(p.xz),p.y))-vec2(r-rr,h-rr);return min(max(d.x,d.y),0.)+length(max(d,0.))-rr;}
float sdCone(vec3 p,float h,float r1,float r2){vec2 q=vec2(length(p.xz),p.y);vec2 k1=vec2(r2,h);vec2 k2=vec2(r2-r1,2.0*h);
  vec2 ca=vec2(q.x-min(q.x,(q.y<0.0)?r1:r2),abs(q.y)-h);vec2 cb=q-k1+k2*clamp(dot(k1-q,k2)/dot(k2,k2),0.0,1.0);
  float s=(cb.x<0.0&&ca.y<0.0)?-1.0:1.0;return s*sqrt(min(dot(ca,ca),dot(cb,cb)));}
float sdOcta(vec3 p,float s){p=abs(p);return (p.x+p.y+p.z-s)*0.57735027;}
float sdPyramid(vec3 p,float h){float m2=h*h+0.25;p.xz=abs(p.xz);p.xz=(p.z>p.x)?p.zx:p.xz;p.xz-=0.5;
  vec3 q=vec3(p.z,h*p.y-0.5*p.x,h*p.x+0.5*p.y);float s=max(-q.x,0.0);float t=clamp((q.y-0.5*p.z)/(m2+0.25),0.0,1.0);
  float a=m2*(q.x+s)*(q.x+s)+q.y*q.y;float b=m2*(q.x+0.5*t)*(q.x+0.5*t)+(q.y-m2*t)*(q.y-m2*t);
  float d2=min(q.y,-q.x*m2-q.y*0.5)>0.0?0.0:min(a,b);return sqrt((d2+q.z*q.z)/m2)*sign(max(q.z,-p.y));}
float sdRoundCone(vec3 p,float r1,float r2,float h){float b=(r1-r2)/h;float a=sqrt(1.0-b*b);vec2 q=vec2(length(p.xz),p.y);
  float k=dot(q,vec2(-b,a));if(k<0.0)return length(q)-r1;if(k>a*h)return length(q-vec2(0.0,h))-r2;return dot(q,vec2(a,b))-r1;}

float map(vec3 p){
  p=uRot*p;
  if(uForm<0.5) return length(p)-1.0;
  if(uForm<1.5) return sdTorus(p.xzy,vec2(0.82,0.34));
  if(uForm<2.5) return sdRoundBox(p,vec3(0.78),0.16);
  if(uForm<3.5) return sdCapsule(p,0.55,0.48);
  if(uForm<4.5) return sdCyl(p,0.8,0.68,0.1);
  if(uForm<5.5) return sdCone(p,0.85,0.85,0.0)-0.04;
  if(uForm<6.5) return sdOcta(p*vec3(1.0,0.8,1.0),1.0)*0.9-0.03;
  if(uForm<7.5) return sdPyramid((p+vec3(0.0,0.7,0.0))/1.55,1.0)*1.55-0.03;
  if(uForm<8.5){float d=length(p)-0.88;return (d+0.09*sin(3.1*p.x+uTime)*sin(2.7*p.y+1.3*uTime)*sin(3.3*p.z+0.7*uTime)+0.05*noise(p*3.0))*0.8;}
  if(uForm<9.5){float k=1.6*p.y;float c=cos(k),s=sin(k);vec3 q=vec3(c*p.x-s*p.z,p.y,s*p.x+c*p.z);return sdRoundBox(q,vec3(0.42,0.95,0.42),0.1)*0.6;}
  if(uForm<10.5){float d=length(p-vec3(0.0,0.2,0.0))-0.5;d=smin(d,length(p-vec3(-0.6,-0.4,0.15))-0.38,0.2);d=smin(d,length(p-vec3(0.6,-0.35,-0.1))-0.34,0.2);
    d=smin(d,length(p-vec3(0.1,0.75,-0.35))-0.28,0.2);return d;}
  if(uForm<11.5) return sdRoundCone(p+vec3(0.0,0.5,0.0),0.62,0.04,1.25);
  if(uForm<12.5) return sdCyl(p.xzy,0.16,0.95,0.06);
  if(uForm<13.5) return max(sdTorus(p.xzy+vec3(0.0,0.35,0.0),vec2(0.78,0.24)),-(p.y+0.35));
  if(uForm<14.5) return sdTorus(p.xzy,vec2(0.88,0.09));
  float a=sdTorus(p.xzy+vec3(0.38,0.0,0.0),vec2(0.6,0.17));float b=sdTorus(p+vec3(-0.38,0.0,0.0),vec2(0.6,0.17));return min(a,b);
}

vec3 normalAt(vec3 p){vec2 e=vec2(0.0015,-0.0015);
  return normalize(e.xyy*map(p+e.xyy)+e.yyx*map(p+e.yyx)+e.yxy*map(p+e.yxy)+e.xxx*map(p+e.xxx));}

vec3 env(vec3 d){
  float t=clamp(d.y*0.5+0.5,0.0,1.0);
  vec3 c=mix(vec3(0.05,0.05,0.06),vec3(0.62,0.64,0.68),smoothstep(0.2,1.0,t));
  c=mix(c,c*mix(vec3(1.0),uCol2,0.35),0.6);
  c+=vec3(5.0)*smoothstep(0.93,0.975,dot(d,uLight));
  c+=vec3(1.8,1.75,1.7)*smoothstep(0.86,0.93,dot(d,normalize(vec3(-uLight.x,0.25,0.6))));
  c+=vec3(1.2)*smoothstep(0.75,0.95,dot(d,vec3(0.0,0.2,-1.0)));
  c+=vec3(0.6)*smoothstep(0.985,0.995,abs(d.x))*step(0.0,d.y);
  return c;
}

float softShadow(vec3 ro,vec3 rd){float res=1.0;float t=0.02;
  for(int i=0;i<28;i++){float h=map(ro+rd*t);res=min(res,10.0*h/t);t+=clamp(h,0.02,0.25);if(res<0.002||t>6.0)break;}
  return clamp(res,0.0,1.0);}
float ao(vec3 p,vec3 n){float o=0.0,s=1.0;for(int i=1;i<=5;i++){float h=0.03+0.06*float(i);o+=(h-map(p+n*h))*s;s*=0.75;}return clamp(1.0-1.6*o,0.0,1.0);}

vec3 aces(vec3 x){return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0);}

void main(){
  vec2 uv=(gl_FragCoord.xy-0.5*uRes)/(0.5*min(uRes.x,uRes.y));
  vec3 ro=vec3(0.0,0.35,4.6);
  vec3 ta=vec3(0.0,-0.05,0.0);
  vec3 ww=normalize(ta-ro);vec3 uu=normalize(cross(ww,vec3(0,1,0)));vec3 vv=cross(uu,ww);
  vec3 rd=normalize(uv.x*uu+uv.y*vv+3.1*ww);

  float t=0.0;float hit=-1.0;float minD=10.0;
  for(int i=0;i<110;i++){vec3 p=ro+rd*t;float d=map(p);minD=min(minD,d);
    if(d<0.0012){hit=t;break;}t+=d;if(t>9.0)break;}

  if(hit<0.0){
    // The floor: only its shadow is drawn; plus a halo around glowing objects.
    float fy=-1.25;float a=0.0;vec3 col=vec3(0.0);
    if(rd.y<0.0){float ft=(fy-ro.y)/rd.y;vec3 fp=ro+rd*ft;
      float sh=softShadow(fp,normalize(uLight+vec3(0.0,0.6,0.0)));
      float fall=exp(-0.55*dot(fp.xz,fp.xz));
      a=(1.0-sh)*0.5*fall;}
    if(uMat>6.5&&uMat<7.5){float g=exp(-6.0*max(minD,0.0));col=uCol*g;a=max(a,g*0.85);}
    gl_FragColor=vec4(col*a,a);return;
  }

  vec3 p=ro+rd*hit;vec3 n=normalAt(p);vec3 v=-rd;vec3 r=reflect(rd,n);
  float fres=pow(1.0-max(dot(n,v),0.0),5.0);
  vec3 L=uLight;float dif=max(dot(n,L),0.0);float sh=softShadow(p+n*0.01,L);float occ=ao(p,n);
  vec3 h=normalize(L+v);float alpha=1.0;
  vec3 c=uCol;vec3 col;
  vec3 q=uRot*p;

  if(uMat<0.5){
    // Glass: refract in, march through the inside, refract out; tinted by thickness.
    vec3 rIn=refract(rd,n,1.0/1.5);vec3 pi=p-n*0.004;float ti=0.0;
    for(int i=0;i<48;i++){float d=-map(pi+rIn*ti);if(d<0.0015)break;ti+=max(d,0.01);if(ti>4.0)break;}
    vec3 pe=pi+rIn*ti;vec3 ne=-normalAt(pe);vec3 rOut=refract(rIn,ne,1.5);
    if(dot(rOut,rOut)<0.01)rOut=reflect(rIn,ne);
    vec3 absorb=exp(-(1.0-c)*ti*1.6);
    vec3 refr=env(rOut)*absorb;
    col=mix(refr,env(r),0.06+0.94*fres)+vec3(6.0)*pow(max(dot(n,h),0.0),220.0)*sh;
    alpha=clamp(0.58+0.42*fres+0.25*(1.0-absorb.g),0.0,1.0);
  } else if(uMat<1.5){
    col=env(r)*mix(vec3(0.92),c,0.12)*(0.55+0.45*occ);
  } else if(uMat<2.5){
    col=env(r)*mix(c,vec3(1.0),fres)*(0.5+0.5*occ)+c*0.06;
  } else if(uMat<3.5){
    float wrap=max((dot(n,L)+0.4)/1.4,0.0);
    col=c*(0.22*occ+0.95*wrap*mix(0.35,1.0,sh))+c*c*0.25*pow(1.0-max(dot(n,v),0.0),2.0)*occ;
    col+=vec3(0.06)*pow(max(dot(n,h),0.0),12.0)*sh;
  } else if(uMat<4.5){
    col=c*(0.18*occ+0.9*dif*sh)+mix(vec3(0.04),vec3(1.0),fres)*env(r)*occ*0.8+vec3(2.5)*pow(max(dot(n,h),0.0),90.0)*sh;
  } else if(uMat<5.5){
    float k=dot(n,v);vec3 film=0.5+0.5*cos(6.2831*(vec3(0.0,0.33,0.67)+k*1.6+fres*2.0+0.15*q.y));
    col=env(r)*mix(film,c,0.25)*(0.6+0.4*occ)+film*0.08;
  } else if(uMat<6.5){
    vec3 rb=normalize(mix(r,n,0.45));
    col=env(rb)*c*(0.45+0.55*occ)+c*0.05+vec3(0.6)*pow(max(dot(n,h),0.0),18.0)*sh*c;
  } else if(uMat<7.5){
    col=c*1.6+uCol2*fres*2.5+vec3(1.0)*pow(max(dot(n,v),0.0),6.0)*0.6;
  } else if(uMat<8.5){
    float vein=abs(sin(q.x*3.0+q.y*1.5+5.0*noise(q*1.8)+2.0*noise(q*5.0)));
    vec3 base=mix(c,uCol2,smoothstep(0.0,0.12,vein)*0.9);
    col=base*(0.25*occ+0.85*dif*mix(0.4,1.0,sh))+env(r)*(0.04+0.6*fres)*occ+vec3(1.5)*pow(max(dot(n,h),0.0),120.0)*sh;
  } else if(uMat<9.5){
    float wrap=max((dot(n,L)+0.25)/1.25,0.0);
    vec3 base=mix(vec3(0.93,0.92,0.9),c,0.18);
    col=base*(0.3*occ+0.85*wrap*mix(0.3,1.0,sh))*(0.94+0.06*noise(q*40.0));
  } else if(uMat<10.5){
    float wrap=max((dot(n,L)+0.6)/1.6,0.0);
    col=c*(0.3*occ+0.8*wrap*mix(0.5,1.0,sh))+c*0.35*pow(1.0-max(dot(n,v),0.0),3.0)+vec3(0.12)*pow(max(dot(n,h),0.0),8.0)*sh;
  } else {
    col=c*(0.2*occ+0.85*dif*sh)+env(r)*(0.06+0.9*fres)*occ+vec3(4.0)*pow(max(dot(n,h),0.0),300.0)*sh;
  }

  col=aces(col*1.05);
  col=pow(col,vec3(1.0/2.2));
  gl_FragColor=vec4(col*alpha,alpha);
}`;

type GL = WebGLRenderingContext;
type Engine = { gl: GL; canvas: HTMLCanvasElement; loc: Record<string, WebGLUniformLocation | null> };

let engine: Engine | null | undefined;

function build(): Engine | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl", { premultipliedAlpha: true, preserveDrawingBuffer: true, antialias: false, alpha: true });
  if (!gl) return null;
  const shader = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
    return s;
  };
  try {
    const prog = gl.createProgram()!;
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? "link");
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const a = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    const loc = Object.fromEntries(["uRes", "uForm", "uMat", "uTime", "uCol", "uCol2", "uLight", "uRot"].map((n) => [n, gl.getUniformLocation(prog, n)]));
    return { gl, canvas, loc };
  } catch (err) {
    console.error("Lumora 3D: WebGL non disponibile", err);
    return null;
  }
}

/** Is 3D drawing available in this browser? */
export function has3D() {
  if (engine === undefined) engine = build();
  return engine !== null;
}

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** Rotation matrix (column-major, for GLSL) from tilts in degrees: object space = R · world space. */
export function rotation(tiltX: number, tiltY: number): number[] {
  const x = (tiltX * Math.PI) / 180;
  const y = (tiltY * Math.PI) / 180;
  const [cx, sx, cy, sy] = [Math.cos(x), Math.sin(x), Math.cos(y), Math.sin(y)];
  // R = Ry · Rx, written column by column.
  return [cy, 0, -sy, sy * sx, cx, cy * sx, sy * cx, -sx, cy * cx];
}

/** Light direction from an angle around the object: always from above and in front. */
export function lightDir(deg: number): [number, number, number] {
  const a = ((deg - 135) * Math.PI) / 180;
  const v = [Math.cos(a) * 0.75, 0.75, 0.55 + Math.sin(a) * 0.25];
  const len = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / len, v[1] / len, v[2] / len];
}

/** Draws an object into `target` (a 2D canvas) at the target's own pixel size. Returns false without WebGL. */
export function draw3D(target: HTMLCanvasElement, o: Render3D): boolean {
  if (!has3D() || !engine) return false;
  const { gl, canvas, loc } = engine;
  const w = target.width;
  const h = target.height;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  gl.viewport(0, 0, w, h);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.uniform2f(loc.uRes, w, h);
  gl.uniform1f(loc.uForm, FORMS_3D.indexOf(o.form));
  gl.uniform1f(loc.uMat, MATERIALS_3D.indexOf(o.material));
  gl.uniform1f(loc.uTime, o.time ?? 0);
  gl.uniform3fv(loc.uCol, hexToRgb(o.color));
  gl.uniform3fv(loc.uCol2, hexToRgb(o.color2 ?? "#ffffff"));
  gl.uniform3fv(loc.uLight, lightDir(o.light));
  gl.uniformMatrix3fv(loc.uRot, false, rotation(o.tiltX, o.tiltY));
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  const ctx = target.getContext("2d");
  if (!ctx) return false;
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(canvas, 0, 0);
  return true;
}
