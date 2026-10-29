// How far inside its frame a lit box is held, and the CSS that holds a tool card's halo there (R4 board 2; Small items
// 3 item 2, `design/design_handoff_the99_small_items_3/`, board `Try-It-Halo.html`).
//
// Its own module, free of the page-shot manifest, so the client tool card (Try it, and Show me's landing) can draw the
// clamp without bundling `pins.ts`'s manifest. `haloAt` (`pins.ts`) is the same arithmetic in pixels.

/** How far inside the frame a lit region's halo is held, so its ring and glow close inside the clipped edge (R4 board 2). */
export const HALO_REACH = 8;

/** A lit box as fractions of its frame: left, top, width, height. */
export type HaloFractions = { x: number; y: number; w: number; h: number };

/** The CSS insets that draw a halo box held `HALO_REACH` inside its frame on every side, at whatever size the frame is
 *  rendered: `haloAt`'s clamp written in CSS, so it needs no measuring. The left and top edges are held in
 *  [REACH, 100% − REACH]; the right and bottom insets are at least REACH; a box squeezed past its own left or top edge
 *  draws at no size, as `haloAt`'s does (an auto width or height under both insets never goes below 0). */
export function haloInsets(b: HaloFractions): { left: string; top: string; right: string; bottom: string } {
  const pct = (v: number) => `${Math.round(v * 1e6) / 1e4}%`;
  const R = `${HALO_REACH}px`;
  return {
    left: `clamp(${R}, ${pct(b.x)}, calc(100% - ${R}))`,
    top: `clamp(${R}, ${pct(b.y)}, calc(100% - ${R}))`,
    right: `max(${R}, ${pct(1 - b.x - b.w)})`,
    bottom: `max(${R}, ${pct(1 - b.y - b.h)})`,
  };
}
