import type { CSSProperties } from "react";
import type { Element, Page } from "@/lib/editor/schema";
import { FONT_FAMILY } from "@/lib/editor/schema";
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
        // eslint-disable-next-line @next/next/no-img-element -- user-provided https images; CSP restricts img-src
        <img
          src={el.src}
          alt={el.alt}
          draggable={false}
          referrerPolicy="no-referrer"
          style={{ width: "100%", height: "100%", objectFit: el.fit, borderRadius: el.radius, pointerEvents: "none", ...strokeStyle(el.stroke, el.strokeWidth) }}
        />
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

/** Border drawn inside the element (an outline follows the rounded corners, also on images). */
function strokeStyle(stroke?: string, width?: number): CSSProperties {
  return stroke && width ? { outline: `${width}px solid ${stroke}`, outlineOffset: -width } : {};
}

export const SHADOW = "drop-shadow(0 18px 28px rgba(0,0,0,0.35))";

export function elementBox(el: Element): CSSProperties {
  return {
    position: "absolute",
    left: el.x,
    top: el.y,
    width: el.w,
    height: el.h,
    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
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
