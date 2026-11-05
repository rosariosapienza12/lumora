import { isSvgShape, SVG_SHAPES, type ShapeId } from "@/lib/editor/shapes";

/** Small preview of a shape, for menus and pickers. */
export function ShapeIcon({ shape, className = "size-6" }: { shape: ShapeId; className?: string }) {
  if (shape === "rect") return <span aria-hidden className={`${className} block rounded-[3px] bg-current`} />;
  if (shape === "ellipse") return <span aria-hidden className={`${className} block rounded-full bg-current`} />;
  if (!isSvgShape(shape)) return null;
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <path d={SVG_SHAPES[shape].d} fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}
