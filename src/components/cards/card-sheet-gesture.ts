/**
 * The phone card sheet's gestures (H23 carousel R2, `design/design_handoff_the99_card_carousel`
 * README "R2: phone, card first" and STATES §R2). Two surfaces move under a finger: the card BAND
 * (y 0 to the teaser's top), whose horizontal drag pages, and the SHEET, whose vertical drag moves
 * it between its two snaps. A vertical drag on the band moves the sheet too.
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

/** The sheet's two snaps (README R2 "States"): full at y 64, teaser a fixed 280 tall. */
export const SHEET = {
  fullTop: 64,
  teaserHeight: 280,
  flickPxPerMs: 0.5,
} as const;

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

/** The sheet follows the finger between its two snaps and never past either. */
export function clampSheetTop(top: number, fullTop: number, teaserTop: number): number {
  return Math.min(Math.max(top, fullTop), teaserTop);
}

/** Two snaps, nothing between (STATES h2): the flick's direction wins, else the nearer snap. */
export function sheetSnap(top: number, vy: number, fullTop: number, teaserTop: number): "full" | "teaser" {
  if (vy <= -SHEET.flickPxPerMs) return "full";
  if (vy >= SHEET.flickPxPerMs) return "teaser";
  return top - fullTop < teaserTop - top ? "full" : "teaser";
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
  bandX: number;
  sheetTop: number;
};

export type CardSheetGestureOptions = {
  bandRef: RefObject<HTMLElement | null>;
  sheetRef: RefObject<HTMLElement | null>;
  /** The sheet is at its full snap. Paging is withheld there (STATES h3). */
  full: boolean;
  /** The teaser's own height, so its top is known at a drag's start. */
  teaserHeight: number;
  canPrev: boolean;
  canNext: boolean;
  /** A committed page, with the band's offset at release so the next card can enter from it. */
  onPage: (dir: "prev" | "next", offset: number) => void;
  onSnap: (to: "full" | "teaser") => void;
};

const SPRING = "transform 180ms cubic-bezier(0.2, 0.7, 0.2, 1)";

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

  const end = useCallback((e: PointerEvent, cancelled: boolean) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.pointerId) return;
    drag.current = null;
    detach.current?.();
    detach.current = null;
    const { bandRef, sheetRef, canPrev, canNext, onPage, onSnap, full } = opts.current;
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
        // Held where the finger left it: the next card enters from exactly here, and with the
        // neighbors read ahead it arrives before anything could have moved. A card that never
        // arrives (a failed read) leaves this band mounted, so it springs back after a beat.
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
      const to = cancelled ? (full ? "full" : "teaser") : sheetSnap(d.sheetTop, vy, SHEET.fullTop, d.teaserTop);
      sheet.style.removeProperty("--sheet-drag-top");
      delete sheet.dataset.dragging;
      onSnap(to);
      return;
    }
    // A tap on the card in the full state returns to the teaser (README R2 "Zoom"). Not a tap on a
    // control in the band: turning a two-faced card must not also drop the sheet.
    if (d.axis === null && !cancelled && d.source === "band" && full && !d.onControl) onSnap("teaser");
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
    d.sheetTop = clampSheetTop(d.startTop + dy, SHEET.fullTop, d.teaserTop);
    sheet.style.setProperty("--sheet-drag-top", `${d.sheetTop}px`);
  }, []);

  const begin = useCallback(
    (e: ReactPointerEvent, source: "band" | "sheet") => {
      if (drag.current) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (startsAtSystemEdge(e.clientX, window.innerWidth)) return;
      const { sheetRef, full, teaserHeight } = opts.current;
      // In the full state the sheet's body scrolls natively; only its grip moves the sheet.
      if (source === "sheet" && full && !(e.target instanceof Element && e.target.closest("[data-sheet-grip]"))) return;
      const sheet = sheetRef.current;
      // `||`, not `??`: an element with no layout reports 0, which is no height to snap within.
      const height = sheet?.parentElement?.clientHeight || window.innerHeight;
      const teaserTop = height - teaserHeight;
      const startTop = full ? SHEET.fullTop : teaserTop;
      drag.current = {
        pointerId: e.pointerId,
        source,
        onControl: e.target instanceof Element && e.target.closest("button, a") !== null,
        start: { x: e.clientX, y: e.clientY },
        samples: [{ t: e.timeStamp, x: e.clientX, y: e.clientY }],
        axis: null,
        dead: false,
        width: sheet?.parentElement?.clientWidth || window.innerWidth,
        startTop,
        teaserTop,
        bandX: 0,
        sheetTop: startTop,
      };
      const onMove = (ev: PointerEvent) => move(ev);
      const onUp = (ev: PointerEvent) => end(ev, false);
      const onCancel = (ev: PointerEvent) => end(ev, true);
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onCancel);
      detach.current = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onCancel);
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
