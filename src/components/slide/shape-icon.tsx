import { fillRule, isSvgShape, SVG_SHAPES, type ShapeId } from "@/lib/editor/shapes";

/** Small preview of a shape, for menus and pickers. */
export function ShapeIcon({ shape, className = "size-6" }: { shape: ShapeId; className?: string }) {
  if (shape === "rect") return <span aria-hidden className={`${className} block rounded-[3px] bg-current`} />;
  if (shape === "ellipse") return <span aria-hidden className={`${className} block rounded-full bg-current`} />;
  if (shape === "arc") {
    return (
      <svg viewBox="0 0 100 100" className={className} aria-hidden>
        <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="18" />
        <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeWidth="18" pathLength={100} strokeDasharray="70 100" transform="rotate(-90 50 50)" />
      </svg>
    );
  }
  if (!isSvgShape(shape)) return null;
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <path d={SVG_SHAPES[shape].d} fill="currentColor" fillRule={fillRule(shape)} />
    </svg>
  );
}
