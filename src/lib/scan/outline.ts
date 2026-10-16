// The detected card's outline, from the detector's corners to the screen. The viewfinder draws it where the card
// is, so nobody has to line a card up with a fixed guide. Pure, apart from the store, which holds one frame's outline
// for the view between the reader (which finds it) and the view (which draws it).
import { sortCorners, type Pt } from "./geometry";

/** The four corners as shares of the camera picture (0 to 1 each way, clockwise from the top left) and that picture's size. */
export type Outline = { corners: Pt[]; width: number; height: number };

/** An outline from corners in the picture's own pixels (`frameW` x `frameH` is the size they were found in). */
export function outlineOf(corners: Pt[], frameW: number, frameH: number, width: number, height: number): Outline {
  return { corners: sortCorners(corners).map((p) => ({ x: p.x / frameW, y: p.y / frameH })), width, height };
}

/**
 * The corners in a box's own pixels when the picture fills the box the way `object-fit: cover` does: scaled to
 * cover it, centred, the overflow cut. Null where the picture or the box has no size yet.
 */
export function outlineInBox(o: Outline, boxW: number, boxH: number): Pt[] | null {
  if (!(o.width > 0 && o.height > 0 && boxW > 0 && boxH > 0)) return null;
  const scale = Math.max(boxW / o.width, boxH / o.height);
  const dx = (boxW - o.width * scale) / 2;
  const dy = (boxH - o.height * scale) / 2;
  return o.corners.map((p) => ({ x: p.x * o.width * scale + dx, y: p.y * o.height * scale + dy }));
}

/** How long an outline is kept after the detector last saw the card: one missed frame must not flicker it off. */
export const OUTLINE_HOLD_MS = 300;

export type OutlineStore = {
  get(): Outline | null;
  subscribe(fn: () => void): () => void;
  /** The card is in view at this outline. */
  show(o: Outline): void;
  /** The card is not in view: the outline stays for `OUTLINE_HOLD_MS`, then goes. */
  hide(): void;
  /** Gone at once (the scanner closed). */
  clear(): void;
};

export function createOutlineStore(hold = OUTLINE_HOLD_MS): OutlineStore {
  let current: Outline | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const subs = new Set<() => void>();
  const set = (o: Outline | null) => {
    current = o;
    subs.forEach((fn) => fn());
  };
  const stop = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  return {
    get: () => current,
    subscribe(fn) {
      subs.add(fn);
      return () => void subs.delete(fn);
    },
    show(o) {
      stop();
      set(o);
    },
    hide() {
      if (!current || timer) return;
      timer = setTimeout(() => {
        timer = null;
        set(null);
      }, hold);
    },
    clear() {
      stop();
      if (current) set(null);
    },
  };
}
