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
const inside = (a: Box, b: Box): boolean => a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h;

/** `avoid` are the cutouts (padded by the caller); each item is placed in order and later items keep clear of earlier ones (the header card goes first). */
export function placeLabels(bounds: Box, avoid: readonly Box[], items: readonly Placing[]): Map<string, Box> {
  const field: Box = { x: bounds.x + EDGE, y: bounds.y + EDGE, w: bounds.w - EDGE * 2, h: bounds.h - EDGE * 2 };
  const out = new Map<string, Box>();
  const taken: Box[] = [];
  for (const it of items) {
    const { w, h } = it.size;
    let best: Box | null = null;
    let bestCost = Infinity;
    let fallback: Box | null = null;
    let fallbackCost = Infinity;
    const x0 = field.x;
    const y0 = field.y;
    const maxX = field.x + field.w - w;
    const maxY = field.y + field.h - h;
    for (let y = y0; y <= maxY + STEP - 1; y += STEP) {
      const yy = Math.min(y, maxY);
      for (let x = x0; x <= maxX + STEP - 1; x += STEP) {
        const xx = Math.min(x, maxX);
        const box: Box = { x: xx, y: yy, w, h };
        const dist = Math.hypot(xx + w / 2 - it.ideal.x, yy + h / 2 - it.ideal.y) + (it.home && !inside(box, it.home) ? OUTSIDE : 0);
        let clash = 0;
        for (const a of avoid) clash += overlap(box, a);
        for (const t of taken) clash += overlap(box, t);
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
