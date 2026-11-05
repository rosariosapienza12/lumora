# Style lock: Lumora slide layouts

Surface: editor/canvas. These rules cover the page layouts in `src/lib/editor/layouts.ts`
and the topic decorations in `src/lib/editor/motifs.ts`, not the marketing site.

## Color contract
- Colours come only from the theme roles in `src/lib/editor/themes.ts` (never a hard-coded hex
  in a layout), so every layout works in every theme and `applyTheme` can remap it.
- Text on cover pages: `coverTitle`, `coverSub`, `accent2`. Text on content pages: `title`,
  `text`, `muted`, `accent`. Labels on accent fills: `onAccent`.
- Decorations: `accent` / `accent2` at low opacity (0.14-0.3), never under text.

## Grid and spacing (1600 x 900 canvas)
- Safe area: x 120-1480, y 90-810. Text and buttons never leave it.
- Gutters: 40 between cards, 80 between columns of text.
- Outer margin band (outside the safe area) belongs to decorations.

## Type scale
- Cover title 104-112, page title 64-72, card title 40-44, body 30-34, caption 24-26.
- Line height: titles 1.05-1.1, body 1.4-1.5.

## Structure
- Each layout has one focal point (photo, big number, diagram) and text as its caption.
- Photo areas are photo slots (`photoSlot` shapes) that receive a real photo in place.
- Layouts differ in skeleton, not in colour: split, full bleed, grid, radial, chain, stack.

## Motion
- Entrances 0.5-0.7 s, staggered by 0.12-0.2 s, ordered by reading order.
- One emphasis animation at most per page.

## Copy
- Placeholder copy says what to write, in Italian, no em dashes.

## Decisions
- pending-review: full redesign of the 17 existing layouts plus 8 new ones (2026-11-05).
