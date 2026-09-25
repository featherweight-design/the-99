"use client";

// The decklist's hover preview (#351) — section 5 of the card-surfaces handoff.
//
// One instance per decklist, not one per row: ninety-nine rows would otherwise
// each carry a positioned 252×352 box and a timer of its own. The rows report
// hover; this layer owns the image, the geometry and the two delays.
//
// It shows the card and nothing else. Every fact it owes is already printed on
// the thing it is showing, and a name caption or a pip row would be the app
// restating Wizards' typography over the top of it. That is also why it is
// `aria-hidden` throughout — it duplicates the row it is anchored to, and the
// card modal, whose trigger is the card name a few pixels away, serves the
// reader who needs more than "which card is this".

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { cssUrl } from "../../lib/collection/browse";

/** 252×352 is the handoff's figure and 63:88 exactly — the card's own ratio. */
const WIDTH = 252;
const HEIGHT = 352;
/** Clear of the pointer on whichever side it opens. */
const GUTTER = 18;
/** Kept off the window's own edges, so the box never sits half off-screen. */
const MARGIN = 8;

/**
 * 240ms in, 80ms out. The delay is what makes an instant appearance calm rather
 * than twitchy, and it is doing the work a transition usually does — the
 * preview does not fade or scale, because zero net motion is locked.
 *
 * Row-to-row is 0ms *while already open*: a scan that re-paid 240ms at every
 * row would feel gated. The open delay is the price of opening, once.
 */
const OPEN_DELAY = 240;
const CLOSE_DELAY = 80;

/**
 * When the image starts downloading, which is NOT when the box appears.
 *
 * The box is mounted by `show()`, and `show()` is what sets the
 * `background: url(…)` — so before this existed, the request could not begin
 * until `OPEN_DELAY` had already elapsed, and the reader waited for the delay
 * PLUS the fetch, serially. Measured on local-dev against a production build:
 * 307ms to the box, then a 214ms request for a 93KB `normal` JPEG, painting at
 * about 477ms.
 *
 * Starting the fetch here puts it inside the wait instead of after it. The box
 * still appears at the same moment, in the same place, at the same size, from
 * the same URL — nothing drawn changes, and the bytes are simply already there.
 *
 * 50ms rather than 0ms because `mouseenter` fires for every row a pointer
 * BRUSHES. A scan down a 99-row list at speed would otherwise request 99 images
 * of ~93KB, and a lane that made the first hover faster by saturating the
 * connection for the next one would be a poor trade. 50ms is short enough to
 * leave ~190ms of the wait overlapped and long enough that a row crossed in
 * passing never asks for anything.
 */
const PRELOAD_DELAY = 50;

/**
 * The image, and where the box was when it opened.
 *
 * The POSITION after that is written straight to the node — see the move
 * handler. State holds the opening position alone, so a pointer crossing 480
 * rows does not re-render the list once per frame.
 */
/** `overSheet`: the row that opened it is inside a dialog, so the box paints above the sheet. */
type PreviewTarget = { imageUri: string; box: PreviewBox; overSheet: boolean };
type PreviewBox = { top: number; left: number };

type PreviewApi = {
  /** Hover began on a row, at the pointer. Null `imageUri` is a no-op — see
   *  `usePreviewRow`. */
  open: (imageUri: string | null | undefined, x: number, y: number, overSheet?: boolean) => void;
  /** The pointer moved while a row is hovered. */
  move: (x: number, y: number) => void;
  close: () => void;
};

const PreviewContext = createContext<PreviewApi | null>(null);

