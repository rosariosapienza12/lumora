import type { CSSProperties } from "react";
import type { Element, Page } from "@/lib/editor/schema";
import { FONT_FAMILY } from "@/lib/editor/schema";
import { fillRule, isSvgShape, SVG_SHAPES } from "@/lib/editor/shapes";
import type { Relief } from "@/lib/three/ids";
import { FitStage } from "./fit-stage";
import { Object3DView } from "./object3d";
import { ChartView } from "./chart-view";
import { PollView } from "./poll-view";
import { ICONS } from "@/lib/editor/icons";

/** A flat colour, or a linear gradient when a second colour is set. */
export function paint(c1: string, c2?: string, angle = 135) {
  return c2 ? `linear-gradient(${angle}deg, ${c1}, ${c2})` : c1;
}

/** Texture layers drawn over the page colour, light on dark pages and dark on light ones. */
function patternLayers(pattern: Page["pattern"], background: string) {
  if (!pattern || pattern === "none") return "";
  const ink = isLight(background) ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.1)";
  switch (pattern) {
    case "dots":
      return `radial-gradient(circle, ${ink} 2px, transparent 2.6px) 0 0/36px 36px`;
    case "grid":
      return `linear-gradient(${ink} 1px, transparent 1px) 0 0/56px 56px, linear-gradient(90deg, ${ink} 1px, transparent 1px) 0 0/56px 56px`;
    case "lines":
      return `repeating-linear-gradient(-45deg, ${ink} 0 2px, transparent 2px 24px)`;
    case "stars":
      return `radial-gradient(circle at 20% 30%, ${ink} 1.5px, transparent 2.2px) 0 0/90px 90px, radial-gradient(circle at 70% 75%, ${ink} 1px, transparent 1.6px) 0 0/130px 130px`;
    case "grain": {
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/><feColorMatrix values='0 0 0 0 ${isLight(background) ? 0 : 1} 0 0 0 0 ${isLight(background) ? 0 : 1} 0 0 0 0 ${isLight(background) ? 0 : 1} 0 0 0 0.09 0'/></filter><rect width='160' height='160' filter='url(%23n)'/></svg>`;
      return `url("data:image/svg+xml,${svg.replace(/"/g, "'").replace(/</g, "%3C").replace(/>/g, "%3E")}") 0 0/160px 160px`;
    }
  }
}

export const pageBackground = (p: Page) => {
  const layers = patternLayers(p.pattern, p.background);
  const base = paint(p.background, p.color2, p.angle);
  return layers ? `${layers}, ${base}` : base;
};

/**
 * SVG lighting that turns a flat drawing into a 3D one: the shape's own
 * outline becomes a height map, lit by a point light from the top left.
 * "gonfio" puffs it up like an inflated toy, "inciso" carves it in, "smalto"
 * adds a glossy enamel coat with a sharp highlight.
 */
function ReliefFilter({ id, relief }: { id: string; relief: Exclude<Relief, "none"> }) {
  const carved = relief === "inciso";
  const blur = relief === "smalto" ? 2.2 : 3.4;
  const spec = relief === "smalto" ? { exp: 34, k: 1.6 } : { exp: 16, k: 0.9 };
  return (
    <filter id={id} x="-30%" y="-30%" width="160%" height="170%" colorInterpolationFilters="sRGB">
      <feGaussianBlur in="SourceAlpha" stdDeviation={blur} result="h" />
      {carved && <feComponentTransfer in="h" result="h"><feFuncA type="table" tableValues="1 0" /></feComponentTransfer>}
      <feSpecularLighting in="h" surfaceScale={carved ? 4 : 6} specularConstant={spec.k} specularExponent={spec.exp} lightingColor="#ffffff" result="spec">
        <fePointLight x={-40} y={-60} z={120} />
      </feSpecularLighting>
      <feComposite in="spec" in2="SourceAlpha" operator="in" result="specIn" />
      <feDiffuseLighting in="h" surfaceScale={carved ? 4 : 6} diffuseConstant={1} lightingColor="#ffffff" result="dif">
        <feDistantLight azimuth={225} elevation={48} />
      </feDiffuseLighting>
      <feComposite in="SourceGraphic" in2="dif" operator="arithmetic" k1={1.25} k2={0} k3={0} k4={0} result="lit" />
      <feComposite in="lit" in2="SourceAlpha" operator="in" result="litIn" />
      <feComposite in="specIn" in2="litIn" operator="arithmetic" k1={0} k2={0.55} k3={1} k4={0} result="body" />
      <feGaussianBlur in="SourceAlpha" stdDeviation={carved ? 1.2 : 4} result="sb" />
      <feOffset in="sb" dx={carved ? -1 : 3} dy={carved ? -1 : 6} result="so" />
      <feComponentTransfer in="so" result="shadow"><feFuncA type="linear" slope={carved ? 0.35 : 0.32} /></feComponentTransfer>
      <feMerge>
        <feMergeNode in="shadow" />
        <feMergeNode in="body" />
      </feMerge>
    </filter>
  );
}

