"use client";
// The bottom sheet, once.
//
// Four surfaces drew this same chrome independently — `filter-panel.tsx`, the
// commander rack's filter sheet, the deck filter sheet and the collection filter
// sheet — and two of them drew it without the gesture. `DeckFilterSheet` and
// `CollectionFilterSheet` had no drag-to-dismiss and did not hold the page
// behind them, so the same control on two routes answered a drag differently
// and let the page scroll under the scrim. That is the divergence a reader
// feels on a phone and a diff cannot show.
//
// WHAT THIS OWNS: the scrim, the panel and its box, and the drag handle with its
// 80px dismissal. A caller renders its own body and footer.
//
// NOT the scroll lock, though an earlier draft of this took it. Every caller
// already holds the page — three through `useDialogA11y`, which locks by
// default, and `filter-panel` through `useScrollLock` directly — so a lock here
// was a SECOND counted lock per sheet rather than a fix. The locks are counted,
// so nothing visibly broke; it was simply an owner too many, and the claim that
// two routes gained the behaviour was wrong. One owner, and it is the a11y
// layer that already had it.
//
// WHAT IT ALSO DOES NOT OWN, FOR NOW: the box. Two vocabularies are in the
// tree — `filter-panel` and the rack draw 16px on `--surface-rail` at 78vh,
// while the deck and collection sheets draw 22px on `--surface-inset` at 86vh —
// and the chassis handoff specifies only the ANCHORED panel (280px,
// `--surface-rail`, 16px), never the sheet. So the difference is an undrawn
// detail answered twice rather than a spec violation, and picking one here
// would repaint two routes on my own authority. `panelClassName` and
// `scrimClassName` let a caller keep what it draws today; the default is the
// handoff's panel vocabulary, since the sheet and the panel are two forms of
// one control. Collapsing the two is a design ruling, not a refactor.
//
// WHAT IT DELIBERATELY DOES NOT OWN: focus. The three sheets each keep a
// different, documented focus policy — the rack traps focus itself because it
// owns its Escape and its drag dismissal, `FilterPanel` holds DOM focus on its
// search field by design, and the collection sheet takes `useDialogA11y`
// wholesale. A shell that imposed one would break at least one of them, so it
// takes the `panelRef` and `onKeyDown` a caller has already decided on.
import { useRef, useState, type ReactNode, type RefObject } from "react";

/** Travel past which the handle drag dismisses rather than snapping back. */
const DRAG_DISMISS_PX = 80;

const PANEL =
  "fixed inset-x-0 bottom-0 z-50 flex max-h-[78vh] flex-col rounded-t-[16px] border-x-0 border-b-0 border-t border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-rail)] shadow-[0_-20px_50px_rgba(0,0,0,0.5)] anim-sheet-in";

const SCRIM = "fixed inset-0 z-40 bg-[color-mix(in_oklab,var(--bg)_72%,transparent)]";

const HANDLE = "flex touch-none justify-center pt-[9px] pb-[4px]";
const HANDLE_BAR = "h-[4px] w-[36px] rounded-full bg-[color:var(--border-strong)]";

export type SheetProps = {
  open: boolean;
  /** Dismiss. The scrim, the ✕, the handle drag and Escape are one action. */
  onDismiss: () => void;
  ariaLabel: string;
  /**
   * The row above the body. A slot rather than a title string: the sheets
   * legitimately differ here — `filter-panel` draws a count badge and a ✕, while
   * the rack, the deck sheet and the collection sheet each draw a live match
   * sentence and keep their one dismiss control in the footer — and each is
   * specified copy. `SheetHeader` below is the badge-and-✕ form, for the one
   * surface whose design calls for it.
   */
  header?: ReactNode;
  /** The caller's panel ref, so its own focus policy still reaches the panel. */
  panelRef?: RefObject<HTMLDivElement | null>;
  onKeyDown?: (event: React.KeyboardEvent) => void;
  /**
   * Mark the panel inert. For a sheet that opens a second `aria-modal` surface
   * over itself: its controls stay mounted for layout, and a focus trap that
   * collects by query would otherwise reach the ones underneath.
   */
  inert?: boolean;
  children: ReactNode;
  /** Pinned below the body, outside the scroll region. */
  footer?: ReactNode;
  /** Override the panel's box. See the note above on the two vocabularies. */
  panelClassName?: string;
  /** Override the scrim's ink. Same reason. */
  scrimClassName?: string;
  /** Override the handle's wrapper — its padding is what sets content offset. */
  handleClassName?: string;
  /** Override the handle bar itself. The routes differ: 36px round, 38px 2px. */
  handleBarClassName?: string;
  /** Wraps scrim and panel — for a caller that gates the sheet on a breakpoint. */
  frameClassName?: string;
  /**
   * Rendered as a SIBLING of the panel, inside the frame. For a second
   * `aria-modal` surface stacked over this one: nested inside an `inert` panel
   * it would be taken out of the accessibility tree, unreachable by the very
   * readers the trap exists for.
   */
  beside?: ReactNode;
};

