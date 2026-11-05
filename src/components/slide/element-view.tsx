import type { CSSProperties } from "react";
import type { Element, Page } from "@/lib/editor/schema";
import { FONT_FAMILY } from "@/lib/editor/schema";
import { fillRule, isSvgShape, SVG_SHAPES } from "@/lib/editor/shapes";
import { FitStage } from "./fit-stage";

/** A flat colour, or a linear gradient when a second colour is set. */
export function paint(c1: string, c2?: string, angle = 135) {
  return c2 ? `linear-gradient(${angle}deg, ${c1}, ${c2})` : c1;
}

export const pageBackground = (p: Page) => paint(p.background, p.color2, p.angle);

/** Pure visual rendering of one element, in canvas units. Text is always rendered as text, never HTML. */
export function ElementBody({ el }: { el: Element }) {
  switch (el.type) {
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
        // SVG gradients go left to right; CSS angles count from "to top": turn by angle − 90.
        return (
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%" style={{ display: "block", overflow: "visible" }} aria-hidden>
            {el.color2 && (
              <defs>
                <linearGradient id={gid} gradientTransform={`rotate(${(el.angle ?? 135) - 90} 0.5 0.5)`}>
                  <stop offset="0" stopColor={el.fill} />
                  <stop offset="1" stopColor={el.color2} />
                </linearGradient>
              </defs>
            )}
            <path
              d={SVG_SHAPES[el.shape].d}
              fill={el.color2 ? `url(#${gid})` : el.fill}
              fillRule={fillRule(el.shape)}
              stroke={el.stroke && el.strokeWidth ? el.stroke : undefined}
              strokeWidth={el.stroke && el.strokeWidth ? el.strokeWidth : undefined}
              strokeLinejoin="round"
              // The outline keeps its thickness however the shape is stretched.
              vectorEffect="non-scaling-stroke"
            />
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
          {el.credit && (
            // Author and licence of a free photo: required by its licence, so it is always visible.
            <span
              style={{
                position: "absolute",
                right: Math.max(8, Math.min(el.radius, 40)),
                bottom: Math.max(8, Math.min(el.radius, 40)),
                maxWidth: "80%",
                padding: "3px 10px",
                borderRadius: 999,
                background: "rgba(0,0,0,0.55)",
                color: "#fff",
                fontSize: Math.max(13, Math.min(18, el.w / 45)),
                fontFamily: FONT_FAMILY.clean,
                lineHeight: 1.3,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                pointerEvents: "none",
              }}
            >
              {el.credit}
            </span>
          )}
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