/** Pure visual rendering of one element, in canvas units. Text is always rendered as text, never HTML. `live` animates 3D objects. */
export function ElementBody({ el, live = false }: { el: Element; live?: boolean }) {
  switch (el.type) {
    case "object3d":
      return <Object3DView el={el} live={live} />;
    case "icon":
      return (
        <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke={el.color} strokeWidth={el.strokeWidth ?? 2} strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", overflow: "visible" }} aria-hidden>
          <path d={ICONS[el.icon].d} />
        </svg>
      );
    case "chart":
      return <ChartView el={el} />;
    case "poll":
      return <PollView el={el} live={live} />;
    case "text":
      return (
        <div
          style={{
            fontSize: el.fontSize,
            color: el.color,
            // Gradient text: paint the background and clip it to the letters.
            ...(el.color2
              ? { backgroundImage: paint(el.color, el.color2, el.angle ?? 90), WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }
              : {}),
            textAlign: el.align,
            fontWeight: Number(el.weight),
            fontFamily: FONT_FAMILY[el.font],
            fontStyle: el.italic ? "italic" : undefined,
            textDecoration: el.underline ? "underline" : undefined,
            textUnderlineOffset: "0.12em",
            letterSpacing: el.letterSpacing ? `${el.letterSpacing}px` : undefined,
            lineHeight: el.lineHeight ?? 1.15,
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
            width: "100%",
            height: "100%",
          }}
        >
          {el.text}
        </div>
      );
    case "shape":
      if (el.photoSlot) return <PhotoSlot fill={el.fill} radius={el.radius} />;
      if (el.shape === "arc") {
        // A ring drawn for `progress`% of its length, starting at the top, as thick as the "ring" shape.
        return (
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%" style={{ display: "block", overflow: "visible" }} aria-hidden>
            <circle cx="50" cy="50" r="39" fill="none" stroke={el.fill} strokeWidth="18" strokeLinecap="round" pathLength={100} strokeDasharray={`${el.progress ?? 75} 100`} transform="rotate(-90 50 50)" />
          </svg>
        );
      }
      if (isSvgShape(el.shape)) {
        // The gradient id must be unique on the page: thumbnails repeat the same element.
        const gid = `g-${el.id}-${Math.round(el.w)}`;
        const relief = el.relief && el.relief !== "none" ? el.relief : null;
        const fid = `r-${el.id}-${Math.round(el.w)}`;
        // SVG gradients go left to right; CSS angles count from "to top": turn by angle − 90.
        // With relief the drawing is lit in its own pixels (the viewBox is scaled by the
        // element size so the light looks the same at any size).
        return (
          <svg
            viewBox={relief ? `0 0 ${Math.round(el.w)} ${Math.round(el.h)}` : "0 0 100 100"}
            preserveAspectRatio="none"
            width="100%"
            height="100%"
            style={{ display: "block", overflow: "visible" }}
            aria-hidden
          >
            {(el.color2 || relief) && (
              <defs>
                {el.color2 && (
                  <linearGradient id={gid} gradientTransform={`rotate(${(el.angle ?? 135) - 90} 0.5 0.5)`}>
                    <stop offset="0" stopColor={el.fill} />
                    <stop offset="1" stopColor={el.color2} />
                  </linearGradient>
                )}
                {relief && <ReliefFilter id={fid} relief={relief} />}
              </defs>
            )}
            {/* The filter sits on the group, so it works in element pixels whatever the path's scale. */}
            <g filter={relief ? `url(#${fid})` : undefined}>
              <path
                transform={relief ? `scale(${el.w / 100} ${el.h / 100})` : undefined}
                d={SVG_SHAPES[el.shape].d}
                fill={el.color2 ? `url(#${gid})` : el.fill}
                fillRule={fillRule(el.shape)}
                stroke={el.stroke && el.strokeWidth ? el.stroke : undefined}
                strokeWidth={el.stroke && el.strokeWidth ? el.strokeWidth : undefined}
                strokeLinejoin="round"
                // The outline keeps its thickness however the shape is stretched.
                vectorEffect="non-scaling-stroke"
              />
            </g>
          </svg>
        );
      }
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: paint(el.fill, el.color2, el.angle),
            borderRadius: el.shape === "ellipse" ? "50%" : el.radius,
            ...strokeStyle(el.stroke, el.strokeWidth),
          }}
        />
      );
    case "image":
      return (
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- user-provided https images; CSP restricts img-src */}
          <img
            src={el.src}
            alt={el.alt}
            draggable={false}
            referrerPolicy="no-referrer"
            style={{ width: "100%", height: "100%", objectFit: el.fit, borderRadius: el.radius, pointerEvents: "none", ...strokeStyle(el.stroke, el.strokeWidth) }}
          />
        </div>
      );
    case "button":
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "grid",
            placeItems: "center",
            background: paint(el.fill, el.color2, el.angle),
            color: el.color,
            fontSize: el.fontSize,
            fontFamily: FONT_FAMILY[el.font ?? "sans"],
            fontWeight: 600,
            borderRadius: 999,
          }}
        >
          {el.label}
        </div>
      );
    case "hotspot":
      return (
        <div
          className="hotspot"
          style={{
            width: "100%",
            height: "100%",
            background: el.fill,
            fontSize: Math.max(12, el.h * 0.45),
            boxShadow: `0 0 0 ${el.w * 0.2}px color-mix(in oklab, ${el.fill} 30%, transparent)`,
          }}
        >
          {el.label}
        </div>
      );
  }
}

