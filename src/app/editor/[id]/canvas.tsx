"use client";

import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { Element, Page } from "@/lib/editor/schema";
import { CANVAS_H, CANVAS_W } from "@/lib/editor/schema";
import { ElementBody, elementBox, pageBackground } from "@/components/slide/element-view";
import { FitStage } from "@/components/slide/fit-stage";
import type { Action } from "./store";

type Handle = "nw" | "ne" | "sw" | "se";
type Drag = { id: string; mode: "move" | Handle; startX: number; startY: number; orig: Pick<Element, "x" | "y" | "w" | "h">; moved: boolean };

const SNAP = 12;

/** Snaps an edge to the canvas centre lines and borders when close. */
function snap(v: number, size: number, total: number) {
  for (const target of [0, total / 2 - size / 2, total - size]) {
    if (Math.abs(v - target) < SNAP) return target;
  }
  return Math.round(v);
}

export function Canvas({ page, selectedId, dispatch }: { page: Page; selectedId: string | null; dispatch: (a: Action) => void }) {
  const scaleRef = useRef(1);
  const drag = useRef<Drag | null>(null);
  const [guides, setGuides] = useState<{ v: boolean; h: boolean }>({ v: false, h: false });
  const onScale = useCallback((s: number) => (scaleRef.current = s || 1), []);

  const begin = useCallback(
    (e: ReactPointerEvent, el: Element, mode: Drag["mode"]) => {
      e.stopPropagation();
      dispatch({ type: "select", id: el.id });
      if (el.locked) return;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      drag.current = { id: el.id, mode, startX: e.clientX, startY: e.clientY, orig: { x: el.x, y: el.y, w: el.w, h: el.h }, moved: false };
    },
    [dispatch],
  );

  const move = useCallback((e: ReactPointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.startX) / scaleRef.current;
    const dy = (e.clientY - d.startY) / scaleRef.current;
    if (!d.moved && Math.hypot(dx, dy) < 2) return;
    let { x, y, w, h } = d.orig;
    if (d.mode === "move") {
      x = snap(x + dx, w, CANVAS_W);
      y = snap(y + dy, h, CANVAS_H);
      setGuides({ v: x === CANVAS_W / 2 - w / 2, h: y === CANVAS_H / 2 - h / 2 });
    } else {
      if (d.mode.includes("e")) w = Math.max(20, d.orig.w + dx);
      if (d.mode.includes("s")) h = Math.max(20, d.orig.h + dy);
      if (d.mode.includes("w")) {
        w = Math.max(20, d.orig.w - dx);
        x = d.orig.x + d.orig.w - w;
      }
      if (d.mode.includes("n")) {
        h = Math.max(20, d.orig.h - dy);
        y = d.orig.y + d.orig.h - h;
      }
      if (e.shiftKey) h = (w * d.orig.h) / d.orig.w;
      ({ x, y, w, h } = { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) });
    }
    // The first move of a drag creates one undo step; the rest merge into it.
    dispatch({ type: "update-element", id: d.id, patch: { x, y, w, h }, coalesce: d.moved });
    d.moved = true;
  }, [dispatch]);

  const end = useCallback(() => {
    drag.current = null;
    setGuides({ v: false, h: false });
  }, []);

  return (
    <div className="h-full w-full" onPointerDown={() => dispatch({ type: "select", id: null })}>
      <FitStage background={pageBackground(page)} contain onScale={onScale} className="[&>div]:shadow-2xl">
        <div className="absolute inset-0" onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
          {page.elements.map((el) => (
            <CanvasItem key={el.id} el={el} selected={el.id === selectedId} onBegin={begin} />
          ))}
          {guides.v && <div className="pointer-events-none absolute inset-y-0 left-1/2 w-0.5 bg-amber" />}
          {guides.h && <div className="pointer-events-none absolute inset-x-0 top-1/2 h-0.5 bg-amber" />}
        </div>
      </FitStage>
    </div>
  );
}

function CanvasItem({
  el,
  selected,
  onBegin,
}: {
  el: Element;
  selected: boolean;
  onBegin: (e: ReactPointerEvent, el: Element, mode: Drag["mode"]) => void;
}) {
  return (
    <div
      style={{ ...elementBox(el), opacity: el.hidden ? Math.min(el.opacity, 0.45) : el.opacity, cursor: el.locked ? "default" : "move", touchAction: "none" }}
      onPointerDown={(e) => onBegin(e, el, "move")}
      className={selected ? "outline outline-[3px] outline-violet" : "hover:outline hover:outline-2 hover:outline-violet/50"}
    >
      <ElementBody el={el} />
      {el.interaction && (
        <span className="absolute -right-3 -top-3 grid size-7 place-items-center rounded-full bg-amber text-[16px] font-bold text-[#3a2500]" title="Ha un'interazione">
          ✦
        </span>
      )}
      {selected &&
        !el.locked &&
        (["nw", "ne", "sw", "se"] as Handle[]).map((hnd) => (
          <span
            key={hnd}
            onPointerDown={(e) => onBegin(e, el, hnd)}
            className="absolute size-5 rounded-full border-[3px] border-violet bg-white"
            style={{
              left: hnd.includes("w") ? -10 : undefined,
              right: hnd.includes("e") ? -10 : undefined,
              top: hnd.includes("n") ? -10 : undefined,
              bottom: hnd.includes("s") ? -10 : undefined,
              cursor: `${hnd}-resize`,
              touchAction: "none",
            }}
          />
        ))}
    </div>
  );
}
