/**
 * Where the What's what guide's labels go (addendum What's what, call 6). Pure over boxes in one coordinate space: the
 * caller measures the drawn controls, so every layout, turned or not, is placed by the same rule with no table of
 * layouts. Each label takes the free spot nearest the point it wants, never over a control's cutout and never over
 * another label; if no spot is free it takes the one that overlaps least.
 */
export type Box = { x: number; y: number; w: number; h: number };
export type Pt = { x: number; y: number };

export type Placing = {
  id: string;
  size: { w: number; h: number };
  /** Where the label's centre wants to be. */
  ideal: Pt;
  /** Extra cost for a spot outside this box: the foot panel's labels prefer to sit inside it. */
  home?: Box;
  /** The control it points at: a spot whose leader to this point would cross a cutout or label it is not for counts as a clash. */
  to?: Pt;
};

const STEP = 6;
const EDGE = 6;
/** What a spot outside the label's home costs, in px of distance. */
const OUTSIDE = 60;

const overlap = (a: Box, b: Box): number => {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
};
const segHitsBox = (a: Pt, b: Pt, r: Box): boolean => {
  let t0 = 0;
  let t1 = 1;
  const d = { x: b.x - a.x, y: b.y - a.y };
  for (const [p, q] of [[-d.x, a.x - r.x], [d.x, r.x + r.w - a.x], [-d.y, a.y - r.y], [d.y, r.y + r.h - a.y]] as const) {
    if (p === 0) {
      if (q < 0) return false;
    } else {
      const t = q / p;
      if (p < 0) t0 = Math.max(t0, t);
      else t1 = Math.min(t1, t);
      if (t0 > t1) return false;
    }
  }
  return true;
};
const ccw = (a: Pt, b: Pt, c: Pt): number => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
const segsCross = (a: Pt, b: Pt, c: Pt, d: Pt): boolean => ccw(a, b, c) * ccw(a, b, d) < 0 && ccw(c, d, a) * ccw(c, d, b) < 0;
const inside = (a: Box, b: Box): boolean => a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h;

/** `avoid` are the cutouts (padded by the caller); each item is placed in order and later items keep clear of earlier ones (the header card goes first). */
export function placeLabels(bounds: Box, avoid: readonly Box[], items: readonly Placing[], fixedLegs: readonly (readonly [Pt, Pt])[] = []): Map<string, Box> {
  const field: Box = { x: bounds.x + EDGE, y: bounds.y + EDGE, w: bounds.w - EDGE * 2, h: bounds.h - EDGE * 2 };
  const out = new Map<string, Box>();
  const taken: Box[] = [];
  const legs: (readonly [Pt, Pt])[] = [...fixedLegs];
  for (const it of items) {
    const { w, h } = it.size;
    let best: Box | null = null;
    let bestCost = Infinity;
    let fallback: Box | null = null;
    let fallbackCost = Infinity;
    const x0 = field.x;
    const y0 = field.y;
    // A label larger than the field is pinned to its top-left corner rather than placed outside the bounds.
    const maxX = Math.max(x0, field.x + field.w - w);
    const maxY = Math.max(y0, field.y + field.h - h);
    for (let y = y0; y <= maxY + STEP - 1; y += STEP) {
      const yy = Math.min(y, maxY);
      for (let x = x0; x <= maxX + STEP - 1; x += STEP) {
        const xx = Math.min(x, maxX);
        const box: Box = { x: xx, y: yy, w, h };
        const dist = Math.hypot(xx + w / 2 - it.ideal.x, yy + h / 2 - it.ideal.y) + (it.home && !inside(box, it.home) ? OUTSIDE : 0);
        let clash = 0;
        for (const a of avoid) clash += overlap(box, a);
        for (const t of taken) clash += overlap(box, t);
        for (const [a, b] of legs) if (segHitsBox(a, b, box)) clash += 1;
        if (it.to) {
          const to = it.to;
          const from = edgePoint(box, to);
          // Another control's cutout or label in the leader's way (the target's own cutout holds its end).
          for (const [la, lb] of legs) if (segsCross(from, to, la, lb)) clash += 1;
          for (const a of [...avoid, ...taken]) if (!(to.x >= a.x && to.x <= a.x + a.w && to.y >= a.y && to.y <= a.y + a.h) && segHitsBox(from, to, { x: a.x - 4, y: a.y - 4, w: a.w + 8, h: a.h + 8 })) clash += 1;
        }
        if (clash === 0) {
          if (dist < bestCost) {
            bestCost = dist;
            best = box;
          }
        } else if (best === null) {
          const c = clash * 100 + dist;
          if (c < fallbackCost) {
            fallbackCost = c;
            fallback = box;
          }
        }
      }
    }
    const pick = best ?? fallback ?? { x: field.x, y: field.y, w, h };
    out.set(it.id, pick);
    taken.push(pick);
    if (it.to) legs.push([edgePoint(pick, it.to), it.to]);
  }
  return out;
}

