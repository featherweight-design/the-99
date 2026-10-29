// Where an About page's numbered pins sit beside a capture, and what number each label takes (About visual build, plan
// `2026-10-27-about-visual.md`, PR 3; handoff `design/design_handoff_the99_about_visual/`, call 1, G6, Labels board;
// Addendum R4 boards 1 and 2, `build.py` `picture(mode="new")` and `halo(inset=True)`).
//
// A pin is a 24px disc in a 30px GUTTER left of the capture, never on it (R4 board 1): level with its region's row
// (its top plus half its height, the half capped at 14), held 12px inside the capture's height. Two pins under 28px
// apart slide down the gutter and a stub joins each slid pin back to its row; the region itself is marked by accent
// corner brackets just outside it, grown to 20 x 20 round a tiny target. Pins number in READING ORDER (top, then
// left) across a section's captures in capture order, so a second shot numbers on from the first; the label list
// follows the same numbers. A label the reader is not drawn (`visibleSections`) has no pin and no line, and the
// numbers close up (call 8, Review Focus 2).
//
// Client-safe: pure functions over the manifest.

import { pageShotFor, type PageBox, type PageWidth } from "./page-shots";
import type { VisibleSection, VisibleUnit } from "./pages-visible";
import { HALO_REACH } from "./halo";

/** A box in the picture's own pixels: left, top, width, height. */
export type Box = { x: number; y: number; w: number; h: number };

/** The gutter left of the capture that the pins ride (R4 board 1, `G`): the capture is drawn this much narrower. */
export const PIN_GUTTER = 30;
/** A pin's diameter. Its centre is kept half of it inside the capture's height, so the disc never leaves the gutter. */
export const PIN_SIZE = 24;
/** Two pins whose centres are under this far apart down the gutter crowd each other: the later slides down. */
export const PIN_GAP = 28;
/** The most pins one picture holds (call 1); past that a screen gets another shot. */
export const MAX_PINS = 5;
// How far inside the frame a lit region's halo is held (R4 board 2): its own module, shared with the tool card's CSS clamp.
export { HALO_REACH } from "./halo";
/** A bracket's padding round its region, its least size, its longest arm and how far inside the capture it is held. */
export const BRACKET_PAD = 4;
export const BRACKET_MIN = 20;
export const BRACKET_ARM = 10;
export const BRACKET_EDGE = 3;

/** A region's corner brackets in the capture's pixels: their box's edges, and each corner's arm length. */
export type Bracket = { l: number; t: number; r: number; b: number; arm: number };
/** A gutter stub joining a slid pin back to its region's row: its top and height in the capture's pixels. */
export type Stub = { top: number; height: number };
/** A pin as drawn: its centre in the GUTTER's coordinates (`x` is always half the gutter), its stub and its brackets. */
export type PlacedPin = { key: string; n: number; x: number; y: number; stub: Stub | null; bracket: Bracket };

const R = PIN_SIZE / 2;
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));
const round = (v: number) => Math.round(v * 10) / 10;

/** The row a region's pin is level with: its top plus half its height (the half capped at `PIN_GAP / 2`), held inside. */
const rowOf = (box: Box, h: number) => clamp(box.y + Math.min(box.h, PIN_GAP) / 2, R, h - R);

/**
 * One axis of a bracket: centred on the region, `BRACKET_PAD` out and at least `BRACKET_MIN` long, cut to sit
 * `BRACKET_EDGE` inside the frame. A cut that leaves it under `BRACKET_MIN` slides it back in to that length instead,
 * so a small target at the edge keeps its least size (review round 1).
 */
function spanOf(start: number, size: number, frame: number): [number, number] {
  const mid = start + size / 2;
  const half = Math.max(size / 2 + BRACKET_PAD, BRACKET_MIN / 2);
  const lo = clamp(mid - half, BRACKET_EDGE, frame - BRACKET_EDGE);
  const hi = clamp(mid + half, BRACKET_EDGE, frame - BRACKET_EDGE);
  const least = Math.min(BRACKET_MIN, Math.max(frame - 2 * BRACKET_EDGE, 0));
  if (hi - lo >= least) return [lo, hi];
  const from = clamp(mid - least / 2, BRACKET_EDGE, frame - BRACKET_EDGE - least);
  return [from, from + least];
}

