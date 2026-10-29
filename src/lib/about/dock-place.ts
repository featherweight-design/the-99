// Where the phone's docked label sits for the region it describes (Small items 3 item 6, `design/
// design_handoff_the99_small_items_3/` board `Dock-Low-Region.html`, over About Addendum R4 board 3; Small items 4
// item 3, `design/design_handoff_the99_small_items_4/` board `Dock-Header.html`).
//
// Its home is the foot, above the tab bar. When the lit region's bottom edge falls below the dock's top edge as placed
// at the foot, the dock covers what it describes, so it goes to the top of the visible band instead. A region so tall
// that the top dock would cover it too keeps the foot: most of it stays in view either way. Top or foot is decided
// once, on the tap; scrolling afterwards never changes it.
//
// At the top, its place is live CSS (`DOCK_AT_TOP` in `pin-dock.tsx`), not a number fixed at the tap: `DOCK_GAP` under the back bar, or
// under the returned header when no back bar shows, riding `--header-offset` on the header's own slide (Small items 4
// item 3, "the label rides the header"), and never under the notch's safe-area inset. The one thing that CSS cannot
// see is a header still in the page (scrolled part way, or not at all: `--header-offset` is 0 there, yet the header
// and the back bar under it hold the top of the screen). Then the tap's measured edge becomes a floor, so the label
// never sits over either. `PinDock` then follows that edge live on scroll (orchestrator ruling, 2026-10-29), so the
// dock climbs as the header leaves with the page, and clears the floor once it reaches 0.
//
// Client-safe: pure arithmetic over on-screen boxes, in viewport pixels.

/** The dock's gap to the tab bar at the foot, to the bar above it at the top, and its side gutters. */
export const DOCK_GAP = 12;

export type DockPlace = { at: "foot" } | { at: "top"; floor: number | null };

/** A box's top and bottom edges on screen. */
export type Edges = { top: number; bottom: number };

export function dockPlace({
  region,
  foot,
  top,
  topEdge,
}: {
  /** The lit region as drawn. */
  region: Edges;
  /** The dock as placed at the foot. */
  foot: Edges;
  /** The top edge of the dock as its CSS places it at the top at the tap, with no floor. */
  top: number;
  /** The lowest bottom edge of what holds the top of the screen at the tap (0 or less when nothing does). */
  topEdge: number;
}): DockPlace {
  if (region.bottom <= foot.top) return { at: "foot" };
  // CSS knows only a returned header; one still in the page reaches lower, and its edge is the floor.
  const floor = topEdge + DOCK_GAP > top ? topEdge : null;
  const at = Math.max(top, topEdge + DOCK_GAP);
  const bottom = at + (foot.bottom - foot.top);
  // Covered in both places: the foot is its home.
  if (region.top < bottom && region.bottom > at) return { at: "foot" };
  return { at: "top", floor };
}
