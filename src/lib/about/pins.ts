// Where an About page's numbered pins sit on a capture, and what number each label takes (About visual build, plan
// `2026-10-27-about-visual.md`, PR 3; handoff `design/design_handoff_the99_about_visual/`, call 1, G6, Labels board).
//
// A pin is a 24px disc whose centre sits 14px inside its region's top-left corner, kept inside the picture. Pins number
// in READING ORDER (top, then left) across a section's captures in capture order, so a second shot numbers on from the
// first; the label list follows the same numbers. A label the reader is not drawn (`visibleSections`) has no pin and no
// line, and the numbers close up (call 8, Review Focus 2).
//
// Client-safe: pure functions over the manifest.

import { pageShotFor, type PageBox, type PageWidth } from "./page-shots";
import type { VisibleSection, VisibleUnit } from "./pages-visible";

/** A box in the picture's own pixels: left, top, width, height. */
export type Box = { x: number; y: number; w: number; h: number };

/** How far inside its region's top-left corner a pin's centre sits. */
export const PIN_INSET = 14;
/** A pin's diameter: its centre is kept this far over half inside the picture, so the disc never leaves it. */
export const PIN_SIZE = 24;
/** Two pins whose centres are under this far apart crowd each other: the later slides right. */
export const PIN_GAP = 28;
/** The most pins one picture holds (call 1); past that a screen gets another shot. */
export const MAX_PINS = 5;

export type PlacedPin = { key: string; n: number; x: number; y: number };

const R = PIN_SIZE / 2;
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));
const round = (v: number) => Math.round(v * 10) / 10;

/**
 * Each region's pin, numbered from 1 in reading order (top, then left, by the region's own corner). A pin's centre is
 * `PIN_INSET` inside its region's top-left, clamped so the disc stays inside `frame`. A pin under `PIN_GAP` from an
 * earlier one slides right along its region's top edge (its height never changes) to the first place clear of every
 * earlier pin; when the frame's right edge stops it first, it slides left instead, so two regions that overlap fully
 * never draw two pins on one spot (Review Focus 5).
 */
export function placePins(regions: readonly { key: string; box: Box }[], frame: { w: number; h: number }): PlacedPin[] {
  const ordered = readingOrder(regions);
  const minX = R;
  const maxX = Math.max(R, frame.w - R);
  const placed: PlacedPin[] = [];
  ordered.forEach(({ key, box }, i) => {
    const x0 = clamp(box.x + PIN_INSET, minX, maxX);
    const y = clamp(box.y + PIN_INSET, R, frame.h - R);
    const x = clear(x0, y, placed, 1, maxX) ?? clear(x0, y, placed, -1, minX) ?? x0;
    placed.push({ key, n: i + 1, x: round(x), y: round(y) });
  });
  return placed;
}

/** Regions in reading order: by the region's top, then its left (then key, so a tie is stable). Scaling a picture
 *  keeps this order, so it is the same at every rendered size. */
function readingOrder<T extends { key: string; box: Box }>(regions: readonly T[]): T[] {
  return [...regions].sort((a, b) => a.box.y - b.box.y || a.box.x - b.box.x || (a.key < b.key ? -1 : 1));
}

/** The first x from `x0` in direction `dir` (1 right, -1 left) clear of every earlier pin, or null past `limit`. */
function clear(x0: number, y: number, placed: readonly PlacedPin[], dir: 1 | -1, limit: number): number | null {
  let x = x0;
  for (let guard = 0; guard <= placed.length; guard++) {
    const near = placed.filter((p) => Math.hypot(p.x - x, p.y - y) < PIN_GAP - 1e-6);
    if (near.length === 0) return dir === 1 ? (x <= limit + 1e-6 ? x : null) : x >= limit - 1e-6 ? x : null;
    // Out to exactly PIN_GAP from the farthest crowding pin along the row.
    const reach = near.map((p) => p.x + dir * Math.sqrt(Math.max(0, PIN_GAP ** 2 - (p.y - y) ** 2)));
    x = dir === 1 ? Math.max(...reach) : Math.min(...reach);
    if (dir === 1 ? x > limit + 1e-6 : x < limit - 1e-6) return null;
  }
  return null;
}