/** The point where the ray from a box's centre toward `to` leaves the box. */
export function edgePoint(box: Box, to: Pt): Pt {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const dx = to.x - cx;
  const dy = to.y - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const t = Math.min(dx === 0 ? Infinity : box.w / 2 / Math.abs(dx), dy === 0 ? Infinity : box.h / 2 / Math.abs(dy));
  return { x: cx + dx * t, y: cy + dy * t };
}

export const centre = (b: Box): Pt => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });

/** Space between neighbours in a labelled row. */
export const ROW_GAP = 6;

/** The widest each of `n` labels in one row can be: all fit across the field, so none has to stack on another. */
export const rowLabelWidth = (bounds: Box, n: number, wanted: number): number => Math.min(wanted, Math.floor((bounds.w - EDGE * 2 - ROW_GAP * (n - 1)) / Math.max(1, n)));

/**
 * One row of labels, one per button, in the buttons' order (addendum What's what, T1): each sits over (side -1) or under
 * (side 1) its own button, spread only as far as neighbours need, all on one edge `lead` from the buttons. Because the
 * order matches and the edge is shared, a leader from a label's near edge to its button never crosses another label or
 * another leader. `widths` are equal and already fit by `rowLabelWidth`. Null when the row would leave the bounds.
 */
export function placeRow(bounds: Box, buttons: readonly Box[], sizes: readonly { w: number; h: number }[], side: -1 | 1, lead: number): Box[] | null {
  const n = buttons.length;
  if (n === 0) return [];
  const left = bounds.x + EDGE;
  const right = bounds.x + bounds.w - EDGE;
  const xs = buttons.map((b, i) => Math.min(Math.max(b.x + b.w / 2 - sizes[i].w / 2, left), right - sizes[i].w));
  for (let i = 1; i < n; i++) xs[i] = Math.max(xs[i], xs[i - 1] + sizes[i - 1].w + ROW_GAP);
  xs[n - 1] = Math.min(xs[n - 1], right - sizes[n - 1].w);
  for (let i = n - 2; i >= 0; i--) xs[i] = Math.min(xs[i], xs[i + 1] - sizes[i].w - ROW_GAP);
  if (xs[0] < left - 0.5 || xs[n - 1] + sizes[n - 1].w > right + 0.5) return null;
  const near = side === -1 ? Math.min(...buttons.map((b) => b.y)) - lead : Math.max(...buttons.map((b) => b.y + b.h)) + lead;
  const boxes = buttons.map((_, i) => ({ x: xs[i], y: side === -1 ? near - sizes[i].h : near, w: sizes[i].w, h: sizes[i].h }));
  const top = Math.min(...boxes.map((b) => b.y));
  const bottom = Math.max(...boxes.map((b) => b.y + b.h));
  return top < bounds.y + EDGE || bottom > bounds.y + bounds.h - EDGE ? null : boxes;
}