/** A region's corner brackets: centred on it, `BRACKET_PAD` out, at least `BRACKET_MIN` square, held `BRACKET_EDGE` inside. */
export function bracketOf(box: Box, w: number, h: number): Bracket {
  const [l, r] = spanOf(box.x, box.w, w);
  const [t, b] = spanOf(box.y, box.h, h);
  return { l: round(l), t: round(t), r: round(r), b: round(b), arm: round(Math.min(BRACKET_ARM, (r - l) / 2, (b - t) / 2)) };
}

/**
 * Each region's pin down the gutter, numbered from 1 in reading order, for a capture drawn `w` by `h`. A pin is level
 * with its region's row; one under `PIN_GAP` below the pin before it (a negative difference included) slides to
 * exactly `PIN_GAP` below it, and the slide is held 12px inside the capture's foot (R4 ruling 7: clamped to the frame).
 */
export function placePins(regions: readonly { key: string; box: Box }[], frame: { w: number; h: number }): PlacedPin[] {
  const placed: PlacedPin[] = [];
  readingOrder(regions).forEach(({ key, box }, i) => {
    const ty = rowOf(box, frame.h);
    const prev = placed.at(-1);
    let cy = ty;
    if (prev && cy - prev.y < PIN_GAP) cy = prev.y + PIN_GAP;
    cy = clamp(cy, R, frame.h - R);
    const stub = Math.abs(ty - cy) > 0.5 ? { top: round(Math.min(ty, cy)), height: round(Math.abs(ty - cy)) } : null;
    placed.push({ key, n: i + 1, x: PIN_GUTTER / 2, y: cy, stub, bracket: bracketOf(box, frame.w, frame.h) });
  });
  return placed.map((p) => ({ ...p, y: round(p.y) }));
}

/** A lit region's halo box in the capture's pixels, held `HALO_REACH` inside the frame on every side (R4 board 2). */
export function haloAt(box: PageBox, w: number, h: number): Box {
  const x = clamp(box[0] * w, HALO_REACH, w - HALO_REACH);
  const y = clamp(box[1] * h, HALO_REACH, h - HALO_REACH);
  const r = Math.max(Math.min((box[0] + box[2]) * w, w - HALO_REACH), x);
  const b = Math.max(Math.min((box[1] + box[3]) * h, h - HALO_REACH), y);
  return { x: round(x), y: round(y), w: round(r - x), h: round(b - y) };
}

/** Regions in reading order: by the region's top, then its left (then key, so a tie is stable). Scaling a picture
 *  keeps this order, so it is the same at every rendered size. */
function readingOrder<T extends { key: string; box: Box }>(regions: readonly T[]): T[] {
  return [...regions].sort((a, b) => a.box.y - b.box.y || a.box.x - b.box.x || (a.key < b.key ? -1 : 1));
}

/** One pin a picture carries: its label's key and number, and its region's box (fractions of the picture). */
export type ScreenPin = { key: string; n: number; box: PageBox };

/** One picture of a section as a reader is drawn it: the capture, and the pins it carries, numbered. WHERE each pin
 *  sits is decided only once the picture's rendered size is known (`pinsAt`), because the 24px disc, the 28px gap and
 *  the brackets' padding are real pixels that do not scale with the picture. Only drawn labels' boxes are here. */
export type ScreenShot = { shot: { src: string; w: number; h: number }; pins: ScreenPin[] };

/** One label line: its number, and the capture it is pinned on (null when no capture holds its region). */
export type ScreenLabel = { key: string; n: number; lead: string; text: string; region: string; shot: number | null };

export type ScreenModel = { shots: ScreenShot[]; labels: ScreenLabel[] };

/**
 * Each pin of one picture placed at the CAPTURE's rendered size, `w` by `h` CSS pixels (its padding box, the gutter
 * not included): `placePins` on its regions' boxes scaled to that size, so the 28px gap, the clamp and the brackets'
 * least size hold in real pixels at every width (a desktop capture is 670 wide only from about 1180). Numbers stay the
 * model's.
 */
export function pinsAt(pins: readonly ScreenPin[], w: number, h: number): (ScreenPin & Omit<PlacedPin, "key" | "n">)[] {
  const placed = placePins(
    pins.map((p) => ({ key: p.key, box: { x: p.box[0] * w, y: p.box[1] * h, w: p.box[2] * w, h: p.box[3] * h } })),
    { w, h },
  );
  const at = new Map(placed.map((p) => [p.key, p]));
  return pins.map((p) => {
    const { x, y, stub, bracket } = at.get(p.key)!;
    return { ...p, x, y, stub, bracket };
  });
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
