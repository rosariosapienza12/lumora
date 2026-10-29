import type { CSSProperties } from "react";
import type { Element, Page } from "@/lib/editor/schema";
import { FitStage } from "./fit-stage";

/** Pure visual rendering of one element, in canvas units. Text is always rendered as text, never HTML. */
export function ElementBody({ el }: { el: Element }) {
  switch (el.type) {
    case "text":
      return (
        <div
          style={{
            fontSize: el.fontSize,
            color: el.color,
            textAlign: el.align,
            fontWeight: Number(el.weight),
            fontFamily: el.font === "display" ? "var(--font-bricolage)" : "var(--font-instrument)",
            lineHeight: 1.15,
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
            background: el.fill,
            borderRadius: el.shape === "ellipse" ? "50%" : el.radius,
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
          style={{ width: "100%", height: "100%", objectFit: el.fit, borderRadius: el.radius, pointerEvents: "none" }}
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
            background: el.fill,
            color: el.color,
            fontSize: el.fontSize,
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

export function elementBox(el: Element): CSSProperties {
  return {
    position: "absolute",
    left: el.x,
    top: el.y,
    width: el.w,
    height: el.h,
    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
    opacity: el.opacity,
  };
}

/** Static, non-interactive preview of a page scaled to its container width. */
export function SlideThumb({ page, className = "" }: { page: Page; className?: string }) {
  return (
    <FitStage background={page.background} className={className}>
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
