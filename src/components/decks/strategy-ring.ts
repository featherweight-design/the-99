// The strategy ring's geometry (handoff `design_handoff_the99_strategy_focus`, Main and Focus-Flow 5), pure so it is
// tested apart from the drawing. One arc per strategy from 12 o'clock, clockwise in legend order, each sized by its
// LIVE count, a small gap at every joint. The focus's arc is pulled out (a wider radius and stroke) in accent; when cards
// toward the focus are pending since the last commit, the arc splits into its committed part and a lighter growth part.

/** The ring at one width, from the boards' measured SVG. */
export type RingSize = { box: number; radius: number; stroke: number; focusRadius: number; focusStroke: number; centre: number; medallion: number };

export const RING = {
  desktop: { box: 230, radius: 101, stroke: 20, focusRadius: 105, focusStroke: 24, centre: 138, medallion: 118 },
  phone: { box: 200, radius: 86, stroke: 20, focusRadius: 90, focusStroke: 24, centre: 108, medallion: 92 },
} satisfies Record<string, RingSize>;

/** Degrees left open at every joint between two arcs, and between a focus arc and its growth. */
export const JOINT_GAP = 2.2;
export const GROWTH_GAP = 1.2;

export type RingRow = { key: string; copies: number; added: number };
export type RingArc = { key: string; kind: "rank" | "focus" | "growth"; rank: number; from: number; to: number };

/**
 * The arcs, in degrees clockwise from 12 o'clock. A row with no copies draws nothing. Only the focus splits off its
 * growth: the other rows' pending changes are said by the legend alone (the boards draw growth on the focus only).
 */
export function ringArcs(rows: readonly RingRow[], focus: string | null): RingArc[] {
  const total = rows.reduce((n, r) => n + r.copies, 0);
  if (total === 0) return [];
  const out: RingArc[] = [];
  let at = 0;
  rows.forEach((r, rank) => {
    const span = (r.copies / total) * 360;
    if (span <= 0) return;
    const from = at + JOINT_GAP / 2;
    const to = Math.max(from, at + span - JOINT_GAP / 2);
    at += span;
    if (r.key !== focus) return void out.push({ key: r.key, kind: "rank", rank, from, to });
    const grown = Math.min(Math.max(r.added, 0), r.copies);
    if (grown === 0) return void out.push({ key: r.key, kind: "focus", rank, from, to });
    const split = from + ((to - from) * (r.copies - grown)) / r.copies;
    out.push({ key: r.key, kind: "focus", rank, from, to: Math.max(from, split - GROWTH_GAP / 2) });
    out.push({ key: r.key, kind: "growth", rank, from: Math.min(to, split + GROWTH_GAP / 2), to });
  });
  return out;
}

/** An SVG arc path on a circle centred in `box`, from one angle to another (degrees clockwise from 12 o'clock). */
export function arcPath(box: number, radius: number, from: number, to: number): string {
  const c = box / 2;
  const point = (deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return `${(c + radius * Math.cos(rad)).toFixed(2)} ${(c + radius * Math.sin(rad)).toFixed(2)}`;
  };
  // A whole circle cannot be one arc command: two halves.
  if (to - from >= 359.99) return `M ${point(0)} A ${radius} ${radius} 0 1 1 ${point(180)} A ${radius} ${radius} 0 1 1 ${point(359.99)}`;
  return `M ${point(from)} A ${radius} ${radius} 0 ${to - from > 180 ? 1 : 0} 1 ${point(to)}`;
}

/** A legend row's count: the committed count, then what moved since the last commit (`11 +2`, `9 −1`, `10 +2 −1`). */
export function legendCount(copies: number, change: { added: number; removed: number } | undefined): { base: number; added: number; removed: number } {
  const added = change?.added ?? 0;
  const removed = change?.removed ?? 0;
  return { base: copies - added + removed, added, removed };
}