/**
 * Where the box goes: BESIDE THE POINTER, not beside the row.
 *
 * It used to be placed against the row's own rect, which works while a row is
 * about as wide as the box and fails completely when it is not. On the top-off
 * list a row spans the whole list, so "beside the row" could only resolve to
 * "past its far edge" — and the box landed flush right, over TYPE, COST, the
 * availability, SYNERGY and DECKS, which are the figures a reader hovers a row
 * to compare. Every one of them was covered, with several hundred pixels of
 * empty row sitting unused.
 *
 * Following the pointer answers that without the surface having to describe
 * itself: the box is always next to what the reader is looking at, and never on
 * top of it. It also removes the whole question of which side a given list's
 * data sits on.
 *
 * Right of the cursor by default, flipping left when the box would cross the
 * viewport's edge — a fixed box is bounded by the window, not by the list, so
 * the pane no longer bounds it.
 *
 * THE SAME RULE ON THE OTHER AXIS: below the cursor when the box fits under it,
 * above when it does not. It used to be CENTRED on the cursor and clamped, which
 * put half the box over the rows the reader had just read and half over the ones
 * they were about to — and near either end of the window the clamp slid it
 * somewhere neither, so the box's relationship to the pointer changed with how
 * far down the list the pointer happened to be. Below-or-above keeps one
 * relationship at every height: the box hangs off the cursor on whichever side
 * has room for it. Ruled by Hugh on 2026-09-21 against the built surface.
 *
 * At a 900px window a 352px box fits below a cursor down to y≈522, so the lower
 * two fifths of the screen flip above. That is the rule working rather than a
 * fallback — "always below" is not available to a box this tall.
 *
 * Both sides are still clamped to the margin, because a window shorter than the
 * box has no side that fits and the box must not sit half off-screen.
 */
