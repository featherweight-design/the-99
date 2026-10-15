/**
 * The phone card sheet's gestures (H23 carousel R2, `design/design_handoff_the99_card_carousel`
 * README "R2: phone, card first" and STATES §R2). Two surfaces move under a finger: the card BAND
 * (y 0 to the teaser's top), whose horizontal drag pages, and the SHEET, whose vertical drag moves
 * it between its snaps. A vertical drag on the band moves the sheet too. Three snaps since
 * 2026-10-13 (Hugh): full, the teaser, and MIN below the teaser, where the shelf shrinks to its
 * title row and the card grows to fill the band; a swipe down from the teaser reaches it.
 *
 * The math is pure and exported so it is tested as math; the hook below only reads pointers and
 * writes the two inline styles a drag needs, so a drag never re-renders the modal it sits in.
 */
import {
  useCallback,
  useEffect,
  useRef,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";

/** The R1 swipe constants, carried into R2 unchanged (README decision 3, STATES §Motion). */
export const SWIPE = {
  /** No axis is chosen until the finger has travelled this far. */
  lockPx: 10,
  /** Horizontal only when |dx| beats |dy| by this much; everything else is vertical. */
  axisRatio: 1.5,
  /** A release this far across the band pages, whatever its speed. */
  commitFraction: 0.25,
  /** A release this fast pages from a shorter drag, so long as it travelled `flickMinPx`. */
  flickPxPerMs: 0.5,
  flickMinPx: 24,
  /** Drags that start this close to either screen edge belong to the system (back, forward). */
  edgePx: 16,
  /** Past an end the band follows at this fraction of the finger, up to `endMaxPx`. */
  endFactor: 0.3,
  endMaxPx: 40,
  /** Velocity is read over the last stretch of the drag, not its whole length. */
  velocityWindowMs: 100,
} as const;

/** The sheet's snaps (README R2 "States"): full at y 64, teaser a fixed 280 tall, and min, the
    shelf at its title row alone (Hugh, 2026-10-13): 72 tall, the grip included. */
export const SHEET = {
  fullTop: 64,
  teaserHeight: 280,
  minHeight: 72,
  flickPxPerMs: 0.5,
} as const;

export type SheetSnap = "full" | "teaser" | "min";

export type Axis = "x" | "y";
export type Sample = { t: number; x: number; y: number };

/** Which axis a drag has committed to, or null while it is still inside the lock distance. */
export function lockAxis(dx: number, dy: number): Axis | null {
  if (Math.hypot(dx, dy) < SWIPE.lockPx) return null;
  return Math.abs(dx) > SWIPE.axisRatio * Math.abs(dy) ? "x" : "y";
}

/** A drag starting at the screen's edge is the system's (back/forward), never ours. */
export function startsAtSystemEdge(x: number, viewportWidth: number): boolean {
  return x <= SWIPE.edgePx || x >= viewportWidth - SWIPE.edgePx;
}

/**
 * Where the band sits for a horizontal drag of `dx`. A drag toward a side with a neighbor is 1:1;
 * toward a side with none it rubber-bands (0.3x, at most 40px) and springs back on release.
 * Positive `dx` drags right, which reveals the previous card.
 */
export function bandOffset(dx: number, canPrev: boolean, canNext: boolean): number {
  const open = dx > 0 ? canPrev : dx < 0 ? canNext : true;
  if (open) return dx;
  return Math.sign(dx) * Math.min(Math.abs(dx) * SWIPE.endFactor, SWIPE.endMaxPx);
}

/** Whether a released horizontal drag pages, and which way. */
export function pageDecision(
  dx: number,
  vx: number,
  width: number,
  canPrev: boolean,
  canNext: boolean,
): "prev" | "next" | null {
  const dir = dx < 0 ? "next" : dx > 0 ? "prev" : null;
  if (dir === null) return null;
  if (dir === "next" ? !canNext : !canPrev) return null;
  const far = Math.abs(dx) >= width * SWIPE.commitFraction;
  const flick =
    Math.abs(dx) >= SWIPE.flickMinPx && Math.abs(vx) >= SWIPE.flickPxPerMs && Math.sign(vx) === Math.sign(dx);
  return far || flick ? dir : null;
}

/** Pixels per millisecond over the last `windowMs` of the samples. Zero for a single sample. */
export function velocity(samples: readonly Sample[], windowMs: number = SWIPE.velocityWindowMs): { vx: number; vy: number } {
  const last = samples[samples.length - 1];
  if (!last) return { vx: 0, vy: 0 };
  const first = samples.find((s) => s.t >= last.t - windowMs) ?? last;
  const dt = last.t - first.t;
  if (dt <= 0) return { vx: 0, vy: 0 };
  return { vx: (last.x - first.x) / dt, vy: (last.y - first.y) / dt };
}

/** The sheet follows the finger between its highest and lowest snaps and never past either.
    `lowestTop` is the min snap's top where there is one, else the teaser's. */
export function clampSheetTop(top: number, fullTop: number, lowestTop: number): number {
  return Math.min(Math.max(top, fullTop), lowestTop);
}

/**
 * Where a released sheet settles. A flick moves one snap in its direction from where the sheet
 * was let go; otherwise the nearer snap wins. Without `minTop` there are two snaps, nothing
 * between (STATES h2).
 */
export function sheetSnap(
  top: number,
  vy: number,
  fullTop: number,
  teaserTop: number,
  minTop?: number,
  /** The drag began at min, which moves one snap up at most: to the teaser, never past it. */
  fromMin = false,
): SheetSnap {
  const snaps: [SheetSnap, number][] = fromMin ? [["teaser", teaserTop]] : [["full", fullTop], ["teaser", teaserTop]];
  if (minTop !== undefined && minTop > teaserTop) snaps.push(["min", minTop]);
  if (vy <= -SHEET.flickPxPerMs) {
    const above = snaps.filter(([, t]) => t < top);
    return (above.length ? above[above.length - 1] : snaps[0])[0];
  }
  if (vy >= SHEET.flickPxPerMs) {
    const below = snaps.filter(([, t]) => t > top);
    return (below.length ? below[0] : snaps[snaps.length - 1])[0];
  }
  return snaps.reduce((best, s) => (Math.abs(s[1] - top) < Math.abs(best[1] - top) ? s : best))[0];
}

/**
 * The phone card's width and top, in px, at `progress` of the way from the teaser (0) to min (1),
 * for a dialog `width` by `height` (Hugh, 2026-10-13: the card grows WITH the drag, not after it).
 * Both ends are the card-modal's own CSS at its two snaps, worked out in pixels: the teaser's
 * `min(320px, (band - 85) x 0.7159)` at y 64, and min's `min(band width - 32, (band - 85) x 0.7159)`,
 * centred in the band and never above y 64. A drag writes these while it moves, and the snap's CSS
 * takes over on release.
 */
export function cardAtProgress(
  width: number,
  height: number,
  teaserHeight: number,
  progress: number,
): { width: number; top: number } {
  const p = Math.min(Math.max(progress, 0), 1);
  const teaserBand = height - teaserHeight;
  const minBand = height - SHEET.minHeight;
  const teaserW = Math.min(320, (teaserBand - 85) * 0.7159);
  const minW = Math.min(width - 32, (minBand - 85) * 0.7159);
  const minTop = Math.max(64, (minBand - (minW * 88) / 63) / 2);
  return { width: teaserW + (minW - teaserW) * p, top: 64 + (minTop - 64) * p };
}

type Drag = {
  pointerId: number;
  source: "band" | "sheet";
  /** The press began on a control (a peek, the turn plate), whose own click is the tap's job. */
  onControl: boolean;
  start: { x: number; y: number };
  samples: Sample[];
  axis: Axis | null;
  /** Set once the gesture locks to an axis this surface does nothing with; it then just ends. */
  dead: boolean;
  width: number;
  startTop: number;
  teaserTop: number;
  /** The min snap's top, or undefined where there is none to reach. */
  minTop: number | undefined;
  /** The drag began at min: it reaches the teaser at most, as one from full reaches it at least. */
  fromMin: boolean;
  /** The dialog's height and the teaser's, for the card's size along the way. */
  height: number;
  teaserHeight: number;
  bandX: number;
  sheetTop: number;
  /** A pull down the full sheet's body from its top, which the body's own scroll would take. */
  pull: boolean;
};

export type CardSheetGestureOptions = {
  bandRef: RefObject<HTMLElement | null>;
  sheetRef: RefObject<HTMLElement | null>;
  /** The box that sizes the card (`--card-w`, `--card-top`): a drag between the teaser and min
   *  writes its `--card-w-drag` and `--card-top-drag`, so the card grows in the sheet's frames. */
  stageRef?: RefObject<HTMLElement | null>;
  /** The sheet is at its full snap. Paging is withheld there (STATES h3). */
  full: boolean;
  /** The sheet is at its min snap: a tap on the band or the shelf returns it to the teaser. */
  min?: boolean;
  /** False where there is no min snap to reach (a screen too short for a teaser has none). */
  canMinimize?: boolean;
  /** The teaser's own height, so its top is known at a drag's start. */
  teaserHeight: number;
  canPrev: boolean;
  canNext: boolean;
  /** A committed page, with the band's offset at release so the next card can enter from it. */
  onPage: (dir: "prev" | "next", offset: number) => void;
  onSnap: (to: SheetSnap) => void;
  /** The full sheet's scrolling body: a downward drag from its top returns to the teaser. */
  bodyRef?: RefObject<HTMLElement | null>;
  /** False where there is no teaser to return to (a screen too short for one). */
  canCollapse?: boolean;
  /**
   * True while the card is leaving (a stacked card's drop, #1268): a drag in progress is abandoned
   * at once, with its window listeners, so its release cannot page or snap, and no new one starts.
   */
  disabled?: boolean;
};

// The release spring: the same length and curve as `.sheet-snap` (`--motion-quick`, `--motion-ease-out`), which it hands to;
// `motion-tokens.test.ts` holds the two together.
const SPRING = "transform 200ms cubic-bezier(0.2, 0.7, 0.2, 1)";

/** Hands the card back to its snap's own CSS, which then eases to it (`card-grow`). */
function clearCardDrag(stage: HTMLElement | null | undefined) {
  if (!stage) return;
  stage.style.removeProperty("--card-w-drag");
  stage.style.removeProperty("--card-top-drag");
  stage.removeAttribute("data-card-dragging");
}

/**
 * Returns the band to rest: 180ms, or a jump under reduced motion (STATES §Motion, "Phone
 * return"). The inline `transition` a drag or a spring writes is cleared once the band is home,
 * because an inline value overrides the stylesheet's own transition on the band (its dim under
 * the full sheet) for as long as it stays.
 */
function springBack(band: HTMLElement) {
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  if (reduced || !band.style.transform) {
    band.style.transform = "";
    band.style.transition = "";
    return;
  }
  band.style.transition = SPRING;
  band.style.transform = "";
  const done = () => {
    band.removeEventListener("transitionend", done);
    band.style.transition = "";
  };
  band.addEventListener("transitionend", done);
  // `transitionend` never fires for a transition that was interrupted or never ran.
  setTimeout(done, 240);
}

/**
 * Pointer handling for the band and the sheet. Spread `onBandPointerDown` on the band,
 * `onSheetPointerDown` on the sheet, and `onClickCapture` on an ancestor of both: a drag that
 * locked an axis cancels the press under it (README decision 3), so a drag that starts on a peek
 * or the grip never also fires its click.
 */
export function useCardSheetGestures(options: CardSheetGestureOptions) {
  const opts = useRef(options);
  useEffect(() => {
    opts.current = options;
  });
  const drag = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const detach = useRef<(() => void) | null>(null);

  useEffect(() => () => detach.current?.(), []);

  // Abandoned, not ended: an end reads the release and may page or snap; this puts the band and the
  // sheet back where they rest and stops listening.
  useEffect(() => {
    if (!options.disabled || !drag.current) return;
    drag.current = null;
    detach.current?.();
    detach.current = null;
    const { bandRef, sheetRef } = opts.current;
    if (bandRef.current) springBack(bandRef.current);
    const sheet = sheetRef.current;
    if (sheet) {
      sheet.style.removeProperty("--sheet-drag-top");
      delete sheet.dataset.dragging;
    }
    clearCardDrag(opts.current.stageRef?.current);
  }, [options.disabled]);

  const end = useCallback((e: PointerEvent, cancelled: boolean) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.pointerId) return;
    drag.current = null;
    detach.current?.();
    detach.current = null;
    const { bandRef, sheetRef, canPrev, canNext, onPage, onSnap, full, min = false } = opts.current;
    const band = bandRef.current;
    const sheet = sheetRef.current;
    // The release itself is a sample. Touch sends no move while a finger rests, so without it a
    // drag that stopped and then lifted would still read as the flick it was before it stopped.
    if (!cancelled) d.samples.push({ t: e.timeStamp, x: e.clientX, y: e.clientY });
    if (d.axis !== null) {
      suppressClick.current = true;
      // A drag that ends without a click (released off the element, say) must not swallow the
      // NEXT press, so the flag only outlives this task.
      setTimeout(() => {
        suppressClick.current = false;
      }, 0);
    }
    if (d.axis === "x" && !d.dead && band) {
      const { vx } = velocity(d.samples);
      const dx = (d.samples[d.samples.length - 1]?.x ?? d.start.x) - d.start.x;
      const dir = cancelled ? null : pageDecision(dx, vx, d.width, canPrev, canNext);
      if (dir) {
        // Held where the finger left it, at the RELEASE rather than the last move (the two differ
        // when the finger travelled after its final move event): the next card enters from
        // exactly here, and with the neighbors read ahead it arrives before anything could have
        // moved. A card that never arrives (a failed read) leaves this band mounted, so it
        // springs back after a beat.
        d.bandX = bandOffset(dx, canPrev, canNext);
        band.style.transform = `translateX(${d.bandX}px)`;
        onPage(dir, d.bandX);
        setTimeout(() => {
          if (band.isConnected) springBack(band);
        }, 1000);
        return;
      }
      springBack(band);
      return;
    }
    if (d.axis === "y" && !d.dead && sheet) {
      const { vy } = velocity(d.samples);
      // The release, not the last move, is where the sheet was let go.
      if (!cancelled) {
        const dy = (d.samples[d.samples.length - 1]?.y ?? d.start.y) - d.start.y;
        d.sheetTop = clampSheetTop(d.startTop + dy, d.fromMin ? d.teaserTop : SHEET.fullTop, d.minTop ?? d.teaserTop);
      }
      const to = cancelled
        ? full ? "full" : opts.current.min ? "min" : "teaser"
        : sheetSnap(d.sheetTop, vy, SHEET.fullTop, d.teaserTop, d.minTop, d.fromMin);
      sheet.style.removeProperty("--sheet-drag-top");
      delete sheet.dataset.dragging;
      clearCardDrag(opts.current.stageRef?.current);
      onSnap(to);
      return;
    }
    // A tap on the card in the full state returns to the teaser (README R2 "Zoom"), and so does a
    // tap on the card or the shelf at the min snap. Not a tap on a control: turning a two-faced
    // card must not also move the sheet, and the grip's own press is its click.
    if (d.axis === null && !cancelled && !d.onControl) {
      if (d.source === "band" && full) onSnap("teaser");
      else if (min) onSnap("teaser");
    }
  }, []);

  const move = useCallback((e: PointerEvent) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.pointerId) return;
    d.samples.push({ t: e.timeStamp, x: e.clientX, y: e.clientY });
    if (d.samples.length > 32) d.samples.splice(0, d.samples.length - 32);
    const dx = e.clientX - d.start.x;
    const dy = e.clientY - d.start.y;
    const { bandRef, sheetRef, full, canPrev, canNext } = opts.current;
    if (d.axis === null) {
      d.axis = lockAxis(dx, dy);
      if (d.axis === null) return;
      // A pull is a drag DOWN. Anything else from the body's top is the body's own: a scroll up
      // its content, or a sideways drag that pages nothing in the full state. Dropped whole, so the
      // `touchmove` guard stops holding the scroller back for the rest of the gesture.
      if (d.pull && (d.axis === "x" || dy < 0)) {
        drag.current = null;
        detach.current?.();
        detach.current = null;
        return;
      }
      // Horizontal pages only from the band, only in the teaser, and only with a neighbor to page
      // to (STATES h3, h6): every other horizontal drag does nothing at all.
      if (d.axis === "x" && (d.source !== "band" || full || (!canPrev && !canNext))) d.dead = true;
      const target = e.target instanceof Element ? e.target : null;
      try {
        target?.setPointerCapture?.(e.pointerId);
      } catch {
        // A pointer the browser has already released cannot be captured; the window listeners
        // still see it.
      }
      if (d.axis === "y" && sheetRef.current) sheetRef.current.dataset.dragging = "";
    }
    if (d.dead) return;
    if (d.axis === "x") {
      const band = bandRef.current;
      if (!band) return;
      d.bandX = bandOffset(dx, canPrev, canNext);
      band.style.transition = "none";
      band.style.transform = `translateX(${d.bandX}px)`;
      return;
    }
    const sheet = sheetRef.current;
    if (!sheet) return;
    d.sheetTop = clampSheetTop(d.startTop + dy, d.fromMin ? d.teaserTop : SHEET.fullTop, d.minTop ?? d.teaserTop);
    sheet.style.setProperty("--sheet-drag-top", `${d.sheetTop}px`);
    // Between the teaser and min the card follows the same finger, frame for frame.
    const stage = opts.current.stageRef?.current;
    if (stage && d.minTop !== undefined) {
      const card = cardAtProgress(d.width, d.height, d.teaserHeight, (d.sheetTop - d.teaserTop) / (d.minTop - d.teaserTop));
      stage.setAttribute("data-card-dragging", "");
      stage.style.setProperty("--card-w-drag", `${card.width}px`);
      stage.style.setProperty("--card-top-drag", `${card.top}px`);
    }
  }, []);

  const begin = useCallback(
    (e: ReactPointerEvent, source: "band" | "sheet") => {
      if (drag.current || opts.current.disabled) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (startsAtSystemEdge(e.clientX, window.innerWidth)) return;
      const { sheetRef, bodyRef, full, min = false, teaserHeight, canCollapse = true, canMinimize = false } = opts.current;
      // In the full state the sheet's body scrolls natively, and the grip moves the sheet. The one
      // exception is a drag DOWN from the body's top, where a scroll has nowhere to go: that pulls
      // the sheet back to the teaser, as the grip does (Hugh, 2026-10-04). Armed here only when the
      // body is at its top; `touchmove` below decides, by direction, whether it is a pull or a scroll.
      let pull = false;
      if (source === "sheet" && full && !(e.target instanceof Element && e.target.closest("[data-sheet-grip]"))) {
        const body = bodyRef?.current;
        // The body's own presses only: the door strip above it is a sibling with no scroll at all.
        if (!canCollapse || !body || body.scrollTop > 0) return;
        if (!(e.target instanceof Node && body.contains(e.target))) return;
        pull = true;
      }
      const sheet = sheetRef.current;
      // `||`, not `??`: an element with no layout reports 0, which is no height to snap within.
      const height = sheet?.parentElement?.clientHeight || window.innerHeight;
      const teaserTop = height - teaserHeight;
      // Min is one step below the teaser: a drag from the full sheet stops at the teaser, as shipped.
      const minTop = canMinimize && !full ? height - SHEET.minHeight : undefined;
      const startTop = full ? SHEET.fullTop : min && minTop !== undefined ? minTop : teaserTop;
      drag.current = {
        pointerId: e.pointerId,
        source,
        // The grip is a button too, so a tap on it is its own click and never also a tap here.
        onControl: e.target instanceof Element && e.target.closest("button, a") !== null,
        start: { x: e.clientX, y: e.clientY },
        samples: [{ t: e.timeStamp, x: e.clientX, y: e.clientY }],
        axis: null,
        dead: false,
        width: sheet?.parentElement?.clientWidth || window.innerWidth,
        startTop,
        teaserTop,
        minTop,
        fromMin: min && minTop !== undefined,
        height,
        teaserHeight,
        bandX: 0,
        sheetTop: startTop,
        pull,
      };
      const onMove = (ev: PointerEvent) => move(ev);
      const onUp = (ev: PointerEvent) => end(ev, false);
      const onCancel = (ev: PointerEvent) => end(ev, true);
      // A pull has to keep the browser's own scroll out of it: a body that scrolls natively takes
      // a touch the moment it moves and cancels the pointer stream. So a downward move is held back
      // from the scroller (non-passive, the only way `preventDefault` reaches it), and the first
      // upward one hands the gesture to the scroll and drops the pull.
      const onTouchMove = (ev: TouchEvent) => {
        const d = drag.current;
        const touch = ev.touches[0];
        if (!d || !d.pull || !touch) return;
        // A second finger is a pinch, and zoom is never held back (the dialog's scroll lock exempts
        // multi-touch for the same reason, `lib/a11y/dialog.ts`): the pull is dropped whole, and
        // the sheet returns to its snap.
        if (ev.touches.length > 1) {
          drag.current = null;
          detach.current?.();
          detach.current = null;
          const sheet = opts.current.sheetRef.current;
          if (sheet) {
            sheet.style.removeProperty("--sheet-drag-top");
            delete sheet.dataset.dragging;
          }
          return;
        }
        if (touch.clientY - d.start.y < 0 && d.axis === null) {
          drag.current = null;
          detach.current?.();
          detach.current = null;
          return;
        }
        if (ev.cancelable) ev.preventDefault();
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onCancel);
      if (pull) window.addEventListener("touchmove", onTouchMove, { passive: false });
      detach.current = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onCancel);
        if (pull) window.removeEventListener("touchmove", onTouchMove);
      };
    },
    [end, move],
  );

  const onBandPointerDown = useCallback((e: ReactPointerEvent) => begin(e, "band"), [begin]);
  const onSheetPointerDown = useCallback((e: ReactPointerEvent) => begin(e, "sheet"), [begin]);
  const onClickCapture = useCallback((e: ReactMouseEvent) => {
    if (!suppressClick.current) return;
    suppressClick.current = false;
    e.preventDefault();
    e.stopPropagation();
  }, []);

  return { onBandPointerDown, onSheetPointerDown, onClickCapture };
}