export function Sheet({
  open,
  onDismiss,
  ariaLabel,
  header,
  panelRef,
  onKeyDown,
  inert,
  children,
  footer,
  panelClassName = PANEL,
  scrimClassName = SCRIM,
  handleClassName = HANDLE,
  handleBarClassName = HANDLE_BAR,
  frameClassName,
  beside,
}: SheetProps) {
  // Live offset under a handle drag, in px. 0 when not dragging.
  const [dragY, setDragY] = useState(0);
  const dragStartY = useRef<number | null>(null);

  // Closed returns null rather than hiding: a hidden duplicate would put a
  // second copy of every control in the accessibility tree, which is the rule
  // the rack's sheet states first and the one most easily lost in a rewrite.
  if (!open) return null;

  const onHandlePointerDown = (e: React.PointerEvent) => {
    dragStartY.current = e.clientY;
    // Captured, so the gesture still reports once the finger leaves the handle.
    // A drag is mostly vertical and the handle is 4px tall, so without this the
    // pointer exits almost immediately: move and up stop arriving, and the sheet
    // sticks part-way down with no way to finish or cancel the drag.
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onHandlePointerMove = (e: React.PointerEvent) => {
    if (dragStartY.current === null) return;
    setDragY(Math.max(0, e.clientY - dragStartY.current));
  };
  const onHandlePointerUp = (e: React.PointerEvent) => {
    if (dragStartY.current === null) return;
    const travelled = Math.max(0, e.clientY - dragStartY.current);
    dragStartY.current = null;
    setDragY(0);
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    if (travelled >= DRAG_DISMISS_PX) onDismiss();
  };
  // A cancel is the gesture being TAKEN AWAY — by a scroll claiming it, or a
  // system interaction — not a drag completing. Sharing the up handler meant a
  // cancel past 80px dismissed a sheet the reader never let go of.
  const onHandlePointerCancel = (e: React.PointerEvent) => {
    dragStartY.current = null;
    setDragY(0);
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  const body = (
    <>
      <div role="presentation" onClick={onDismiss} className={scrimClassName} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        aria-label={ariaLabel}
        onKeyDown={onKeyDown}
        inert={inert}
        className={panelClassName}
        // The drag offset is per-pixel and only exists mid-gesture, so it cannot
        // be a class. Not colour or border — the inline-style rule is about
        // styles that outrank hover: utilities.
        // Truthiness, not `> 0`: the clamp above is the one place the drag is
        // bounded, and a second guard here would mask it — an upward drag that
        // reached this with a negative offset would be silently ignored rather
        // than caught.
        style={dragY ? { transform: `translateY(${dragY}px)` } : undefined}
      >
        {/* Drag handle. `aria-hidden` and unfocusable on purpose: the ✕ below is
            the one accessible close control, and two identically-labelled
            buttons in a row is a defect. */}
        <div
          aria-hidden
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerCancel}
          className={handleClassName}
        >
          <span className={handleBarClassName} />
        </div>

        {header}

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
        {footer}
      </div>
      {beside}
    </>
  );

  return frameClassName ? <div className={frameClassName}>{body}</div> : body;
}

export { DRAG_DISMISS_PX };

/**
 * The badge-and-✕ header, for the sheets whose design calls for one.
 *
 * Separate from `Sheet` so a sheet with a different header — the deck sheet's
 * match sentence, for instance — is not forced to grow a second close control.
 * Two identically-purposed dismiss controls in one row is a defect, which is
 * also why the drag handle is `aria-hidden`.
 */
export function SheetHeader({
  title,
  badge,
  closeLabel,
  onDismiss,
}: {
  title: string;
  /** Active-filter count beside the title. Hidden when 0. */
  badge?: number;
  closeLabel: string;
  onDismiss: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-[16px] pt-[4px] pb-[10px]">
      <h2 className="m-0 font-display text-[18px] font-semibold text-[color:var(--fg)]">
        {title}
        {badge !== undefined && badge > 0 && (
          <span className="ml-[8px] rounded-full bg-[color:var(--accent)] px-[8px] py-px align-middle font-mono text-[12px] font-semibold text-[color:var(--bg)]">
            {badge}
          </span>
        )}
      </h2>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={closeLabel}
        className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-raised)] text-[13px] text-[color:var(--fg-muted)]"
      >
        ✕
      </button>
    </div>
  );
}