/** Is a hex colour light (so a dark mark reads on it)? */
function isLight(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 150;
}

/** Empty photo space: a card with a small picture mark, until a real photo replaces it. */
function PhotoSlot({ fill, radius }: { fill: string; radius: number }) {
  const ink = isLight(fill) ? "rgba(0,0,0,0.22)" : "rgba(255,255,255,0.28)";
  return (
    <div style={{ width: "100%", height: "100%", background: fill, borderRadius: radius, display: "grid", placeItems: "center", overflow: "hidden" }}>
      <svg viewBox="0 0 100 100" style={{ width: "min(22%, 140px)", height: "auto" }} aria-hidden>
        <path d="M8 18 H92 V82 H8 Z M15 25 V75 H85 V25 Z" fill={ink} fillRule="evenodd" />
        <path d="M20 70 L42 44 L56 60 L64 52 L80 70 Z M60 34 A6 6 0 1 0 72 34 A6 6 0 1 0 60 34 Z" fill={ink} />
      </svg>
    </div>
  );
}

/** Border drawn inside the element (an outline follows the rounded corners, also on images). */
function strokeStyle(stroke?: string, width?: number): CSSProperties {
  return stroke && width ? { outline: `${width}px solid ${stroke}`, outlineOffset: -width } : {};
}

export const SHADOW = "drop-shadow(0 18px 28px rgba(0,0,0,0.35))";

/** Rotation and mirroring, in that order (flipping does not change the rotation direction shown). */
export function elementTransform(el: Element) {
  const parts = [];
  if (el.rotation) parts.push(`rotate(${el.rotation}deg)`);
  if (el.flipX || el.flipY) parts.push(`scale(${el.flipX ? -1 : 1}, ${el.flipY ? -1 : 1})`);
  return parts.length ? parts.join(" ") : undefined;
}

export function elementBox(el: Element): CSSProperties {
  return {
    position: "absolute",
    left: el.x,
    top: el.y,
    width: el.w,
    height: el.h,
    transform: elementTransform(el),
    opacity: el.opacity,
    filter: el.shadow ? SHADOW : undefined,
  };
}

/** Static, non-interactive preview of a page scaled to its container width. */
export function SlideThumb({ page, className = "" }: { page: Page; className?: string }) {
  return (
    <FitStage background={pageBackground(page)} className={className}>
      <div aria-hidden>
        {page.elements
          .filter((el) => !el.hidden)
          .map((el) => (
            <div key={el.id} style={elementBox(el)}>
              <ElementBody el={el} />
            </div>
          ))}
      </div>
    </FitStage>
  );
}
