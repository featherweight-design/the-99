// Where the phone's docked label sits for the region it describes (Small items 3 item 6, `design/
// design_handoff_the99_small_items_3/` board `Dock-Low-Region.html`, over About Addendum R4 board 3).
//
// Its home is the foot, above the tab bar. When the lit region's bottom edge falls below the dock's top edge as placed
// at the foot, the dock covers what it describes, so it goes to the top of the visible band instead: `DOCK_GAP` under
// whatever holds the top of the screen at the tap (the sticky back bar, or the header, or with the quick-return header
// away and no back bar stuck, the screen's own top edge). A region so tall that the top dock would cover it too keeps
// the foot: most of it stays in view either way. Decided once, on the tap; scrolling afterwards never moves it.
//
// Client-safe: pure arithmetic over on-screen boxes, in viewport pixels.

/** The dock's gap to the tab bar at the foot, to the bar above it at the top, and its side gutters. */
export const DOCK_GAP = 12;

export type DockPlace = { at: "foot" } | { at: "top"; top: number };

/** A box's top and bottom edges on screen. */
export type Edges = { top: number; bottom: number };

export function dockPlace({
  region,
  foot,
  topEdge,
}: {
  /** The lit region as drawn. */
  region: Edges;
  /** The dock as placed at the foot. */
  foot: Edges;
  /** The lowest bottom edge of what holds the top of the screen (0 when nothing does). */
  topEdge: number;
}): DockPlace {
  if (region.bottom <= foot.top) return { at: "foot" };
  const top = Math.max(0, topEdge) + DOCK_GAP;
  const bottom = top + (foot.bottom - foot.top);
  // Covered in both places: the foot is its home.
  if (region.top < bottom && region.bottom > top) return { at: "foot" };
  return { at: "top", top };
}
