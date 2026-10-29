"use client";
// Quick-add's failed search, said in the deck toast (small items 2, item 8, `Quick-Add-Failed`): the seat picker's
// failed-search words, split into the title and a Try again press, `role="alert"`. The bar itself draws nothing new.
//
// The deck slot sits over the foot of the page, which is where the quick-add dock is pinned, so while the dock is on
// screen the toast lifts to sit 10px above it (phone: above the dock; desktop: bottom = dock height + 10) and never
// covers the field the reader is typing in. The lift is measured off the dock, not hard-coded: its height moves with
// the viewport (44 vs 38px field) and a wrapped row.
//
// Portalled to the body: the dock is `sticky` with a z-index, a stacking context the slot's z-[60] could not climb out of.

import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import { ToastFrame, useToastClock } from "../collection/edit-toast";

/** The gap between the toast and the top of the dock it sits above (the board's 78 over a 67px phone dock, 72 over 61 on desktop). */
export const DOCK_GAP = 10;

/**
 * How far to lift a toast whose slot bottom is `slotBottom` (viewport px, before any lift) so it clears a dock whose box
 * is `dock`. Nothing when the dock is off screen or not drawn (`max-md:hidden` leaves a zero box).
 */
export function liftOverDock(slotBottom: number, dock: { top: number; bottom: number; height: number }, viewportHeight: number) {
  const onScreen = dock.height > 0 && dock.top < viewportHeight && dock.bottom > 0;
  if (!onScreen) return 0;
  return Math.max(0, Math.ceil(slotBottom - (dock.top - DOCK_GAP)));
}

export function QuickAddFailedToast({
  dockRef,
  insideProps,
  onRetry,
  onDone,
}: {
  /** The bar's own root; the dock is the foot bar around it. */
  dockRef: RefObject<HTMLElement | null>;
  /** The bar's `useSearchDismiss` mark: a press on the toast is not a press outside the bar, which would clear the field. */
  insideProps: Record<string, string>;
  onRetry: () => void;
  onDone: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  useToastClock(ref, !hover && !focus, onDone);

  const [lift, setLift] = useState(0);
  // What the frame is drawn with right now, so a measure can take it back off the frame's box.
  const drawn = useRef(0);
  useLayoutEffect(() => {
    drawn.current = lift;
  }, [lift]);
  useLayoutEffect(() => {
    const frame = ref.current;
    const root = dockRef.current;
    if (!frame || !root) return;
    const dock = root.closest<HTMLElement>("[data-foot-bar]") ?? root;
    const measure = () => {
      const next = liftOverDock(frame.getBoundingClientRect().bottom + drawn.current, dock.getBoundingClientRect(), window.innerHeight);
      drawn.current = next;
      setLift(next);
    };
    measure();
    const watch = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    watch?.observe(dock);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { capture: true, passive: true });
    window.visualViewport?.addEventListener("resize", measure);
    return () => {
      watch?.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, { capture: true });
      window.visualViewport?.removeEventListener("resize", measure);
    };
  }, [dockRef]);

  // Only ever mounted after a search has failed in the browser, so the body is there. The wrapper draws no box.
  return createPortal(
    <div {...insideProps} className="contents">
    <ToastFrame
      frameRef={ref}
      role="alert"
      placement="deck"
      kind="quick-add-failed"
      lift={lift}
      title={addPanelCopy.quickAdd.searchFailed}
      onHold={(kind, on) => (kind === "hover" ? setHover : setFocus)(on)}
      actions={
        // The press must not take focus off the field: on a phone that drops the keyboard (the board: "the keyboard
        // stays up"). A keyboard press does move focus here, so `onRetry` hands it back.
        <button
          type="button"
          onPointerDown={(e) => e.preventDefault()}
          onClick={onRetry}
          className="min-h-[44px] cursor-pointer border-0 bg-transparent px-[12px] text-[13.5px] font-semibold text-[color:var(--accent-text)] underline underline-offset-2"
        >
          {addPanelCopy.quickAdd.searchRetry}
        </button>
      }
    />
    </div>,
    document.body,
  );
}
