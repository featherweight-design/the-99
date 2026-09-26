"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * A popover panel FIXED to viewport coordinates computed from its trigger's rect, rather than
 * `absolute` inside the thing it opens from. Lifted out of `deck-card-overflow.tsx` so the game
 * log's delete confirm floats the same way the deck's does (Hugh, 2026-09-27: "our UI is
 * consistent"). Every rule below was paid for on the deck tile first.
 *
 * WHY FIXED. An absolutely positioned popover inside a clipping ancestor is CUT BY IT. The deck
 * tile's art band is `overflow-hidden` and 168px tall at the three-column band, so the menu's last
 * row was 13px visible and unreachable (confirmed on screen 2026-09-16). A fixed box escapes every
 * clipping ancestor.
 *
 * CLAMPED TO THE VIEWPORT. Right-aligning to the trigger alone puts the panel's left edge
 * off-screen where the trigger sits near the left margin, so it is placed FROM the left and pushed
 * back inside the margin when there is not room.
 *
 * THE GAP IS ARITHMETIC, not a margin: `top` is the trigger's bottom plus `gap`, because a flipped
 * panel needs the gap ABOVE it, where a margin-top would push it down into its own trigger. The
 * 6/4 step is the shipped `mt-[6px] sm:mt-[4px]` at Tailwind's `sm` (640).
 */
export function useAnchoredPanel<T extends HTMLElement = HTMLButtonElement>({
  open,
  width,
  remeasure,
}: {
  open: boolean;
  /** The panel's width. It may change with the panel's mode; the panel is re-placed when it does. */
  width: number;
  /** Anything else that changes the panel's height, such as its mode. */
  remeasure?: unknown;
}) {
  /**
   * Null only before the first open. `place()` runs in the same batch as the open, so there is no
   * paint with `at === null`; a caller's absolute classes are a fallback for a trigger that has gone.
   */
  const [at, setAt] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<T>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const widthRef = useRef(width);
  // Synced in a layout effect, not during render (React forbids writing a ref while rendering). It is
  // declared before the effects that place the panel, so they always read the width this render drew.
  useLayoutEffect(() => {
    widthRef.current = width;
  }, [width]);

  function place() {
    const box = triggerRef.current?.getBoundingClientRect();
    if (!box) return;
    const w = widthRef.current;
    const margin = 8;
    const gap = window.innerWidth >= 640 ? 4 : 6;
    const height = panelRef.current?.offsetHeight ?? 0;

    const wanted = box.right - w;
    const left = Math.min(Math.max(margin, wanted), window.innerWidth - w - margin);

    // The tab bar is FIXED at z-40 across the bottom below `md`, and a panel inside a stacking
    // context (the deck tile's `relative z-10` wrapper is one) does not outrank it: `position:
    // fixed` escapes a clipping ancestor but NOT a stacking context. Treat those pixels as
    // unavailable rather than raising z-indexes across components.
    const tabbar =
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--tabbar-h")) || 0;
    const floor = window.innerHeight - (window.innerWidth < 768 ? tabbar : 0);

    // FLIP WHEN THERE IS NO ROOM BELOW. A fixed box cannot be scrolled into view (scrolling re-runs
    // this and carries the panel with its trigger), so a panel hanging past the fold is not awkward,
    // it is UNREACHABLE. `height` is 0 on the first placement, before the panel has rendered; the
    // layout effect below re-places once it can be measured.
    const below = box.bottom + gap;
    const fitsBelow = height === 0 || below + height + margin <= floor;
    const above = box.top - gap - height;
    const top = fitsBelow
      ? below
      : above >= margin
        ? above
        : // Neither side has room: a viewport shorter than the panel. Pin to the top margin so the
          // panel's HEAD is readable.
          margin;

    setAt({ top, left });
  }

  // Resize only. Scrolling and any other movement of the anchor are covered by the frame loop
  // below, which catches what a scroll listener cannot.
  useEffect(() => {
    if (!open) return;
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open]);

  // Re-place once the panel can be MEASURED, and then whenever anything moves it. A layout effect,
  // so a panel that has to flip never draws once in the wrong place. THREE things move it:
  //  - the panel RESIZES without opening or changing mode (a delete pane grows a `role="alert"`
  //    line when its action fails). `ResizeObserver`.
  //  - the page SCROLLS, which a fixed box does not follow.
  //  - the ANCHOR MOVES UNDER A STILL PAGE (a sorted or filtered list slides this very instance to
  //    a new row with no scroll and no resize).
  // A frame loop covers the last two together, at a rect read per frame only while open.
  useLayoutEffect(() => {
    const node = panelRef.current;
    if (!open || !node) return;
    place();
    // Guarded, as `card-modal.tsx` guards it: an engine without the API must still open the
    // panel, and the frame loop below keeps placing it without the observer.
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(place);
    observer?.observe(node);

    let frame = 0;
    let previous = "";
    const track = () => {
      const box = triggerRef.current?.getBoundingClientRect();
      if (box) {
        const key = `${Math.round(box.top)}:${Math.round(box.left)}`;
        if (key !== previous) {
          previous = key;
          place();
        }
      }
      frame = requestAnimationFrame(track);
    };
    frame = requestAnimationFrame(track);

    return () => {
      observer?.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [open, remeasure, width]);

  return { at, place, triggerRef, panelRef };
}

/** The floating panel's shell, as the deck ⋯ menu draws it. `w-*` is the caller's. */
export const ANCHORED_PANEL_CLASS =
  "z-50 overflow-hidden rounded-[10px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)] shadow-[0_22px_50px_rgba(0,0,0,0.6)]";