/** One pin a picture carries: its label's key and number, and its region's box (fractions of the picture). */
export type ScreenPin = { key: string; n: number; box: PageBox };

/** One picture of a section as a reader is drawn it: the capture, and the pins it carries, numbered. WHERE each pin
 *  sits is decided only once the picture's rendered size is known (`pinsAt`), because the 24px disc, the 14px inset and
 *  the 28px gap are real pixels that do not scale with the picture. Only drawn labels' boxes are here. */
export type ScreenShot = { shot: { src: string; w: number; h: number }; pins: ScreenPin[] };

/** One label line: its number, and the capture it is pinned on (null when no capture holds its region). */
export type ScreenLabel = { key: string; n: number; lead: string; text: string; region: string; shot: number | null };

export type ScreenModel = { shots: ScreenShot[]; labels: ScreenLabel[] };

/**
 * Each pin of one picture placed at the picture's RENDERED size, `w` by `h` CSS pixels: `placePins` on its regions'
 * boxes scaled to that size, so the 14px inset, the edge clamp and the 28px gap hold in real pixels at every width (a
 * desktop picture is 700 wide only from about 1180; at a 768 window it is about 388). Numbers stay the model's.
 */
export function pinsAt(pins: readonly ScreenPin[], w: number, h: number): (ScreenPin & { x: number; y: number })[] {
  const placed = placePins(
    pins.map((p) => ({ key: p.key, box: { x: p.box[0] * w, y: p.box[1] * h, w: p.box[2] * w, h: p.box[3] * h } })),
    { w, h },
  );
  const at = new Map(placed.map((p) => [p.key, p]));
  return pins.map((p) => ({ ...p, x: at.get(p.key)!.x, y: at.get(p.key)!.y }));
}

/**
 * A section at one width in the reader's theme: each capture with its pins, and its label list in pin order. Each
 * label belongs to the first of the section's captures that measured its region; captures number on in order. A label
 * with no box on any capture keeps its line, numbered after the pinned ones, with no pin.
 */
export function screenModel(
  section: Pick<VisibleSection, "captures" | "labels">,
  theme: string | undefined,
  width: PageWidth,
  shotFor: typeof pageShotFor = pageShotFor,
): ScreenModel {
  const byKey = new Map(section.labels.map((l) => [l.key, { ...l, region: regionOf(l) }]));
  const claimed = new Set<string>();
  const shots: ScreenShot[] = [];
  const labels: ScreenLabel[] = [];
  let next = 1;
  for (const capture of section.captures[width]) {
    const shot = shotFor(theme, width, capture);
    if (!shot) continue;
    // Numbered in reading order on the capture's own pixels; the order is the same at any rendered size.
    const placed = readingOrder(
      [...byKey.values()]
        .filter((l) => !claimed.has(l.key) && Object.hasOwn(shot.regions, l.region))
        .map((l) => {
          const [x, y, w, h] = shot.regions[l.region];
          return { key: l.key, box: { x: x * shot.w, y: y * shot.h, w: w * shot.w, h: h * shot.h } };
        }),
    );
    if (placed.length === 0 && shots.length > 0) continue;
    const index = shots.length;
    shots.push({
      shot: { src: shot.src, w: shot.w, h: shot.h },
      pins: placed.map((p, i) => ({ key: p.key, n: next + i, box: shot.regions[p.key] })),
    });
    placed.forEach((p, i) => {
      const l = byKey.get(p.key)!;
      claimed.add(l.key);
      labels.push({ key: l.key, n: next + i, lead: l.lead ?? "", text: l.text, region: l.region, shot: index });
    });
    next += placed.length;
  }
  for (const l of section.labels) {
    if (claimed.has(l.key)) continue;
    labels.push({ key: l.key, n: next++, lead: l.lead ?? "", text: l.text, region: regionOf(l), shot: null });
  }
  return { shots, labels };
}

/** A label's region: every label's `region` is `<area>/<section>/<label id>`, which is its key (`labelKey`); pinned by
 *  `pins.test.ts`, so the manifest's boxes are read by the key the reader's label carries. */
export function regionOf(l: Pick<VisibleUnit, "key">): string {
  return l.key;
}