function place(x: number, y: number): PreviewBox {
  const rightward = x + GUTTER;
  const left = rightward + WIDTH + MARGIN <= window.innerWidth
    ? rightward
    : Math.max(MARGIN, x - GUTTER - WIDTH);
  const below = y + GUTTER;
  const downward = below + HEIGHT + MARGIN <= window.innerHeight;
  const top = clamp(
    downward ? below : y - GUTTER - HEIGHT,
    MARGIN,
    window.innerHeight - HEIGHT - MARGIN,
  );
  return { top, left };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

/**
 * Wraps a list and owns one preview box for it.
 *
 * `className` is the wrapper's own padding, which the caller supplies because
 * the wrapper stands in the list's layout. It no longer BOUNDS the preview —
 * the box follows the pointer and is bounded by the window — so a caller that
 * passes none simply adds no padding.
 */
export function HoverPreviewProvider({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const [target, setTarget] = useState<PreviewTarget | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The preload's own timer, separate from the box's: they fire at different
  // moments and either can be cancelled without touching the other.
  const preloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // URLs already asked for this mount. The browser's cache would coalesce a
  // repeat anyway — `cache-control: public, max-age=31556952` on every card
  // image — so this saves the `Image` object rather than the request, and keeps
  // a pointer oscillating between two rows from allocating one per crossing.
  const preloaded = useRef<Set<string>>(new Set());
  // Read in `open` to decide whether the 240ms has already been paid. A ref
  // rather than the state itself, because `open` is stable and would otherwise
  // close over the value it had when the row first mounted.
  const isOpen = useRef(false);

  useEffect(() => {
    isOpen.current = target !== null;
  }, [target]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    if (preloadTimer.current) clearTimeout(preloadTimer.current);
  }, []);

  // The box's own node, written to directly while the pointer moves. A
  // `mousemove` that went through state would re-render this provider — and so
  // every row under it — on every frame of a scan across a 480-row list, to move
  // one absolutely positioned box.
  const boxEl = useRef<HTMLDivElement | null>(null);
  // Coalesced to one write per frame. A pointer reports far more often than the
  // screen refreshes, and each extra write is a layout the browser throws away.
  const frame = useRef<number | null>(null);
  const pending = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
  }, []);

  const api = useMemo<PreviewApi>(
    () => ({
      open: (imageUri, x, y, overSheet = false) => {
        // A row whose card has no art has nothing to preview. Silence rather
        // than a plate: the preview exists to answer "which card is this", and
        // an empty rectangle answers nothing.
        if (!imageUri) return;
        // Desktop only. A touch device fires `mouseenter` on tap, which would
        // put a transient the reader cannot dismiss over the row they meant to
        // press. Checked here rather than in CSS because the delays and the
        // geometry are script either way.
        if (!window.matchMedia("(hover: hover)").matches) return;
        if (timer.current) clearTimeout(timer.current);
        if (preloadTimer.current) clearTimeout(preloadTimer.current);
        // Ask for the bytes during the wait rather than after it. Only while
        // CLOSED: once the box is open `show()` runs immediately, so the
        // background — and therefore the request — is set in the same tick and
        // there is no wait left to hide the fetch inside.
        if (!isOpen.current && !preloaded.current.has(imageUri)) {
          preloadTimer.current = setTimeout(() => {
            preloaded.current.add(imageUri);
            // An `Image` rather than a `<link rel="preload">`: this needs no DOM
            // node, cannot affect layout, and lands in the same cache the CSS
            // background then reads. `decoding` async so a large JPEG cannot
            // block the main thread while the reader is still moving.
            const img = new window.Image();
            img.decoding = "async";
            img.src = imageUri;
          }, PRELOAD_DELAY);
        }
        const show = () => {
          // The pointer has moved since the delay began — a reader who set off
          // down the list does not want the box where they entered the row.
          const at = pending.current ?? { x, y };
          setTarget({ imageUri, box: place(at.x, at.y), overSheet });
        };
        pending.current = { x, y };
        if (isOpen.current) show();
        else timer.current = setTimeout(show, OPEN_DELAY);
      },
      move: (x, y) => {
        pending.current = { x, y };
        // Nothing to move until the box exists; the opening `show` reads
        // `pending` for itself.
        if (!isOpen.current || frame.current !== null) return;
        frame.current = requestAnimationFrame(() => {
          frame.current = null;
          const box = boxEl.current;
          const at = pending.current;
          if (!box || !at) return;
          const { top, left } = place(at.x, at.y);
          box.style.top = `${top}px`;
          box.style.left = `${left}px`;
        });
      },
      close: () => {
        if (preloadTimer.current) clearTimeout(preloadTimer.current);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setTarget(null), CLOSE_DELAY);
      },
    }),
    [],
  );

  return (
    <PreviewContext.Provider value={api}>
      <div className={className}>
        {children}
      </div>
      {target && (
        // UNDER the z-50 sheets by default, which is what every row on the page wants: a row
        // press that opens the card modal leaves this box up until the pointer moves, and the
        // modal must cover it. A name hovered INSIDE a sheet (the overview's) previews above it
        // instead, or the box is drawn under the sheet it was asked for from.
        <div
          ref={boxEl}
          aria-hidden
          data-testid="hover-preview"
          className={`fixed ${target.overSheet ? "z-[60]" : "z-40"} pointer-events-none rounded-[12px] hidden md:block`}
          style={{
            top: target.box.top,
            left: target.box.left,
            width: WIDTH,
            height: HEIGHT,
            border: "1px solid var(--border-strong)",
            boxShadow: "0 18px 40px -12px rgba(0, 0, 0, 0.72)",
            background: `center / cover no-repeat ${cssUrl(target.imageUri)}`,
          }}
        />
      )}
    </PreviewContext.Provider>
  );
}

/**
 * The handlers a row spreads onto its shell. Returns an empty object outside a
 * provider, so a row rendered on its own — in a test, or on a surface that has
 * no preview — costs nothing and behaves as it always did.
 */
export function usePreviewRow(imageUri: string | null | undefined) {
  const api = useContext(PreviewContext);
  const onMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLElement>) =>
      api?.open(imageUri, e.clientX, e.clientY, e.currentTarget.closest('[role="dialog"]') !== null),
    [api, imageUri],
  );
  // The box follows the pointer, so the row reports every move it sees. The
  // provider coalesces them to one write per frame — the handler itself does no
  // work beyond recording where the pointer is.
  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLElement>) => api?.move(e.clientX, e.clientY),
    [api],
  );
  const onMouseLeave = useCallback(() => api?.close(), [api]);
  if (!api) return {};
  return { onMouseEnter, onMouseMove, onMouseLeave };
}
