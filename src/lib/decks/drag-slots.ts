// The arithmetic of dragging a row in Arrange mode (arrange-decks.tsx). Every number is read ONCE, at pickup, from the
// undisturbed layout, so nothing the drag does (rows sliding, the list reordering) feeds back into the next target.

export type DragGeometry = {
  /** Each row's resting top, in document coordinates, in list order. */
  tops: number[];
  heights: number[];
  /** The lifted row's index. */
  from: number;
  /** The pointer's document y at pickup. */
  startPageY: number;
  /** The list's own top, in document coordinates. */
  olTop: number;
  /** The space between two rows. */
  gap: number;
};

/** How far the lifted row may be moved from where it rests: not above the list's top, not below its last row's bottom. */
export function clampDy(geo: DragGeometry, dy: number): number {
  const last = geo.tops.length - 1;
  const lo = geo.olTop - geo.tops[geo.from];
  const hi = geo.tops[last] + geo.heights[last] - geo.tops[geo.from] - geo.heights[geo.from];
  return Math.min(hi, Math.max(lo, dy));
}

/** The slot the lifted row's centre is over: the number of OTHER rows whose resting midpoint it has passed. */
export function slotAt(geo: DragGeometry, dy: number): number {
  const centre = geo.tops[geo.from] + geo.heights[geo.from] / 2 + dy;
  let to = 0;
  for (let j = 0; j < geo.tops.length; j += 1) if (j !== geo.from && geo.tops[j] + geo.heights[j] / 2 < centre) to += 1;
  return to;
}

/** Where the lifted row's top rests when dropped in `to`, in the undisturbed layout (neighbours slide a row's height). */
export function slotTop(geo: DragGeometry, to: number): number {
  return to > geo.from ? geo.tops[to] + geo.heights[to] - geo.heights[geo.from] : geo.tops[to];
}

/** A row's translate while the lifted row is over `to`: the lifted row's own `dy`, a neighbour's one row up or down, else 0. */
export function rowShift(geo: DragGeometry, i: number, to: number, dy: number): number {
  if (i === geo.from) return dy;
  const slide = geo.heights[geo.from] + geo.gap;
  if (geo.from < to && i > geo.from && i <= to) return -slide;
  if (to < geo.from && i >= to && i < geo.from) return slide;
  return 0;
}
