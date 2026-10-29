"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { CANVAS_H, CANVAS_W } from "@/lib/editor/schema";

/** Scales a fixed 1600×900 canvas to fit its container while keeping 16:9. */
export function FitStage({
  children,
  background,
  className = "",
  contain = false,
  onScale,
}: {
  children: ReactNode;
  background: string;
  className?: string;
  /** Fit inside both width and height (viewer) instead of width only (thumbnails). */
  contain?: boolean;
  onScale?: (scale: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const update = () => {
      const { width, height } = node.getBoundingClientRect();
      const s = contain ? Math.min(width / CANVAS_W, height / CANVAS_H) : width / CANVAS_W;
      setScale(s);
      onScale?.(s);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(node);
    return () => ro.disconnect();
  }, [contain, onScale]);

  return (
    <div ref={ref} className={`relative overflow-hidden ${contain ? "h-full w-full" : "aspect-video w-full"} ${className}`}>
      <div
        style={{
          position: "absolute",
          left: contain ? `calc(50% - ${(CANVAS_W * scale) / 2}px)` : 0,
          top: contain ? `calc(50% - ${(CANVAS_H * scale) / 2}px)` : 0,
          width: CANVAS_W,
          height: CANVAS_H,
          background,
          transformOrigin: "0 0",
          transform: `scale(${scale})`,
          visibility: scale ? "visible" : "hidden",
          overflow: "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}
